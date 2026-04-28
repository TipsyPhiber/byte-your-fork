-- One-time wipe of data encrypted with a lost AES_KEY.
-- After this runs, users will need to re-enter their email (login by username
-- still works because passwords are bcrypt-hashed) and re-pick preferences.

UPDATE users SET email = 'wiped_' || id WHERE email IS NOT NULL;
DELETE FROM email_hashes;
DELETE FROM user_preferences;
