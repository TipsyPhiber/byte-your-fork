#!/usr/bin/env node
// Direct password reset for an admin account. Looks up the user by username
// and writes a new bcrypt hash to users.password_hash.
//
// Usage:
//   node resetAdminPassword.js <username> <new_password>

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

async function run() {
  const [, , username, newPassword] = process.argv;
  if (!username || !newPassword) {
    console.error('Usage: node resetAdminPassword.js <username> <new_password>');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const userRes = await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);
  if (userRes.rows.length === 0) {
    console.error(`No user found with username "${username}".`);
    const listRes = await pool.query(`
      SELECT u.username FROM users u
      JOIN admins a ON a.user_id = u.id
      ORDER BY u.username
    `);
    if (listRes.rows.length > 0) {
      console.error('Admin usernames in this DB:');
      for (const r of listRes.rows) console.error(`  - ${r.username}`);
    }
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userRes.rows[0].id]);
  console.log(`Password reset for user "${username}".`);
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
