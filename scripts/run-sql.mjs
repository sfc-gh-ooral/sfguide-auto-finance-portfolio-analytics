// Runs a SQL file top to bottom with the .env.local connection (no role override; the file's
// USE ROLE statements apply). Used to verify sql/setup.sql and sql/cleanup.sql end to end.
//   node scripts/run-sql.mjs sql/setup.sql
import { readFileSync } from 'node:fs';
import snowflake from 'snowflake-sdk';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
snowflake.configure({ logLevel: 'ERROR' });

// Split on semicolons outside quotes, $$ blocks, and -- comments.
function split(sql) {
  const out = []; let cur = ''; let q = false, dollar = false, line = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], n2 = sql.slice(i, i + 2);
    if (line) { cur += c; if (c === '\n') line = false; continue; }
    if (!q && !dollar && n2 === '--') { line = true; cur += c; continue; }
    if (!q && n2 === '$$') { dollar = !dollar; cur += n2; i++; continue; }
    if (!dollar && c === "'") q = !q;
    if (!q && !dollar && c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.replace(/--.*$/gm, '').trim()) out.push(cur.trim());
  return out.filter((s) => s.replace(/--.*$/gm, '').trim());
}

const conn = snowflake.createConnection({
  account: env.SNOWFLAKE_ACCOUNT, username: env.SNOWFLAKE_USERNAME,
  authenticator: 'SNOWFLAKE_JWT', privateKeyPath: env.SNOWFLAKE_PRIVATE_KEY_PATH,
});
await new Promise((res, rej) => conn.connect((e) => (e ? rej(e) : res())));
const stmts = split(readFileSync(process.argv[2], 'utf8'));
for (const [i, s] of stmts.entries()) {
  const head = s.replace(/--.*$/gm, '').trim().split('\n')[0].slice(0, 90);
  const t0 = Date.now();
  try {
    const rows = await new Promise((res, rej) => conn.execute({ sqlText: s, complete: (e, _st, r) => (e ? rej(e) : res(r)) }));
    console.log(`ok  ${String(i + 1).padStart(3)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${head}`);
    if (/^SELECT/i.test(head)) console.log('     ', JSON.stringify(rows?.slice(0, 6)));
  } catch (e) {
    console.error(`ERR ${i + 1} ${head}\n    ${e.message}`);
    process.exit(1);
  }
}
conn.destroy(() => {});
