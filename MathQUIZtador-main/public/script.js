// Same-origin: frontend-ul vorbește cu ACELAȘI server care îl servește.
// Serverul (server.js) trebuie să ruleze ca proces persistent (local sau Render
// Web Service), NU pe Vercel serverless — serverless nu suportă WebSocket.
const BACKEND_URL = '';

const _storedToken = localStorage.getItem('socketToken');
const socket = io(BACKEND_URL, {
  withCredentials: true,
  auth: _storedToken ? { token: _storedToken } : {},
  // Permite și polling ca rezervă, dar preferă websocket
  transports: ['websocket', 'polling'],
  // Reconectare robustă — un blip de rețea nu te scoate din joc
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  timeout: 20000
});

// Harta Romaniei: path-urile reale ale judetelor sunt incarcate din romania-map.js (window.ROMANIA_MAP)

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

  // Rejoin with retry — tolerates the brief race after page navigation
  let rejoinAttempts = 0;
  let gameEntered = false;
  function tryRejoin() { socket.emit('rejoin-game'); }

  tryRejoin();
  // Re-emit on every (re)connect so a dropped socket auto-recovers
  socket.on('connect', () => { if (!gameEntered) tryRejoin(); else socket.emit('rejoin-game'); });

  socket.on('rejoin-failed', () => {
    rejoinAttempts++;
    if (rejoinAttempts < 5) {
      setTimeout(tryRejoin, 700); // server may not have processed the new socket yet
    } else {
      window.location.href = 'index.html';
    }
  });

  // SELECTION PHASE
  socket.on('selection-phase', (state) => {
    gameEntered = true; rejoinAttempts = 0;
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
    gameEntered = true; rejoinAttempts = 0;
    isSelectionPhase = false;
    activeGameState = state;
    if (state.code) gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = `${state.round}/${state.maxRounds}`;
    renderScoreboard(state.players, state.turnIndex);
    renderSvgMap(state.map, state.players, false, state.turnIndex);
    updateTurnBanner();
  });

  socket.on('game-state-sync', (state) => {
    gameEntered = true; rejoinAttempts = 0;
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
    if (disconnected && message) showToast(message);
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

  socket.on('player-disconnected', ({username}) => showToast(`${username} s-a deconectat. Se așteaptă reconectarea (max 60s)...`));
  socket.on('player-reconnected', ({username}) => showToast(`${username} s-a reconectat. Jocul continuă!`));
  socket.on('error-msg', msg => showToast(msg));
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
  // Lookup real county SVG paths by id (ro-ab, ro-ag, ...)
  const REAL_PATHS = {};
  let MAP_VIEWBOX = "0 0 613 433";
  if (window.ROMANIA_MAP && window.ROMANIA_MAP.locations) {
    MAP_VIEWBOX = window.ROMANIA_MAP.viewBox || MAP_VIEWBOX;
    window.ROMANIA_MAP.locations.forEach(loc => { REAL_PATHS[loc.id] = loc.path; });
  }

  function renderSvgMap(map, players, selectionMode, activeTurnIndex) {
    svgMapWrapper.innerHTML = '';
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", MAP_VIEWBOX);
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

    const pathEls = []; // for label placement after DOM insertion

    // Aliasuri pentru abrevieri vechi/variante (ex: backend mai vechi trimitea "MJ" pentru Mehedinți)
    const ABBR_ALIAS = { mj: 'mh', buc: 'b', b: 'b' };

    map.forEach(node => {
      let key = (node.abbr || '').toLowerCase();
      let d = REAL_PATHS['ro-' + key];
      if (!d && ABBR_ALIAS[key]) d = REAL_PATHS['ro-' + ABBR_ALIAS[key]];
      // ultim resort: caută după nume (Mehedinți etc.)
      if (!d && node.name && window.ROMANIA_MAP) {
        const byName = window.ROMANIA_MAP.locations.find(l => l.name && l.name.toLowerCase() === node.name.toLowerCase());
        if (byName) d = byName.path;
      }
      if (!d) return;
      const isOwnedByMe  = node.owner === socket.id;
      const isAttackable = attackableIds.has(node.id);
      const isSelectable = selectionMode && node.owner === null;

      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "svg-county-group");
      g.setAttribute("id", `county-${node.id}`);

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "svg-county-poly");
      path.style.fill = node.color || '#2d3561';
      if (isOwnedByMe)  path.classList.add('my-county');
      if (isAttackable) path.classList.add('is-attackable');
      if (isSelectable) path.classList.add('is-selectable');
      g.appendChild(path);

      const title = document.createElementNS(svgNS, "title");
      title.textContent = node.name;
      g.appendChild(title);

      if ((selectionMode && isSelectable) || (!selectionMode && isAttackable)) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => {
          if (selectionMode) socket.emit('select-starting-territory', {territoryId: node.id});
          else socket.emit('attack-territory', {targetId: node.id});
        });
      }

      svg.appendChild(g);
      pathEls.push({ g, path, abbr: node.abbr });
    });

    svgMapWrapper.appendChild(svg);

    // Place abbreviation labels at the bounding-box center of each county
    pathEls.forEach(({ g, path, abbr }) => {
      let cx, cy;
      try {
        const bb = path.getBBox();
        cx = bb.x + bb.width / 2;
        cy = bb.y + bb.height / 2;
      } catch (e) { return; }
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", cx);
      text.setAttribute("y", cy);
      text.setAttribute("class", "svg-county-text");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.textContent = abbr;
      g.appendChild(text);
    });
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
