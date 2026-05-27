// ── HARDCODED CREDENTIALS — every browser connects automatically ──────────────
const CONFIG = {
  apiKey:   'AIzaSyDUbHdv29FZkFo0EUW9usfWWJ5ErZ6Zzu4',
  clientId: '778007470057-6g7aur2jdjgfb2ooakoommqq0gjpb923.apps.googleusercontent.com',
  calendars: [
    { id: 'en.usa#holiday@group.v.calendar.google.com',                                                  cat: 'holiday'  },
    { id: '9e3d406ff577e84f8520707b3d6fde4f0231d9af3bfa3d540139a70e801dbec2@group.calendar.google.com', cat: 'workann'  },
    { id: '382b2aa86827b768761c16ce3b5bec6323f1d9f62fed78aaf107bf83c537a410@group.calendar.google.com', cat: 'cnend'    },
    { id: '3e2fc9cd2ded39150182128a50e16d2d3ac65d7deabdaa411c2f497446d002fb@group.calendar.google.com', cat: 'birthday' },
  ],
};
// ─────────────────────────────────────────────────────────────────────────────

// ── Date/time header ─────────────────────────────────────────────────────────
(function () {
  function tick() {
    const n = new Date();
    document.getElementById('header-date').textContent =
      n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase() +
      '  ·  ' + n.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  }
  tick(); setInterval(tick, 10000);
})();

// ── View switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+btn.dataset.view).classList.add('active');
  });
});

// ── Admin PIN system ──────────────────────────────────────────────────────────
(function () {
  const ADMIN_PIN  = '2712'; // ← change this
  const pinModal   = document.getElementById('pin-modal');
  const pinInput   = document.getElementById('pin-input');
  const pinError   = document.getElementById('pin-error');
  const connectBtn = document.getElementById('connect-gcal-btn');
  const logoutBtn  = document.getElementById('admin-logout-btn');
  let logoClicks = 0, logoTimer = null;

  function isUnlocked() { return sessionStorage.getItem('hub_admin') === 'yes'; }

  function setAdminUI(show) {
    connectBtn.style.display = show ? '' : 'none';
    logoutBtn.style.display  = show ? '' : 'none';
    // Notify Quincy so Add Person / Manage Fields buttons appear
    if (typeof QUINCY !== 'undefined') QUINCY.notifyAdminChange(show);
  }

  // Exit admin — clears session, reverts pill text if still connected
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('hub_admin');
    setAdminUI(false);
    const pill = document.getElementById('gcal-status-pill');
    if (pill.classList.contains('connected')) {
      pill.textContent = '● Connected';
    }
  });

  if (isUnlocked()) setAdminUI(true);

  document.getElementById('logo-mark-btn').addEventListener('click', () => {
    if (isUnlocked()) return;
    logoClicks++;
    clearTimeout(logoTimer);
    if (logoClicks >= 3) { logoClicks=0; openPin(); }
    else logoTimer = setTimeout(()=>{ logoClicks=0; }, 800);
  });

  function openPin() {
    pinInput.value='';
    document.getElementById('pin-api-key').value = '';
    pinError.style.display='none';
    pinModal.classList.add('open');
    setTimeout(()=>pinInput.focus(), 80);
  }
  function closePin() { pinModal.classList.remove('open'); }

  document.getElementById('pin-modal-close').addEventListener('click', closePin);
  document.getElementById('pin-cancel').addEventListener('click', closePin);
  pinModal.addEventListener('click', e=>{ if(e.target===pinModal) closePin(); });

  async function tryUnlock() {
    if (pinInput.value === ADMIN_PIN) {
      sessionStorage.setItem('hub_admin','yes');

      // Store Anthropic API key for Quincy (session only — never persisted)
      const apiKey = document.getElementById('pin-api-key').value.trim();
      if (apiKey) sessionStorage.setItem('hub_anthropic_key', apiKey);

      closePin();
      setAdminUI(true);

      // Immediately trigger OAuth so admin has write access
      const clientId = localStorage.getItem('hub_gcal_client') || CONFIG.clientId;
      if (clientId) {
        try {
          await CAL.adminAuth(clientId);
          document.getElementById('gcal-status-pill').textContent = '● Admin';
          document.getElementById('gcal-status-pill').classList.add('connected');
        } catch(e) { console.warn('Admin auth failed', e); }
      }
    } else {
      pinError.style.display='block';
      pinInput.value=''; pinInput.focus();
    }
  }

  document.getElementById('pin-submit').addEventListener('click', tryUnlock);
  pinInput.addEventListener('keydown', e=>{ if(e.key==='Enter') tryUnlock(); });
})();

// ── Export iCal ───────────────────────────────────────────────────────────────
document.getElementById('export-ical-btn').addEventListener('click', ()=>CAL.exportICal());

// ── Add Event modal ───────────────────────────────────────────────────────────
(function () {
  const modal     = document.getElementById('add-event-modal');
  const alldaySel = document.getElementById('evt-allday');
  const timeRow   = document.getElementById('evt-time-row');
  const errEl     = document.getElementById('evt-error');
  const saveBtn   = document.getElementById('add-event-save');

  function open() {
    const t = new Date();
    document.getElementById('evt-date').value =
      `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    ['evt-title','evt-desc','evt-location'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('evt-start').value='09:00';
    document.getElementById('evt-end').value='10:00';
    alldaySel.value='allday'; timeRow.style.display='none'; errEl.style.display='none';
    modal.classList.add('open');
    setTimeout(()=>document.getElementById('evt-title').focus(),80);
  }
  function close() { modal.classList.remove('open'); }

  document.getElementById('add-event-btn').addEventListener('click', open);
  document.getElementById('add-event-modal-close').addEventListener('click', close);
  document.getElementById('add-event-cancel').addEventListener('click', close);
  modal.addEventListener('click', e=>{ if(e.target===modal) close(); });
  alldaySel.addEventListener('change', ()=>{
    timeRow.style.display = alldaySel.value==='timed' ? 'flex' : 'none';
  });

  saveBtn.addEventListener('click', async () => {
    const title    = document.getElementById('evt-title').value.trim();
    const date     = document.getElementById('evt-date').value;
    const isAllDay = alldaySel.value==='allday';
    errEl.style.display='none';
    if (!title) { errEl.textContent='Please enter a title.'; errEl.style.display='block'; return; }
    if (!date)  { errEl.textContent='Please select a date.';  errEl.style.display='block'; return; }
    const st=document.getElementById('evt-start').value;
    const et=document.getElementById('evt-end').value;
    if (!isAllDay && st>=et) { errEl.textContent='End time must be after start time.'; errEl.style.display='block'; return; }
    saveBtn.disabled=true; saveBtn.textContent='Adding…';
    try {
      await CAL.addOfficeEvent({
        title, date, allDay:isAllDay, startTime:st, endTime:et,
        description: document.getElementById('evt-desc').value.trim(),
        location:    document.getElementById('evt-location').value.trim(),
      });
      close();
    } catch(err) {
      errEl.textContent = err.message || 'Failed to add event.';
      errEl.style.display='block';
    } finally { saveBtn.disabled=false; saveBtn.textContent='Add to Calendar'; }
  });
})();

// ── Google Calendar modal ─────────────────────────────────────────────────────
(function () {
  let calEntries = JSON.parse(localStorage.getItem('hub_cal_entries')||'null') || [{id:'primary',cat:'office'}];
  const CAT_LABEL = {office:'Office Activity',holiday:'Holidays',birthday:'Birthdays',cnend:'Camp North End',workann:'Work Anniversaries'};
  const CAT_COLOR = {office:'var(--c-office-text)',holiday:'var(--c-holiday-text)',birthday:'var(--c-birthday-text)',cnend:'var(--c-cnend-text)',workann:'var(--c-workann-text)'};

  document.getElementById('modal-origin').textContent = window.location.origin;

  function renderEntries() {
    const el = document.getElementById('cal-entry-list');
    el.innerHTML = calEntries.map((e,i)=>`
      <div class="cal-entry">
        <div class="cal-entry-id">${e.id}</div>
        <div class="cal-entry-cat" style="color:${CAT_COLOR[e.cat]||'var(--gray-300)'}">${CAT_LABEL[e.cat]||e.cat}</div>
        <button class="cal-entry-rm" data-idx="${i}">✕</button>
      </div>`).join('');
    el.querySelectorAll('.cal-entry-rm').forEach(btn=>{
      btn.addEventListener('click',()=>{ calEntries.splice(Number(btn.dataset.idx),1); renderEntries(); });
    });
  }

  document.getElementById('add-cal-btn').addEventListener('click',()=>{
    const id=document.getElementById('new-cal-id').value.trim();
    const cat=document.getElementById('new-cal-cat').value;
    if (!id) return;
    calEntries.push({id,cat});
    document.getElementById('new-cal-id').value='';
    renderEntries();
  });

  const modal = document.getElementById('gcal-modal');
  function openModal() {
    document.getElementById('cfg-api-key').value  = localStorage.getItem('hub_gcal_apikey')||'';
    document.getElementById('cfg-client-id').value= localStorage.getItem('hub_gcal_client')||'';
    const savedE=localStorage.getItem('hub_cal_entries');
    if (savedE) calEntries=JSON.parse(savedE);
    renderEntries();
    modal.classList.add('open');
  }
  function closeModal() { modal.classList.remove('open'); }

  document.getElementById('connect-gcal-btn').addEventListener('click', openModal);
  document.getElementById('gcal-modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(); });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const apiKey   = document.getElementById('cfg-api-key').value.trim();
    const clientId = document.getElementById('cfg-client-id').value.trim();
    if (!apiKey) { alert('Please enter an API key.'); return; }
    localStorage.setItem('hub_gcal_apikey', apiKey);
    if (clientId) localStorage.setItem('hub_gcal_client', clientId);
    localStorage.setItem('hub_cal_entries', JSON.stringify(calEntries));
    closeModal();
    await CAL.connectGoogle(clientId, apiKey, calEntries);
    document.getElementById('gcal-status-pill').textContent='● Connected';
    document.getElementById('gcal-status-pill').classList.add('connected');
    document.getElementById('connect-gcal-btn').textContent='Manage Calendars';
  });

  // Auto-connect on load — use localStorage if admin has customised, otherwise CONFIG
  const savedApiKey  = localStorage.getItem('hub_gcal_apikey')  || CONFIG.apiKey;
  const savedClient  = localStorage.getItem('hub_gcal_client')  || CONFIG.clientId;
  const savedEntries = localStorage.getItem('hub_cal_entries');
  const resolvedEntries = savedEntries ? JSON.parse(savedEntries) : CONFIG.calendars;

  if (resolvedEntries.length) {
    calEntries = resolvedEntries;
    CAL.connectGoogle(savedClient, savedApiKey, calEntries).then(()=>{
      document.getElementById('gcal-status-pill').textContent='● Connected';
      document.getElementById('gcal-status-pill').classList.add('connected');
      document.getElementById('connect-gcal-btn').textContent='Manage Calendars';
    });
  }
})();

// ── Init ──────────────────────────────────────────────────────────────────────
// CONFIG is always present so never show sample data
const _hasCreds = true;
if (!_hasCreds) {
  CAL.loadSample();
}
CAL.render();
WS.init();
QUINCY.init();
