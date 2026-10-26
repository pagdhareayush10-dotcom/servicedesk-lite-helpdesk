import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { requireAuth, allowRoles } from './auth.js';

dotenv.config();
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'ServiceDesk Lite API' }));

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const [rows] = await pool.execute(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1', [email]
    );
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role: rows[0].role };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ token, user });
  } catch (err) { next(err); }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [req.user.id]
    );
    if (!rows.length) return res.status(401).json({ message: 'User no longer exists' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

app.get('/api/dashboard/stats', requireAuth, async (req, res, next) => {
  try {
    const employeeFilter = req.user.role === 'employee' ? 'WHERE created_by = ?' : '';
    const params = req.user.role === 'employee' ? [req.user.id] : [];
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total,
        SUM(status = 'Open') AS open,
        SUM(status = 'In Progress') AS inProgress,
        SUM(status = 'Resolved') AS resolved,
        SUM(priority = 'Critical') AS critical
       FROM tickets ${employeeFilter}`, params
    );
    res.json({ stats: rows[0] });
  } catch (err) { next(err); }
});

app.get('/api/tickets', requireAuth, async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.user.role === 'employee') {
      conditions.push('t.created_by = ?');
      params.push(req.user.id);
    }
    const status = String(req.query.status || '');
    const priority = String(req.query.priority || '');
    const search = String(req.query.search || '').trim().slice(0, 100);
    if (['Open','In Progress','Resolved','Closed'].includes(status)) {
      conditions.push('t.status = ?'); params.push(status);
    }
    if (['Low','Medium','High','Critical'].includes(priority)) {
      conditions.push('t.priority = ?'); params.push(priority);
    }
    if (search) {
      conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT t.id, t.title, t.description, t.category, t.priority, t.status,
              t.created_at, t.updated_at, t.created_by, t.assigned_to,
              creator.name AS creator_name, assignee.name AS assignee_name
       FROM tickets t
       JOIN users creator ON creator.id = t.created_by
       LEFT JOIN users assignee ON assignee.id = t.assigned_to
       ${where} ORDER BY t.created_at DESC LIMIT 200`, params
    );
    res.json({ tickets: rows });
  } catch (err) { next(err); }
});


app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        message: 'Name must be between 2 and 100 characters'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: 'Password must be between 8 and 72 characters'
      });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'employee']
    );

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: result.insertId,
        name,
        email,
        role: 'employee'
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }
    next(err);
  }
});


app.post('/api/tickets', requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || 'General').trim().slice(0, 60);
    const priority = String(req.body.priority || 'Medium');
    if (title.length < 4 || title.length > 160) {
      return res.status(400).json({ message: 'Title must be between 4 and 160 characters' });
    }
    if (description.length < 10 || description.length > 5000) {
      return res.status(400).json({ message: 'Description must be between 10 and 5000 characters' });
    }
    if (!['Low','Medium','High','Critical'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }
    const [result] = await pool.execute(
      'INSERT INTO tickets (title,description,category,priority,created_by) VALUES (?,?,?,?,?)',
      [title, description, category || 'General', priority, req.user.id]
    );
    res.status(201).json({ message: 'Ticket created', id: result.insertId });
  } catch (err) { next(err); }
});

app.patch('/api/tickets/:id', requireAuth, allowRoles('admin','agent'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid ticket ID' });
    const updates = [];
    const values = [];
    if (req.body.status !== undefined) {
      if (!['Open','In Progress','Resolved','Closed'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      updates.push('status = ?'); values.push(req.body.status);
    }
    if (req.body.priority !== undefined) {
      if (!['Low','Medium','High','Critical'].includes(req.body.priority)) {
        return res.status(400).json({ message: 'Invalid priority' });
      }
      updates.push('priority = ?'); values.push(req.body.priority);
    }
    if (req.body.assigned_to !== undefined) {
      const assigned = req.body.assigned_to === null || req.body.assigned_to === '' ? null : Number(req.body.assigned_to);
      if (assigned !== null && (!Number.isInteger(assigned) || assigned < 1)) {
        return res.status(400).json({ message: 'Invalid assignee' });
      }
      updates.push('assigned_to = ?'); values.push(assigned);
    }
    if (!updates.length) return res.status(400).json({ message: 'No valid fields to update' });
    values.push(id);
    const [result] = await pool.execute(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`, values);
    if (!result.affectedRows) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ message: 'Ticket updated' });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`ServiceDesk Lite API listening on http://localhost:${port}`));
