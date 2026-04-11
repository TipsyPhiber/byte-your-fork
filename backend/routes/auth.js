const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); 

const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT id, first_name, surname, username, email, role FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.put('/update-username', authenticateToken, async (req, res) => {
  const { username } = req.body;
  try {
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username, req.user.id]);
    res.json({ message: "Username updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

router.put('/update-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: "New password is required" });
  
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
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (first_name, surname, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [first_name, surname, username, email, hashedPassword]
    );
    const user_id = newUser.rows[0].id;
    const token = jwt.sign({ id: user_id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.status(201).json({ token, id: user_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(401).json({ error: "Credentials bad" });

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) return res.status(401).json({ error: "Credentials bad" });

    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
