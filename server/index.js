import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import session from 'express-session';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const dbFile = process.env.DB_FILE || './data.sqlite';

const db = new Database(dbFile);

// Bootstrap schema
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT, -- nullable until they set a password
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    league TEXT NOT NULL,
    date TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    venue TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    mode TEXT CHECK(mode IN ('in_person','tv')) NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(game_id) REFERENCES games(id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(game_id) REFERENCES games(id)
  );
  CREATE INDEX IF NOT EXISTS idx_checkins_game ON checkins(game_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game_id, created_at DESC);
`);

// Seed minimal demo data if empty
const countGames = db.prepare("SELECT COUNT(*) AS c FROM games").get().c;
if (countGames === 0) {
  const gstmt = db.prepare("INSERT INTO games (id, league, date, home_team, away_team, venue) VALUES (?,?,?,?,?,?)");
  const demoGames = [
    {league: 'MLB', date: new Date().toISOString(), home_team: 'Chicago Cubs', away_team: 'St. Louis Cardinals', venue: 'Wrigley Field'},
    {league: 'MLB', date: new Date(Date.now()+86400000).toISOString(), home_team: 'Chicago White Sox', away_team: 'Minnesota Twins', venue: 'Guaranteed Rate Field'},
    {league: 'NFL', date: new Date().toISOString(), home_team: 'Green Bay Packers', away_team: 'Chicago Bears', venue: 'Lambeau Field'}
  ];
  for (const g of demoGames) {
    gstmt.run(uuidv4(), g.league, g.date, g.home_team, g.away_team, g.venue);
  }
  const ustmt = db.prepare("INSERT INTO users (id, username) VALUES (?,?)");
  ustmt.run(uuidv4(), "Guest123");
}

const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: ORIGIN } });

io.on('connection', (socket) => {
  // join specific game rooms
  socket.on('room:join', (gameId) => {
    socket.join(`game:${gameId}`);
  });
});

// Helpers
const getUserByName = db.prepare("SELECT * FROM users WHERE username = ?");
const createUser = db.prepare("INSERT INTO users (id, username) VALUES (?,?)");
function ensureUser(username) {
  let u = getUserByName.get(username);
  if (!u) {
    const id = uuidv4();
    createUser.run(id, username);
    u = { id, username };
  }
  return u;
}

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true if using HTTPS
}));

// Routes
app.get('/api/games', (req,res) => {
  const rows = db.prepare("SELECT * FROM games ORDER BY date DESC").all();
  res.json(rows);
});

app.post('/api/games', (req,res) => {
  const { league, date, home_team, away_team, venue } = req.body || {};
  if (!league || !date || !home_team || !away_team) return res.status(400).json({error: 'Missing fields'});
  const id = uuidv4();
  db.prepare("INSERT INTO games (id, league, date, home_team, away_team, venue) VALUES (?,?,?,?,?,?)")
    .run(id, league, date, home_team, away_team, venue || null);
  res.json({ id, league, date, home_team, away_team, venue });
});

app.get('/api/games/:id', (req,res) => {
  const game = db.prepare("SELECT * FROM games WHERE id = ?").get(req.params.id);
  if (!game) return res.status(404).json({error:'Not found'});
  const comments = db.prepare(`
    SELECT c.*, u.username 
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.game_id = ? ORDER BY c.created_at DESC
  `).all(req.params.id);
  const checkins = db.prepare(`
    SELECT ch.*, u.username 
    FROM checkins ch JOIN users u ON ch.user_id = u.id
    WHERE ch.game_id = ? ORDER BY ch.created_at DESC
  `).all(req.params.id);
  res.json({ game, comments, checkins });
});

app.post('/api/checkins', (req,res) => {
  const { username, game_id, mode, rating, comment } = req.body || {};
  if (!username || !game_id || !mode) return res.status(400).json({error:'Missing fields'});
  const user = ensureUser(username.trim().slice(0,40));
  const id = uuidv4();
  db.prepare("INSERT INTO checkins (id, user_id, game_id, mode, rating, comment) VALUES (?,?,?,?,?,?)")
    .run(id, user.id, game_id, mode, rating || null, comment || null);
  const payload = { id, username: user.username, game_id, mode, rating, comment, created_at: new Date().toISOString() };
  io.emit('checkin:new', payload);
  res.json(payload);
});

app.post('/api/games/:id/comments', (req,res) => {
  const { username, body } = req.body || {};
  if (!username || !body) return res.status(400).json({error:'Missing fields'});
  const user = ensureUser(username.trim().slice(0,40));
  const id = uuidv4();
  db.prepare("INSERT INTO comments (id, user_id, game_id, body) VALUES (?,?,?,?)")
    .run(id, user.id, req.params.id, body);
  const payload = { id, username: user.username, game_id: req.params.id, body, created_at: new Date().toISOString() };
  io.to(`game:${req.params.id}`).emit('comment:new', payload);
  res.json(payload);
});

app.get('/api/feed', (req,res) => {
  const rows = db.prepare(`
    SELECT ch.id, ch.game_id, ch.mode, ch.rating, ch.comment, ch.created_at, 
           g.league, g.date AS game_date, g.home_team, g.away_team, g.venue, u.username
    FROM checkins ch
    JOIN games g ON ch.game_id = g.id
    JOIN users u ON ch.user_id = u.id
    ORDER BY ch.created_at DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${ORIGIN}`);
});

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const existing = getUserByName.get(username);
  if (existing) return res.status(400).json({ error: 'User already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare("INSERT INTO users (id, username, password) VALUES (?,?,?)").run(id, username, hash);

  req.session.userId = id;
  res.json({ id, username });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const user = getUserByName.get(username);
  if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Current session
app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(req.session.userId);
  res.json(user);
});