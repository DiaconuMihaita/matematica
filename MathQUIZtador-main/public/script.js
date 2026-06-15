// Detect if running locally or on hosted production backend (e.g. Render)
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '' // Local development (relative paths)
  : 'https://mathquiz-backend-uakf.onrender.com'; // Replace with deployed Render backend URL

// Poligoane SVG pentru fiecare județ (viewBox 0 0 920 580)
const countyPolygons = {
  1:  "370,232 402,222 430,240 450,265 448,306 428,328 400,335 370,328 346,314 336,294 346,265",
  2:  "65,193 145,186 165,196 175,220 172,270 150,293 126,306 93,300 68,283 53,260 58,226",
  3:  "430,344 496,334 526,348 540,375 536,418 516,444 490,455 460,455 430,442 410,419 406,385",
  4:  "566,164 665,154 688,174 692,215 680,250 655,270 630,280 603,280 576,266 556,246 550,215 553,182",
  5:  "145,93 288,88 308,112 305,162 282,190 250,202 215,200 175,196 148,180 138,154 136,120",
  6:  "385,84 475,80 494,106 490,155 468,175 440,180 410,172 383,155 356,130 352,106",
  7:  "692,12 768,12 786,56 770,110 745,126 716,128 690,118 668,142 694,106 710,56",
  8:  "696,348 760,335 783,352 786,388 778,419 758,435 733,440 706,429 693,408 690,378",
  9:  "460,312 540,302 570,318 590,344 586,375 570,394 543,404 516,405 490,392 466,372 453,345",
  10: "580,305 655,296 686,312 706,338 702,378 685,398 658,411 630,408 603,394 585,372 576,345",
  11: "603,468 660,460 696,466 728,480 730,510 712,536 686,545 655,542 623,530 606,507 598,482",
  12: "65,335 148,328 178,340 196,362 192,406 175,430 150,442 112,442 80,430 60,406 56,373",
  13: "260,110 402,104 425,126 425,186 405,215 378,229 348,236 318,225 290,212 268,196 250,166 258,136",
  14: "750,436 800,446 830,452 860,443 890,421 906,400 913,456 908,515 890,555 866,576 836,580 804,576 773,566 750,546 740,516",
  15: "532,266 596,258 624,278 630,312 618,340 598,354 575,360 552,353 530,338 522,312",
  16: "463,372 536,360 562,375 566,408 553,434 528,448 503,452 476,442 456,428 448,406",
  17: "233,458 323,452 355,462 373,488 366,526 343,550 306,556 266,550 230,530 216,508 220,480",
  18: "716,318 790,308 820,325 836,358 830,390 808,404 778,408 750,398 724,382 712,355",
  19: "480,460 520,450 546,458 558,480 555,514 535,535 510,546 480,543 450,528 446,506 453,478",
  20: "253,366 336,358 362,370 375,394 370,425 350,445 323,455 293,455 263,445 242,424 240,398",
  21: "490,158 560,150 576,176 580,210 570,248 556,280 540,306 523,326 508,332 490,322 476,302 473,265 482,230 486,196",
  22: "222,260 336,252 366,268 380,298 378,334 360,354 336,362 306,358 276,344 246,324 226,305 216,282",
  23: "600,414 660,408 695,418 725,435 730,462 715,489 696,508 666,512 636,506 610,489 598,466",
  24: "668,142 770,124 788,146 784,190 764,212 736,222 708,225 682,215 662,196 665,176",
  25: "543,435 576,425 610,428 622,448 619,468 608,485 586,488 560,488 540,476 533,456",
  26: "305,15 472,12 490,44 476,70 458,88 420,98 385,96 338,93 322,78 322,44",
  27: "166,442 250,432 270,448 276,475 263,502 240,518 213,526 183,520 163,505 156,478",
  28: "376,172 458,160 494,176 512,200 510,235 490,260 466,272 440,275 413,266 386,246 370,222 368,196",
  29: "552,130 645,120 668,142 665,176 645,196 620,208 593,208 566,196 546,174 540,148",
  30: "380,445 418,438 453,446 466,468 463,504 446,528 420,540 390,540 360,526 350,505 356,472",
  31: "500,345 562,335 590,348 600,374 596,408 576,428 550,440 523,442 500,428 480,408 470,382",
  32: "250,88 385,84 402,110 398,146 376,166 346,172 315,170 283,156 260,136 246,112",
  33: "192,15 305,15 322,44 310,78 288,92 252,90 210,86 192,60 190,35",
  34: "320,302 400,294 432,308 448,334 446,365 426,382 400,388 370,386 344,372 320,355 306,332",
  35: "472,12 692,12 710,56 694,106 668,142 642,158 605,164 566,148 533,120 502,90 488,62 476,35",
  36: "393,458 453,449 490,458 522,468 526,502 510,530 483,546 450,550 416,540 393,520 383,497",
  37: "20,268 145,260 172,272 190,296 186,340 166,362 140,375 98,375 60,360 28,336 20,300",
  38: "783,305 866,284 900,304 913,346 906,400 890,443 860,465 830,475 800,468 773,446 758,416 760,378 773,346",
  39: "336,360 402,350 432,362 446,385 443,418 426,442 400,452 370,452 340,440 313,426 306,400 313,370",
  40: "716,196 793,185 816,206 820,243 806,272 780,288 753,292 726,280 710,260 708,230",
  41: "605,282 682,272 710,292 726,318 722,355 706,375 680,382 655,385 630,372 613,352 603,325",
  42: "546,452 590,442 620,448 626,468 620,489 600,500 570,502 546,490 536,470"
};

function getPolygonCentroid(points) {
  const coords = points.trim().split(/\s+/).map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
  const n = coords.length;
  return {
    x: Math.round(coords.reduce((s, p) => s + p.x, 0) / n),
    y: Math.round(coords.reduce((s, p) => s + p.y, 0) / n)
  };
}

// Connect to Socket.io (use stored token if available for cross-domain auth)
const _storedToken = localStorage.getItem('socketToken');
const socket = io(BACKEND_URL, {
  withCredentials: true,
  auth: _storedToken ? { token: _storedToken } : {}
});

// Harta României - Județe (trebuie să fie identică cu server.js)
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

const rawConnections = [
  [1,3],[1,9],[1,13],[1,22],[1,28],[1,34],[1,39],
  [2,5],[2,12],[2,22],[2,37],
  [3,9],[3,16],[3,19],[3,30],[3,36],[3,39],
  [4,21],[4,29],[4,40],[4,41],
  [5,13],[5,32],[5,33],
  [6,13],[6,21],[6,26],[6,28],[6,35],
  [7,24],[7,35],
  [8,10],[8,18],[8,23],[8,38],[8,41],
  [9,15],[9,21],[9,28],[9,31],[9,34],[9,41],
  [10,23],[10,31],[10,41],
  [11,19],[11,23],
  [12,22],[12,27],[12,37],
  [13,26],[13,28],[13,32],
  [14,38],
  [15,21],[15,41],
  [16,25],[16,31],
  [17,20],[17,27],[17,30],
  [18,38],[18,40],[18,41],
  [19,25],[19,36],
  [20,22],[20,27],[20,39],
  [21,28],
  [22,34],
  [23,25],
  [24,29],[24,35],[24,40],
  [25,31],[25,42],
  [26,32],[26,33],[26,35],
  [29,35],
  [30,36],[30,39],
  [31,41],
  [32,33],
  [34,39],
  [40,41]
];

// Rebuild full client-side adjacency list
const adjacencyList = {};
territoriesList.forEach(t => {
  adjacencyList[t.id] = [];
});
rawConnections.forEach(([n1, n2]) => {
  if (!adjacencyList[n1].includes(n2)) adjacencyList[n1].push(n2);
  if (!adjacencyList[n2].includes(n1)) adjacencyList[n2].push(n1);
});

// App State (shared variables)
let currentUser = null;
let currentLobby = null;
let activeGameState = null;
let questionTimerInterval = null;

// Determine current page view mode
const isIndexPage = document.getElementById('auth-section') !== null;
const isGamePage = document.getElementById('svg-map-wrapper') !== null;

// -------------------------------------------------------------
// INDEX.HTML (LOBBY & AUTH) LOGIC
// -------------------------------------------------------------
if (isIndexPage) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const authError = document.getElementById('auth-error');
  
  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const lobbySection = document.getElementById('lobby-section');
  
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplayName = document.getElementById('user-display-name');
  const userRating = document.getElementById('user-rating');
  const userWins = document.getElementById('user-wins');
  const userLosses = document.getElementById('user-losses');
  const userTerritories = document.getElementById('user-territories');
  
  const create1v1Btn = document.getElementById('create-1v1-btn');
  const create1v1v1Btn = document.getElementById('create-1v1v1-btn');
  const joinRoomCodeInput = document.getElementById('join-room-code');
  const joinRoomBtn = document.getElementById('join-room-btn');
  
  const lobbyModeVal = document.getElementById('lobby-mode-val');
  const lobbyCodeVal = document.getElementById('lobby-code-val');
  const lobbyPlayersCount = document.getElementById('lobby-players-count');
  const lobbyPlayersMax = document.getElementById('lobby-players-max');
  const lobbyPlayersList = document.getElementById('lobby-players-list');
  const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
  const startGameBtn = document.getElementById('start-game-btn');
  const leaderboardBody = document.getElementById('leaderboard-body');

  // Tab Switching
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginTab.classList.remove('hidden');
    registerTab.classList.add('hidden');
    authError.classList.add('hidden');
  });

  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerTab.classList.remove('hidden');
    loginTab.classList.add('hidden');
    authError.classList.add('hidden');
  });

  // Handle Authentication Forms
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.error) {
        authError.textContent = data.error;
        authError.classList.remove('hidden');
      } else {
        currentUser = data.user;
        // Store token and reconnect socket with auth
        if (data.socketToken) {
          localStorage.setItem('socketToken', data.socketToken);
          socket.auth = { token: data.socketToken };
          socket.disconnect().connect();
        }
        showDashboard();
      }
    } catch (err) {
      console.error(err);
      authError.textContent = 'Eroare de conexiune la server!';
      authError.classList.remove('hidden');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (password.length < 6) {
      authError.textContent = 'Parola trebuie să aibă minim 6 caractere!';
      authError.classList.remove('hidden');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (data.error) {
        authError.textContent = data.error;
        authError.classList.remove('hidden');
      } else {
        // Automatically fill login and switch to it
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        tabLoginBtn.click();
        authError.textContent = 'Cont creat! Vă puteți autentifica.';
        authError.classList.remove('hidden');
        authError.style.borderColor = 'var(--neon-green)';
        authError.style.color = 'var(--neon-green)';
      }
    } catch (err) {
      console.error(err);
      authError.textContent = 'Eroare de conexiune la server!';
      authError.classList.remove('hidden');
    }
  });

  // Logout Action
  logoutBtn.addEventListener('click', async () => {
    const socketToken = localStorage.getItem('socketToken');
    await fetch(`${BACKEND_URL}/api/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socketToken })
    });
    localStorage.removeItem('socketToken');
    socket.auth = { token: null };
    currentUser = null;
    showAuth();
  });

  // Lobby actions
  create1v1Btn.addEventListener('click', () => {
    socket.emit('create-room', { mode: '1v1' });
  });

  create1v1v1Btn.addEventListener('click', () => {
    socket.emit('create-room', { mode: '1v1v1' });
  });

  joinRoomBtn.addEventListener('click', () => {
    const code = joinRoomCodeInput.value.trim().toUpperCase();
    if (code.length !== 6) {
      alert('Codul camerei trebuie să aibă exact 6 caractere!');
      return;
    }
    socket.emit('join-room', { code });
  });

  leaveLobbyBtn.addEventListener('click', () => {
    socket.emit('leave-lobby');
  });

  startGameBtn.addEventListener('click', () => {
    socket.emit('start-game');
  });

  // View transitions
  function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    lobbySection.classList.add('hidden');
  }

  async function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    lobbySection.classList.add('hidden');
    
    // Refresh user profile details
    try {
      const profileRes = await fetch(`${BACKEND_URL}/api/profile`, { credentials: 'include' });
      if (profileRes.ok) {
        currentUser = await profileRes.json();
      }
    } catch(e) {}

    userDisplayName.textContent = currentUser.username;
    userRating.textContent = currentUser.rating;
    userWins.textContent = currentUser.wins;
    userLosses.textContent = currentUser.losses;
    userTerritories.textContent = currentUser.territories_conquered;
    
    // Connect socket to lobby
    loadLeaderboard();
  }

  async function loadLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Se încarcă clasamentul...</td></tr>';
    try {
      const res = await fetch(`${BACKEND_URL}/api/leaderboard`, { credentials: 'include' });
      const leaderboard = await res.json();
      leaderboardBody.innerHTML = '';
      
      if (leaderboard.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nu există utilizatori în clasament!</td></tr>';
        return;
      }

      leaderboard.forEach((user, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td><strong>${user.username}</strong></td>
          <td>${user.rating}</td>
          <td>${user.wins}</td>
          <td>${user.territories_conquered}</td>
        `;
        leaderboardBody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
      leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ff1744;">Eroare la încărcare!</td></tr>';
    }
  }

  // Socket status listeners
  socket.on('auth-status', ({ loggedIn, user }) => {
    if (loggedIn) {
      currentUser = user;
      showDashboard();
    } else if (!currentUser) {
      // Only redirect to login if user didn't just log in via HTTP
      showAuth();
    }
  });

  socket.on('lobby-update', ({ players, host, mode, roomCode }) => {
    currentLobby = { players, host, mode, roomCode };
    
    dashboardSection.classList.add('hidden');
    lobbySection.classList.remove('hidden');

    lobbyModeVal.textContent = mode;
    lobbyCodeVal.textContent = roomCode;
    
    const maxPlayers = mode === '1v1' ? 2 : 3;
    lobbyPlayersCount.textContent = players.length;
    lobbyPlayersMax.textContent = maxPlayers;

    lobbyPlayersList.innerHTML = '';
    players.forEach(p => {
      const isHost = p.socketId === host;
      const playerCard = document.createElement('div');
      playerCard.className = `lobby-player-card card ${isHost ? 'is-host' : ''}`;
      playerCard.innerHTML = `
        <div class="player-card-avatar">👨‍🎓</div>
        <div class="player-card-username">${p.username}</div>
        <div class="player-card-rating">Rating: ${p.rating}</div>
      `;
      lobbyPlayersList.appendChild(playerCard);
    });

    // Handle Start Game eligibility
    const isUserHost = socket.id === host;
    if (isUserHost) {
      startGameBtn.classList.remove('hidden');
      if (players.length === maxPlayers) {
        startGameBtn.disabled = false;
        startGameBtn.textContent = 'Pornește Jocul';
      } else {
        startGameBtn.disabled = true;
        startGameBtn.textContent = `Așteptare jucători (${players.length}/${maxPlayers})...`;
      }
    } else {
      startGameBtn.classList.add('hidden');
    }
  });

  socket.on('left-lobby', () => {
    currentLobby = null;
    showDashboard();
  });

  socket.on('error-msg', (msg) => {
    alert(msg);
  });

  socket.on('game-started', () => {
    // Redirect all players in this room to the game page!
    window.location.href = 'game.html';
  });

  // Check auth on load
  socket.emit('join-lobby');
}

// -------------------------------------------------------------
// GAME.HTML (GAME ENGINE & MAP) LOGIC
// -------------------------------------------------------------
if (isGamePage) {
  const currentRoundEl = document.getElementById('current-round');
  const turnBannerEl = document.getElementById('turn-banner');
  const gameRoomCodeEl = document.getElementById('game-room-code');
  const playersScoreboardEl = document.getElementById('players-scoreboard');
  const svgMapWrapper = document.getElementById('svg-map-wrapper');
  
  // Question duel elements
  const questionOverlay = document.getElementById('question-overlay');
  const attackerAnnouncement = document.getElementById('attacker-announcement');
  const questionTextVal = document.getElementById('question-text-val');
  const questionAnswersGrid = document.getElementById('question-answers-grid');
  const questionCountdown = document.getElementById('question-countdown');
  const timerProgressCircle = document.getElementById('timer-progress-circle');
  const timerProgressLine = document.getElementById('timer-progress-line');
  
  // Result elements
  const resultPopup = document.getElementById('result-popup');
  const resultStatusTitle = document.getElementById('result-status-title');
  const resultDetails = document.getElementById('result-details');
  
  // GameOver elements
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const gameWinnerName = document.getElementById('game-winner-name');
  const gameoverRankingBody = document.getElementById('gameover-ranking-body');
  const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

  // Trigger game rejoin on load (since page reloaded)
  socket.emit('rejoin-game');

  // Handle rejoin failure (e.g. session expired or no active game)
  socket.on('rejoin-failed', () => {
    window.location.href = 'index.html';
  });

  // State sync after page load
  socket.on('game-state-sync', (state) => {
    activeGameState = state;
    gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = `${state.round}/${state.maxRounds}`;
    
    renderScoreboard();
    renderSvgMap();
    updateTurnBanner();

    // Check if there was an active attack in progress when we loaded
    if (state.activeAttack) {
      showQuestionDuel(state.activeAttack);
    }
  });

  // Normal socket game events
  socket.on('game-started', (state) => {
    activeGameState = state;
    if (state.code) gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = `${state.round}/${state.maxRounds}`;
    renderScoreboard();
    renderSvgMap();
    updateTurnBanner();
  });

  socket.on('new-turn', ({ turnIndex, round }) => {
    if (!activeGameState) return;
    
    // Hide any previous question overlay
    questionOverlay.classList.add('hidden');
    clearInterval(questionTimerInterval);

    activeGameState.turnIndex = turnIndex;
    activeGameState.round = round;

    currentRoundEl.textContent = `${round}/${activeGameState.maxRounds}`;
    
    renderScoreboard();
    updateTurnBanner();
    highlightAttackableTerritories();
  });

  socket.on('question-broadcast', (attackInfo) => {
    showQuestionDuel(attackInfo);
  });

  socket.on('answer-registered', ({ isCorrect }) => {
    // Disable answers buttons to prevent multiple clicks
    const btns = questionAnswersGrid.querySelectorAll('.answer-btn');
    btns.forEach(btn => btn.disabled = true);
  });

  socket.on('answer-result', ({ winnerId, winnerUsername, correctIndex, targetId, newOwnerColor, players }) => {
    clearInterval(questionTimerInterval);
    
    if (activeGameState) {
      activeGameState.players = players;
      
      // Update local map owner
      const territory = activeGameState.map.find(t => t.id === targetId);
      if (territory) {
        territory.owner = winnerId;
        territory.color = newColorHex(winnerId, players);
      }
    }

    // Highlight correct answer button in green and wrong in red
    const btns = questionAnswersGrid.querySelectorAll('.answer-btn');
    btns.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIndex) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected')) {
        btn.classList.add('incorrect');
      }
    });

    // Show brief banner overlay
    setTimeout(() => {
      questionOverlay.classList.add('hidden');
      
      resultPopup.classList.remove('hidden');
      if (winnerId) {
        const winnerPlayer = players.find(p => p.socketId === winnerId);
        resultStatusTitle.textContent = "TERITORIU CUCERIT!";
        resultDetails.innerHTML = `Jucătorul <span style="color:${winnerPlayer.color}; font-weight:bold;">${winnerUsername}</span> a răspuns primul corect și a ocupat <strong>${territory ? territory.name : 'teritoriul'}</strong>!`;
      } else {
        resultStatusTitle.textContent = "CONTRACRONOMETRU EXPIRAT";
        resultDetails.innerHTML = `Niciun jucător nu a oferit un răspuns corect. Teritoriul rămâne neatins!`;
      }

      // Hide results banner after 3.5 seconds
      setTimeout(() => {
        resultPopup.classList.add('hidden');
        renderScoreboard();
        renderSvgMap();
      }, 3500);

    }, 1200); // Wait 1.2s before hiding question and showing results banner
  });

  socket.on('game-over', ({ ranking, winnerUsername, disconnected, message }) => {
    clearInterval(questionTimerInterval);
    questionOverlay.classList.add('hidden');
    resultPopup.classList.add('hidden');
    
    gameoverOverlay.classList.remove('hidden');
    
    if (disconnected) {
      gameWinnerName.textContent = "Niciunul (Jucător Deconectat)";
      alert(message || 'Jocul s-a încheiat brusc.');
    } else {
      gameWinnerName.textContent = winnerUsername;
    }

    gameoverRankingBody.innerHTML = '';
    ranking.forEach((player, idx) => {
      const tr = document.createElement('tr');
      
      let badgeColorClass = 'neutral';
      let ratingSign = '';
      if (player.ratingChange > 0) {
        badgeColorClass = 'positive';
        ratingSign = `+${player.ratingChange}`;
      } else if (player.ratingChange < 0) {
        badgeColorClass = 'negative';
        ratingSign = player.ratingChange;
      } else {
        ratingSign = '0';
      }

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><span style="color:${player.color}; font-weight:bold;">${player.username}</span></td>
        <td><strong>${player.territoriesCount}</strong></td>
        <td>${player.newRating}</td>
        <td><span class="rating-change-val ${badgeColorClass}">${ratingSign}</span></td>
      `;
      gameoverRankingBody.appendChild(tr);
    });
  });

  socket.on('player-disconnected', ({ username }) => {
    alert(`Jucătorul ${username} s-a deconectat!`);
  });

  socket.on('error-msg', (msg) => {
    alert(msg);
  });

  // Exit Game
  backToLobbyBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Render player list scoreboard on sidebar
  function renderScoreboard() {
    if (!activeGameState) return;
    playersScoreboardEl.innerHTML = '';
    
    const activePlayer = activeGameState.players[activeGameState.turnIndex];
    
    activeGameState.players.forEach(p => {
      const isMyTurn = p.socketId === activePlayer.socketId;
      const isMe = p.socketId === socket.id;

      const card = document.createElement('div');
      card.className = `scoreboard-player-card ${isMyTurn ? 'active-turn' : ''}`;
      // Set border color dynamically for active turn
      if (isMyTurn) {
        card.style.color = p.color;
      }

      card.innerHTML = `
        <div class="player-meta">
          <div class="player-color-dot" style="color: ${p.color}; background-color: ${p.color};"></div>
          <div>
            <div class="player-name">${p.username} ${isMe ? '(Tu)' : ''}</div>
            <div class="player-rating-lbl">Rating: ${p.rating}</div>
          </div>
        </div>
        <div class="player-score">
          <span class="count">${p.territoriesCount}</span>
          <span class="label">Județe</span>
        </div>
      `;
      playersScoreboardEl.appendChild(card);
    });
  }

  // Update Turn Banner Info
  function updateTurnBanner() {
    if (!activeGameState) return;
    const activePlayer = activeGameState.players[activeGameState.turnIndex];
    const isMe = activePlayer.socketId === socket.id;
    
    turnBannerEl.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
    turnBannerEl.style.border = `1px solid ${activePlayer.color}`;
    turnBannerEl.style.color = activePlayer.color;

    if (isMe) {
      turnBannerEl.textContent = "ESTE RÂNDUL TĂU • Alege un teritoriu vecin!";
    } else {
      turnBannerEl.textContent = `Rândul lui ${activePlayer.username} să atace...`;
    }
  }

  // Render SVG interactive map cu poligoane geografice
  function renderSvgMap() {
    if (!activeGameState) return;

    svgMapWrapper.innerHTML = '';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 920 580");
    svg.setAttribute("class", "game-map-svg");

    // Fundal harta
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", "920");
    bg.setAttribute("height", "580");
    bg.setAttribute("fill", "rgba(0,0,0,0)");
    svg.appendChild(bg);

    // Desenare județe ca poligoane (Ilfov înainte de București ca să se suprapună corect)
    const renderOrder = activeGameState.map.slice().sort((a, b) => {
      if (a.id === 25) return -1;
      if (b.id === 25) return 1;
      return a.id - b.id;
    });

    renderOrder.forEach(node => {
      const polyPoints = countyPolygons[node.id];
      if (!polyPoints) return;

      const group = document.createElementNS(svgNS, "g");
      group.setAttribute("class", "svg-node-group");
      group.setAttribute("id", `node-grp-${node.id}`);
      group.setAttribute("data-id", node.id);

      const polygon = document.createElementNS(svgNS, "polygon");
      polygon.setAttribute("points", polyPoints);
      polygon.setAttribute("class", "county-polygon");
      polygon.style.fill = node.color;
      group.appendChild(polygon);

      // Tooltip cu numele complet
      const title = document.createElementNS(svgNS, "title");
      title.textContent = node.name;
      group.appendChild(title);

      // Abreviere centrată pe poligon
      const centroid = getPolygonCentroid(polyPoints);
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", centroid.x);
      text.setAttribute("y", centroid.y);
      text.setAttribute("class", "svg-node-text");
      text.textContent = node.abbr || node.name;
      group.appendChild(text);

      group.addEventListener('click', () => {
        if (group.classList.contains('is-attackable')) {
          socket.emit('attack-territory', { targetId: node.id });
        }
      });

      svg.appendChild(group);
    });

    svgMapWrapper.appendChild(svg);
    highlightAttackableTerritories();
  }

  // Highlight which territories the player can click to attack
  function highlightAttackableTerritories() {
    if (!activeGameState) return;
    
    // Clear all highlights
    document.querySelectorAll('.svg-node-group').forEach(grp => {
      grp.classList.remove('is-attackable');
      grp.classList.remove('my-territory');
    });
    
    // Mark mine
    activeGameState.map.forEach(node => {
      const grp = document.getElementById(`node-grp-${node.id}`);
      if (grp && node.owner === socket.id) {
        grp.classList.add('my-territory');
      }
    });

    // If it's my turn, highlight valid adjacent targets
    const activePlayer = activeGameState.players[activeGameState.turnIndex];
    if (activePlayer.socketId === socket.id) {
      // Find my owned territory IDs
      const myOwnedIds = activeGameState.map
        .filter(node => node.owner === socket.id)
        .map(node => node.id);

      // Find neighbors that are NOT owned by me
      const attackableTargets = new Set();
      myOwnedIds.forEach(myId => {
        const neighbors = adjacencyList[myId] || [];
        neighbors.forEach(nId => {
          const neighborNode = activeGameState.map.find(t => t.id === nId);
          if (neighborNode && neighborNode.owner !== socket.id) {
            attackableTargets.add(nId);
          }
        });
      });

      // Add class to SVG nodes
      attackableTargets.forEach(tId => {
        const grp = document.getElementById(`node-grp-${tId}`);
        if (grp) {
          grp.classList.add('is-attackable');
        }
      });
    }
  }

  // Display the Speed Quiz question overlay
  function showQuestionDuel(attackInfo) {
    clearInterval(questionTimerInterval);

    // Render attacker label
    attackerAnnouncement.textContent = `⚔️ ${attackInfo.attackerUsername} ATACĂ TERITORIUL!`;
    questionTextVal.textContent = attackInfo.questionText;
    
    // Draw answers buttons
    questionAnswersGrid.innerHTML = '';
    attackInfo.answers.forEach((ansText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = ansText;
      btn.addEventListener('click', () => {
        // Highlight selection locally
        const buttons = questionAnswersGrid.querySelectorAll('.answer-btn');
        buttons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        socket.emit('submit-answer', { answerIndex: idx });
      });
      questionAnswersGrid.appendChild(btn);
    });

    // Disable buttons if player already answered in case of sync rejoin
    if (attackInfo.hasAnswered) {
      const buttons = questionAnswersGrid.querySelectorAll('.answer-btn');
      buttons.forEach(b => b.disabled = true);
    }

    questionOverlay.classList.remove('hidden');

    // Run timer animation (20 seconds standard duration)
    const duration = attackInfo.duration || 20000;
    const timeRemaining = attackInfo.timeRemaining !== undefined ? attackInfo.timeRemaining : duration;
    
    let timeLeftMs = timeRemaining;
    const stepInterval = 100; // Tick every 100ms
    
    updateTimerUI(timeLeftMs, duration);

    questionTimerInterval = setInterval(() => {
      timeLeftMs -= stepInterval;
      if (timeLeftMs <= 0) {
        timeLeftMs = 0;
        clearInterval(questionTimerInterval);
      }
      updateTimerUI(timeLeftMs, duration);
    }, stepInterval);
  }

  // Update SVG timer progress and linear line progress
  function updateTimerUI(timeLeftMs, duration) {
    const secondsLeft = Math.ceil(timeLeftMs / 1000);
    questionCountdown.textContent = secondsLeft;
    
    const percentage = (timeLeftMs / duration) * 100;
    
    // Circle progress (SVG stroke-dasharray)
    // Circle circumference is roughly 100
    if (timerProgressCircle) {
      timerProgressCircle.setAttribute("stroke-dasharray", `${percentage}, 100`);
      // Transition color based on urgency
      if (percentage > 50) {
        timerProgressCircle.style.stroke = "var(--neon-blue)";
      } else if (percentage > 25) {
        timerProgressCircle.style.stroke = "var(--neon-yellow)";
      } else {
        timerProgressCircle.style.stroke = "var(--neon-pink)";
      }
    }

    // Line progress
    if (timerProgressLine) {
      timerProgressLine.style.transform = `scaleX(${percentage / 100})`;
      if (percentage <= 25) {
        timerProgressLine.style.background = "var(--neon-pink)";
      } else {
        timerProgressLine.style.background = "linear-gradient(90deg, var(--neon-blue), var(--neon-pink))";
      }
    }
  }

  // Helper function to extract user colors mapping
  function newColorHex(socketId, players) {
    if (!socketId) return '#4a5568';
    const p = players.find(player => player.socketId === socketId);
    return p ? p.color : '#4a5568';
  }
}
