const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const pool = require('../db');
const { encrypt, decrypt, hmac } = require('../crypto_helper');
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
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const [adminResult, notifResult, prefResult, profileResult] = await Promise.all([
      pool.query('SELECT 1 FROM admins WHERE user_id = $1', [user.id]),
      pool.query('SELECT cleared_at FROM notification_settings WHERE user_id = $1', [user.id]),
      pool.query('SELECT tag_name FROM user_preferences WHERE user_id = $1', [user.id]),
      pool.query('SELECT updated_at, (avatar_data IS NOT NULL) as has_avatar FROM user_profiles WHERE user_id = $1', [user.id])
    ]);
    user.role = adminResult.rows.length > 0 ? 'admin' : 'user';
    user.notifications_cleared_at = notifResult.rows[0]?.cleared_at || null;
    user.preferences = prefResult.rows.map(r => decrypt(r.tag_name));
    user.avatar_url = profileResult.rows[0]?.has_avatar
      ? `/api/auth/avatar/${user.id}?t=${profileResult.rows[0].updated_at?.getTime?.() || Date.now()}`
      : null;
    user.email = decrypt(user.email);

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/update-username', authenticateToken, async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username cannot be empty' });
  if (username.trim().length > 15) return res.status(400).json({ error: 'Username must not exceed 15 characters.' });
  try {
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username.trim(), req.user.id]);
    res.json({ message: 'Username updated' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username is already taken.' });
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.put('/update-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password is required' });
  if (newPassword.length > 15) return res.status(400).json({ error: 'Password must not exceed 15 characters.' });
  try {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash.trim());
    if (!validPassword) return res.status(401).json({ error: 'Current password incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateResult = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    if (updateResult.rowCount === 0) return res.status(500).json({ error: 'Update failed: No rows affected' });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password Update Error:', err);
    res.status(500).json({ error: 'Database update failed' });
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
    res.json({ avatar_url: `/api/auth/avatar/${req.user.id}?t=${Date.now()}` });
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
