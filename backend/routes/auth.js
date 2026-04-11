const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../db');
const { encrypt, decrypt, hmac } = require('../crypto_helper');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../mailer');

const { authenticateToken } = require('../middleware/auth');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error('Only JPEG, PNG, WebP, or GIF images are allowed.'), { code: 'INVALID_TYPE' }));
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id, first_name, surname, username, email FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = userResult.rows[0];
    const [adminResult, notifResult, prefResult, profileResult] = await Promise.all([
      pool.query('SELECT 1 FROM admins WHERE user_id = $1', [user.id]),
      pool.query('SELECT cleared_at FROM notification_settings WHERE user_id = $1', [user.id]),
      pool.query('SELECT tag_name FROM user_preferences WHERE user_id = $1', [user.id]),
      pool.query('SELECT avatar_url FROM user_profiles WHERE user_id = $1', [user.id])
    ]);
    user.role = adminResult.rows.length > 0 ? 'admin' : 'user';
    user.notifications_cleared_at = notifResult.rows[0]?.cleared_at || null;
    user.preferences = prefResult.rows.map(r => decrypt(r.tag_name));
    user.avatar_url = profileResult.rows[0]?.avatar_data
      ? `http://localhost:5000/api/auth/avatar/${user.id}`
      : null;
    user.email = decrypt(user.email);

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.put('/preferences', authenticateToken, async (req, res) => {
  const { preferences } = req.body; // array of tag names
  if (!Array.isArray(preferences)) return res.status(400).json({ error: "preferences must be an array" });
  try {
    await pool.query('DELETE FROM user_preferences WHERE user_id = $1', [req.user.id]);
    for (const tag of preferences) {
      await pool.query('INSERT INTO user_preferences (user_id, tag_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, encrypt(tag)]);
    }
    res.json({ preferences }); // return plaintext to frontend
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.put('/clear-notifications', authenticateToken, async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO notification_settings (user_id, cleared_at)
      VALUES ($1, NOW())
      ON CONFLICT (user_id) DO UPDATE SET cleared_at = NOW()
    `, [req.user.id]);
    const result = await pool.query('SELECT cleared_at FROM notification_settings WHERE user_id = $1', [req.user.id]);
    res.json({ cleared_at: result.rows[0].cleared_at });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.put('/update-username', authenticateToken, async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: "Username cannot be empty" });
  try {
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username.trim(), req.user.id]);
    res.json({ message: "Username updated" });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: "Username is already taken." });
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

router.put('/update-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: "New password is required" });
  if (newPassword.length > 15) return res.status(400).json({ error: 'Password must not exceed 15 characters.' });
  
  try {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    
    if (userResult.rows.length === 0) {
      console.log('Update Password: User not found for ID', req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    const currentHash = userResult.rows[0].password_hash.trim();
    const validPassword = await bcrypt.compare(currentPassword, currentHash);
    
    if (!validPassword) {
      return res.status(401).json({ error: "Current password incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateResult = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    
    if (updateResult.rowCount === 0) {
      return res.status(500).json({ error: "Update failed: No rows affected" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error('Password Update Error:', err);
    res.status(500).json({ error: "Database update failed" });
  }
});

router.post('/signup', async (req, res) => {
  const { first_name, surname, username, email, password } = req.body;
  if (password && password.length > 15) return res.status(400).json({ error: 'Password must not exceed 15 characters.' });
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

    // Store HMAC for email lookup
    await pool.query(
      'INSERT INTO email_hashes (user_id, email_hmac) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET email_hmac = $2',
      [user_id, emailHmac]
    );

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [user_id, code, expiresAt]
    );

    await sendVerificationEmail(email, first_name, code);

    res.status(201).json({ userId: user_id, message: "Verification code sent to your email." });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post('/verify-email', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: "userId and code are required" });

  try {
    const result = await pool.query(
      'SELECT * FROM email_verification_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()',
      [userId, code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }

    await pool.query('UPDATE email_verification_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);
    await pool.query('INSERT INTO verified_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);

    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const userResult = await pool.query('SELECT first_name, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const { first_name, email } = userResult.rows[0];

    // Invalidate old codes
    await pool.query('UPDATE email_verification_codes SET used = TRUE WHERE user_id = $1 AND used = FALSE', [userId]);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'INSERT INTO email_verification_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [userId, code, expiresAt]
    );

    await sendVerificationEmail(email, first_name, code);
    res.json({ message: "New code sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // Use HMAC lookup since email is encrypted at rest
    const hashResult = await pool.query('SELECT user_id FROM email_hashes WHERE email_hmac = $1', [hmac(email)]);
    // Always respond success to prevent email enumeration
    if (hashResult.rows.length === 0) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }
    const userResult = await pool.query('SELECT id, first_name FROM users WHERE id = $1', [hashResult.rows[0].user_id]);
    if (userResult.rows.length === 0) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const user = userResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}?reset_token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required" });
  if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (newPassword.length > 15) return res.status(400).json({ error: "Password must not exceed 15 characters." });

  try {
    const tokenResult = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "Reset link is invalid or has expired." });
    }

    const resetRecord = tokenResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, resetRecord.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetRecord.id]);

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const identifier = email?.trim();
    const isEmail = identifier?.includes('@');
    let user;
    if (isEmail) {
      // Look up via HMAC since email is encrypted at rest
      const hashResult = await pool.query(
        'SELECT user_id FROM email_hashes WHERE email_hmac = $1', [hmac(identifier)]
      );
      if (hashResult.rows.length === 0) return res.status(401).json({ error: 'Credentials bad' });
      user = await pool.query('SELECT * FROM users WHERE id = $1', [hashResult.rows[0].user_id]);
    } else {
      user = await pool.query('SELECT * FROM users WHERE username = $1', [identifier]);
    }
    if (user.rows.length === 0) return res.status(401).json({ error: "Credentials bad" });

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) return res.status(401).json({ error: "Credentials bad" });

    const verified = await pool.query('SELECT 1 FROM verified_users WHERE user_id = $1', [user.rows[0].id]);
    if (verified.rows.length === 0) {
      return res.status(403).json({ error: "Please verify your email before logging in.", userId: user.rows[0].id, unverified: true });
    }

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.put('/update-email', authenticateToken, async (req, res) => {
  const { newEmail, password } = req.body;
  if (!newEmail || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const valid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });
    const cleanEmail = newEmail.trim().toLowerCase();
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [encrypt(cleanEmail), req.user.id]);
    await pool.query(
      'INSERT INTO email_hashes (user_id, email_hmac) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET email_hmac = $2',
      [req.user.id, hmac(cleanEmail)]
    );
    res.json({ message: 'Email updated successfully.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That email is already in use.' });
    res.status(500).json({ error: 'Server Error' });
  }
});

// Admin: grant or revoke admin by username (admin only)
router.post('/admin/set-role', authenticateToken, async (req, res) => {
  const { username, makeAdmin } = req.body;
  try {
    const callerAdmin = await pool.query('SELECT 1 FROM admins WHERE user_id = $1', [req.user.id]);
    if (callerAdmin.rows.length === 0) return res.status(403).json({ error: 'Admins only.' });
    const target = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const targetId = target.rows[0].id;
    if (makeAdmin) {
      await pool.query('INSERT INTO admins (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [targetId]);
    } else {
      await pool.query('DELETE FROM admins WHERE user_id = $1', [targetId]);
    }
    res.json({ message: `${username} is now ${makeAdmin ? 'an admin' : 'a regular user'}.` });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/avatar', authenticateToken, (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Maximum size is 5 MB.' });
      if (err.code === 'INVALID_TYPE') return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    await pool.query(`
      INSERT INTO user_profiles (user_id, avatar_data, avatar_mime, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET avatar_data = $2, avatar_mime = $3, updated_at = NOW()
    `, [req.user.id, req.file.buffer, req.file.mimetype]);
    res.json({ avatar_url: `http://localhost:5000/api/auth/avatar/${req.user.id}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save avatar.' });
  }
});

router.get('/avatar/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT avatar_data, avatar_mime FROM user_profiles WHERE user_id = $1', [req.params.userId]);
    if (result.rows.length === 0 || !result.rows[0].avatar_data) return res.status(404).send('Not found');
    res.set('Content-Type', result.rows[0].avatar_mime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(result.rows[0].avatar_data);
  } catch {
    res.status(500).send('Error');
  }
});

module.exports = router;
