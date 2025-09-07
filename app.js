// app.js - LinguaSpark full (local accounts + learning)
// Penyimpanan: localStorage
// Struktur penyimpanan:
// localStorage['linguaspark:users'] = JSON.stringify({ username: { password, displayName, settings:{themePreset}, data:{xp,hearts,streak,completedLessons,leaderboard,lastRefresh} } })
// localStorage['linguaspark:active'] = username

/* =================== Utilities =================== */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const norm = s => String(s||'').trim().toLowerCase();
const todayKey = () => new Date().toISOString().slice(0,10);

/* =================== Storage =================== */
function loadUsers(){
  const raw = localStorage.getItem('linguaspark:users');
  return raw ? JSON.parse(raw) : {};
}
function saveUsers(users){ localStorage.setItem('linguaspark:users', JSON.stringify(users)); }
function setActiveUser(username){
  localStorage.setItem('linguaspark:active', username);
}
function getActiveUser(){
  return localStorage.getItem('linguaspark:active') || null;
}

/* =================== Initial demo data =================== */
const DEMO_USERS = {
  demo: {
    password: btoa('demo123'),
    displayName: 'Demo User',
    settings: { theme: 'presetA' },
    data: {
      xp: 120,
      hearts: 5,
      streak: {count:3, last: todayKey()},
      completedLessons: { l1:true, l3:true },
      leaderboard: [{name:'Ayu',xp:980},{name:'Rizky',xp:870}],
      lastRefresh: null
    }
  }
};

/* =================== Course data (example) =================== */
const COURSE = {
  code:'id-en', title:'Bahasa Indonesia → English',
  units:[
    { id:'u1', title:'Dasar 1', lessons:[
      { id:'l1', title:'Sapaan', challenges:[
        {type:'mc', prompt:"Apa arti 'Selamat pagi'?", options:['Good night','Good morning','Goodbye'], answer:1},
        {type:'translate', prompt:'Terjemahkan: Terima kasih', direction:'id-en', answer:'thank you'},
        {type:'arrange', prompt:'Susun: saya / suka / makan', tokens:['saya','suka','makan'], answer:['saya','suka','makan']}
      ]},
      { id:'l2', title:'Orang & Nama', challenges:[
        {type:'mc', prompt:"'Orang' dalam bahasa Inggris adalah...", options:['people','place','thing'], answer:0},
        {type:'translate', prompt:'Terjemahkan: Saya pelajar', direction:'id-en', answer:'i am a student'},
        {type:'listen', prompt:"Dengarkan dan ketik: 'Good evening'", tts:'Good evening', answer:'good evening'}
      ]}
    ]},
    { id:'u2', title:'Makanan', lessons:[
      { id:'l3', title:'Makanan Sehari-hari', challenges:[
        {type:'mc', prompt:"'Nasi' adalah...", options:['rice','noodle','bread'], answer:0},
        {type:'translate', prompt:'Terjemahkan: Saya makan roti', direction:'id-en', answer:'i eat bread'}
      ]}
    ]}
  ]
};

/* =================== App state helpers =================== */
let users = loadUsers();
if(Object.keys(users).length === 0){
  users = DEMO_USERS;
  saveUsers(users);
}
let active = getActiveUser(); // username or null

function currentUserObj(){
  if(!active) return null;
  return users[active] || null;
}
function ensureUserData(username){
  if(!users[username]) {
    users[username] = {
      password: btoa('123'), displayName: username,
      settings:{theme:'presetA'}, data:{xp:0, hearts:5, streak:{count:0,last:null}, completedLessons:{}, leaderboard:[], lastRefresh: null}
    };
    saveUsers(users);
  }
}

/* =================== LOGIN ATTEMPT PROTECTION =================== */
// track failed attempts per username in-memory. For persistence you could store in localStorage too.
const loginAttempts = {}; // { username: { count: number, blockedUntil: timestamp } }
// usage: increment on fail, block when count >= 3 for a minute

/* =================== UI wiring - AUTH =================== */
const authScreens = $('#authScreens');
const appView = $('#app');
const modalRoot = $('#modalRoot');

$('#tabLogin').addEventListener('click', ()=> { $('#panelLogin').classList.remove('hidden'); $('#panelRegister').classList.add('hidden'); $('#tabLogin').classList.add('active'); $('#tabRegister').classList.remove('active'); });
$('#tabRegister').addEventListener('click', ()=> { $('#panelRegister').classList.remove('hidden'); $('#panelLogin').classList.add('hidden'); $('#tabRegister').classList.add('active'); $('#tabLogin').classList.remove('active'); });

$('#btnRegister').addEventListener('click', ()=>{
  const u = norm($('#regUser').value);
  const p = $('#regPass').value;
  const name = $('#regName').value.trim() || u;
  if(!u || !p){ alert('Masukkan username & password'); return; }
  if(users[u]){ alert('Username sudah terpakai'); return; }
  users[u] = { password: btoa(p), displayName: name, settings:{theme:'presetA'}, data:{xp:0,hearts:5,streak:{count:0,last:null},completedLessons:{},leaderboard:[], lastRefresh: null} };
  saveUsers(users);
  alert('Akun dibuat. Silakan login.');
  // switch to login
  $('#tabLogin').click();
  $('#loginUser').value = u;
});
$('#btnBackLogin').addEventListener('click', ()=> $('#tabLogin').click());

$('#btnLogin').addEventListener('click', ()=>{
  const u = norm($('#loginUser').value);
  const p = $('#loginPass').value;
  if(!u || !p){ alert('Masukkan username & password'); return; }

  // anti brute-force: check block first
  if(loginAttempts[u] && loginAttempts[u].blockedUntil && loginAttempts[u].blockedUntil > Date.now()){
    const wait = Math.ceil((loginAttempts[u].blockedUntil - Date.now())/1000);
    alert(`Terlalu banyak percobaan gagal. Coba lagi dalam ${wait} detik.`);
    return;
  }

  const record = users[u];
  if(!record || record.password !== btoa(p)){
    // increment attempts
    loginAttempts[u] = loginAttempts[u] || {count:0, blockedUntil: 0};
    loginAttempts[u].count++;
    if(loginAttempts[u].count >= 3){
      loginAttempts[u].blockedUntil = Date.now() + 60_000; // 1 minute block
      loginAttempts[u].count = 0;
      alert('Terlalu banyak percobaan salah. Akun diblokir sementara (1 menit).');
    } else {
      alert('Username atau password salah');
    }
    return;
  }

  // success
  loginAttempts[u] = {count:0, blockedUntil:0};
  active = u;
  setActiveUser(u);
  initApp();
});
$('#btnFillDemo').addEventListener('click', ()=> {
  $('#loginUser').value = 'demo'; $('#loginPass').value = 'demo123';
});

/* =================== App initialization =================== */
function initApp(){
  if(!active) return;
  authScreens.classList.add('hidden');
  appView.classList.remove('hidden');
  // Ensure the user data exists (fallback)
  ensureUserData(active);
  // DAILY REFILL: refill hearts once per day per user
  dailyRefreshForUser(active);
  renderAll();
}

/* =================== Daily refill =================== */
function dailyRefreshForUser(username){
  const user = users[username];
  if(!user) return;
  const today = todayKey();
  if(user.data.lastRefresh !== today){
    // refill full hearts
    user.data.hearts = 5;
    user.data.lastRefresh = today;
    users[username] = user;
    saveUsers(users);
  }
}

/* =================== Render functions =================== */
function renderAll(){
  const user = currentUserObj();
  if(!user) return;
  $('#displayName').textContent = user.displayName || active;
  $('#sidebarName').textContent = user.displayName || active;
  $('#courseTitle').textContent = COURSE.title;
  $('#xp').textContent = (user.data.xp||0) + ' XP';
  $('#hearts').textContent = '♥ ' + (user.data.hearts||0);
  $('#streak').textContent = '🔥 ' + (user.data.streak?.count||0);
  // progress
  const totalLessons = COURSE.units.flatMap(u=>u.lessons).length;
  const done = Object.keys(user.data.completedLessons||{}).length;
  $('#progressText').textContent = `${done} / ${totalLessons} lessons`;
  $('#progressFill').style.width = Math.round((done/totalLessons)*100) + '%';
  renderLeaderboard();
  renderMap();
  applyTheme(user.settings.theme);
}

function renderLeaderboard(){
  const root = $('#leaderboard'); root.innerHTML = '';
  const user = currentUserObj();
  const base = (user.data.leaderboard||[]).slice(0,4);
  const arr = [...base, {name:user.displayName, xp:user.data.xp}].sort((a,b)=>b.xp-a.xp).slice(0,5);
  arr.forEach((p,i)=>{
    const el = document.createElement('div'); el.className='leadrow';
    el.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(90deg,#60a5fa,#6ee7b7);display:grid;place-items:center;color:white;font-weight:800">${i+1}</div><div>${p.name}</div></div><div style="font-weight:800">${p.xp} XP</div>`;
    root.appendChild(el);
  });
}

function renderMap(){
  const root = $('#map'); root.innerHTML = '';
  COURSE.units.forEach(u=>{
    const card = document.createElement('div'); card.className='unit';
    const h = document.createElement('h3'); h.textContent = u.title; card.appendChild(h);
    u.lessons.forEach(l=>{
      const done = !!(currentUserObj().data.completedLessons || {})[l.id];
      const el = document.createElement('div'); el.className='lesson';
      el.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div class="badge">${l.title.charAt(0)}</div><div><div style="font-weight:700">${l.title}</div><div class="muted small">${l.challenges.length} tantangan</div></div></div><div class="muted small">${done? 'Selesai ✓' : 'Mulai ▶'}</div>`;
      el.addEventListener('click', ()=> startLesson(l));
      card.appendChild(el);
    });
    root.appendChild(card);
  });
}

/* =================== Player / Quiz =================== */
let playerState = null; // { lesson, index, mistakes, arranged, modalEl }

function startLesson(lesson){
  playerState = { lesson, index:0, mistakes:0, arranged:[] };
  openPlayer();
}

function openPlayer(){
  const overlay = document.createElement('div'); overlay.className='overlay'; overlay.id='overlay';
  const player = document.createElement('div'); player.className='player';
  overlay.appendChild(player);
  modalRoot.appendChild(overlay);
  renderPlayer();
}

function closePlayer(){
  const ov = document.getElementById('overlay'); if(ov) ov.remove();
  playerState = null;
}

function renderPlayer(){
  const player = document.querySelector('.player');
  if(!player || !playerState) return;
  const ch = playerState.lesson.challenges[playerState.index];
  const total = playerState.lesson.challenges.length;
  const pct = Math.round((playerState.index/total)*100);
  const userHearts = (currentUserObj().data.hearts||0);

  player.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div>
        <div style="font-weight:800">${playerState.lesson.title}</div>
        <div class="muted small">${playerState.index+1} / ${total} · Mistakes: ${playerState.mistakes}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="width:160px">
          <div style="height:8px;background:rgba(11,17,32,0.04);border-radius:999px;overflow:hidden">
            <div style="height:100%;background:linear-gradient(90deg,#60a5fa,#6ee7b7);width:${pct}%"></div>
          </div>
        </div>
        <button id="closePlayer" class="btn ghost">Tutup</button>
      </div>
    </div>
    <div class="q">
      <div style="font-weight:700;margin-bottom:8px">${ch.prompt}</div>
      <div id="challengeArea"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
      <div class="muted">Hearts: ${userHearts}</div>
      <div style="display:flex;gap:8px">
        <button id="skipQ" class="btn ghost">Lewati (pakai ♥)</button>
        <button id="submitQ" class="btn">Kirim Jawaban</button>
      </div>
    </div>
  `;

  $('#closePlayer').addEventListener('click', ()=> {
    if(confirm('Tutup pelajaran?')) closePlayer();
  });
  $('#skipQ').addEventListener('click', ()=> {
    const user = currentUserObj();
    if(user.data.hearts > 0){
      user.data.hearts = Math.max(0, user.data.hearts - 1);
      users[active] = user; saveUsers(users); renderAll();
      nextChallenge(true, true);
    } else alert('Tidak ada hearts tersisa');
  });

  const area = $('#challengeArea');
  if(ch.type === 'mc'){
    const container = document.createElement('div'); container.className='choices';
    ch.options.forEach((opt,i)=>{
      const c = document.createElement('div'); c.className='choice'; c.textContent = opt;
      c.addEventListener('click', ()=> { container.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); c.dataset.idx = i; });
      container.appendChild(c);
    });
    area.appendChild(container);
    $('#submitQ').addEventListener('click', ()=> {
      const sel = container.querySelector('.choice.selected');
      if(!sel){ alert('Pilih jawaban'); return; }
      const picked = Number(sel.dataset.idx);
      if(picked === ch.answer) correctAnswer(); else wrongAnswer();
    });
  } else if(ch.type === 'translate' || ch.type === 'listen'){
    const input = document.createElement('input'); input.type='text'; input.placeholder = ch.direction==='id-en' ? 'Tulis jawaban dalam bahasa Inggris' : 'Tulis jawaban';
    area.appendChild(input);
    if(ch.type === 'listen'){
      const btn = document.createElement('button'); btn.className='btn ghost'; btn.style.marginTop='8px'; btn.textContent='▶ Putar Audio';
      btn.addEventListener('click', ()=> speak(ch.tts || ch.answer));
      area.appendChild(btn);
    }
    $('#submitQ').addEventListener('click', ()=> {
      const val = norm(input.value);
      if(!val){ alert('Masukkan jawaban'); return; }
      if(val === norm(ch.answer)) correctAnswer(); else wrongAnswer();
    });
  } else if(ch.type === 'arrange'){
    const tokens = ch.tokens.slice().sort(()=>Math.random()-0.5);
    const pool = document.createElement('div'); pool.style.marginBottom='8px';
    tokens.forEach(t=>{
      const el = document.createElement('span'); el.className='token'; el.textContent = t;
      el.addEventListener('click', ()=> {
        if(!el.classList.contains('used')){
          el.classList.add('used');
          const picked = document.createElement('span'); picked.className='token'; picked.textContent = t;
          picked.addEventListener('click', ()=> { picked.remove(); el.classList.remove('used'); });
          pool.appendChild(picked);
        }
      });
      pool.appendChild(el);
    });
    area.appendChild(pool);
    $('#submitQ').addEventListener('click', ()=> {
      const arranged = Array.from(pool.querySelectorAll('.token')).filter(x=>x.classList.contains('used')).map(n=>n.textContent);
      if(arranged.length === 0){ alert('Susun jawaban dulu'); return; }
      if(JSON.stringify(arranged) === JSON.stringify(ch.answer)) correctAnswer(); else wrongAnswer();
    });
  }

  function correctAnswer(){
    const user = currentUserObj();
    const gained = Math.max(8, 12 - playerState.mistakes*2);
    user.data.xp = (user.data.xp || 0) + gained;
    users[active] = user; saveUsers(users);
    nextChallenge(true, false, gained);
  }

  function wrongAnswer(){
    const user = currentUserObj();
    user.data.hearts = Math.max(0, user.data.hearts - 1);
    playerState.mistakes++;
    users[active] = user; saveUsers(users);
    renderAll();
    if(playerState.mistakes >= 3 || user.data.hearts === 0){
      alert('Pelajaran gagal — nyawa habis. Ulangi nanti.');
      closePlayer();
    } else {
      alert('Salah — nyawa berkurang.');
    }
  }
}

function nextChallenge(succeeded=false, skipped=false, gained=0){
  const lesson = playerState.lesson;
  if(succeeded || skipped){
    if(playerState.index + 1 >= lesson.challenges.length){
      // selesai
      const user = currentUserObj();
      user.data.completedLessons[lesson.id] = true;
      // streak
      const today = todayKey();
      if(user.data.streak.last !== today){
        const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
        user.data.streak.count = (user.data.streak.last === yesterday) ? (user.data.streak.count||0)+1 : 1;
        user.data.streak.last = today;
      }
      if(skipped) user.data.xp = (user.data.xp||0) + 4;
      users[active] = user; saveUsers(users);
      renderAll();
      alert('Pelajaran selesai! XP +' + (gained || (skipped?4:10)));
      closePlayer();
      return;
    } else {
      playerState.index++;
      renderPlayer();
    }
  }
}

/* =================== TTS helper =================== */
function speak(text){
  if(!('speechSynthesis' in window)){ alert('TTS tidak tersedia di browser ini'); return; }
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  if(voices.length){
    const prefer = voices.find(v=>/en-|en_/i.test(v.lang)) || voices[0];
    u.voice = prefer;
  }
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* =================== Quick practice =================== */
$('#quickBtn').addEventListener('click', ()=> {
  const all = COURSE.units.flatMap(u => u.lessons.flatMap(l => l.challenges.map(c => ({...c, lessonId: l.id}))));
  const pick = all.sort(()=>Math.random()-0.5).slice(0,5);
  const lesson = { id:'quick-'+Date.now(), title:'Latihan Cepat', challenges: pick };
  startLesson(lesson);
});

/* =================== Profile & Settings =================== */
function openProfile(){
  const user = currentUserObj();
  if(!user) return;
  const modal = document.createElement('div'); modal.className='overlay'; modal.id='profileModal';
  modal.innerHTML = `
    <div class="player">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800">Profil & Pengaturan</div>
        <button id="closeProfile" class="btn ghost">Tutup</button>
      </div>
      <div style="margin-top:12px">
        <label class="muted small">Nama tampilan</label>
        <input id="editName" value="${user.displayName || active}" style="margin-top:6px" />
        <div style="margin-top:10px" class="muted small">Tema warna</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button data-theme="presetA" class="btn themeBtn">Preset A</button>
          <button data-theme="presetB" class="btn themeBtn">Preset B</button>
          <button data-theme="presetC" class="btn themeBtn">Preset C</button>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button id="saveProfile" class="btn">Simpan</button>
          <button id="rechargeHearts" class="btn ghost">Isi Ulang ♥</button>
          <button id="logoutNow" class="btn ghost">Logout</button>
        </div>
      </div>
    </div>
  `;
  modalRoot.appendChild(modal);
  $('#closeProfile').addEventListener('click', ()=> modal.remove());
  $('#saveProfile').addEventListener('click', ()=>{
    const val = $('#editName').value.trim() || active;
    users[active].displayName = val;
    saveUsers(users); modal.remove(); renderAll();
  });
  $('#logoutNow').addEventListener('click', ()=> { doLogout(); modal.remove(); });
  // theme buttons
  $$('.themeBtn').forEach(b => {
    b.addEventListener('click', ()=> {
      const t = b.dataset.theme;
      users[active].settings.theme = t; saveUsers(users); renderAll();
    });
  });

  // recharge hearts handler
  $('#rechargeHearts').addEventListener('click', ()=>{
    const userNow = currentUserObj();
    if(!userNow) return;
    userNow.data.hearts = 5;
    users[active] = userNow; saveUsers(users);
    alert('Hearts telah diisi ulang!');
    modal.remove();
    renderAll();
  });
}

$('#btnProfile').addEventListener('click', openProfile);
$('#profileBtn').addEventListener('click', openProfile);

/* =================== Buy heart / shop / reset =================== */
$('#buyHeart').addEventListener('click', ()=> {
  const user = currentUserObj();
  user.data.hearts = Math.min(5, (user.data.hearts||0) + 1);
  users[active] = user; saveUsers(users); renderAll();
});
$('#resetProgress').addEventListener('click', ()=> {
  if(!confirm('Reset progress untuk akun ini?')) return;
  const user = currentUserObj();
  user.data.completedLessons = {};
  user.data.xp = 0;
  user.data.hearts = 5;
  user.data.streak = {count:0,last:null};
  users[active] = user; saveUsers(users); renderAll();
});

/* =================== Logout / auth flow =================== */
$('#btnLogout').addEventListener('click', ()=> {
  if(confirm('Logout?')) doLogout();
});
function doLogout(){
  localStorage.removeItem('linguaspark:active');
  active = null;
  appView.classList.add('hidden');
  authScreens.classList.remove('hidden');
  // clear login inputs
  $('#loginUser').value = '';
  $('#loginPass').value = '';
}

/* =================== Theme application =================== */
function applyTheme(preset){
  const root = document.documentElement;
  if(preset === 'presetB'){
    root.style.setProperty('--bg-1','#f0f8ff');
    root.style.setProperty('--bg-2','#fbe7ff');
    // accents handled in css; optionally apply class
  } else if(preset === 'presetC'){
    root.style.setProperty('--bg-1','#fff1f2');
    root.style.setProperty('--bg-2','#fff7ed');
  } else { // presetA default
    root.style.setProperty('--bg-1','#e6f2ff');
    root.style.setProperty('--bg-2','#f0e8ff');
  }
}

/* =================== Startup: if active user exists, go straight in =================== */
(function startup(){
  const a = getActiveUser();
  if(a && users[a]){ active = a; initApp(); }
})();
