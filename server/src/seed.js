import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
dotenv.config();

const users = [
  ['Demo Admin', 'admin@servicedesk.local', 'AdminDemo!123', 'admin'],
  ['Demo Agent', 'agent@servicedesk.local', 'AgentDemo!123', 'agent'],
  ['Demo Employee', 'employee@servicedesk.local', 'EmployeeDemo!123', 'employee']
];

try {
  for (const [name, email, password, role] of users) {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (!existing.length) {
      const hash = await bcrypt.hash(password, 12);
      await pool.execute(
        'INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
        [name, email, hash, role]
      );
    }
  }
  console.log('Seed complete. Demo users were added if they did not already exist.');
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
