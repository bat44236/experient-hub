/* ── APP BOOTSTRAP ───────────────────────────────────────────────────────── */

// ── Date/time header ─────────────────────────────────────────────────────────
(function () {
  function tick() {
    const n = new Date();
    document.getElementById('header-date').textContent =
      n.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }).toUpperCase() +
      '  ·  ' +
      n.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }
  tick(); setInterval(tick, 10000);
})();

// ── View switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

// ── Admin PIN system ──────────────────────────────────────────────────────────
(function () {
  // Change this PIN to whatever you want — only you need to know it
  const ADMIN_PIN      = '2712';          // ← set your PIN here
  const STORAGE_KEY    = 'hub_admin_pin';
  const LOCK_KEY       = 'hub_admin_lock'; // timestamp of last unlock

  const pinModal  = document.getElementById('pin-modal');
  const pinInput  = document.getElementById('pin-input');
  const pinError  = document.getElementById('pin-error');
  const connectBtn= document.getElementById('connect-gcal-btn');

  let logoClickCount = 0;
  let logoClickTimer = null;

  function isUnlocked() {
    // PIN stays unlocked for the browser session (sessionStorage)
    return sessionStorage.getItem(STORAGE_KEY) === 'unlocked';
  }

  function setAdminVisible(show) {
    connectBtn.style.display = show ? '' : 'none';
  }

  // Check on load
  if (isUnlocked()) setAdminVisible(true);

  // Secret gesture: click the logo mark 3× quickly
  document.getElementById('logo-mark-btn').addEventListener('click', () => {
    if (isUnlocked()) return; // already unlocked, nothing to do
    logoClickCount++;
    clearTimeout(logoClickTimer);
    if (logoClickCount >= 3) {
      logoClickCount = 0;
      openPinModal();
    } else {
      logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 800);
    }
  });

  function openPinModal() {
    pinInput.value = '';
    pinError.style.display = 'none';
    pinModal.classList.add('open');
    setTimeout(() => pinInput.focus(), 80);
  }
  function closePinModal() { pinModal.classList.remove('open'); }

  document.getElementById('pin-modal-close').addEventListener('click', closePinModal);
  document.getElementById('pin-cancel').addEventListener('click', closePinModal);
  pinModal.addEventListener('click', e => { if (e.target === pinModal) closePinModal(); });

  function tryUnlock() {
    if (pinInput.value === ADMIN_PIN) {
      sessionStorage.setItem(STORAGE_KEY, 'unlocked');
      closePinModal();
      setAdminVisible(true);
    } else {
      pinError.style.display = 'block';
      pinInput.value = '';
      pinInput.focus();
    }
  }

  document.getElementById('pin-submit').addEventListener('click', tryUnlock);
  pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
})();

// ── Export iCal ───────────────────────────────────────────────────────────────
document.getElementById('export-ical-btn').addEventListener('click', () => CAL.exportICal());

// ── Add Event modal ───────────────────────────────────────────────────────────
(function () {
  const modal      = document.getElementById('add-event-modal');
  const openBtn    = document.getElementById('add-event-btn');
  const closeBtn   = document.getElementById('add-event-modal-close');
  const cancelBtn  = document.getElementById('add-event-cancel');
  const saveBtn    = document.getElementById('add-event-save');
  const alldaySel  = document.getElementById('evt-allday');
  const timeRow    = document.getElementById('evt-time-row');
  const errEl      = document.getElementById('evt-error');

  function open() {
    const t = new Date();
    document.getElementById('evt-date').value =
      `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    document.getElementById('evt-title').value    = '';
    document.getElementById('evt-desc').value     = '';
    document.getElementById('evt-location').value = '';
    document.getElementById('evt-start').value    = '09:00';
    document.getElementById('evt-end').value      = '10:00';
    alldaySel.value = 'allday';
    timeRow.style.display = 'none';
    errEl.style.display   = 'none';
    modal.classList.add('open');
    setTimeout(() => document.getElementById('evt-title').focus(), 80);
  }
  function close() { modal.classList.remove('open'); }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  alldaySel.addEventListener('change', () => {
    timeRow.style.display = alldaySel.value === 'timed' ? 'flex' : 'none';
  });

  saveBtn.addEventListener('click', async () => {
    const title    = document.getElementById('evt-title').value.trim();
    const date     = document.getElementById('evt-date').value;
    const isAllDay = alldaySel.value === 'allday';
    errEl.style.display = 'none';
    if (!title) { showError('Please enter a title.'); return; }
    if (!date)  { showError('Please select a date.');  return; }
    const startTime = document.getElementById('evt-start').value;
    const endTime   = document.getElementById('evt-end').value;
    if (!isAllDay && startTime >= endTime) { showError('End time must be after start time.'); return; }

    saveBtn.disabled    = true;
    saveBtn.textContent = 'Adding…';
    try {
      await CAL.addOfficeEvent({ title, date, allDay: isAllDay, startTime, endTime,
        description: document.getElementById('evt-desc').value.trim(),
        location:    document.getElementById('evt-location').value.trim() });
      close();
    } catch (err) {
      showError(err.message || 'Failed to add event. Make sure Google Calendar is connected.');
    } finally {
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Add to Calendar';
    }
  });

  function showError(msg) { errEl.textContent = msg; errEl.style.display = 'block'; }
})();

// ── Google Calendar modal ─────────────────────────────────────────────────────
(function () {
  let calEntries = JSON.parse(localStorage.getItem('hub_cal_entries') || 'null') || [{ id:'primary', cat:'office' }];
  const CAT_LABEL = { office:'Office Activity', holiday:'Holidays', birthday:'Birthdays', cnend:'Camp North End', workann:'Work Anniversaries' };
  const CAT_COLOR = { office:'var(--c-office-text)', holiday:'var(--c-holiday-text)', birthday:'var(--c-birthday-text)', cnend:'var(--c-cnend-text)', workann:'var(--c-workann-text)' };

  document.getElementById('modal-origin').textContent = window.location.origin;

  function renderEntries() {
    const el = document.getElementById('cal-entry-list');
    el.innerHTML = calEntries.map((e, i) => `
      <div class="cal-entry">
        <div class="cal-entry-id">${e.id}</div>
        <div class="cal-entry-cat" style="color:${CAT_COLOR[e.cat]||'var(--gray-300)'}">${CAT_LABEL[e.cat]||e.cat}</div>
        <button class="cal-entry-rm" data-idx="${i}">✕</button>
      </div>`).join('');
    el.querySelectorAll('.cal-entry-rm').forEach(btn => {
      btn.addEventListener('click', () => { calEntries.splice(Number(btn.dataset.idx), 1); renderEntries(); });
    });
  }

  document.getElementById('add-cal-btn').addEventListener('click', () => {
    const id  = document.getElementById('new-cal-id').value.trim();
    const cat = document.getElementById('new-cal-cat').value;
    if (!id) return;
    calEntries.push({ id, cat });
    document.getElementById('new-cal-id').value = '';
    renderEntries();
  });

  const modal = document.getElementById('gcal-modal');
  function openModal() {
    const saved = localStorage.getItem('hub_gcal_client');
    if (saved) document.getElementById('cfg-client-id').value = saved;
    const savedE = localStorage.getItem('hub_cal_entries');
    if (savedE) calEntries = JSON.parse(savedE);
    renderEntries();
    modal.classList.add('open');
  }
  function closeModal() { modal.classList.remove('open'); }

  document.getElementById('connect-gcal-btn').addEventListener('click', openModal);
  document.getElementById('gcal-modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const clientId = document.getElementById('cfg-client-id').value.trim();
    if (!clientId) { alert('Please enter a Client ID.'); return; }
    localStorage.setItem('hub_gcal_client', clientId);
    localStorage.setItem('hub_cal_entries', JSON.stringify(calEntries));
    closeModal();
    await CAL.connectGoogle(clientId, calEntries);
  });

  // Auto-reconnect on load if credentials already saved
  const savedClient  = localStorage.getItem('hub_gcal_client');
  const savedEntries = localStorage.getItem('hub_cal_entries');
  if (savedClient && savedEntries) {
    calEntries = JSON.parse(savedEntries);
    CAL.connectGoogle(savedClient, calEntries).then(() => {
      document.getElementById('gcal-status-pill').textContent = '● Connected';
      document.getElementById('gcal-status-pill').classList.add('connected');
      document.getElementById('connect-gcal-btn').textContent = 'Manage Calendars';
    });
  }
})();

// ── Init ──────────────────────────────────────────────────────────────────────
CAL.loadSample();
CAL.render();
WS.init();
