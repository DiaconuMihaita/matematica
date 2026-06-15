const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://mathquiz-backend-uakf.onrender.com';

const _storedToken = localStorage.getItem('socketToken');
const socket = io(BACKEND_URL, {
  withCredentials: true,
  auth: _storedToken ? { token: _storedToken } : {}
});

// ============================================================
// HARTA ROMANIEI - poligoane SVG (viewBox 0 0 900 620)
// ============================================================
const COUNTY_POLYGONS = {
  1:  "175,163 215,159 244,183 247,219 234,263 210,275 183,265 165,248 164,223 171,201",
  2:  "71,113 95,155 113,167 119,205 91,225 63,218 49,184 53,141",
  3:  "210,275 244,265 266,261 273,295 271,328 255,349 233,355 214,349 214,325 233,311",
  4:  "421,124 463,137 475,171 471,207 451,233 429,229 423,205 425,184 427,153",
  5:  "79,65 101,49 201,99 201,139 177,161 135,167 95,155 71,113",
  6:  "266,93 351,91 363,113 357,143 321,157 289,157 273,135 273,117",
  7:  "449,31 521,35 529,69 513,105 475,119 461,89 461,59",
  8:  "541,261 559,281 585,291 601,309 599,339 579,351 559,343 541,323 541,293",
  9:  "289,203 355,197 375,217 374,263 356,286 331,293 306,283 289,259 289,233",
  10: "467,295 487,283 511,289 525,303 503,311 491,333 473,335 456,317 456,295",
  11: "509,397 529,383 543,343 563,351 579,373 577,405 563,425 541,435 519,431 501,415",
  12: "63,287 98,295 125,281 137,311 134,359 109,378 79,375 57,343 48,311",
  13: "201,139 273,133 271,153 266,183 244,205 214,209 184,199 174,171 177,153",
  14: "609,275 619,289 651,307 683,309 720,299 744,323 744,390 734,420 720,434 696,440 672,434 652,424 629,403 619,377 615,351",
  15: "419,139 453,143 465,169 461,205 435,225 419,205 421,183 425,157",
  16: "266,261 290,259 307,285 314,319 304,343 283,355 261,355 243,341 243,319 255,295",
  17: "119,333 141,329 161,341 169,369 163,405 149,421 125,423 105,405 103,379 109,351",
  18: "541,239 563,229 586,217 603,231 609,275 586,291 560,281 541,261",
  19: "261,355 283,355 304,345 320,365 314,399 299,419 276,427 255,421 249,403 255,381",
  20: "133,311 166,289 191,299 197,333 183,365 159,375 141,367 133,341",
  21: "354,139 419,139 425,157 421,183 399,229 376,229 358,208 354,173",
  22: "95,155 135,161 171,159 184,199 177,227 167,251 144,258 119,251 111,225 113,205",
  23: "503,311 525,303 543,311 543,343 529,383 509,397 486,391 471,373 469,347 481,327",
  24: "521,35 579,41 585,81 578,125 553,149 529,141 513,115 529,69",
  25: "261,347 281,345 307,353 323,371 321,399 304,417 279,423 257,419 251,405 255,383 263,365",
  26: "189,41 339,35 356,61 351,97 307,113 229,109 206,83 206,65",
  27: "109,333 133,311 144,338 141,381 119,393 93,388 81,368 81,344",
  28: "273,133 354,133 363,151 358,176 323,199 291,203 266,181 266,153",
  29: "351,113 421,124 427,153 423,184 399,205 375,197 355,173 353,145",
  30: "171,325 191,338 214,343 233,355 239,388 231,415 211,425 189,419 183,397 169,375 159,353",
  31: "307,285 331,295 357,288 371,315 363,345 340,361 317,361 304,345 314,319",
  32: "201,99 266,93 273,117 259,143 225,155 201,151 201,121",
  33: "101,49 189,41 206,65 201,99 165,113 125,109 89,91 79,65",
  34: "214,159 266,159 291,183 289,215 266,261 243,265 233,263 233,241 217,221 214,197",
  35: "339,35 449,31 467,59 461,97 421,124 379,109 356,83 356,61",
  36: "191,365 214,349 233,355 259,351 266,383 259,417 241,437 221,441 201,435 189,421 186,399",
  37: "49,184 91,225 113,205 127,235 125,281 98,295 63,287 47,259 49,213",
  38: "603,231 639,221 687,227 737,245 742,283 720,299 683,309 651,307 619,289 609,275",
  39: "165,248 183,265 210,275 234,265 239,293 231,325 214,343 191,338 171,325 165,303 164,275",
  40: "529,141 553,149 565,177 563,221 541,239 541,261 519,231 507,205 511,167",
  41: "453,235 471,227 491,253 489,279 469,295 456,295 439,273 441,253",
  42: "277,365 295,361 309,373 307,393 289,403 271,397 265,383"
};

const COUNTY_LABEL = {
  1:[205,223], 2:[83,179],  3:[239,311], 4:[443,184],
  5:[149,131], 6:[318,126], 7:[491,74],  8:[570,313],
  9:[331,251], 10:[489,310],11:[537,404],12:[93,332],
  13:[223,173],14:[673,365],15:[440,185],16:[279,311],
  17:[133,381],18:[573,257],19:[283,396],20:[163,334],
  21:[386,190],22:[140,211],23:[499,357],24:[549,93],
  25:[283,386],26:[268,74], 27:[111,362],28:[313,168],
  29:[387,169],30:[199,391],31:[335,324],32:[233,124],
  33:[146,79], 34:[249,213],35:[401,74], 36:[225,407],
  37:[86,246], 38:[671,267],39:[195,297],40:[533,198],
  41:[463,263],42:[288,382]
};

const territoriesList = [
  {id:1,name:"Alba",abbr:"AB"},{id:2,name:"Arad",abbr:"AR"},
  {id:3,name:"Arges",abbr:"AG"},{id:4,name:"Bacau",abbr:"BC"},
  {id:5,name:"Bihor",abbr:"BH"},{id:6,name:"Bistrita-Nasaud",abbr:"BN"},
  {id:7,name:"Botosani",abbr:"BT"},{id:8,name:"Braila",abbr:"BR"},
  {id:9,name:"Brasov",abbr:"BV"},{id:10,name:"Buzau",abbr:"BZ"},
  {id:11,name:"Calarasi",abbr:"CL"},{id:12,name:"Caras-Severin",abbr:"CS"},
  {id:13,name:"Cluj",abbr:"CJ"},{id:14,name:"Constanta",abbr:"CT"},
  {id:15,name:"Covasna",abbr:"CV"},{id:16,name:"Dambovita",abbr:"DB"},
  {id:17,name:"Dolj",abbr:"DJ"},{id:18,name:"Galati",abbr:"GL"},
  {id:19,name:"Giurgiu",abbr:"GR"},{id:20,name:"Gorj",abbr:"GJ"},
  {id:21,name:"Harghita",abbr:"HR"},{id:22,name:"Hunedoara",abbr:"HD"},
  {id:23,name:"Ialomita",abbr:"IL"},{id:24,name:"Iasi",abbr:"IS"},
  {id:25,name:"Ilfov",abbr:"IF"},{id:26,name:"Maramures",abbr:"MM"},
  {id:27,name:"Mehedinti",abbr:"MH"},{id:28,name:"Mures",abbr:"MS"},
  {id:29,name:"Neamt",abbr:"NT"},{id:30,name:"Olt",abbr:"OT"},
  {id:31,name:"Prahova",abbr:"PH"},{id:32,name:"Salaj",abbr:"SJ"},
  {id:33,name:"Satu Mare",abbr:"SM"},{id:34,name:"Sibiu",abbr:"SB"},
  {id:35,name:"Suceava",abbr:"SV"},{id:36,name:"Teleorman",abbr:"TR"},
  {id:37,name:"Timis",abbr:"TM"},{id:38,name:"Tulcea",abbr:"TL"},
  {id:39,name:"Valcea",abbr:"VL"},{id:40,name:"Vaslui",abbr:"VS"},
  {id:41,name:"Vrancea",abbr:"VN"},{id:42,name:"Bucuresti",abbr:"B"}
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
  [21,28],[22,34],[23,25],
  [24,29],[24,35],[24,40],
  [25,31],[25,42],
  [26,32],[26,33],[26,35],
  [29,35],[30,36],[30,39],
  [31,41],[32,33],[34,39],[40,41]
];

const adjacencyList = {};
territoriesList.forEach(t => { adjacencyList[t.id] = []; });
rawConnections.forEach(([n1,n2]) => {
  if (!adjacencyList[n1].includes(n2)) adjacencyList[n1].push(n2);
  if (!adjacencyList[n2].includes(n1)) adjacencyList[n2].push(n1);
});

let currentUser = null;
let currentLobby = null;
let activeGameState = null;
let questionTimerInterval = null;
let isSelectionPhase = false;

const isIndexPage = document.getElementById('auth-section') !== null;
const isGamePage  = document.getElementById('svg-map-wrapper') !== null;

// ============================================================
// INDEX.HTML
// ============================================================
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

  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active'); tabRegisterBtn.classList.remove('active');
    loginTab.classList.remove('hidden'); registerTab.classList.add('hidden');
    authError.classList.add('hidden');
  });
  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active'); tabLoginBtn.classList.remove('active');
    registerTab.classList.remove('hidden'); loginTab.classList.add('hidden');
    authError.classList.add('hidden');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({username, password})
      });
      const data = await res.json();
      if (data.error) { authError.textContent = data.error; authError.classList.remove('hidden'); }
      else {
        currentUser = data.user;
        if (data.socketToken) {
          localStorage.setItem('socketToken', data.socketToken);
          socket.auth = { token: data.socketToken };
          socket.disconnect().connect();
        }
        showDashboard();
      }
    } catch(err) { authError.textContent = 'Eroare conexiune!'; authError.classList.remove('hidden'); }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.add('hidden');
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    if (password.length < 6) { authError.textContent = 'Parola min 6 caractere!'; authError.classList.remove('hidden'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({username, email, password})
      });
      const data = await res.json();
      if (data.error) { authError.textContent = data.error; authError.classList.remove('hidden'); }
      else {
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        tabLoginBtn.click();
        authError.textContent = 'Cont creat! Va puteti autentifica.';
        authError.classList.remove('hidden');
        authError.style.borderColor = 'var(--neon-green)';
        authError.style.color = 'var(--neon-green)';
      }
    } catch(err) { authError.textContent = 'Eroare conexiune!'; authError.classList.remove('hidden'); }
  });

  logoutBtn.addEventListener('click', async () => {
    const socketToken = localStorage.getItem('socketToken');
    await fetch(`${BACKEND_URL}/api/logout`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({socketToken})
    });
    localStorage.removeItem('socketToken');
    socket.auth = {token:null};
    currentUser = null;
    showAuth();
  });

  create1v1Btn.addEventListener('click', () => socket.emit('create-room', {mode:'1v1'}));
  create1v1v1Btn.addEventListener('click', () => socket.emit('create-room', {mode:'1v1v1'}));
  joinRoomBtn.addEventListener('click', () => {
    const code = joinRoomCodeInput.value.trim().toUpperCase();
    if (code.length !== 6) { alert('Cod 6 caractere!'); return; }
    socket.emit('join-room', {code});
  });
  leaveLobbyBtn.addEventListener('click', () => socket.emit('leave-lobby'));
  startGameBtn.addEventListener('click', () => socket.emit('start-game'));

  function showAuth() {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    lobbySection.classList.add('hidden');
  }

  async function showDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    lobbySection.classList.add('hidden');
    try {
      const r = await fetch(`${BACKEND_URL}/api/profile`, {credentials:'include'});
      if (r.ok) currentUser = await r.json();
    } catch(e) {}
    userDisplayName.textContent = currentUser.username;
    userRating.textContent = currentUser.rating;
    userWins.textContent = currentUser.wins;
    userLosses.textContent = currentUser.losses;
    userTerritories.textContent = currentUser.territories_conquered;
    loadLeaderboard();
  }

  async function loadLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Se incarca...</td></tr>';
    try {
      const res = await fetch(`${BACKEND_URL}/api/leaderboard`, {credentials:'include'});
      const lb = await res.json();
      leaderboardBody.innerHTML = '';
      if (!lb.length) { leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Gol</td></tr>'; return; }
      lb.forEach((u,i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td><strong>${u.username}</strong></td><td>${u.rating}</td><td>${u.wins}</td><td>${u.territories_conquered}</td>`;
        leaderboardBody.appendChild(tr);
      });
    } catch(e) { leaderboardBody.innerHTML = '<tr><td colspan="5" style="color:#ff1744;text-align:center">Eroare!</td></tr>'; }
  }

  socket.on('auth-status', ({loggedIn, user}) => {
    if (loggedIn) { currentUser = user; showDashboard(); }
    else if (!currentUser) showAuth();
  });

  socket.on('lobby-update', ({players, host, mode, roomCode}) => {
    currentLobby = {players, host, mode, roomCode};
    dashboardSection.classList.add('hidden');
    lobbySection.classList.remove('hidden');
    lobbyModeVal.textContent = mode;
    lobbyCodeVal.textContent = roomCode;
    const max = mode === '1v1' ? 2 : 3;
    lobbyPlayersCount.textContent = players.length;
    lobbyPlayersMax.textContent = max;
    lobbyPlayersList.innerHTML = '';
    players.forEach(p => {
      const isHost = p.socketId === host;
      const div = document.createElement('div');
      div.className = `lobby-player-card card ${isHost ? 'is-host' : ''}`;
      div.innerHTML = `<div class="player-card-avatar">&#x1F468;&#x200D;&#x1F393;</div><div class="player-card-username">${p.username}</div><div class="player-card-rating">Rating: ${p.rating}</div>`;
      lobbyPlayersList.appendChild(div);
    });
    const isUserHost = socket.id === host;
    if (isUserHost) {
      startGameBtn.classList.remove('hidden');
      if (players.length === max) { startGameBtn.disabled = false; startGameBtn.textContent = 'Porneste Jocul'; }
      else { startGameBtn.disabled = true; startGameBtn.textContent = `Asteptare jucatori (${players.length}/${max})...`; }
    } else { startGameBtn.classList.add('hidden'); }
  });

  socket.on('left-lobby', () => { currentLobby = null; showDashboard(); });
  socket.on('error-msg', msg => alert(msg));
  socket.on('game-started', () => { window.location.href = 'game.html'; });
  socket.on('selection-phase', () => { window.location.href = 'game.html'; });

  socket.emit('join-lobby');
}

// ============================================================
// GAME.HTML
// ============================================================
if (isGamePage) {
  const currentRoundEl     = document.getElementById('current-round');
  const turnBannerEl       = document.getElementById('turn-banner');
  const gameRoomCodeEl     = document.getElementById('game-room-code');
  const playersScoreboardEl= document.getElementById('players-scoreboard');
  const svgMapWrapper      = document.getElementById('svg-map-wrapper');
  const questionOverlay    = document.getElementById('question-overlay');
  const attackerAnnouncement= document.getElementById('attacker-announcement');
  const questionTextVal    = document.getElementById('question-text-val');
  const questionAnswersGrid= document.getElementById('question-answers-grid');
  const questionCountdown  = document.getElementById('question-countdown');
  const timerProgressCircle= document.getElementById('timer-progress-circle');
  const timerProgressLine  = document.getElementById('timer-progress-line');
  const resultPopup        = document.getElementById('result-popup');
  const resultStatusTitle  = document.getElementById('result-status-title');
  const resultDetails      = document.getElementById('result-details');
  const gameoverOverlay    = document.getElementById('gameover-overlay');
  const gameWinnerName     = document.getElementById('game-winner-name');
  const gameoverRankingBody= document.getElementById('gameover-ranking-body');
  const backToLobbyBtn     = document.getElementById('back-to-lobby-btn');

  socket.emit('rejoin-game');
  socket.on('rejoin-failed', () => { window.location.href = 'index.html'; });

  // SELECTION PHASE
  socket.on('selection-phase', (state) => {
    isSelectionPhase = true;
    activeGameState = state;
    if (state.code) gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = 'ALEGERE START';
    updateSelectionBanner(state.players, state.selectionTurnIndex);
    renderScoreboard(state.players, state.selectionTurnIndex);
    renderSvgMap(state.map, state.players, true, state.selectionTurnIndex);
  });

  socket.on('selection-update', ({map, players, selectionTurnIndex}) => {
    activeGameState.map = map;
    activeGameState.players = players;
    activeGameState.selectionTurnIndex = selectionTurnIndex;
    updateSelectionBanner(players, selectionTurnIndex);
    renderScoreboard(players, selectionTurnIndex);
    renderSvgMap(map, players, true, selectionTurnIndex);
  });

  function updateSelectionBanner(players, idx) {
    const sel = players[idx];
    const isMe = sel.socketId === socket.id;
    turnBannerEl.style.border = `1px solid ${sel.color}`;
    turnBannerEl.style.color = sel.color;
    turnBannerEl.textContent = isMe
      ? 'ALEGE JUDETUL TAU DE START — click pe orice judet liber!'
      : `${sel.username} alege judetul de start...`;
  }

  // GAME STARTED
  socket.on('game-started', (state) => {
    isSelectionPhase = false;
    activeGameState = state;
    if (state.code) gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = `${state.round}/${state.maxRounds}`;
    renderScoreboard(state.players, state.turnIndex);
    renderSvgMap(state.map, state.players, false, state.turnIndex);
    updateTurnBanner();
  });

  socket.on('game-state-sync', (state) => {
    isSelectionPhase = false;
    activeGameState = state;
    gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = `${state.round}/${state.maxRounds}`;
    renderScoreboard(state.players, state.turnIndex);
    renderSvgMap(state.map, state.players, false, state.turnIndex);
    updateTurnBanner();
    if (state.activeAttack) showQuestionDuel(state.activeAttack);
  });

  socket.on('new-turn', ({turnIndex, round}) => {
    if (!activeGameState) return;
    questionOverlay.classList.add('hidden');
    clearInterval(questionTimerInterval);
    activeGameState.turnIndex = turnIndex;
    activeGameState.round = round;
    currentRoundEl.textContent = `${round}/${activeGameState.maxRounds}`;
    renderScoreboard(activeGameState.players, turnIndex);
    updateTurnBanner();
    renderSvgMap(activeGameState.map, activeGameState.players, false, turnIndex);
  });

  socket.on('question-broadcast', attackInfo => showQuestionDuel(attackInfo));

  socket.on('answer-registered', () => {
    questionAnswersGrid.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
  });

  socket.on('answer-result', ({winnerId, winnerUsername, correctIndex, targetId, newOwnerColor, players}) => {
    clearInterval(questionTimerInterval);
    if (activeGameState) {
      activeGameState.players = players;
      const t = activeGameState.map.find(t => t.id === targetId);
      if (t) { t.owner = winnerId; t.color = newOwnerColor; }
    }
    const btns = questionAnswersGrid.querySelectorAll('.answer-btn');
    btns.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIndex) btn.classList.add('correct');
      else if (btn.classList.contains('selected')) btn.classList.add('incorrect');
    });
    setTimeout(() => {
      questionOverlay.classList.add('hidden');
      resultPopup.classList.remove('hidden');
      const territory = activeGameState && activeGameState.map.find(t => t.id === targetId);
      if (winnerId) {
        const wp = players.find(p => p.socketId === winnerId);
        resultStatusTitle.textContent = "JUDET CUCERIT!";
        resultDetails.innerHTML = `<span style="color:${wp ? wp.color : '#fff'};font-weight:bold;">${winnerUsername}</span> a cucerit <strong>${territory ? territory.name : 'judetul'}</strong>!`;
      } else {
        resultStatusTitle.textContent = "TIMP EXPIRAT";
        resultDetails.innerHTML = "Niciun raspuns corect. Judetul ramane neschimbat!";
      }
      setTimeout(() => {
        resultPopup.classList.add('hidden');
        if (activeGameState) {
          renderScoreboard(activeGameState.players, activeGameState.turnIndex);
          renderSvgMap(activeGameState.map, activeGameState.players, false, activeGameState.turnIndex);
        }
      }, 3500);
    }, 1200);
  });

  socket.on('game-over', ({ranking, winnerUsername, disconnected, message}) => {
    clearInterval(questionTimerInterval);
    questionOverlay.classList.add('hidden');
    resultPopup.classList.add('hidden');
    gameoverOverlay.classList.remove('hidden');
    gameWinnerName.textContent = disconnected ? "Deconectat" : winnerUsername;
    if (disconnected && message) alert(message);
    gameoverRankingBody.innerHTML = '';
    ranking.forEach((p, i) => {
      const tr = document.createElement('tr');
      let cls = 'neutral', sign = '0';
      if (p.ratingChange > 0) { cls = 'positive'; sign = `+${p.ratingChange}`; }
      else if (p.ratingChange < 0) { cls = 'negative'; sign = String(p.ratingChange); }
      tr.innerHTML = `<td>${i+1}</td><td><span style="color:${p.color};font-weight:bold">${p.username}</span></td><td><strong>${p.territoriesCount}</strong></td><td>${p.newRating}</td><td><span class="rating-change-val ${cls}">${sign}</span></td>`;
      gameoverRankingBody.appendChild(tr);
    });
  });

  socket.on('player-disconnected', ({username}) => showToast(`${username} s-a deconectat. Asteptare 15s...`));
  socket.on('error-msg', msg => alert(msg));
  backToLobbyBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

  // SCOREBOARD
  function renderScoreboard(players, turnIndex) {
    if (!players) return;
    playersScoreboardEl.innerHTML = '';
    const active = players[turnIndex];
    players.forEach(p => {
      const isMyTurn = active && p.socketId === active.socketId;
      const isMe = p.socketId === socket.id;
      const card = document.createElement('div');
      card.className = `scoreboard-player-card ${isMyTurn ? 'active-turn' : ''}`;
      if (isMyTurn) card.style.color = p.color;
      card.innerHTML = `
        <div class="player-meta">
          <div class="player-color-dot" style="color:${p.color};background-color:${p.color}"></div>
          <div>
            <div class="player-name">${p.username}${isMe ? ' (Tu)' : ''}</div>
            <div class="player-rating-lbl">Rating: ${p.rating}</div>
          </div>
        </div>
        <div class="player-score">
          <span class="count">${p.territoriesCount}</span>
          <span class="label">Judete</span>
        </div>`;
      playersScoreboardEl.appendChild(card);
    });
  }

  function updateTurnBanner() {
    if (!activeGameState) return;
    const active = activeGameState.players[activeGameState.turnIndex];
    const isMe = active.socketId === socket.id;
    turnBannerEl.style.backgroundColor = 'rgba(0,0,0,0.4)';
    turnBannerEl.style.border = `1px solid ${active.color}`;
    turnBannerEl.style.color = active.color;
    turnBannerEl.textContent = isMe
      ? 'ESTE RANDUL TAU — selecteaza un judet vecin pentru a ataca!'
      : `Randul lui ${active.username} sa atace...`;
  }

  // SVG MAP cu poligoane reale
  function renderSvgMap(map, players, selectionMode, activeTurnIndex) {
    svgMapWrapper.innerHTML = '';
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 900 620");
    svg.setAttribute("class", "game-map-svg");

    const activePlayer = players && players[activeTurnIndex];
    const attackableIds = new Set();

    if (!selectionMode && activePlayer && activePlayer.socketId === socket.id) {
      const myIds = map.filter(t => t.owner === socket.id).map(t => t.id);
      myIds.forEach(id => {
        (adjacencyList[id] || []).forEach(nId => {
          const n = map.find(t => t.id === nId);
          if (n && n.owner !== socket.id) attackableIds.add(nId);
        });
      });
    }

    map.forEach(node => {
      const pts = COUNTY_POLYGONS[node.id];
      if (!pts) return;
      const lbl = COUNTY_LABEL[node.id];
      const isOwnedByMe  = node.owner === socket.id;
      const isAttackable = attackableIds.has(node.id);
      const isSelectable = selectionMode && node.owner === null;

      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "svg-county-group");
      g.setAttribute("id", `county-${node.id}`);

      const poly = document.createElementNS(svgNS, "polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("class", "svg-county-poly");
      poly.style.fill = node.color || '#2d3561';
      if (isOwnedByMe)  poly.classList.add('my-county');
      if (isAttackable) poly.classList.add('is-attackable');
      if (isSelectable) poly.classList.add('is-selectable');
      g.appendChild(poly);

      const title = document.createElementNS(svgNS, "title");
      title.textContent = node.name;
      g.appendChild(title);

      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", lbl[0]);
      text.setAttribute("y", lbl[1]);
      text.setAttribute("class", "svg-county-text");
      text.textContent = node.abbr;
      g.appendChild(text);

      if ((selectionMode && isSelectable) || (!selectionMode && isAttackable)) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => {
          if (selectionMode) socket.emit('select-starting-territory', {territoryId: node.id});
          else socket.emit('attack-territory', {targetId: node.id});
        });
      }

      svg.appendChild(g);
    });

    svgMapWrapper.appendChild(svg);
  }

  // QUESTION DUEL
  function showQuestionDuel(attackInfo) {
    clearInterval(questionTimerInterval);
    attackerAnnouncement.textContent = `${attackInfo.attackerUsername} ATACA!`;
    questionTextVal.textContent = attackInfo.questionText;
    questionAnswersGrid.innerHTML = '';
    attackInfo.answers.forEach((ans, idx) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = ans;
      btn.addEventListener('click', () => {
        questionAnswersGrid.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        socket.emit('submit-answer', {answerIndex: idx});
      });
      questionAnswersGrid.appendChild(btn);
    });
    if (attackInfo.hasAnswered) questionAnswersGrid.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
    questionOverlay.classList.remove('hidden');
    const duration = attackInfo.duration || 20000;
    let timeLeftMs = attackInfo.timeRemaining !== undefined ? attackInfo.timeRemaining : duration;
    updateTimerUI(timeLeftMs, duration);
    questionTimerInterval = setInterval(() => {
      timeLeftMs -= 100;
      if (timeLeftMs <= 0) { timeLeftMs = 0; clearInterval(questionTimerInterval); }
      updateTimerUI(timeLeftMs, duration);
    }, 100);
  }

  function updateTimerUI(timeLeftMs, duration) {
    const sec = Math.ceil(timeLeftMs / 1000);
    questionCountdown.textContent = sec;
    const pct = (timeLeftMs / duration) * 100;
    if (timerProgressCircle) {
      timerProgressCircle.setAttribute("stroke-dasharray", `${pct}, 100`);
      timerProgressCircle.style.stroke = pct > 50 ? "var(--neon-blue)" : pct > 25 ? "var(--neon-yellow)" : "var(--neon-pink)";
    }
    if (timerProgressLine) {
      timerProgressLine.style.transform = `scaleX(${pct/100})`;
      timerProgressLine.style.background = pct <= 25 ? "var(--neon-pink)" : "linear-gradient(90deg,var(--neon-blue),var(--neon-pink))";
    }
  }

  function showToast(msg) {
    let t = document.getElementById('game-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'game-toast';
      t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(255,234,0,.15);border:1px solid var(--neon-yellow);color:var(--neon-yellow);padding:12px 24px;border-radius:8px;z-index:200;font-family:var(--font-title);font-size:.9rem;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 6000);
  }
}
