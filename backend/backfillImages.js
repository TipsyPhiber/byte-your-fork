#!/usr/bin/env node
// One-shot backfill: download every external image URL into the DB as a blob,
// then rewrite images.url to point at /api/images/<id>.
//
// Safe to re-run — only processes rows where data IS NULL.

require('dotenv').config();
const pool = require('./db');

const CONCURRENCY = 4;
const TIMEOUT_MS = 15000;
const MAX_BYTES = 10 * 1024 * 1024;

async function fetchImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ByteYourFork-ImageBackfill/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!mime.startsWith('image/')) throw new Error(`Not an image (${mime || 'unknown'})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error('Empty body');
    if (buf.length > MAX_BYTES) throw new Error(`Too large (${buf.length} bytes)`);
    return { data: buf, mime };
  } finally {
    clearTimeout(timer);
  }
}

async function processOne(row, counters) {
  try {
    const { data, mime } = await fetchImage(row.url);
    await pool.query(
      'UPDATE images SET data = $1, mime_type = $2, url = $3 WHERE id = $4',
      [data, mime, `/api/images/${row.id}`, row.id]
    );
    counters.ok++;
    console.log(`  ✓ #${row.id} (${(data.length / 1024).toFixed(1)} KB, ${mime})`);
  } catch (err) {
    counters.fail++;
    console.log(`  ✗ #${row.id} ${row.url} — ${err.message}`);
  }
}

async function run() {
  const { rows } = await pool.query(
    "SELECT id, url FROM images WHERE url LIKE 'http%' AND data IS NULL ORDER BY id"
  );
  console.log(`Backfilling ${rows.length} image(s) with concurrency ${CONCURRENCY}...`);

  const counters = { ok: 0, fail: 0 };
  const queue = rows.slice();

  const worker = async () => {
    while (queue.length) {
      const row = queue.shift();
      await processOne(row, counters);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nDone. ✓ ${counters.ok}   ✗ ${counters.fail}`);
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
