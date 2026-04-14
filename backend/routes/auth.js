const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { encrypt, hmac } = require('../crypto_helper');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../mailer');

router.post('/signup', async (req, res) => {
  const { first_name, surname, username, email, password } = req.body;
  if (password && password.length > 15) return res.status(400).json({ error: 'Password must not exceed 15 characters.' });
  if (username && username.length > 15) return res.status(400).json({ error: 'Username must not exceed 15 characters.' });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const encEmail = encrypt(email.trim().toLowerCase());
    const emailHmac = hmac(email);
    const newUser = await pool.query(
      'INSERT INTO users (first_name, surname, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [first_name, surname, username, encEmail, hashedPassword]
    ).catch(err => {
      if (err.code === '23505') {
        if (err.constraint === 'users_username_key') throw { status: 409, message: 'Username is already taken.' };
        if (err.constraint === 'users_email_key') throw { status: 409, message: 'An account with that email already exists.' };
      }
      throw err;
    });
    const user_id = newUser.rows[0].id;

    await pool.query(
      'INSERT INTO email_hashes (user_id, email_hmac) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET email_hmac = $2',
      [user_id, emailHmac]
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(
      'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [user_id, code, expiresAt]
    );
    await sendVerificationEmail(email, first_name, code);

    res.status(201).json({ userId: user_id, message: 'Verification code sent to your email.' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/verify-email', async (req, res) => {
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

router.post('/resend-verification', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const userResult = await pool.query('SELECT first_name, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { first_name, email } = userResult.rows[0];
    await pool.query('UPDATE email_verification_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE', [userId]);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(
      'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [userId, code, expiresAt]
    );
    await sendVerificationEmail(email, first_name, code);
    res.json({ message: 'New code sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/forgot-password', async (req, res) => {
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

router.post('/reset-password', async (req, res) => {
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

router.post('/login', async (req, res) => {
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
