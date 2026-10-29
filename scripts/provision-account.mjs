import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { hashPassword } from '../server/auth.js';

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index++) {
  const key = args[index];
  if (['--local', '--remote'].includes(key)) options[key.slice(2)] = true;
  else if (['--email', '--name', '--role', '--persist-to'].includes(key) && args[index + 1] && !args[index + 1].startsWith('--')) options[key.slice(2)] = args[++index];
  else throw new Error(`Unknown or incomplete option: ${key}`);
}
if (Boolean(options.local) === Boolean(options.remote)) throw new Error('Select exactly one of --local or --remote.');
if (!options.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email) || options.email.length > 254) throw new Error('Provide a valid --email.');
if (options.role && !['student', 'admin'].includes(options.role)) throw new Error('--role must be student or admin. Omit it to preserve an existing role.');
if (options.name && options.name.length > 100) throw new Error('--name must be at most 100 characters.');
if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal to enter the password privately.');
const email = options.email.trim().toLowerCase();
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const run = commandArgs => new Promise((resolve, reject) => {
  const child = spawn('wrangler', commandArgs, { stdio: 'inherit', shell: false });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Wrangler exited with code ${code}`)));
});

const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
if (options.remote) {
  const answer = await prompt.question(`Provision/reset ${email}${options.role ? ` as ${options.role}` : ''} in the REMOTE database? Type the email to continue: `);
  if (answer.trim().toLowerCase() !== email) { prompt.close(); throw new Error('Cancelled.'); }
}
prompt.close();
// Hide all keystrokes while readline is collecting the password.
const silent = new Writable({ write(_chunk, _encoding, done) { done(); } });
const privatePrompt = readline.createInterface({ input: process.stdin, output: silent, terminal: true });
process.stdout.write('New password (15–128 characters; input hidden): ');
let password = await privatePrompt.question('');
process.stdout.write('\nConfirm password (input hidden): ');
let confirmation = await privatePrompt.question('');
privatePrompt.close();
process.stdout.write('\n');
if (password !== confirmation) throw new Error('Passwords did not match. No data changed.');
const passwordHash = await hashPassword(password);
password = confirmation = '';
const name = options.name || email.split('@')[0];
const role = options.role || 'student';
const sql = [
  `INSERT INTO users (id, email, full_name, role, profile_complete, teacher_status) SELECT ${quote(crypto.randomUUID())}, ${quote(email)}, ${quote(name)}, ${quote(role)}, ${role === 'admin' ? 1 : 0}, 'pending' WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = ${quote(email)});`,
  `INSERT INTO auth_credentials (user_id, password_hash) SELECT id, ${quote(passwordHash)} FROM users WHERE lower(email) = ${quote(email)} ON CONFLICT(user_id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = CURRENT_TIMESTAMP;`,
  ...(options.role ? [`UPDATE users SET role = ${quote(options.role)}, profile_complete = ${options.role === 'admin' ? 1 : 0}, updated_at = CURRENT_TIMESTAMP WHERE lower(email) = ${quote(email)};`] : []),
  `DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE lower(email) = ${quote(email)});`,
].join('\n');
const folder = await mkdtemp(join(tmpdir(), 'ph-sports-provision-'));
try {
  const sqlFile = join(folder, 'account.sql');
  await writeFile(sqlFile, sql, { mode: 0o600 });
  const commandArgs = ['d1', 'execute', 'ph-sports-db', options.remote ? '--remote' : '--local', '--file', sqlFile];
  if (options['persist-to']) commandArgs.push('--persist-to', options['persist-to']);
  await run(commandArgs);
  process.stdout.write(`Account provisioned: ${email}. Existing sessions were revoked.\n`);
} finally {
  await rm(folder, { recursive: true, force: true });
}
