const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// In-memory socket auth tokens (token -> { userId, username })
const socketTokens = new Map();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  pingInterval: 25000,
  pingTimeout: 60000, // tolerează blocaje scurte (tab în fundal) fără a deconecta
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Enable CORS for Express REST API
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ensure database and questions folders exist
if (!fs.existsSync(path.join(__dirname, 'database'))) {
  fs.mkdirSync(path.join(__dirname, 'database'));
}

// Database Setup
const dbPath = path.join(__dirname, 'database', 'database.db');
const db = new Database(dbPath);
console.log('Connected to SQLite database at:', dbPath);
initializeDatabase();

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      rating INTEGER DEFAULT 1000,
      territories_conquered INTEGER DEFAULT 0
    )
  `);
}

// Session configuration
const sessionMiddleware = session({
  secret: 'conquiztador-mate-super-secret-key-11',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Share session with Socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// Socket.io token auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (token && socketTokens.has(token)) {
    socket._socketAuthUser = socketTokens.get(token);
  }
  next();
});

// Helper functions for DB queries (synchronous with better-sqlite3)
const dbGet = (sql, params = []) => db.prepare(sql).get(...params);
const dbRun = (sql, params = []) => db.prepare(sql).run(...params);
const dbAll = (sql, params = []) => db.prepare(sql).all(...params);

// Authentication Routes
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii!' });
  }

  try {
    const existingUser = await dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Numele de utilizator sau emailul este deja folosit!' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await dbRun(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    res.json({ success: true, message: 'Cont creat cu succes!' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Eroare de server!' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii!' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Nume de utilizator sau parolă incorectă!' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Nume de utilizator sau parolă incorectă!' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    // Generate socket auth token
    const socketToken = crypto.randomBytes(32).toString('hex');
    socketTokens.set(socketToken, { userId: user.id, username: user.username });

    res.json({
      success: true,
      socketToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        wins: user.wins,
        losses: user.losses,
        rating: user.rating,
        territories_conquered: user.territories_conquered
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Eroare de server!' });
  }
});

app.post('/api/logout', (req, res) => {
  // Remove socket token
  const token = req.body && req.body.socketToken;
  if (token) socketTokens.delete(token);

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Nu s-a putut efectua logout-ul!' });
    }
    res.json({ success: true, message: 'Deconectat cu succes!' });
  });
});

app.get('/api/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Neautorizat!' });
  }

  try {
    const user = await dbGet('SELECT id, username, email, wins, losses, rating, territories_conquered FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      return res.status(404).json({ error: 'Utilizatorul nu a fost găsit!' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Eroare de server!' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const topUsers = await dbAll('SELECT username, rating, wins, losses, territories_conquered FROM users ORDER BY rating DESC LIMIT 10');
    res.json(topUsers);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Eroare de server!' });
  }
});

// Load math questions from JSON files
let questions = { easy: [], medium: [], hard: [] };
try {
  questions.easy = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions', 'easy.json'), 'utf8'));
  questions.medium = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions', 'medium.json'), 'utf8'));
  questions.hard = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions', 'hard.json'), 'utf8'));
  console.log(`Loaded questions pools: Easy (${questions.easy.length}), Medium (${questions.medium.length}), Hard (${questions.hard.length})`);
} catch (error) {
  console.error('Error loading question files. Make sure easy.json, medium.json, and hard.json exist in /questions:', error.message);
}

// Întrebări numerice (de departajare)
let tiebreakQuestions = [];
try {
  tiebreakQuestions = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions', 'tiebreak.json'), 'utf8'));
  console.log(`Loaded tiebreak (numeric) questions: ${tiebreakQuestions.length}`);
} catch (error) {
  console.error('Error loading tiebreak.json:', error.message);
}

// Harta României - Județe (42 teritorii)
const territoriesList = [
  { id: 1,  name: "Alba",              abbr: "AB", x: 378, y: 295 },
  { id: 2,  name: "Arad",              abbr: "AR", x: 140, y: 268 },
  { id: 3,  name: "Argeș",             abbr: "AG", x: 485, y: 415 },
  { id: 4,  name: "Bacău",             abbr: "BC", x: 685, y: 250 },
  { id: 5,  name: "Bihor",             abbr: "BH", x: 220, y: 195 },
  { id: 6,  name: "Bistrița-Năsăud",   abbr: "BN", x: 455, y: 168 },
  { id: 7,  name: "Botoșani",          abbr: "BT", x: 666, y: 118 },
  { id: 8,  name: "Brăila",            abbr: "BR", x: 775, y: 398 },
  { id: 9,  name: "Brașov",            abbr: "BV", x: 555, y: 345 },
  { id: 10, name: "Buzău",             abbr: "BZ", x: 690, y: 390 },
  { id: 11, name: "Călărași",          abbr: "CL", x: 685, y: 520 },
  { id: 12, name: "Caraș-Severin",     abbr: "CS", x: 210, y: 395 },
  { id: 13, name: "Cluj",              abbr: "CJ", x: 370, y: 220 },
  { id: 14, name: "Constanța",         abbr: "CT", x: 840, y: 503 },
  { id: 15, name: "Covasna",           abbr: "CV", x: 630, y: 308 },
  { id: 16, name: "Dâmbovița",         abbr: "DB", x: 558, y: 450 },
  { id: 17, name: "Dolj",              abbr: "DJ", x: 385, y: 520 },
  { id: 18, name: "Galați",            abbr: "GL", x: 830, y: 340 },
  { id: 19, name: "Giurgiu",           abbr: "GR", x: 575, y: 550 },
  { id: 20, name: "Gorj",              abbr: "GJ", x: 340, y: 405 },
  { id: 21, name: "Harghita",          abbr: "HR", x: 562, y: 261 },
  { id: 22, name: "Hunedoara",         abbr: "HD", x: 305, y: 338 },
  { id: 23, name: "Ialomița",          abbr: "IL", x: 723, y: 459 },
  { id: 24, name: "Iași",              abbr: "IS", x: 752, y: 173 },
  { id: 25, name: "Ilfov",             abbr: "IF", x: 650, y: 448 },
  { id: 26, name: "Maramureș",         abbr: "MM", x: 400, y: 118 },
  { id: 27, name: "Mehedinți",         abbr: "MH", x: 298, y: 462 },
  { id: 28, name: "Mureș",             abbr: "MS", x: 475, y: 250 },
  { id: 29, name: "Neamț",             abbr: "NT", x: 628, y: 206 },
  { id: 30, name: "Olt",               abbr: "OT", x: 450, y: 478 },
  { id: 31, name: "Prahova",           abbr: "PH", x: 603, y: 400 },
  { id: 32, name: "Sălaj",             abbr: "SJ", x: 308, y: 175 },
  { id: 33, name: "Satu Mare",         abbr: "SM", x: 292, y: 102 },
  { id: 34, name: "Sibiu",             abbr: "SB", x: 435, y: 340 },
  { id: 35, name: "Suceava",           abbr: "SV", x: 590, y: 118 },
  { id: 36, name: "Teleorman",         abbr: "TR", x: 505, y: 528 },
  { id: 37, name: "Timiș",             abbr: "TM", x: 155, y: 338 },
  { id: 38, name: "Tulcea",            abbr: "TL", x: 866, y: 393 },
  { id: 39, name: "Vâlcea",            abbr: "VL", x: 415, y: 402 },
  { id: 40, name: "Vaslui",            abbr: "VS", x: 761, y: 239 },
  { id: 41, name: "Vrancea",           abbr: "VN", x: 715, y: 325 },
  { id: 42, name: "București",         abbr: "B",  x: 607, y: 490 }
];

// Conexiuni geografice între județele României
const rawConnections = [
  // AB (Alba)
  [1,3],[1,9],[1,13],[1,22],[1,28],[1,34],[1,39],
  // AR (Arad)
  [2,5],[2,12],[2,22],[2,37],
  // AG (Argeș)
  [3,9],[3,16],[3,19],[3,30],[3,36],[3,39],
  // BC (Bacău)
  [4,21],[4,29],[4,40],[4,41],
  // BH (Bihor)
  [5,13],[5,32],[5,33],
  // BN (Bistrița-Năsăud)
  [6,13],[6,21],[6,26],[6,28],[6,35],
  // BT (Botoșani)
  [7,24],[7,35],
  // BR (Brăila)
  [8,10],[8,18],[8,23],[8,38],[8,41],
  // BV (Brașov)
  [9,15],[9,21],[9,28],[9,31],[9,34],[9,41],
  // BZ (Buzău)
  [10,23],[10,31],[10,41],
  // CL (Călărași)
  [11,19],[11,23],
  // CS (Caraș-Severin)
  [12,22],[12,27],[12,37],
  // CJ (Cluj)
  [13,26],[13,28],[13,32],
  // CT (Constanța)
  [14,38],
  // CV (Covasna)
  [15,21],[15,41],
  // DB (Dâmbovița)
  [16,25],[16,31],
  // DJ (Dolj)
  [17,20],[17,27],[17,30],
  // GL (Galați)
  [18,38],[18,40],[18,41],
  // GR (Giurgiu)
  [19,25],[19,36],
  // GJ (Gorj)
  [20,22],[20,27],[20,39],
  // HR (Harghita)
  [21,28],
  // HD (Hunedoara)
  [22,34],
  // IL (Ialomița)
  [23,25],
  // IS (Iași)
  [24,29],[24,35],[24,40],
  // IF (Ilfov)
  [25,31],[25,42],
  // MM (Maramureș)
  [26,32],[26,33],[26,35],
  // NT (Neamț)
  [29,35],
  // OT (Olt)
  [30,36],[30,39],
  // PH (Prahova)
  [31,41],
  // SJ (Sălaj)
  [32,33],
  // SB (Sibiu)
  [34,39],
  // VS (Vaslui)
  [40,41]
];

// Rebuild full adjacency list from connections (ensure symmetry)
const adjacencyList = {};
territoriesList.forEach(t => {
  adjacencyList[t.id] = [];
});
rawConnections.forEach(([n1, n2]) => {
  if (!adjacencyList[n1].includes(n2)) adjacencyList[n1].push(n2);
  if (!adjacencyList[n2].includes(n1)) adjacencyList[n2].push(n1);
});

// Active game rooms state
const rooms = {};

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Retrieve user identity: token auth takes priority over session cookie
  const tokenAuth = socket._socketAuthUser;
  const sessionUser = socket.request.session;
  let loggedUsername = (tokenAuth && tokenAuth.username) || (sessionUser && sessionUser.username) || null;
  let loggedUserId = (tokenAuth && tokenAuth.userId) || (sessionUser && sessionUser.userId) || null;

  // Track the current room
  socket.currentRoom = null;

  socket.on('join-lobby', async () => {
    if (loggedUserId) {
      try {
        const user = await dbGet('SELECT id, username, email, wins, losses, rating, territories_conquered FROM users WHERE id = ?', [loggedUserId]);
        if (user) {
          socket.emit('auth-status', { loggedIn: true, user });
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }
    socket.emit('auth-status', { loggedIn: false });
  });

  // Create Room
  socket.on('create-room', ({ mode }) => {
    if (!loggedUsername) {
      return socket.emit('error-msg', 'Trebuie să fii autentificat pentru a crea o cameră!');
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      code: roomCode,
      mode: mode, // '1v1' or '1v1v1'
      players: [],
      host: socket.id,
      status: 'lobby',
      gameState: null
    };

    joinRoomHelper(socket, roomCode);
  });

  // Join Room
  socket.on('join-room', ({ code }) => {
    if (!loggedUsername) {
      return socket.emit('error-msg', 'Trebuie să fii autentificat pentru a te alătura!');
    }

    const roomCode = code.toUpperCase().trim();
    const room = rooms[roomCode];

    if (!room) {
      return socket.emit('error-msg', 'Camera nu există!');
    }

    if (room.status !== 'lobby') {
      return socket.emit('error-msg', 'Jocul a început deja în această cameră!');
    }

    const maxPlayers = room.mode === '1v1' ? 2 : 3;
    if (room.players.length >= maxPlayers) {
      return socket.emit('error-msg', 'Camera este plină!');
    }

    if (room.players.some(p => p.userId === loggedUserId)) {
      return socket.emit('error-msg', 'Ești deja în această cameră!');
    }

    joinRoomHelper(socket, roomCode);
  });

  // Leave Lobby
  socket.on('leave-lobby', () => {
    const roomCode = socket.currentRoom;
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.socketId !== socket.id);
      socket.leave(roomCode);
      socket.currentRoom = null;
      
      if (room.players.length === 0) {
        delete rooms[roomCode];
      } else {
        if (room.host === socket.id) {
          room.host = room.players[0].socketId;
        }
        io.to(room.code).emit('lobby-update', {
          players: room.players,
          host: room.host
        });
      }
      socket.emit('left-lobby');
    }
  });
  // ============================================================
  // START GAME -> faza de SELECȚIE inițială (fiecare alege 1 județ)
  // ============================================================
  socket.on('start-game', () => {
    const room = rooms[socket.currentRoom];
    if (!room) return;
    if (room.host !== socket.id) return socket.emit('error-msg', 'Doar gazda poate porni jocul!');
    const required = room.mode === '1v1' ? 2 : 3;
    if (room.players.length < required) return socket.emit('error-msg', `Sunt necesari ${required} jucători!`);

    room.status = 'selecting';
    room.players.forEach((p, idx) => { p.color = PLAYER_COLORS[idx]; p.territoriesCount = 0; });

    const mapState = territoriesList.map(t => ({
      id: t.id, name: t.name, abbr: t.abbr, owner: null, color: NEUTRAL
    }));

    room.gameState = {
      phase: 'selecting',
      map: mapState,
      selectionTurnIndex: 0,
      selectionsLeft: room.players.length,
      turnIndex: 0,
      round: 1,
      maxRounds: BATTLE_ROUNDS,
      distribution: null,
      activeBattle: null
    };

    io.to(room.code).emit('selection-phase', {
      code: room.code, players: room.players, map: room.gameState.map, selectionTurnIndex: 0
    });
  });

  // Alegerea județului de start (fără întrebare)
  socket.on('select-starting-territory', ({ territoryId }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'selecting') return;
    const gs = room.gameState;
    const active = room.players[gs.selectionTurnIndex];
    if (active.socketId !== socket.id) return socket.emit('error-msg', 'Nu este rândul tău să alegi!');
    const t = gs.map.find(x => x.id === territoryId);
    if (!t || t.owner !== null) return socket.emit('error-msg', 'Județul este deja ocupat!');

    t.owner = socket.id; t.color = active.color; active.territoriesCount = 1;
    gs.selectionsLeft--;
    gs.selectionTurnIndex = (gs.selectionTurnIndex + 1) % room.players.length;

    if (gs.selectionsLeft === 0) {
      startDistribution(room);
    } else {
      io.to(room.code).emit('selection-update', {
        map: gs.map, players: room.players, selectionTurnIndex: gs.selectionTurnIndex
      });
    }
  });

  // ============================================================
  // FAZA DE DISTRIBUȚIE — rezervare județ vecin
  // ============================================================
  socket.on('reserve-territory', ({ countyId }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'distribution') return;
    const gs = room.gameState; const dist = gs.distribution;
    if (!dist || dist.mode !== 'reserve') return;
    if (dist.order[dist.idx] !== socket.id) return socket.emit('error-msg', 'Nu este rândul tău să alegi!');
    const taken = Object.values(dist.reservations);
    const opts = freeAdjacentForPlayer(gs, socket.id).filter(id => !taken.includes(id));
    if (!opts.includes(countyId)) return socket.emit('error-msg', 'Alege un județ liber vecin teritoriului tău!');
    dist.reservations[socket.id] = countyId;
    dist.idx++;
    emitReserveTurn(room);
  });

  // Răspuns la întrebarea grilă din distribuție
  socket.on('submit-distribution-answer', ({ answerIndex }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'distribution') return;
    const gs = room.gameState; const dist = gs.distribution;
    if (!dist || dist.mode !== 'question' || !dist.activeQuestion) return;
    if (!(socket.id in dist.reservations)) return;
    if (dist.answers[socket.id] !== undefined) return;
    dist.answers[socket.id] = {
      correct: answerIndex === dist.activeQuestion.correctIndex,
      time: Date.now() - dist.activeQuestion.startTime
    };
    socket.emit('answer-registered', { isCorrect: dist.answers[socket.id].correct });
    const reservers = Object.keys(dist.reservations);
    if (reservers.every(sid => dist.answers[sid] !== undefined)) {
      clearTimeout(dist.timerId); resolveDistribution(room);
    }
  });

  // Răspuns numeric la departajarea din distribuție
  socket.on('submit-distribution-tiebreak', ({ value }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'distribution') return;
    const gs = room.gameState; const dist = gs.distribution;
    if (!dist || dist.mode !== 'tiebreak') return;
    if (!dist.order.includes(socket.id)) return;
    if (dist.answers[socket.id] !== undefined) return;
    dist.answers[socket.id] = { value: Number(value), time: Date.now() - dist.question.startTime };
    socket.emit('answer-registered', { isCorrect: null });
    if (dist.order.every(sid => dist.answers[sid] !== undefined)) {
      clearTimeout(dist.timerId); resolveDistributionTiebreak(room);
    }
  });

  // ============================================================
  // FAZA DE BĂTĂLIE — atac
  // ============================================================
  socket.on('attack-territory', ({ targetId }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'battle') return;
    const gs = room.gameState;
    if (gs.activeBattle) return socket.emit('error-msg', 'O bătălie e deja în desfășurare!');
    const active = room.players[gs.turnIndex];
    if (!active || active.socketId !== socket.id) return socket.emit('error-msg', 'Nu este rândul tău!');
    const myIds = gs.map.filter(t => t.owner === socket.id).map(t => t.id);
    const isAdj = (adjacencyList[targetId] || []).some(n => myIds.includes(n));
    if (!isAdj) return socket.emit('error-msg', 'Poți ataca doar județe vecine!');
    const target = gs.map.find(t => t.id === targetId);
    if (!target || target.owner === socket.id || target.owner === null)
      return socket.emit('error-msg', 'Alege un județ inamic vecin!');

    const defenderId = target.owner;
    const q = randomMC();
    gs.activeBattle = {
      attackerId: socket.id, defenderId, targetId, mode: 'mc',
      question: q.question, answers: q.answers, correctIndex: q.correct,
      startTime: Date.now(), answersSubmitted: {}
    };
    io.to(room.code).emit('battle-question', {
      questionText: q.question, answers: q.answers, duration: MC_DURATION, targetId,
      attackerUsername: active.username,
      defenderUsername: room.players.find(p => p.socketId === defenderId)?.username,
      participants: [socket.id, defenderId]
    });
    gs.activeBattle.timerId = setTimeout(() => resolveBattleMC(room), MC_DURATION);
  });

  socket.on('submit-battle-answer', ({ answerIndex }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'battle') return;
    const gs = room.gameState; const b = gs.activeBattle;
    if (!b || b.mode !== 'mc') return;
    if (socket.id !== b.attackerId && socket.id !== b.defenderId) return;
    if (b.answersSubmitted[socket.id] !== undefined) return;
    b.answersSubmitted[socket.id] = { correct: answerIndex === b.correctIndex, time: Date.now() - b.startTime };
    socket.emit('answer-registered', { isCorrect: b.answersSubmitted[socket.id].correct });
    if (b.answersSubmitted[b.attackerId] !== undefined && b.answersSubmitted[b.defenderId] !== undefined) {
      clearTimeout(b.timerId); resolveBattleMC(room);
    }
  });

  socket.on('submit-battle-tiebreak', ({ value }) => {
    const room = rooms[socket.currentRoom];
    if (!room || room.status !== 'battle') return;
    const gs = room.gameState; const b = gs.activeBattle;
    if (!b || b.mode !== 'tiebreak') return;
    if (socket.id !== b.attackerId && socket.id !== b.defenderId) return;
    if (b.tie.answers[socket.id] !== undefined) return;
    b.tie.answers[socket.id] = { value: Number(value), time: Date.now() - b.tie.startTime };
    socket.emit('answer-registered', { isCorrect: null });
    if (b.tie.answers[b.attackerId] !== undefined && b.tie.answers[b.defenderId] !== undefined) {
      clearTimeout(b.timerId); resolveBattleTiebreak(room);
    }
  });

  // ============================================================
  // REJOIN (după navigarea index.html -> game.html)
  // ============================================================
  socket.on('rejoin-game', () => {
    if (!loggedUserId) return socket.emit('rejoin-failed');
    let foundRoom = null;
    for (const code in rooms) {
      if (rooms[code].players.some(p => p.userId === loggedUserId)) { foundRoom = rooms[code]; break; }
    }
    const liveStatuses = ['selecting', 'distribution', 'battle'];
    if (!foundRoom || !liveStatuses.includes(foundRoom.status)) return socket.emit('rejoin-failed');

    const player = foundRoom.players.find(p => p.userId === loggedUserId);
    const oldSocketId = player.socketId;
    if (player.reconnectTimer) { clearTimeout(player.reconnectTimer); player.reconnectTimer = null; }
    player.disconnected = false;
    player.socketId = socket.id;

    const gs = foundRoom.gameState;
    migrateSocketId(foundRoom, oldSocketId, socket.id);
    if (foundRoom.host === oldSocketId) foundRoom.host = socket.id;

    socket.currentRoom = foundRoom.code;
    socket.join(foundRoom.code);
    socket.to(foundRoom.code).emit('player-reconnected', { username: player.username });

    // Resync după fază
    if (foundRoom.status === 'selecting') {
      return socket.emit('selection-phase', {
        code: foundRoom.code, players: foundRoom.players, map: gs.map,
        selectionTurnIndex: gs.selectionTurnIndex, isRejoin: true
      });
    }
    socket.emit('game-state-sync', buildSyncPayload(foundRoom, socket.id));
  });

  // ============================================================
  // DISCONNECT (perioadă de grație)
  // ============================================================
  socket.on('disconnect', () => {
    const roomCode = socket.currentRoom;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];

    if (room.status === 'lobby') {
      room.players = room.players.filter(p => p.socketId !== socket.id);
      if (room.players.length === 0) { delete rooms[roomCode]; }
      else {
        if (room.host === socket.id) room.host = room.players[0].socketId;
        io.to(room.code).emit('lobby-update', { players: room.players, host: room.host });
      }
    } else {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.disconnected = true;
        io.to(room.code).emit('player-disconnected', { username: player.username });
        if (player.reconnectTimer) clearTimeout(player.reconnectTimer);
        player.reconnectTimer = setTimeout(() => {
          if (player.disconnected && rooms[roomCode]) {
            room.players = room.players.filter(p => p.socketId !== player.socketId);
            const stillConnected = room.players.filter(p => !p.disconnected);
            if (stillConnected.length <= 1) endGameDueToDisconnect(room);
          }
        }, 60000);
      }
    }
  });
});

// Helper pentru intrarea în cameră
function joinRoomHelper(socket, roomCode) {
  const room = rooms[roomCode];
  const tokenAuth = socket._socketAuthUser;
  const sessionUser = socket.request.session;
  const authUserId = (tokenAuth && tokenAuth.userId) || (sessionUser && sessionUser.userId);
  const authUsername = (tokenAuth && tokenAuth.username) || (sessionUser && sessionUser.username);

  const playerObj = {
    socketId: socket.id, userId: authUserId, username: authUsername,
    rating: 1000, color: NEUTRAL, territoriesCount: 0
  };
  try {
    const row = db.prepare('SELECT rating FROM users WHERE id = ?').get(authUserId);
    if (row) playerObj.rating = row.rating;
  } catch (e) { console.error('Rating fetch error:', e); }

  room.players.push(playerObj);
  socket.join(roomCode);
  socket.currentRoom = roomCode;
  io.to(roomCode).emit('lobby-update', {
    players: room.players, host: room.host, mode: room.mode, roomCode: roomCode
  });
}

// ============================================================
// CONSTANTE + UTILITARE DE JOC
// ============================================================
const PLAYER_COLORS = ['#00f0ff', '#ff007f', '#ffea00'];
const NEUTRAL = '#2d3561';
const BATTLE_ROUNDS = 10;
const MC_DURATION = 45000;   // 45s pentru întrebările grilă (derivate etc.)
const TIE_DURATION = 45000;  // 45s pentru departajări numerice
const STEP_DELAY = 4200;

function freeAdjacentForPlayer(gs, socketId) {
  const owned = gs.map.filter(t => t.owner === socketId).map(t => t.id);
  const res = new Set();
  owned.forEach(id => (adjacencyList[id] || []).forEach(n => {
    const t = gs.map.find(x => x.id === n);
    if (t && t.owner === null) res.add(n);
  }));
  return [...res];
}

function enemyAdjacentForPlayer(gs, socketId) {
  const owned = gs.map.filter(t => t.owner === socketId).map(t => t.id);
  const res = new Set();
  owned.forEach(id => (adjacencyList[id] || []).forEach(n => {
    const t = gs.map.find(x => x.id === n);
    if (t && t.owner && t.owner !== socketId) res.add(n);
  }));
  return [...res];
}

function randomMC() {
  const diffs = ['easy', 'medium', 'hard'].filter(d => questions[d] && questions[d].length);
  const d = diffs.length ? diffs[Math.floor(Math.random() * diffs.length)] : null;
  const pool = d ? questions[d] : [];
  if (!pool.length) return { question: 'Cât este 2 + 2?', answers: ['4', '3', '5', '22'], correct: 0 };
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomTie() {
  const pool = tiebreakQuestions;
  if (!pool || !pool.length) return { question: 'Câte soluții reale are x² = 4?', answer: 2 };
  return pool[Math.floor(Math.random() * pool.length)];
}

function migrateSocketId(room, oldId, newId) {
  if (oldId === newId) return;
  const gs = room.gameState; if (!gs) return;
  if (gs.map) gs.map.forEach(t => { if (t.owner === oldId) t.owner = newId; });
  const b = gs.activeBattle;
  if (b) {
    if (b.attackerId === oldId) b.attackerId = newId;
    if (b.defenderId === oldId) b.defenderId = newId;
    if (b.answersSubmitted && b.answersSubmitted[oldId] !== undefined) { b.answersSubmitted[newId] = b.answersSubmitted[oldId]; delete b.answersSubmitted[oldId]; }
    if (b.tie && b.tie.answers && b.tie.answers[oldId] !== undefined) { b.tie.answers[newId] = b.tie.answers[oldId]; delete b.tie.answers[oldId]; }
  }
  const dist = gs.distribution;
  if (dist) {
    if (dist.order) dist.order = dist.order.map(s => s === oldId ? newId : s);
    if (dist.reservations && dist.reservations[oldId] !== undefined) { dist.reservations[newId] = dist.reservations[oldId]; delete dist.reservations[oldId]; }
    if (dist.answers && dist.answers[oldId] !== undefined) { dist.answers[newId] = dist.answers[oldId]; delete dist.answers[oldId]; }
  }
}

function buildSyncPayload(room, mySocketId) {
  const gs = room.gameState;
  const payload = {
    code: room.code, mode: room.mode, phase: room.status,
    players: room.players, map: gs.map,
    turnIndex: gs.turnIndex, round: gs.round, maxRounds: gs.maxRounds,
    active: null
  };
  // Re-trimite promptul activ, dacă există
  if (room.status === 'distribution' && gs.distribution) {
    const dist = gs.distribution;
    if (dist.mode === 'reserve') {
      const sid = dist.order[dist.idx];
      payload.active = { kind: 'reserve', activeSocketId: sid,
        activeUsername: room.players.find(p => p.socketId === sid)?.username,
        reservableIds: sid === mySocketId ? freeAdjacentForPlayer(gs, sid).filter(id => !Object.values(dist.reservations).includes(id)) : [] };
    } else if (dist.mode === 'question' && dist.activeQuestion) {
      payload.active = { kind: 'dist-question',
        questionText: dist.activeQuestion.question, answers: dist.activeQuestion.answers,
        duration: MC_DURATION, timeRemaining: Math.max(0, MC_DURATION - (Date.now() - dist.activeQuestion.startTime)),
        isParticipant: mySocketId in dist.reservations,
        hasAnswered: dist.answers[mySocketId] !== undefined };
    } else if (dist.mode === 'tiebreak' && dist.question) {
      payload.active = { kind: 'dist-tiebreak', questionText: dist.questionText,
        duration: TIE_DURATION, timeRemaining: Math.max(0, TIE_DURATION - (Date.now() - dist.question.startTime)),
        isParticipant: dist.order.includes(mySocketId), hasAnswered: dist.answers[mySocketId] !== undefined };
    }
  } else if (room.status === 'battle' && gs.activeBattle) {
    const b = gs.activeBattle;
    if (b.mode === 'mc') {
      payload.active = { kind: 'battle-question', questionText: b.question, answers: b.answers,
        duration: MC_DURATION, timeRemaining: Math.max(0, MC_DURATION - (Date.now() - b.startTime)),
        targetId: b.targetId,
        attackerUsername: room.players.find(p => p.socketId === b.attackerId)?.username,
        defenderUsername: room.players.find(p => p.socketId === b.defenderId)?.username,
        isParticipant: mySocketId === b.attackerId || mySocketId === b.defenderId,
        hasAnswered: b.answersSubmitted[mySocketId] !== undefined };
    } else if (b.mode === 'tiebreak' && b.tie) {
      payload.active = { kind: 'battle-tiebreak', questionText: b.tie.questionText,
        duration: TIE_DURATION, timeRemaining: Math.max(0, TIE_DURATION - (Date.now() - b.tie.startTime)),
        targetId: b.targetId,
        isParticipant: mySocketId === b.attackerId || mySocketId === b.defenderId,
        hasAnswered: b.tie.answers[mySocketId] !== undefined };
    }
  } else if (room.status === 'battle') {
    const active = room.players[gs.turnIndex];
    payload.active = { kind: 'battle-turn', activeSocketId: active ? active.socketId : null,
      attackableIds: (active && active.socketId === mySocketId) ? enemyAdjacentForPlayer(gs, active.socketId) : [] };
  }
  return payload;
}

// ============================================================
// DISTRIBUȚIE — logică
// ============================================================
function startDistribution(room) {
  room.status = 'distribution';
  room.gameState.phase = 'distribution';
  io.to(room.code).emit('distribution-start', {
    code: room.code, players: room.players, map: room.gameState.map
  });
  setTimeout(() => startDistributionRound(room), 1200);
}

function startDistributionRound(room) {
  if (!rooms[room.code] || room.status !== 'distribution') return;
  const gs = room.gameState;
  const freeCount = gs.map.filter(t => t.owner === null).length;
  if (freeCount === 0) return startBattle(room);
  const expanders = room.players.filter(p => freeAdjacentForPlayer(gs, p.socketId).length > 0);
  if (expanders.length === 0) return startBattle(room);

  if (freeCount < expanders.length) {
    return startDistributionTiebreak(room, expanders);
  }

  gs.distribution = {
    mode: 'reserve', order: expanders.map(p => p.socketId), idx: 0,
    reservations: {}, activeQuestion: null, answers: {}, timerId: null
  };
  emitReserveTurn(room);
}

function emitReserveTurn(room) {
  const gs = room.gameState; const dist = gs.distribution;
  while (dist.idx < dist.order.length) {
    const sid = dist.order[dist.idx];
    const taken = Object.values(dist.reservations);
    const opts = freeAdjacentForPlayer(gs, sid).filter(id => !taken.includes(id));
    if (opts.length === 0) { dist.idx++; continue; }
    io.to(room.code).emit('distribution-reserve-turn', {
      activeSocketId: sid,
      activeUsername: room.players.find(p => p.socketId === sid)?.username,
      reservableIds: opts, reservations: dist.reservations,
      map: gs.map, players: room.players
    });
    return;
  }
  if (Object.keys(dist.reservations).length === 0) return startBattle(room);
  poseDistributionQuestion(room);
}

function poseDistributionQuestion(room) {
  const gs = room.gameState; const dist = gs.distribution;
  const q = randomMC();
  dist.mode = 'question';
  dist.activeQuestion = { question: q.question, answers: q.answers, correctIndex: q.correct, startTime: Date.now() };
  dist.answers = {};
  io.to(room.code).emit('distribution-question', {
    questionText: q.question, answers: q.answers, duration: MC_DURATION,
    reservations: dist.reservations, map: gs.map, players: room.players
  });
  dist.timerId = setTimeout(() => resolveDistribution(room), MC_DURATION);
}

function resolveDistribution(room) {
  const gs = room.gameState; const dist = gs.distribution;
  if (!dist || !dist.activeQuestion) return;
  const claims = [];
  Object.entries(dist.reservations).forEach(([sid, cid]) => {
    const ans = dist.answers[sid];
    const correct = !!(ans && ans.correct);
    if (correct) {
      const t = gs.map.find(x => x.id === cid);
      const pl = room.players.find(p => p.socketId === sid);
      if (t && pl) { t.owner = sid; t.color = pl.color; pl.territoriesCount++; }
    }
    claims.push({ socketId: sid, countyId: cid, correct });
  });
  const aq = dist.activeQuestion;
  io.to(room.code).emit('distribution-result', {
    claims, correctIndex: aq.correctIndex, map: gs.map, players: room.players
  });
  gs.distribution = null;
  setTimeout(() => startDistributionRound(room), STEP_DELAY);
}

function startDistributionTiebreak(room, expanders) {
  const gs = room.gameState;
  const q = randomTie();
  gs.distribution = {
    mode: 'tiebreak', order: expanders.map(p => p.socketId),
    questionText: q.question, question: { answer: q.answer, startTime: Date.now() },
    answers: {}, timerId: null
  };
  io.to(room.code).emit('distribution-tiebreak-question', {
    questionText: q.question, duration: TIE_DURATION,
    participants: gs.distribution.order, map: gs.map, players: room.players
  });
  gs.distribution.timerId = setTimeout(() => resolveDistributionTiebreak(room), TIE_DURATION);
}

function resolveDistributionTiebreak(room) {
  const gs = room.gameState; const dist = gs.distribution;
  if (!dist || dist.mode !== 'tiebreak') return;
  const ans = dist.question.answer;
  const ranked = dist.order.slice().sort((a, b) => {
    const A = dist.answers[a], B = dist.answers[b];
    if (!A && !B) return 0; if (!A) return 1; if (!B) return -1;
    const da = Math.abs(A.value - ans), db = Math.abs(B.value - ans);
    if (da !== db) return da - db; return A.time - B.time;
  });
  const claims = [];
  ranked.forEach(sid => {
    const opts = freeAdjacentForPlayer(gs, sid);
    if (opts.length > 0) {
      const cid = opts[0];
      const t = gs.map.find(x => x.id === cid);
      const pl = room.players.find(p => p.socketId === sid);
      if (t && pl) { t.owner = sid; t.color = pl.color; pl.territoriesCount++; claims.push({ socketId: sid, countyId: cid }); }
    }
  });
  io.to(room.code).emit('distribution-tiebreak-result', {
    correctAnswer: ans, claims, map: gs.map, players: room.players,
    ranking: ranked.map(sid => ({
      username: room.players.find(p => p.socketId === sid)?.username,
      value: dist.answers[sid] ? dist.answers[sid].value : null
    }))
  });
  gs.distribution = null;
  setTimeout(() => startDistributionRound(room), STEP_DELAY);
}

// ============================================================
// BĂTĂLIE — logică
// ============================================================
function startBattle(room) {
  if (!rooms[room.code]) return;
  room.status = 'battle';
  const gs = room.gameState;
  gs.phase = 'battle'; gs.round = 1; gs.turnIndex = 0; gs.maxRounds = BATTLE_ROUNDS; gs.activeBattle = null;
  io.to(room.code).emit('battle-start', {
    code: room.code, map: gs.map, players: room.players, turnIndex: 0, round: 1, maxRounds: BATTLE_ROUNDS
  });
  setTimeout(() => nextBattleTurn(room), 1500);
}

function advanceBattleIndex(room) {
  const gs = room.gameState;
  gs.turnIndex = (gs.turnIndex + 1) % room.players.length;
  if (gs.turnIndex === 0) {
    gs.round++;
    if (gs.round > gs.maxRounds) { endGame(room); return; }
  }
}

function nextBattleTurn(room) {
  if (!rooms[room.code] || room.status !== 'battle') return;
  const gs = room.gameState;
  let checked = 0;
  while (checked < room.players.length) {
    const active = room.players[gs.turnIndex];
    if (active && active.territoriesCount > 0 && enemyAdjacentForPlayer(gs, active.socketId).length > 0) {
      io.to(room.code).emit('battle-turn', {
        turnIndex: gs.turnIndex, round: gs.round, maxRounds: gs.maxRounds,
        activeSocketId: active.socketId, attackableIds: enemyAdjacentForPlayer(gs, active.socketId),
        map: gs.map, players: room.players
      });
      return;
    }
    advanceBattleIndex(room);
    if (room.status === 'finished') return;
    checked++;
  }
  endGame(room);
}

function resolveBattleMC(room) {
  const gs = room.gameState; const b = gs.activeBattle;
  if (!b || b.mode !== 'mc') return;
  const a = b.answersSubmitted[b.attackerId];
  const d = b.answersSubmitted[b.defenderId];
  const aCorrect = !!(a && a.correct);
  const dCorrect = !!(d && d.correct);
  if (aCorrect && dCorrect) { return startBattleTiebreak(room); }
  if (aCorrect && !dCorrect) { finishBattle(room, b.attackerId, true, b.correctIndex); }
  else { finishBattle(room, b.defenderId, false, b.correctIndex); }
}

function startBattleTiebreak(room) {
  const gs = room.gameState; const b = gs.activeBattle;
  const q = randomTie();
  b.mode = 'tiebreak';
  b.tie = { answer: q.answer, questionText: q.question, startTime: Date.now(), answers: {} };
  io.to(room.code).emit('battle-tiebreak-question', {
    questionText: q.question, duration: TIE_DURATION,
    participants: [b.attackerId, b.defenderId], targetId: b.targetId,
    attackerUsername: room.players.find(p => p.socketId === b.attackerId)?.username,
    defenderUsername: room.players.find(p => p.socketId === b.defenderId)?.username
  });
  b.timerId = setTimeout(() => resolveBattleTiebreak(room), TIE_DURATION);
}

function resolveBattleTiebreak(room) {
  const gs = room.gameState; const b = gs.activeBattle;
  if (!b || b.mode !== 'tiebreak') return;
  const ans = b.tie.answer;
  const A = b.tie.answers[b.attackerId], D = b.tie.answers[b.defenderId];
  let attackerWins;
  if (A && !D) attackerWins = true;
  else if (!A && D) attackerWins = false;
  else if (!A && !D) attackerWins = false;
  else {
    const da = Math.abs(A.value - ans), dd = Math.abs(D.value - ans);
    attackerWins = (da !== dd) ? (da < dd) : (A.time < D.time);
  }
  finishBattle(room, attackerWins ? b.attackerId : b.defenderId, attackerWins, null, {
    tie: true, correctAnswer: ans
  });
}

function finishBattle(room, winnerId, taken, correctIndex, extra) {
  const gs = room.gameState; const b = gs.activeBattle;
  if (!b) return;
  const target = gs.map.find(t => t.id === b.targetId);
  if (taken && winnerId === b.attackerId && target) {
    const oldOwner = target.owner;
    target.owner = b.attackerId;
    const wp = room.players.find(p => p.socketId === b.attackerId);
    if (wp) { target.color = wp.color; wp.territoriesCount++; }
    const op = room.players.find(p => p.socketId === oldOwner);
    if (op && op.territoriesCount > 0) op.territoriesCount--;
  }
  io.to(room.code).emit('battle-result', Object.assign({
    winnerId, taken, targetId: b.targetId,
    attackerId: b.attackerId, defenderId: b.defenderId,
    correctIndex: (correctIndex === undefined ? null : correctIndex),
    map: gs.map, players: room.players,
    winnerUsername: room.players.find(p => p.socketId === winnerId)?.username
  }, extra || {}));
  gs.activeBattle = null;
  setTimeout(() => {
    if (!rooms[room.code] || room.status !== 'battle') return;
    advanceBattleIndex(room);
    if (room.status === 'battle') nextBattleTurn(room);
  }, STEP_DELAY);
}

// ============================================================
// FINAL DE JOC
// ============================================================
function endGame(room) {
  if (room.status === 'finished') return;
  room.status = 'finished';
  const sorted = [...room.players].sort((a, b) => b.territoriesCount - a.territoriesCount);
  const winner = sorted[0];
  const ratingChanges = sorted.map((_, i) => i === 0 ? 50 : i === 1 ? -30 : -20);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    try {
      dbRun('UPDATE users SET rating = rating + ?, wins = wins + ?, losses = losses + ?, territories_conquered = territories_conquered + ? WHERE id = ?',
        [ratingChanges[i], i === 0 ? 1 : 0, i === 0 ? 0 : 1, p.territoriesCount, p.userId]);
    } catch (e) { console.error('Rating update error:', e); }
  }

  io.to(room.code).emit('game-over', {
    winnerUsername: winner ? winner.username : '—',
    ranking: sorted.map((p, i) => ({
      username: p.username, color: p.color, territoriesCount: p.territoriesCount,
      newRating: (p.rating || 1000) + ratingChanges[i], ratingChange: ratingChanges[i]
    })),
    disconnected: false
  });
  setTimeout(() => { delete rooms[room.code]; }, 30000);
}

function endGameDueToDisconnect(room) {
  if (room.status === 'finished') return;
  room.status = 'finished';
  const remaining = room.players.filter(p => !p.disconnected);
  const winner = remaining.length > 0 ? remaining[0] : (room.players[0] || null);
  if (winner) {
    try {
      dbRun('UPDATE users SET rating = rating + 50, wins = wins + 1, territories_conquered = territories_conquered + ? WHERE id = ?',
        [winner.territoriesCount, winner.userId]);
      winner.rating = (winner.rating || 1000) + 50;
    } catch (e) { console.error(e); }
  }
  io.to(room.code).emit('game-over', {
    winnerUsername: winner ? winner.username : '—',
    ranking: room.players.map(p => ({
      username: p.username, color: p.color, territoriesCount: p.territoriesCount,
      newRating: p.rating, ratingChange: (winner && p.userId === winner.userId) ? 50 : 0
    })),
    disconnected: true,
    message: 'Un jucător s-a deconectat. Jocul s-a încheiat.'
  });
  setTimeout(() => { delete rooms[room.code]; }, 30000);
}

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Serverul a prins o eroare dar continuă:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
