const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
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
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
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
  });
}

// Session configuration
const sessionMiddleware = session({
  secret: 'conquiztador-mate-super-secret-key-11',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none',
    secure: true
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

// Helper functions for DB queries (using Promises)
const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

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
  { id: 27, name: "Mehedinți",         abbr: "MJ", x: 298, y: 462 },
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

  // Start Game
  socket.on('start-game', () => {
    const roomCode = socket.currentRoom;
    const room = rooms[roomCode];
    if (!room) return;

    if (room.host !== socket.id) {
      return socket.emit('error-msg', 'Doar gazda poate porni jocul!');
    }

    const requiredPlayers = room.mode === '1v1' ? 2 : 3;
    if (room.players.length < requiredPlayers) {
      return socket.emit('error-msg', `Sunt necesari ${requiredPlayers} jucători pentru a începe!`);
    }

    room.status = 'playing';

    // Assign bases and colors — SM (northwest), GL (southeast), DJ (southwest)
    const baseTerritoryIds = [33, 18, 17];
    const playerColors = ['#00f0ff', '#ff007f', '#ffea00'];

    room.players.forEach((player, idx) => {
      player.color = playerColors[idx];
      player.baseTerritoryId = baseTerritoryIds[idx];
      player.territoriesCount = 1;
    });

    const mapState = territoriesList.map(t => {
      let owner = null;
      let color = '#4a5568';

      room.players.forEach(p => {
        if (p.baseTerritoryId === t.id) {
          owner = p.socketId;
          color = p.color;
        }
      });

      return {
        id: t.id,
        name: t.name,
        abbr: t.abbr,
        x: t.x,
        y: t.y,
        owner: owner,
        color: color
      };
    });

    room.gameState = {
      map: mapState,
      turnIndex: 0,
      round: 1,
      maxRounds: 20,
      activeAttack: null
    };

    io.to(room.code).emit('game-started', {
      code: room.code,
      players: room.players,
      map: room.gameState.map,
      turnIndex: room.gameState.turnIndex,
      round: room.gameState.round,
      maxRounds: room.gameState.maxRounds
    });
  });

  // Rejoin Game logic for page switching
  socket.on('rejoin-game', () => {
    if (!loggedUserId) {
      return socket.emit('rejoin-failed');
    }

    let foundRoom = null;
    for (const code in rooms) {
      const room = rooms[code];
      if (room.players.some(p => p.userId === loggedUserId)) {
        foundRoom = room;
        break;
      }
    }

    if (!foundRoom || foundRoom.status !== 'playing') {
      return socket.emit('rejoin-failed');
    }

    // Update socketId
    const player = foundRoom.players.find(p => p.userId === loggedUserId);
    const oldSocketId = player.socketId;

    // Cancel reconnect timer - player is back
    if (player.reconnectTimer) {
      clearTimeout(player.reconnectTimer);
      player.reconnectTimer = null;
    }
    player.disconnected = false;

    player.socketId = socket.id;

    // Update active attack
    const gameState = foundRoom.gameState;
    if (gameState && gameState.activeAttack) {
      const attack = gameState.activeAttack;
      if (attack.attackerId === oldSocketId) {
        attack.attackerId = socket.id;
      }
      if (attack.answersSubmitted[oldSocketId] !== undefined) {
        attack.answersSubmitted[socket.id] = attack.answersSubmitted[oldSocketId];
        delete attack.answersSubmitted[oldSocketId];
      }
    }

    // Update map owners matching old socket ID
    if (gameState && gameState.map) {
      gameState.map.forEach(t => {
        if (t.owner === oldSocketId) {
          t.owner = socket.id;
        }
      });
    }

    // Update room host if it was the old socket ID
    if (foundRoom.host === oldSocketId) {
      foundRoom.host = socket.id;
    }

    socket.currentRoom = foundRoom.code;
    socket.join(foundRoom.code);

    // Send full state sync
    socket.emit('game-state-sync', {
      code: foundRoom.code,
      mode: foundRoom.mode,
      players: foundRoom.players,
      map: gameState.map,
      turnIndex: gameState.turnIndex,
      round: gameState.round,
      maxRounds: gameState.maxRounds,
      activeAttack: gameState.activeAttack ? {
        attackerUsername: foundRoom.players.find(p => p.socketId === gameState.activeAttack.attackerId).username,
        questionText: gameState.activeAttack.question,
        answers: gameState.activeAttack.answers,
        duration: gameState.activeAttack.duration,
        targetId: gameState.activeAttack.targetId,
        timeRemaining: Math.max(0, gameState.activeAttack.duration - (Date.now() - gameState.activeAttack.startTime)),
        hasAnswered: gameState.activeAttack.answersSubmitted[socket.id] !== undefined
      } : null
    });
  });

  // Handle attack territory
  socket.on('attack-territory', ({ targetId }) => {
    const roomCode = socket.currentRoom;
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    const gameState = room.gameState;
    const activePlayer = room.players[gameState.turnIndex];

    if (activePlayer.socketId !== socket.id) {
      return socket.emit('error-msg', 'Nu este rândul tău!');
    }

    const attackerOwnedIds = gameState.map
      .filter(t => t.owner === socket.id)
      .map(t => t.id);

    const neighbors = adjacencyList[targetId] || [];
    const isAdjacent = neighbors.some(nId => attackerOwnedIds.includes(nId));

    if (!isAdjacent) {
      return socket.emit('error-msg', 'Poți ataca doar teritorii vecine teritoriilor tale!');
    }

    const targetTerritory = gameState.map.find(t => t.id === targetId);
    if (targetTerritory.owner === socket.id) {
      return socket.emit('error-msg', 'Nu îți poți ataca propriul teritoriu!');
    }

    const difficulties = ['easy', 'medium', 'hard'];
    const selectedDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    const pool = questions[selectedDifficulty];

    if (!pool || pool.length === 0) {
      return socket.emit('error-msg', 'Întrebările nu s-au putut încărca pe server!');
    }

    const question = pool[Math.floor(Math.random() * pool.length)];

    gameState.activeAttack = {
      attackerId: socket.id,
      targetId: targetId,
      question: question.question,
      answers: question.answers,
      correctIndex: question.correct,
      answersSubmitted: {},
      duration: 20000,
      startTime: Date.now()
    };

    io.to(room.code).emit('question-broadcast', {
      questionText: question.question,
      answers: question.answers,
      duration: gameState.activeAttack.duration,
      targetId: targetId,
      attackerUsername: activePlayer.username
    });

    gameState.activeAttack.timerId = setTimeout(() => {
      handleQuestionTimeout(room.code);
    }, gameState.activeAttack.duration);
  });

  // Submit Answer
  socket.on('submit-answer', ({ answerIndex }) => {
    const roomCode = socket.currentRoom;
    const room = rooms[roomCode];
    if (!room || room.status !== 'playing') return;

    const gameState = room.gameState;
    const attack = gameState.activeAttack;

    if (!attack) return;

    if (attack.answersSubmitted[socket.id] !== undefined) {
      return socket.emit('error-msg', 'Ai răspuns deja!');
    }

    const isCorrect = answerIndex === attack.correctIndex;
    const timeTaken = Date.now() - attack.startTime;

    attack.answersSubmitted[socket.id] = {
      answerIndex,
      isCorrect,
      timeTaken
    };

    socket.emit('answer-registered', { isCorrect });

    if (isCorrect) {
      clearTimeout(attack.timerId);
      concludeAttack(room, socket.id);
    } else {
      const allAnswered = room.players.every(p => attack.answersSubmitted[p.socketId] !== undefined);
      if (allAnswered) {
        clearTimeout(attack.timerId);
        concludeAttack(room, null);
      }
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const roomCode = socket.currentRoom;
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];

      if (room.status === 'lobby') {
        room.players = room.players.filter(p => p.socketId !== socket.id);
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
      } else if (room.status === 'playing') {
        // Give player 10 seconds to reconnect (page navigation to game.html)
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.disconnected = true;
          player.reconnectTimer = setTimeout(() => {
            if (player.disconnected && rooms[roomCode]) {
              room.players = room.players.filter(p => p.socketId !== player.socketId);
              io.to(room.code).emit('player-disconnected', { username: player.username });
              const stillConnected = room.players.filter(p => !p.disconnected);
              if (stillConnected.length <= 1) {
                endGameDueToDisconnect(room);
              }
            }
          }, 10000);
        }
      }
    }
  });
});

// Helper for joining room
function joinRoomHelper(socket, roomCode) {
  const room = rooms[roomCode];
  const tokenAuth = socket._socketAuthUser;
  const sessionUser = socket.request.session;
  const authUserId = (tokenAuth && tokenAuth.userId) || (sessionUser && sessionUser.userId);
  const authUsername = (tokenAuth && tokenAuth.username) || (sessionUser && sessionUser.username);

  const playerObj = {
    socketId: socket.id,
    userId: authUserId,
    username: authUsername,
    rating: 1000,
    color: '#4a5568',
    territoriesCount: 0
  };

  db.get('SELECT rating FROM users WHERE id = ?', [authUserId], (err, row) => {
    if (!err && row) {
      playerObj.rating = row.rating;
    }
    
    room.players.push(playerObj);
    socket.join(roomCode);
    socket.currentRoom = roomCode;
    
    io.to(roomCode).emit('lobby-update', {
      players: room.players,
      host: room.host,
      mode: room.mode,
      roomCode: roomCode
    });
  });
}

// ============================================================
// GAME LOGIC HELPERS
// ============================================================

// Called when a player answers correctly or all answered wrong
function concludeAttack(room, winnerId) {
  const gameState = room.gameState;
  const attack = gameState.activeAttack;
  if (!attack) return;

  const targetTerritory = gameState.map.find(t => t.id === attack.targetId);
  let winnerUsername = null;

  if (winnerId) {
    // Give the territory to the winner
    const oldOwner = targetTerritory.owner;
    targetTerritory.owner = winnerId;
    const winnerPlayer = room.players.find(p => p.socketId === winnerId);
    if (winnerPlayer) {
      targetTerritory.color = winnerPlayer.color;
      winnerPlayer.territoriesCount += 1;
      winnerUsername = winnerPlayer.username;
    }
    // Reduce old owner's count
    if (oldOwner) {
      const oldOwnerPlayer = room.players.find(p => p.socketId === oldOwner);
      if (oldOwnerPlayer && oldOwnerPlayer.territoriesCount > 0) {
        oldOwnerPlayer.territoriesCount -= 1;
      }
    }
  }

  io.to(room.code).emit('answer-result', {
    winnerId,
    winnerUsername,
    correctIndex: attack.correctIndex,
    targetId: attack.targetId,
    newOwnerColor: targetTerritory.color,
    players: room.players
  });

  gameState.activeAttack = null;

  // Advance turn
  setTimeout(() => {
    advanceTurn(room);
  }, 3500);
}

// Called when timer runs out with no correct answer
function handleQuestionTimeout(roomCode) {
  const room = rooms[roomCode];
  if (!room || !room.gameState || !room.gameState.activeAttack) return;
  concludeAttack(room, null);
}

// Advance to next turn (or end game)
function advanceTurn(room) {
  const gameState = room.gameState;
  if (!gameState) return;

  // Advance turn index (skip players with 0 territories only if they never had any at start — everyone starts with 1)
  gameState.turnIndex = (gameState.turnIndex + 1) % room.players.length;

  // If we've gone through all players, increment round
  if (gameState.turnIndex === 0) {
    gameState.round += 1;
  }

  // Check if game over (max rounds reached)
  if (gameState.round > gameState.maxRounds) {
    endGame(room);
    return;
  }

  // Check if only one player has territories (others have 0)
  const activePlayers = room.players.filter(p => p.territoriesCount > 0);
  if (activePlayers.length === 1) {
    endGame(room);
    return;
  }

  io.to(room.code).emit('new-turn', {
    turnIndex: gameState.turnIndex,
    round: gameState.round
  });
}

// End game and calculate ratings
async function endGame(room) {
  room.status = 'finished';

  // Sort by territories (desc)
  const sorted = [...room.players].sort((a, b) => b.territoriesCount - a.territoriesCount);
  const winner = sorted[0];

  const ratingChanges = sorted.map((p, idx) => {
    if (idx === 0) return 50;
    if (idx === 1) return -30;
    return -20;
  });

  // Update DB ratings
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const change = ratingChanges[i];
    const isWinner = i === 0;
    try {
      await dbRun(
        `UPDATE users SET rating = rating + ?, wins = wins + ?, losses = losses + ?, territories_conquered = territories_conquered + ? WHERE id = ?`,
        [change, isWinner ? 1 : 0, isWinner ? 0 : 1, p.territoriesCount, p.userId]
      );
    } catch (e) {
      console.error('Rating update error:', e);
    }
  }

  const ranking = sorted.map((p, idx) => ({
    username: p.username,
    color: p.color,
    territoriesCount: p.territoriesCount,
    newRating: p.rating + ratingChanges[idx],
    ratingChange: ratingChanges[idx]
  }));

  io.to(room.code).emit('game-over', {
    winnerUsername: winner.username,
    ranking,
    disconnected: false
  });

  // Clean up room after 30s
  setTimeout(() => {
    delete rooms[room.code];
  }, 30000);
}

// End game due to disconnect
function endGameDueToDisconnect(room) {
  room.status = 'finished';

  // Whoever is left wins by default
  const remaining = room.players;
  const winner = remaining.length > 0 ? remaining[0] : null;

  const ranking = remaining.map((p, idx) => ({
    username: p.username,
    color: p.color,
    territoriesCount: p.territoriesCount,
    newRating: p.rating,
    ratingChange: 0
  }));

  io.to(room.code).emit('game-over', {
    winnerUsername: winner ? winner.username : '—',
    ranking,
    disconnected: true,
    message: 'Un jucător s-a deconectat. Jocul s-a încheiat.'
  });

  setTimeout(() => {
    delete rooms[room.code];
  }, 30000);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
