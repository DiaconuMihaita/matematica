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
  const currentRoundEl      = document.getElementById('current-round');
  const turnBannerEl        = document.getElementById('turn-banner');
  const gameRoomCodeEl      = document.getElementById('game-room-code');
  const playersScoreboardEl = document.getElementById('players-scoreboard');
  const svgMapWrapper       = document.getElementById('svg-map-wrapper');
  const questionOverlay     = document.getElementById('question-overlay');
  const attackerAnnouncement= document.getElementById('attacker-announcement');
  const questionTextVal     = document.getElementById('question-text-val');
  const questionAnswersGrid = document.getElementById('question-answers-grid');
  const questionCountdown   = document.getElementById('question-countdown');
  const questionTag         = document.getElementById('question-tag');
  const timerProgressCircle = document.getElementById('timer-progress-circle');
  const timerProgressLine   = document.getElementById('timer-progress-line');
  const resultPopup         = document.getElementById('result-popup');
  const resultStatusTitle   = document.getElementById('result-status-title');
  const resultDetails       = document.getElementById('result-details');
  const gameoverOverlay     = document.getElementById('gameover-overlay');
  const gameWinnerName      = document.getElementById('game-winner-name');
  const gameoverRankingBody = document.getElementById('gameover-ranking-body');
  const backToLobbyBtn      = document.getElementById('back-to-lobby-btn');

  // Path-urile reale ale județelor
  const REAL_PATHS = {};
  let MAP_VIEWBOX = '0 0 613 433';
  if (window.ROMANIA_MAP && window.ROMANIA_MAP.locations) {
    MAP_VIEWBOX = window.ROMANIA_MAP.viewBox || MAP_VIEWBOX;
    window.ROMANIA_MAP.locations.forEach(l => { REAL_PATHS[l.id] = l.path; });
  }
  const ABBR_ALIAS = { mj: 'mh' };

  // Input numeric pentru departajări (creat o singură dată)
  let numericWrap = document.getElementById('numeric-answer-wrap');
  if (!numericWrap) {
    numericWrap = document.createElement('div');
    numericWrap.id = 'numeric-answer-wrap';
    numericWrap.className = 'hidden';
    numericWrap.style.cssText = 'display:flex;gap:.75rem;margin-bottom:1.5rem;';
    numericWrap.innerHTML =
      '<input id="numeric-answer-input" type="number" step="any" placeholder="Scrie un număr..." ' +
      'style="flex:1;padding:1rem;background:rgba(0,0,0,.3);border:1px solid var(--border-color);border-radius:12px;color:#fff;font-size:1.2rem;font-family:var(--font-title);" />' +
      '<button id="numeric-answer-btn" class="btn btn-primary">Trimite</button>';
    questionAnswersGrid.parentNode.insertBefore(numericWrap, questionAnswersGrid.nextSibling);
  }
  const numericInput = document.getElementById('numeric-answer-input');
  const numericBtn   = document.getElementById('numeric-answer-btn');

  let questionTimerInterval = null;
  let gameEntered = false;
  let rejoinAttempts = 0;

  // ---- REJOIN ----
  function tryRejoin() { socket.emit('rejoin-game'); }
  tryRejoin();
  socket.on('connect', () => { socket.emit('rejoin-game'); });
  socket.on('rejoin-failed', () => {
    rejoinAttempts++;
    if (rejoinAttempts < 6) setTimeout(tryRejoin, 700);
    else window.location.href = 'index.html';
  });

  // ==========================================================
  // RENDER
  // ==========================================================
  function setBanner(text, color) {
    turnBannerEl.style.backgroundColor = 'rgba(0,0,0,0.4)';
    turnBannerEl.style.border = `1px solid ${color || 'var(--neon-blue)'}`;
    turnBannerEl.style.color = color || 'var(--text-main)';
    turnBannerEl.textContent = text;
  }

  function renderScoreboard() {
    const gs = activeGameState; if (!gs || !gs.players) return;
    playersScoreboardEl.innerHTML = '';
    gs.players.forEach(p => {
      const isActive = p.socketId === gs.activeSocketId;
      const isMe = p.socketId === socket.id;
      const card = document.createElement('div');
      card.className = `scoreboard-player-card ${isActive ? 'active-turn' : ''}`;
      if (isActive) card.style.color = p.color;
      card.innerHTML = `
        <div class="player-meta">
          <div class="player-color-dot" style="color:${p.color};background-color:${p.color}"></div>
          <div>
            <div class="player-name">${p.username}${isMe ? ' (Tu)' : ''}${p.disconnected ? ' ⏳' : ''}</div>
            <div class="player-rating-lbl">Rating: ${p.rating}</div>
          </div>
        </div>
        <div class="player-score">
          <span class="count">${p.territoriesCount}</span>
          <span class="label">Județe</span>
        </div>`;
      playersScoreboardEl.appendChild(card);
    });
  }

  // clickableIds: array; styleClass: 'is-selectable'|'is-attackable'; clickFn(id)
  function renderMap(clickableIds, styleClass, clickFn) {
    const gs = activeGameState; if (!gs || !gs.map) return;
    clickableIds = clickableIds || [];
    svgMapWrapper.innerHTML = '';
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', MAP_VIEWBOX);
    svg.setAttribute('class', 'game-map-svg');
    const pathEls = [];

    gs.map.forEach(node => {
      let key = (node.abbr || '').toLowerCase();
      let d = REAL_PATHS['ro-' + key];
      if (!d && ABBR_ALIAS[key]) d = REAL_PATHS['ro-' + ABBR_ALIAS[key]];
      if (!d && node.name && window.ROMANIA_MAP) {
        const bn = window.ROMANIA_MAP.locations.find(l => l.name && l.name.toLowerCase() === node.name.toLowerCase());
        if (bn) d = bn.path;
      }
      if (!d) return;

      const isMine = node.owner === socket.id;
      const clickable = clickableIds.indexOf(node.id) !== -1;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'svg-county-group');
      g.setAttribute('id', `county-${node.id}`);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'svg-county-poly');
      path.style.fill = node.color || '#2d3561';
      if (isMine) path.classList.add('my-county');
      if (clickable) path.classList.add(styleClass || 'is-attackable');
      g.appendChild(path);
      const title = document.createElementNS(NS, 'title');
      title.textContent = node.name;
      g.appendChild(title);
      if (clickable && clickFn) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => clickFn(node.id));
      }
      svg.appendChild(g);
      pathEls.push({ g, path, abbr: node.abbr });
    });

    svgMapWrapper.appendChild(svg);
    pathEls.forEach(({ g, path, abbr }) => {
      let bb; try { bb = path.getBBox(); } catch (e) { return; }
      if (!bb.width || !bb.height) return;
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', bb.x + bb.width / 2);
      t.setAttribute('y', bb.y + bb.height / 2);
      t.setAttribute('class', 'svg-county-text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      t.textContent = abbr;
      g.appendChild(t);
    });
  }

  // ==========================================================
  // ÎNTREBĂRI (grilă + numeric)
  // ==========================================================
  function clearTimer() { if (questionTimerInterval) { clearInterval(questionTimerInterval); questionTimerInterval = null; } }

  function startTimer(duration, timeRemaining) {
    clearTimer();
    let left = (timeRemaining !== undefined && timeRemaining !== null) ? timeRemaining : duration;
    updateTimerUI(left, duration);
    questionTimerInterval = setInterval(() => {
      left -= 100; if (left <= 0) { left = 0; clearTimer(); }
      updateTimerUI(left, duration);
    }, 100);
  }

  function updateTimerUI(left, duration) {
    questionCountdown.textContent = Math.ceil(left / 1000);
    const pct = (left / duration) * 100;
    if (timerProgressCircle) {
      timerProgressCircle.setAttribute('stroke-dasharray', `${pct}, 100`);
      timerProgressCircle.style.stroke = pct > 50 ? 'var(--neon-blue)' : pct > 25 ? 'var(--neon-yellow)' : 'var(--neon-pink)';
    }
    if (timerProgressLine) {
      timerProgressLine.style.transform = `scaleX(${pct / 100})`;
      timerProgressLine.style.background = pct <= 25 ? 'var(--neon-pink)' : 'linear-gradient(90deg,var(--neon-blue),var(--neon-pink))';
    }
  }

  // Randează text + LaTeX ($...$) cu KaTeX
  function setMath(el, str) {
    el.textContent = str || '';
    if (window.renderMathInElement) {
      try {
        renderMathInElement(el, {
          delimiters: [{ left: '$', right: '$', display: false }],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  // info: {questionText, answers, duration, timeRemaining, announce, tag}
  // opts: {participant, emitName, hasAnswered}
  function showMC(info, opts) {
    clearTimer();
    questionTag.textContent = opts.tag || 'DUEL';
    attackerAnnouncement.textContent = info.announce || '';
    setMath(questionTextVal, info.questionText);
    numericWrap.classList.add('hidden');
    questionAnswersGrid.classList.remove('hidden');
    questionAnswersGrid.innerHTML = '';
    (info.answers || []).forEach((ans, idx) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      setMath(btn, ans);
      if (!opts.participant || opts.hasAnswered) btn.disabled = true;
      btn.addEventListener('click', () => {
        questionAnswersGrid.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        questionAnswersGrid.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
        socket.emit(opts.emitName, { answerIndex: idx });
      });
      questionAnswersGrid.appendChild(btn);
    });
    questionOverlay.classList.remove('hidden');
    startTimer(info.duration || 20000, info.timeRemaining);
  }

  function showNumeric(info, opts) {
    clearTimer();
    questionTag.textContent = 'DEPARTAJARE';
    attackerAnnouncement.textContent = info.announce || 'Întrebare de departajare — răspunde cu un număr!';
    setMath(questionTextVal, info.questionText);
    questionAnswersGrid.classList.add('hidden');
    numericWrap.classList.remove('hidden');
    numericInput.value = '';
    const enabled = opts.participant && !opts.hasAnswered;
    numericInput.disabled = !enabled;
    numericBtn.disabled = !enabled;
    numericBtn.onclick = () => {
      if (numericInput.value === '') return;
      numericInput.disabled = true; numericBtn.disabled = true;
      socket.emit(opts.emitName, { value: Number(numericInput.value) });
    };
    questionOverlay.classList.remove('hidden');
    if (enabled) setTimeout(() => numericInput.focus(), 100);
    startTimer(info.duration || 20000, info.timeRemaining);
  }

  function hideQuestion() { clearTimer(); questionOverlay.classList.add('hidden'); }

  function showResult(title, html, color) {
    resultStatusTitle.textContent = title;
    resultStatusTitle.style.color = color || 'var(--neon-yellow)';
    resultDetails.innerHTML = html;
    resultPopup.classList.remove('hidden');
    setTimeout(() => resultPopup.classList.add('hidden'), 3600);
  }

  function nameOf(socketId) {
    const p = activeGameState.players.find(x => x.socketId === socketId);
    return p ? p.username : '?';
  }
  function colorOf(socketId) {
    const p = activeGameState.players.find(x => x.socketId === socketId);
    return p ? p.color : '#fff';
  }

  // ==========================================================
  // FAZA 1 — SELECȚIE INIȚIALĂ
  // ==========================================================
  socket.on('selection-phase', (state) => {
    gameEntered = true; rejoinAttempts = 0;
    activeGameState = { phase: 'selecting', map: state.map, players: state.players,
      activeSocketId: state.players[state.selectionTurnIndex].socketId };
    if (state.code) gameRoomCodeEl.textContent = state.code;
    currentRoundEl.textContent = 'ALEGERE START';
    selectionRender(state.players[state.selectionTurnIndex].socketId);
  });
  socket.on('selection-update', ({ map, players, selectionTurnIndex }) => {
    activeGameState.map = map; activeGameState.players = players;
    activeGameState.activeSocketId = players[selectionTurnIndex].socketId;
    selectionRender(players[selectionTurnIndex].socketId);
  });
  function selectionRender(activeSid) {
    const isMe = activeSid === socket.id;
    setBanner(isMe ? '🏠 ALEGE JUDEȚUL TĂU DE START — orice județ liber!' : `${nameOf(activeSid)} alege județul de start...`, colorOf(activeSid));
    renderScoreboard();
    const free = isMe ? activeGameState.map.filter(t => t.owner === null).map(t => t.id) : [];
    renderMap(free, 'is-selectable', id => socket.emit('select-starting-territory', { territoryId: id }));
  }

  // ==========================================================
  // FAZA 2 — DISTRIBUȚIE
  // ==========================================================
  socket.on('distribution-start', ({ map, players }) => {
    gameEntered = true; rejoinAttempts = 0;
    activeGameState = { phase: 'distribution', map, players, activeSocketId: null };
    currentRoundEl.textContent = 'DISTRIBUȚIE';
    setBanner('📦 Faza de distribuție — fiecare își extinde teritoriul!', 'var(--neon-yellow)');
    renderScoreboard();
    renderMap([], 'is-selectable', null);
  });

  socket.on('distribution-reserve-turn', ({ activeSocketId, activeUsername, reservableIds, map, players }) => {
    activeGameState.map = map; activeGameState.players = players; activeGameState.activeSocketId = activeSocketId;
    currentRoundEl.textContent = 'DISTRIBUȚIE';
    const isMe = activeSocketId === socket.id;
    setBanner(isMe ? '🎯 ALEGE un județ liber vecin teritoriului tău!' : `${activeUsername} își alege un județ...`, colorOf(activeSocketId));
    renderScoreboard();
    renderMap(isMe ? reservableIds : [], 'is-selectable', id => socket.emit('reserve-territory', { countyId: id }));
  });

  socket.on('distribution-question', (info) => {
    activeGameState.map = info.map; activeGameState.players = info.players; activeGameState.activeSocketId = null;
    renderScoreboard(); renderMap([], 'is-selectable', null);
    const participant = info.reservations && (socket.id in info.reservations);
    showMC({ questionText: info.questionText, answers: info.answers, duration: info.duration,
      announce: participant ? '✏️ Răspunde corect ca să primești județul ales!' : 'Aștepți rezultatul... (nu ai rezervat un județ)',
      tag: 'DISTRIBUȚIE' },
      { participant, emitName: 'submit-distribution-answer' });
  });

  socket.on('distribution-result', ({ claims, map, players }) => {
    hideQuestion();
    activeGameState.map = map; activeGameState.players = players;
    renderScoreboard(); renderMap([], 'is-selectable', null);
    const ok = claims.filter(c => c.correct).map(c => nameOf(c.socketId));
    const fail = claims.filter(c => !c.correct).map(c => nameOf(c.socketId));
    let html = '';
    if (ok.length) html += `<div>✅ Au primit județul: <b>${ok.join(', ')}</b></div>`;
    if (fail.length) html += `<div style="margin-top:.4rem;opacity:.8">❌ Au ratat: ${fail.join(', ')}</div>`;
    if (!html) html = 'Nimeni nu a primit județul în această rundă.';
    showResult('REZULTAT DISTRIBUȚIE', html, 'var(--neon-green)');
  });

  socket.on('distribution-tiebreak-question', (info) => {
    activeGameState.map = info.map; activeGameState.players = info.players; activeGameState.activeSocketId = null;
    renderScoreboard(); renderMap([], 'is-selectable', null);
    const participant = info.participants && info.participants.indexOf(socket.id) !== -1;
    showNumeric({ questionText: info.questionText, duration: info.duration,
      announce: '⚖️ Județe puține! Cel mai aproape de răspuns câștigă.' },
      { participant, emitName: 'submit-distribution-tiebreak' });
  });

  socket.on('distribution-tiebreak-result', ({ correctAnswer, claims, map, players, ranking }) => {
    hideQuestion();
    activeGameState.map = map; activeGameState.players = players;
    renderScoreboard(); renderMap([], 'is-selectable', null);
    let html = `<div>Răspuns corect: <b>${correctAnswer}</b></div>`;
    if (ranking && ranking.length) {
      html += '<div style="margin-top:.4rem;font-size:.9rem">' +
        ranking.map((r, i) => `${i + 1}. ${r.username} (${r.value === null ? '—' : r.value})`).join('<br>') + '</div>';
    }
    showResult('DEPARTAJARE', html, 'var(--neon-yellow)');
  });

  // ==========================================================
  // FAZA 3 — BĂTĂLIE
  // ==========================================================
  socket.on('battle-start', ({ map, players, turnIndex, round, maxRounds, code }) => {
    gameEntered = true; rejoinAttempts = 0;
    activeGameState = { phase: 'battle', map, players, round, maxRounds, turnIndex,
      activeSocketId: players[turnIndex] ? players[turnIndex].socketId : null };
    if (code) gameRoomCodeEl.textContent = code;
    currentRoundEl.textContent = `${round}/${maxRounds}`;
    setBanner('⚔️ Începe BĂTĂLIA! Cucerește cât mai multe județe!', 'var(--neon-pink)');
    renderScoreboard(); renderMap([], 'is-attackable', null);
  });

  socket.on('battle-turn', ({ turnIndex, round, maxRounds, activeSocketId, attackableIds, map, players }) => {
    activeGameState.map = map; activeGameState.players = players;
    activeGameState.round = round; activeGameState.maxRounds = maxRounds;
    activeGameState.turnIndex = turnIndex; activeGameState.activeSocketId = activeSocketId;
    currentRoundEl.textContent = `${round}/${maxRounds}`;
    const isMe = activeSocketId === socket.id;
    setBanner(isMe ? '⚔️ RÂNDUL TĂU — atacă un județ inamic vecin!' : `Rândul lui ${nameOf(activeSocketId)} să atace...`, colorOf(activeSocketId));
    renderScoreboard();
    renderMap(isMe ? attackableIds : [], 'is-attackable', id => socket.emit('attack-territory', { targetId: id }));
  });

  socket.on('battle-question', (info) => {
    activeGameState.activeSocketId = null;
    const participant = info.participants && info.participants.indexOf(socket.id) !== -1;
    showMC({ questionText: info.questionText, answers: info.answers, duration: info.duration,
      announce: `⚔️ ${info.attackerUsername} atacă ${info.defenderUsername}` + (participant ? '' : ' — spectezi duelul'),
      tag: 'BĂTĂLIE' },
      { participant, emitName: 'submit-battle-answer' });
  });

  socket.on('battle-tiebreak-question', (info) => {
    const participant = info.participants && info.participants.indexOf(socket.id) !== -1;
    showNumeric({ questionText: info.questionText, duration: info.duration,
      announce: '⚖️ Amândoi corect! Departajare: cel mai aproape câștigă.' },
      { participant, emitName: 'submit-battle-tiebreak' });
  });

  socket.on('battle-result', (res) => {
    hideQuestion();
    activeGameState.map = res.map; activeGameState.players = res.players;
    renderScoreboard(); renderMap([], 'is-attackable', null);
    const target = res.map.find(t => t.id === res.targetId);
    const tName = target ? target.name : 'județul';
    let html, title, color;
    if (res.taken) {
      title = 'JUDEȚ CUCERIT!'; color = 'var(--neon-green)';
      html = `<span style="color:${colorOf(res.winnerId)};font-weight:bold">${res.winnerUsername}</span> a cucerit <b>${tName}</b>!`;
    } else {
      title = 'ATAC RESPINS'; color = 'var(--neon-pink)';
      html = `<b>${tName}</b> rămâne la <span style="color:${colorOf(res.winnerId)};font-weight:bold">${res.winnerUsername}</span>.`;
    }
    if (res.tie) html += `<div style="margin-top:.4rem;font-size:.9rem;opacity:.85">Departajare — răspuns corect: <b>${res.correctAnswer}</b></div>`;
    showResult(title, html, color);
  });

  // ==========================================================
  // REJOIN SYNC
  // ==========================================================
  socket.on('game-state-sync', (s) => {
    gameEntered = true; rejoinAttempts = 0;
    activeGameState = { phase: s.phase, map: s.map, players: s.players,
      round: s.round, maxRounds: s.maxRounds, turnIndex: s.turnIndex, activeSocketId: null };
    if (s.code) gameRoomCodeEl.textContent = s.code;
    currentRoundEl.textContent = s.phase === 'battle' ? `${s.round}/${s.maxRounds}` : (s.phase === 'distribution' ? 'DISTRIBUȚIE' : 'JOC');

    const a = s.active;
    if (!a) { setBanner('Se sincronizează...', 'var(--neon-blue)'); renderScoreboard(); renderMap([], 'is-attackable', null); return; }

    if (a.kind === 'reserve') {
      activeGameState.activeSocketId = a.activeSocketId;
      const isMe = a.activeSocketId === socket.id;
      setBanner(isMe ? '🎯 ALEGE un județ liber vecin!' : `${a.activeUsername} alege...`, colorOf(a.activeSocketId));
      renderScoreboard();
      renderMap(isMe ? a.reservableIds : [], 'is-selectable', id => socket.emit('reserve-territory', { countyId: id }));
    } else if (a.kind === 'dist-question') {
      renderScoreboard(); renderMap([], 'is-selectable', null);
      showMC({ questionText: a.questionText, answers: a.answers, duration: a.duration, timeRemaining: a.timeRemaining,
        announce: a.isParticipant ? '✏️ Răspunde corect!' : 'Spectezi...', tag: 'DISTRIBUȚIE' },
        { participant: a.isParticipant, emitName: 'submit-distribution-answer', hasAnswered: a.hasAnswered });
    } else if (a.kind === 'dist-tiebreak') {
      renderScoreboard(); renderMap([], 'is-selectable', null);
      showNumeric({ questionText: a.questionText, duration: a.duration, timeRemaining: a.timeRemaining },
        { participant: a.isParticipant, emitName: 'submit-distribution-tiebreak', hasAnswered: a.hasAnswered });
    } else if (a.kind === 'battle-turn') {
      activeGameState.activeSocketId = a.activeSocketId;
      const isMe = a.activeSocketId === socket.id;
      setBanner(isMe ? '⚔️ RÂNDUL TĂU — atacă!' : `Rândul lui ${nameOf(a.activeSocketId)}...`, colorOf(a.activeSocketId));
      renderScoreboard();
      renderMap(isMe ? a.attackableIds : [], 'is-attackable', id => socket.emit('attack-territory', { targetId: id }));
    } else if (a.kind === 'battle-question') {
      renderScoreboard(); renderMap([], 'is-attackable', null);
      showMC({ questionText: a.questionText, answers: a.answers, duration: a.duration, timeRemaining: a.timeRemaining,
        announce: `⚔️ ${a.attackerUsername} atacă ${a.defenderUsername}`, tag: 'BĂTĂLIE' },
        { participant: a.isParticipant, emitName: 'submit-battle-answer', hasAnswered: a.hasAnswered });
    } else if (a.kind === 'battle-tiebreak') {
      renderScoreboard(); renderMap([], 'is-attackable', null);
      showNumeric({ questionText: a.questionText, duration: a.duration, timeRemaining: a.timeRemaining },
        { participant: a.isParticipant, emitName: 'submit-battle-tiebreak', hasAnswered: a.hasAnswered });
    }
  });

  // ---- diverse ----
  socket.on('answer-registered', () => {});

  socket.on('game-over', ({ ranking, winnerUsername, disconnected, message }) => {
    clearTimer(); hideQuestion(); resultPopup.classList.add('hidden');
    gameoverOverlay.classList.remove('hidden');
    gameWinnerName.textContent = disconnected ? 'Deconectat' : winnerUsername;
    if (disconnected && message) showToast(message);
    gameoverRankingBody.innerHTML = '';
    (ranking || []).forEach((p, i) => {
      const tr = document.createElement('tr');
      let cls = 'neutral', sign = '0';
      if (p.ratingChange > 0) { cls = 'positive'; sign = `+${p.ratingChange}`; }
      else if (p.ratingChange < 0) { cls = 'negative'; sign = String(p.ratingChange); }
      tr.innerHTML = `<td>${i + 1}</td><td><span style="color:${p.color};font-weight:bold">${p.username}</span></td><td><strong>${p.territoriesCount}</strong></td><td>${p.newRating}</td><td><span class="rating-change-val ${cls}">${sign}</span></td>`;
      gameoverRankingBody.appendChild(tr);
    });
  });

  socket.on('player-disconnected', ({ username }) => showToast(`${username} s-a deconectat. Așteptare reconectare (max 60s)...`));
  socket.on('player-reconnected', ({ username }) => showToast(`${username} s-a reconectat. Jocul continuă!`));
  socket.on('error-msg', (msg) => showToast(msg));
  backToLobbyBtn.addEventListener('click', () => { window.location.href = 'index.html'; });

  function showToast(msg) {
    let t = document.getElementById('game-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'game-toast';
      t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(255,234,0,.15);border:1px solid var(--neon-yellow);color:var(--neon-yellow);padding:12px 24px;border-radius:8px;z-index:200;font-family:var(--font-title);font-size:.9rem;text-align:center;max-width:90%;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.display = 'none'; }, 5500);
  }
}
