
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck
} from 'lucide-react';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('sd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const blankForm = {
  title: '',
  description: '',
  category: 'Hardware',
  priority: 'Medium'
};

export default function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState('employee@servicedesk.local');
  const [password, setPassword] = useState('EmployeeDemo!123');

  const [isRegistering, setIsRegistering] = useState(false);
  const [registerName, setRegisterName] = useState('');

  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [form, setForm] = useState(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const isStaff = user && ['admin', 'agent'].includes(user.role);

  const loadData = async () => {
    setLoading(true);

    try {
      const params = {};

      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [t, s] = await Promise.all([
        api.get('/tickets', { params }),
        api.get('/dashboard/stats')
      ]);

      setTickets(t.data.tickets);
      setStats(s.data.stats || {});
    } catch (e) {
      setNotice(
        e.response?.data?.message ||
        'Could not load data. Check that the API and database are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('sd_token');
    if (!token) return;

    api.get('/auth/me')
      .then(r => setUser(r.data.user))
      .catch(() => {
        localStorage.removeItem('sd_token');
      });
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, search, statusFilter, priorityFilter]);

  async function login(e) {
    e.preventDefault();
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');

    try {
      const r = await api.post('/auth/login', { email, password });

      localStorage.setItem('sd_token', r.data.token);
      setUser(r.data.user);
      setNotice(`Welcome, ${r.data.user.name}`);
    } catch (e) {
      setLoginError(
        e.response?.data?.message || 'Unable to log in'
      );
    }
  }

  async function register(e) {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setLoginError('');

    try {
      const r = await api.post('/auth/register', {
        name: registerName.trim(),
        email: email.trim(),
        password
      });

      setRegisterSuccess(
        r.data.message || 'Account created successfully. Please sign in.'
      );

      setIsRegistering(false);
      setRegisterName('');
      setPassword('');
    } catch (e) {
      setRegisterError(
        e.response?.data?.message || 'Unable to create account'
      );
    }
  }

  function switchAuthMode() {
    setIsRegistering(current => !current);
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');
  }

  function logout() {
    localStorage.removeItem('sd_token');
    setUser(null);
    setTickets([]);
    setStats({});
    setNotice('');
    setIsRegistering(false);
    setEmail('');
    setPassword('');
  }

  async function createTicket(e) {
    e.preventDefault();
    setNotice('');

    try {
      await api.post('/tickets', form);
      setForm(blankForm);
      setShowForm(false);
      setNotice('Ticket created successfully.');
      await loadData();
    } catch (e) {
      setNotice(
        e.response?.data?.message || 'Ticket could not be created'
      );
    }
  }

  async function updateTicket(id, patch) {
    try {
      await api.patch(`/tickets/${id}`, patch);
      setNotice('Ticket updated.');
      await loadData();
    } catch (e) {
      setNotice(e.response?.data?.message || 'Update failed');
    }
  }

  const statCards = [
    { label: 'Total tickets', value: stats.total || 0, icon: ClipboardList },
    { label: 'Open', value: stats.open || 0, icon: AlertCircle },
    { label: 'In progress', value: stats.inProgress || 0, icon: Activity },
    { label: 'Resolved', value: stats.resolved || 0, icon: CheckCircle2 }
  ];

  // LOGIN AND REGISTRATION SCREEN
  if (!user) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <div className="brand-mark">
            <ShieldCheck size={27} />
          </div>

          <p className="eyebrow">INTERNAL IT OPERATIONS</p>

          <h1>
            ServiceDesk <span>Lite</span>
          </h1>

          <p className="muted">
            A simple workspace to report, prioritize and resolve IT incidents.
          </p>

          <h2>{isRegistering ? 'Create your account' : 'Welcome back'}</h2>

          <form
            onSubmit={isRegistering ? register : login}
            className="stack"
          >
            {isRegistering && (
              <label>
                Full name
                <input
                  type="text"
                  value={registerName}
                  onChange={e => setRegisterName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={isRegistering ? 8 : undefined}
                maxLength={72}
                autoComplete={
                  isRegistering ? 'new-password' : 'current-password'
                }
                placeholder={
                  isRegistering
                    ? 'At least 8 characters'
                    : 'Enter your password'
                }
                required
              />
            </label>

            {loginError && !isRegistering && (
              <div className="error" role="alert">
                {loginError}
              </div>
            )}

            {registerError && isRegistering && (
              <div className="error" role="alert">
                {registerError}
              </div>
            )}

            {registerSuccess && (
              <div className="notice" role="status">
                {registerSuccess}
              </div>
            )}

            <button className="primary" type="submit">
              {isRegistering ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="muted">
            {isRegistering
              ? 'Already have an account?'
              : "Don't have an account yet?"}
            {' '}
            <button
              type="button"
              className="text-btn"
              onClick={switchAuthMode}
            >
              {isRegistering ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {!isRegistering && (
            <div className="demo-hint">
              <b>Demo account prefilled</b>
              <br />
              Change to agent/admin credentials to test staff features.
            </div>
          )}
        </section>
      </main>
    );
  }

  // EXISTING TICKET DASHBOARD
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <b>ServiceDesk</b>
            <small>IT OPERATIONS</small>
          </div>
        </div>

        <div className="nav-active">
          <ClipboardList size={18} /> Ticket workspace
        </div>

        <div className="side-note">
          <span className="live-dot" /> API connected after successful data load
        </div>

        <div className="profile">
          <div className="avatar">
            {user.name?.slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-copy">
            <b>{user.name}</b>
            <small>{user.role}</small>
          </div>
          <button
            className="icon-btn"
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">WORKSPACE / INCIDENTS</p>
            <h1>IT Service Desk</h1>
            <p className="muted">
              Track requests, identify priorities and keep work moving.
            </p>
          </div>

          <div className="top-actions">
            <button className="secondary" onClick={loadData}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              className="primary"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={17} /> New ticket
            </button>
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}

        <section className="stats-grid">
          {statCards.map(s => (
            <article className="stat-card" key={s.label}>
              <div className="stat-icon">
                <s.icon size={18} />
              </div>
              <p>{s.label}</p>
              <strong>{s.value}</strong>
            </article>
          ))}
        </section>

        {showForm && (
          <form className="panel ticket-form" onSubmit={createTicket}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">NEW REQUEST</p>
                <h2>Create an IT ticket</h2>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>

            <div className="form-grid">
              <label>
                Title
                <input
                  minLength="4"
                  maxLength="160"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Laptop cannot connect to Wi-Fi"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Network</option>
                  <option>Access</option>
                  <option>General</option>
                </select>
              </label>

              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>

              <label className="wide">
                Description
                <textarea
                  minLength="10"
                  maxLength="5000"
                  value={form.description}
                  onChange={e =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe the issue and what you have tried..."
                  required
                />
              </label>
            </div>

            <button className="primary" type="submit">
              Submit ticket
            </button>
          </form>
        )}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">QUEUE OVERVIEW</p>
              <h2>Tickets</h2>
            </div>
            <span className="count-pill">{tickets.length} records</span>
          </div>

          <div className="filters">
            <div className="searchbox">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option value="">All priorities</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created by</th>
                  {isStaff && <th>Update status</th>}
                </tr>
              </thead>

              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td>
                      <b>
                        SD-{String(t.id).padStart(4, '0')} · {t.title}
                      </b>
                      <small>{t.description}</small>
                    </td>
                    <td>{t.category}</td>
                    <td>
                      <span className={`pill p-${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`pill s-${t.status.toLowerCase().replace(' ', '-')}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>{t.creator_name}</td>
                    {isStaff && (
                      <td>
                        <select
                          value={t.status}
                          onChange={e =>
                            updateTicket(t.id, { status: e.target.value })
                          }
                        >
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                          <option>Closed</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}

                {!tickets.length && (
                  <tr>
                    <td colSpan={isStaff ? 6 : 5} className="empty">
                      {loading
                        ? 'Loading tickets...'
                        : 'No tickets found. Create the first request.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>
          ServiceDesk Lite · Learning portfolio project · Do not use for real company incidents
        </footer>
      </main>
    </div>
  );
}
