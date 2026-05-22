/* ── CALENDAR MODULE ─────────────────────────────────────────────────────── */

const CAL = (() => {
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  const CAT_PILL  = { office:'pill-office', holiday:'pill-holiday', birthday:'pill-birthday', cnend:'pill-cnend', workann:'pill-workann' };
  const CAT_DOT   = { office:'dot-office',  holiday:'dot-holiday',  birthday:'dot-birthday',  cnend:'dot-cnend',  workann:'dot-workann'  };
  const CAT_LABEL = { office:'Office Activity', holiday:'Holiday', birthday:'Birthday', cnend:'Camp North End', workann:'Work Anniversary' };
  const CAT_COLOR = { office:'var(--c-office-text)', holiday:'var(--c-holiday-text)', birthday:'var(--c-birthday-text)', cnend:'var(--c-cnend-text)', workann:'var(--c-workann-text)' };

  const MAX_PILLS = 3;

  const today = new Date();
  let calYear  = today.getFullYear();
  let calMonth = today.getMonth();

  // ── event store: { 'YYYY-MM-DD': [event, ...] }
  let store = {};

  const SAMPLE = [
    {id:'s1', title:'Team Sync — Archer Migration', date:'2026-05-22', time:'10:00 AM', cat:'office'},
    {id:'s2', title:'Beginner/Run Club',             date:'2026-05-22', time:'6:00 PM',  cat:'cnend'},
    {id:'s3', title:'Disco Luau',                    date:'2026-05-22', time:'4:30 PM',  cat:'cnend'},
    {id:'s4', title:'Cinco de Mayo',                 date:'2026-05-05', allDay:true,     cat:'holiday'},
    {id:'s5', title:'Cinco de Mayo Block Party',     date:'2026-05-05', time:'3:00 PM',  cat:'cnend'},
    {id:'s6', title:'Group Run',                     date:'2026-05-05', time:'5:30 PM',  cat:'cnend'},
    {id:'s7', title:'Mother\'s Day',                 date:'2026-05-10', allDay:true,     cat:'holiday'},
    {id:'s8', title:'Sunrise Session',               date:'2026-05-08', time:'7:00 AM',  cat:'cnend'},
    {id:'s9', title:'Special Edition Market',        date:'2026-05-09', time:'1:00 PM',  cat:'cnend'},
    {id:'s10',title:'Carolina Roller Derby',         date:'2026-05-09', time:'10:00 AM', cat:'cnend'},
    {id:'s11',title:'Drew Marshall\'s Birthday 🎂',  date:'2026-05-13', allDay:true,     cat:'birthday'},
    {id:'s12',title:'Mandie Hancock\'s Birthday 🎂', date:'2026-05-18', allDay:true,     cat:'birthday'},
    {id:'s13',title:'Memorial Day',                  date:'2026-05-25', allDay:true,     cat:'holiday'},
    {id:'s14',title:'Q2 Planning — BRC',             date:'2026-05-21', time:'1:00 PM',  cat:'office'},
    {id:'s15',title:'Chad Carmichael\'s Work Anniversary', date:'2026-06-06', allDay:true, cat:'workann'},
    {id:'s16',title:'Juneteenth',                    date:'2026-06-19', allDay:true,     cat:'holiday'},
    // recurring cnend events
    ...['2026-05-06','2026-05-13','2026-05-20','2026-05-27'].map((d,i)=>({id:`cork${i}`,title:'Cork & Canvas',date:d,time:'4:00 PM',cat:'cnend'})),
    ...['2026-05-07','2026-05-14','2026-05-21','2026-05-28'].map((d,i)=>({id:`survey${i}`,title:'Survey Says Trivia',date:d,time:'7:00 PM',cat:'cnend'})),
    ...['2026-05-12','2026-05-19','2026-05-26'].map((d,i)=>({id:`mad${i}`,title:'Mad Miles Run',date:d,time:'6:30 PM',cat:'cnend'})),
    ...['2026-05-11','2026-05-18','2026-05-25'].map((d,i)=>({id:`inter${i}`,title:'Intermediate Run Club',date:d,time:'10:00 AM',cat:'cnend'})),
    ...['2026-05-11','2026-05-18','2026-05-25'].map((d,i)=>({id:`pickle${i}`,title:'PickleBall Clinic',date:d,time:'6:00 PM',cat:'cnend'})),
    ...['2026-05-11','2026-05-18','2026-05-25'].map((d,i)=>({id:`king${i}`,title:'King of the Trampoline',date:d,time:'7:00 PM',cat:'cnend'})),
    ...['2026-05-08','2026-05-14','2026-05-21','2026-05-28'].map((d,i)=>({id:`wine${i}`,title:'Wine Thursday',date:d,time:'8:00 AM',cat:'cnend'})),
    ...['2026-05-03','2026-05-10','2026-05-17','2026-05-24','2026-05-31'].map((d,i)=>({id:`mim${i}`,title:'Mimosa Sunday',date:d,time:'11:00 AM',cat:'cnend'})),
    ...['2026-05-13','2026-05-20','2026-05-27'].map((d,i)=>({id:`mid${i}`,title:'Midweek Run',date:d,time:'7:00 PM',cat:'cnend'})),
    ...['2026-05-14','2026-05-21'].map((d,i)=>({id:`bulb${i}`,title:'The Bulb',date:d,time:'11:00 AM',cat:'cnend'})),
    ...['2026-05-13','2026-05-20'].map((d,i)=>({id:`beg${i}`,title:'Beginner/Run Club',date:d,time:'1:00 PM',cat:'cnend'})),
    ...['2026-05-21','2026-05-28'].map((d,i)=>({id:`knight${i}`,title:'Knight Vision',date:d,time:'6:00 PM',cat:'cnend'})),
  ];

  function loadSample() {
    store = {};
    SAMPLE.forEach(e => {
      if (!store[e.date]) store[e.date] = [];
      store[e.date].push(e);
    });
  }

  function ds(y, m, d) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function sortEvents(evts) {
    return evts.slice().sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.time || '').localeCompare(b.time || '');
    });
  }

  function makePill(evt) {
    const pill = document.createElement('div');
    pill.className = 'event-pill ' + (CAT_PILL[evt.cat] || 'pill-office');
    const timeSpan = evt.allDay ? '' : `<span class="pill-time">${evt.time}</span>`;
    pill.innerHTML = `<div class="pill-dot ${CAT_DOT[evt.cat] || 'dot-office'}"></div>${timeSpan}<span class="pill-title">${evt.title}</span>`;
    pill.addEventListener('mouseenter', e => showTooltip(evt, e));
    pill.addEventListener('mouseleave', hideTooltip);
    return pill;
  }

  // ── Tooltip
  const tooltip = document.getElementById('evt-tooltip');
  function showTooltip(evt, e) {
    document.getElementById('tt-title').textContent = evt.title;
    const parts = [CAT_LABEL[evt.cat] || '', evt.allDay ? 'All day' : evt.time || ''].filter(Boolean);
    document.getElementById('tt-meta').textContent = parts.join(' · ');
    tooltip.classList.add('show');
    placeTooltip(e.clientX, e.clientY);
  }
  function hideTooltip()  { tooltip.classList.remove('show'); }
  function placeTooltip(x, y) {
    tooltip.style.left = Math.min(x + 14, window.innerWidth  - 280) + 'px';
    tooltip.style.top  = Math.min(y - 10, window.innerHeight - 110) + 'px';
  }
  document.addEventListener('mousemove', e => {
    if (tooltip.classList.contains('show')) placeTooltip(e.clientX, e.clientY);
  });

  // ── Overflow popup
  const overflowPopup = document.getElementById('overflow-popup');
  function showOverflow(dateStr, events, mouseEvent) {
    const d = new Date(dateStr + 'T00:00:00');
    document.getElementById('overflow-date').textContent =
      d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }).toUpperCase();
    const list = document.getElementById('overflow-list');
    list.innerHTML = '';
    events.forEach(evt => list.appendChild(makePill(evt)));
    overflowPopup.classList.add('show');
    overflowPopup.style.left = Math.min(mouseEvent.clientX + 10, window.innerWidth  - 255) + 'px';
    overflowPopup.style.top  = Math.min(mouseEvent.clientY + 10, window.innerHeight - 300) + 'px';
  }
  document.getElementById('overflow-close').addEventListener('click', () => overflowPopup.classList.remove('show'));
  document.addEventListener('click', e => {
    if (!overflowPopup.contains(e.target)) overflowPopup.classList.remove('show');
  });

  // ── Render
  function render() {
    document.getElementById('cal-month-label').textContent = MONTHS[calMonth] + ' ' + calYear;
    const body = document.getElementById('cal-grid-body');
    body.innerHTML = '';

    const firstDow     = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev   = new Date(calYear, calMonth, 0).getDate();
    const prevM = calMonth === 0 ? 11 : calMonth - 1;
    const prevY = calMonth === 0 ? calYear - 1 : calYear;
    const nextM = calMonth === 11 ? 0 : calMonth + 1;
    const nextY = calMonth === 11 ? calYear + 1 : calYear;

    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--)
      cells.push({ y: prevY, m: prevM, d: daysInPrev - i, other: true });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ y: calYear, m: calMonth, d, other: false });
    while (cells.length % 7 !== 0) {
      cells.push({ y: nextY, m: nextM, d: cells.length - firstDow - daysInMonth + 1, other: true });
    }

    const rows = cells.length / 7;
    for (let row = 0; row < rows; row++) {
      const weekEl = document.createElement('div');
      weekEl.className = 'week-row';

      for (let col = 0; col < 7; col++) {
        const cell = cells[row * 7 + col];
        const dateStr = ds(cell.y, cell.m, cell.d);
        const isToday = !cell.other &&
          cell.y === today.getFullYear() && cell.m === today.getMonth() && cell.d === today.getDate();

        const dayEl = document.createElement('div');
        dayEl.className = 'day-cell' + (cell.other ? ' other-month' : '') + (isToday ? ' today' : '');

        const numRow = document.createElement('div');
        numRow.className = 'day-num-row';
        const numEl = document.createElement('div');
        numEl.className = 'day-num';
        numEl.textContent = cell.d;
        numRow.appendChild(numEl);
        dayEl.appendChild(numRow);

        const events = sortEvents(store[dateStr] || []);
        const visible = events.slice(0, MAX_PILLS);
        const hidden  = events.slice(MAX_PILLS);

        visible.forEach(evt => dayEl.appendChild(makePill(evt)));

        if (hidden.length > 0) {
          const more = document.createElement('div');
          more.className = 'more-link';
          more.textContent = `+ ${hidden.length} more`;
          more.addEventListener('click', e => { e.stopPropagation(); showOverflow(dateStr, events, e); });
          dayEl.appendChild(more);
        }

        weekEl.appendChild(dayEl);
      }
      body.appendChild(weekEl);
    }
  }

  // ── Google Calendar OAuth + fetch
  async function connectGoogle(clientId, calEntries) {
    const loadScript = src => new Promise(res => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      document.head.appendChild(s);
    });

    showLoading();

    try {
      await loadScript('https://apis.google.com/js/api.js');
      await new Promise(res => gapi.load('client', res));
      await loadScript('https://accounts.google.com/gsi/client');

      await gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: async resp => {
          if (resp.error) { hideLoading(); alert('Auth error: ' + resp.error); return; }
          await fetchEvents(calEntries);
        },
      });
      tokenClient.requestAccessToken({ prompt: '' });

    } catch (err) {
      hideLoading();
      console.error('Google Calendar error:', err);
      alert('Could not connect. Check your Client ID and Cloud Console settings.');
    }
  }

  async function fetchEvents(calEntries) {
    const timeMin = new Date(calYear, calMonth - 1, 1).toISOString();
    const timeMax = new Date(calYear, calMonth + 2, 0, 23, 59, 59).toISOString();

    store = {};
    await Promise.all(calEntries.map(async entry => {
      try {
        const resp = await gapi.client.calendar.events.list({
          calendarId: entry.id,
          timeMin, timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 500,
        });
        (resp.result.items || []).forEach(item => {
          const startDate = item.start.date || item.start.dateTime?.split('T')[0];
          if (!startDate) return;
          const timeStr = item.start.dateTime
            ? new Date(item.start.dateTime).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
            : null;
          if (!store[startDate]) store[startDate] = [];
          store[startDate].push({
            id: item.id, title: item.summary || '(No title)',
            date: startDate, time: timeStr, allDay: !item.start.dateTime, cat: entry.cat,
          });
        });
      } catch (e) { console.warn('Fetch failed for', entry.id, e); }
    }));

    hideLoading();
    render();

    const btn = document.getElementById('connect-gcal-btn');
    btn.textContent = '✓ Connected';
    btn.classList.add('connected');
  }

  let loadingEl = null;
  function showLoading() {
    const body = document.getElementById('cal-grid-body');
    body.innerHTML = '';
    loadingEl = document.createElement('div');
    loadingEl.className = 'loading-state';
    loadingEl.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Connecting to Google Calendar…</div>';
    body.appendChild(loadingEl);
  }
  function hideLoading() { loadingEl = null; }

  // ── Nav buttons
  document.getElementById('prev-month').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } render();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } render();
  });

  // ── Public API
  return { render, loadSample, connectGoogle };
})();
