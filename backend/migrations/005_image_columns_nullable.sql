-- Allow images rows that have only a URL (no fetched binary blob yet).
-- Manual recipe add/edit only stores the URL; the backfill job populates data later.
ALTER TABLE images ALTER COLUMN data DROP NOT NULL;
ALTER TABLE images ALTER COLUMN mime_type DROP NOT NULL;
