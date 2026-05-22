/* ── APP BOOTSTRAP ───────────────────────────────────────────────────────── */

// ── Date header
(function () {
  function tick() {
    const n = new Date();
    document.getElementById('header-date').textContent =
      n.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }).toUpperCase() +
      '  ·  ' +
      n.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }
  tick();
  setInterval(tick, 10000);
})();

// ── View switching
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + target).classList.add('active');
  });
});

// ── Google Calendar modal
(function () {
  let calEntries = JSON.parse(localStorage.getItem('hub_cal_entries') || 'null') || [
    { id: 'primary', cat: 'office' },
  ];

  const CAT_LABEL = {
    office:'Office Activity', holiday:'Holidays', birthday:'Birthdays',
    cnend:'Camp North End', workann:'Work Anniversaries',
  };
  const CAT_COLOR = {
    office:'var(--c-office-text)', holiday:'var(--c-holiday-text)',
    birthday:'var(--c-birthday-text)', cnend:'var(--c-cnend-text)', workann:'var(--c-workann-text)',
  };

  // show current origin in modal
  document.getElementById('modal-origin').textContent = window.location.origin;

  function renderEntries() {
    const el = document.getElementById('cal-entry-list');
    el.innerHTML = calEntries.map((e, i) => `
      <div class="cal-entry">
        <div class="cal-entry-id">${e.id}</div>
        <div class="cal-entry-cat" style="color:${CAT_COLOR[e.cat] || 'var(--white-dim)'}">${CAT_LABEL[e.cat] || e.cat}</div>
        <button class="cal-entry-rm" data-idx="${i}">✕</button>
      </div>`).join('');
    el.querySelectorAll('.cal-entry-rm').forEach(btn => {
      btn.addEventListener('click', () => {
        calEntries.splice(Number(btn.dataset.idx), 1);
        renderEntries();
      });
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

  function openModal() {
    const saved = localStorage.getItem('hub_gcal_client');
    if (saved) document.getElementById('cfg-client-id').value = saved;
    const savedEntries = localStorage.getItem('hub_cal_entries');
    if (savedEntries) calEntries = JSON.parse(savedEntries);
    renderEntries();
    document.getElementById('gcal-modal').classList.add('open');
  }
  function closeModal() { document.getElementById('gcal-modal').classList.remove('open'); }

  document.getElementById('connect-gcal-btn').addEventListener('click', openModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('gcal-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('gcal-modal')) closeModal();
  });

  document.getElementById('modal-save').addEventListener('click', async () => {
    const clientId = document.getElementById('cfg-client-id').value.trim();
    if (!clientId) { alert('Please enter a Client ID.'); return; }
    localStorage.setItem('hub_gcal_client', clientId);
    localStorage.setItem('hub_cal_entries', JSON.stringify(calEntries));
    closeModal();
    await CAL.connectGoogle(clientId, calEntries);
  });

  // auto-reconnect on load
  const savedClient  = localStorage.getItem('hub_gcal_client');
  const savedEntries = localStorage.getItem('hub_cal_entries');
  if (savedClient && savedEntries) {
    calEntries = JSON.parse(savedEntries);
    CAL.connectGoogle(savedClient, calEntries);
  }
})();

// ── Init modules
CAL.loadSample();
CAL.render();
WS.init();
