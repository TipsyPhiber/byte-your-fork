const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { encrypt, hmac } = require('../crypto_helper');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../mailer');

const isLocalIp = (ip) =>
  process.env.NODE_ENV !== 'production' && (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip?.startsWith('172.') ||
    ip?.startsWith('192.168.') ||
    ip?.startsWith('10.')
  );

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalIp(req.ip),
});

// Per-account limiters (layered on top of authLimiter): cap attempts/sends
// against a specific user even if the attacker rotates source IPs.
const perUser = ({ keyPrefix, getKey }) => rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts for this account. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalIp(req.ip) || !getKey(req),
  keyGenerator: (req) => `${keyPrefix}:${getKey(req)}`,
});

const byUserId = perUser({ keyPrefix: 'uid', getKey: (req) => req.body.userId });
const byEmail  = perUser({ keyPrefix: 'email', getKey: (req) => req.body.email?.trim().toLowerCase() });

router.post('/signup', authLimiter, async (req, res) => {
  const { first_name, surname, username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }
  if (password.length > 15) return res.status(400).json({ error: 'Password must not exceed 15 characters.' });
  if (username.length > 15) return res.status(400).json({ error: 'Username must not exceed 15 characters.' });

  let user_id;
  let code;
  const client = await pool.connect();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const encEmail = encrypt(email.trim().toLowerCase());
    const emailHmac = hmac(email);

    await client.query('BEGIN');
    try {
      const newUser = await client.query(
        'INSERT INTO users (first_name, surname, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [first_name, surname, username, encEmail, hashedPassword]
      );
      user_id = newUser.rows[0].id;

      await client.query(
        'INSERT INTO email_hashes (user_id, email_hmac) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET email_hmac = $2',
        [user_id, emailHmac]
      );

      code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await client.query(
        'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
        [user_id, code, expiresAt]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        if (err.constraint === 'users_username_key') return res.status(409).json({ error: 'Username is already taken.' });
        // users.email is encrypted with a random IV, so users_email_key never
        // trips; email_hashes_email_hmac_key is the real uniqueness gate.
        if (err.constraint === 'users_email_key' || err.constraint === 'email_hashes_email_hmac_key') {
          return res.status(409).json({ error: 'An account with that email already exists.' });
        }
      }
      throw err;
    }
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }

  // Email send happens after the DB transaction commits. A delivery failure
  // does not roll back the account — the user can request a resend.
  try {
    await sendVerificationEmail(email, first_name, code);
    return res.status(201).json({ userId: user_id, message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Verification email send failed (account still created):', err.message);
    return res.status(201).json({
      userId: user_id,
      message: 'Account created, but we could not send the verification email. Use "resend code" to try again.',
      emailDeliveryFailed: true,
    });
  }
});

router.post('/verify-email', authLimiter, byUserId, async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'userId and code are required' });
  try {
    const result = await pool.query(
      'SELECT * FROM email_verification_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()',
      [userId, code.trim()]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired code.' });

    await pool.query('UPDATE email_verification_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    await pool.query('INSERT INTO verified_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/resend-verification', authLimiter, byUserId, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  let first_name;
  let email;
  let code;
  const client = await pool.connect();
  try {
    const userResult = await client.query('SELECT first_name, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    ({ first_name, email } = userResult.rows[0]);

    await client.query('BEGIN');
    try {
      await client.query('UPDATE email_verification_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE', [userId]);
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await client.query(
        'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
        [userId, code, expiresAt]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }

  try {
    await sendVerificationEmail(email, first_name, code);
    return res.json({ message: 'New code sent.' });
  } catch (err) {
    console.error('Verification email send failed:', err.message);
    return res.status(502).json({ error: 'We could not send the verification email right now. Please try again in a moment.' });
  }
});

router.post('/forgot-password', authLimiter, byEmail, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const hashResult = await pool.query('SELECT user_id FROM email_hashes WHERE email_hmac = $1', [hmac(email)]);
    if (hashResult.rows.length === 0) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const userResult = await pool.query('SELECT id, first_name FROM users WHERE id = $1', [hashResult.rows[0].user_id]);
    if (userResult.rows.length === 0) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const user = userResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    await sendPasswordResetEmail(email, `${appUrl}?reset_token=${token}`);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (newPassword.length > 15) return res.status(400).json({ error: 'Password must not exceed 15 characters.' });
  try {
    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    if (tokenResult.rows.length === 0) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    const resetRecord = tokenResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, resetRecord.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRecord.id]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const identifier = email?.trim();
    const isEmail = identifier?.includes('@');
    let user;
    if (isEmail) {
      const hashResult = await pool.query('SELECT user_id FROM email_hashes WHERE email_hmac = $1', [hmac(identifier)]);
      if (hashResult.rows.length === 0) return res.status(401).json({ error: 'Credentials bad' });
      user = await pool.query('SELECT * FROM users WHERE id = $1', [hashResult.rows[0].user_id]);
    } else {
      user = await pool.query('SELECT * FROM users WHERE username = $1', [identifier]);
    }
    if (user.rows.length === 0) return res.status(401).json({ error: 'Credentials bad' });

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credentials bad' });

    const verified = await pool.query('SELECT 1 FROM verified_users WHERE user_id = $1', [user.rows[0].id]);
    if (verified.rows.length === 0) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', userId: user.rows[0].id, unverified: true });
    }

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
