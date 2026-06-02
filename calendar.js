/* ── CALENDAR MODULE ─────────────────────────────────────────────────────── */
const CAL = (() => {
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const CAT_PILL  = { office:'pill-office', holiday:'pill-holiday', birthday:'pill-birthday', cnend:'pill-cnend', workann:'pill-workann' };
  const CAT_DOT   = { office:'dot-office',  holiday:'dot-holiday',  birthday:'dot-birthday',  cnend:'dot-cnend',  workann:'dot-workann'  };
  const CAT_LABEL = { office:'Office Activity', holiday:'Holiday', birthday:'Birthday', cnend:'Camp North End', workann:'Work Anniversary' };
  const CAT_COLOR = { office:'var(--c-office-text)', holiday:'var(--c-holiday-text)', birthday:'var(--c-birthday-text)', cnend:'var(--c-cnend-text)', workann:'var(--c-workann-text)' };
  const MAX_PILLS = 3;

  const today      = new Date();
  let calYear      = today.getFullYear();
  let calMonth     = today.getMonth();
  let store        = {};
  let currentCalEntries = [];
  let currentApiKey     = '';

  // ── Sample data ───────────────────────────────────────────────────────────
  const SAMPLE = [
    {id:'s1', title:'Team Sync — Archer Migration', date:'2026-05-22', time:'10:00 AM', cat:'office', description:'Weekly check-in on the Archer migration project.', location:'Camp North End, Bldg C'},
    {id:'s2', title:'Q2 Planning — BRC',            date:'2026-05-21', time:'1:00 PM',  cat:'office', description:'Quarterly planning session for BRC deliverables.', location:''},
    {id:'s3', title:'Cinco de Mayo',                date:'2026-05-05', allDay:true,     cat:'holiday', description:'', location:''},
    {id:'s4', title:'Mother\'s Day',                date:'2026-05-10', allDay:true,     cat:'holiday', description:'', location:''},
    {id:'s5', title:'Memorial Day',                 date:'2026-05-25', allDay:true,     cat:'holiday', description:'Office closed.', location:''},
    {id:'s6', title:'Juneteenth',                   date:'2026-06-19', allDay:true,     cat:'holiday', description:'', location:''},
    {id:'s7', title:'Drew Marshall\'s Birthday 🎂', date:'2026-05-13', allDay:true,     cat:'birthday', description:'', location:''},
    {id:'s8', title:'Mandie Hancock\'s Birthday 🎂',date:'2026-05-18', allDay:true,     cat:'birthday', description:'', location:''},
    {id:'s9', title:'Chad Carmichael — Work Ann.',  date:'2026-06-06', allDay:true,     cat:'workann', description:'', location:''},
    ...['2026-05-06','2026-05-13','2026-05-20','2026-05-27'].map((d,i)=>({id:`cork${i}`, title:'Cork & Canvas',        date:d, time:'4:00 PM',  cat:'cnend', description:'Paint night at CNE.', location:'Camp North End'})),
    ...['2026-05-07','2026-05-14','2026-05-21','2026-05-28'].map((d,i)=>({id:`surv${i}`, title:'Survey Says Trivia',   date:d, time:'7:00 PM',  cat:'cnend', description:'', location:'Boileryard Clarke'})),
    ...['2026-05-12','2026-05-19','2026-05-26'].map((d,i)=>             ({id:`mad${i}`,  title:'Mad Miles Run',        date:d, time:'6:30 PM',  cat:'cnend', description:'', location:'Camp North End'})),
    ...['2026-05-11','2026-05-18','2026-05-25'].map((d,i)=>             ({id:`intv${i}`, title:'Intermediate Run Club',date:d, time:'10:00 AM', cat:'cnend', description:'', location:'Camp North End'})),
    ...['2026-05-11','2026-05-18','2026-05-25'].map((d,i)=>             ({id:`pick${i}`, title:'PickleBall Clinic',    date:d, time:'6:00 PM',  cat:'cnend', description:'', location:'Camp North End'})),
    ...['2026-05-08','2026-05-14','2026-05-21','2026-05-28'].map((d,i)=>({id:`wine${i}`, title:'Wine Thursday',        date:d, time:'8:00 AM',  cat:'cnend', description:'', location:'Boileryard Clarke'})),
    ...['2026-05-03','2026-05-10','2026-05-17','2026-05-24','2026-05-31'].map((d,i)=>({id:`mim${i}`, title:'Mimosa Sunday', date:d, time:'11:00 AM', cat:'cnend', description:'', location:'Camp North End'})),
    {id:'disco', title:'Disco Luau',              date:'2026-05-22', time:'4:30 PM',  cat:'cnend', description:'', location:'Camp North End'},
    {id:'novel', title:'That\'s Novel Book Club', date:'2026-05-17', time:'9:30 AM',  cat:'cnend', description:'', location:'Camp North End'},
    {id:'boiler',title:'Boileryard Pool',         date:'2026-05-24', time:'12:00 PM', cat:'cnend', description:'', location:'Boileryard Clarke'},
  ];

  function loadSample() {
    store = {};
    SAMPLE.forEach(e => { if (!store[e.date]) store[e.date]=[]; store[e.date].push(e); });
  }

  function ds(y,m,d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

  function sortEvents(evts) {
    return evts.slice().sort((a,b)=>{
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return  1;
      return (a.time||'').localeCompare(b.time||'');
    });
  }

  // ── Event detail panel ───────────────────────────────────────────────────
  function openEventDetail(evt) {
    const panel   = document.getElementById('evt-detail-panel');
    const overlay = document.getElementById('evt-detail-overlay');
    const isOffice = evt.cat === 'office';
    // Both regular users and admins can edit Office Activity events
    const canEdit  = isOffice;

    const dateLabel = evt.allDay
      ? new Date(evt.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
      : (() => {
          const d = new Date(evt.startDateTime || evt.date+'T00:00:00');
          return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
            + (evt.time ? ' · ' + evt.time : '');
        })();

    // parse existing time values for edit fields
    const existingDate  = evt.date || '';
    const existingStart = evt.startDateTime && !evt.allDay
      ? evt.startDateTime.split('T')[1]?.slice(0,5) || '09:00'
      : '09:00';
    const existingEnd = evt.endDateTime && !evt.allDay
      ? evt.endDateTime.split('T')[1]?.slice(0,5) || '10:00'
      : '10:00';

    panel.innerHTML = `
      <div class="edp-header">
        <div class="edp-cat-tag" style="background:${CAT_COLOR[evt.cat]}22;color:${CAT_COLOR[evt.cat]};border-color:${CAT_COLOR[evt.cat]}44">
          ${CAT_LABEL[evt.cat]||evt.cat}
        </div>
        <button class="edp-close" id="edp-close-btn">✕</button>
      </div>

      <div class="edp-title" ${canEdit?'contenteditable="true" id="edp-title-field"':''}>${evt.title}</div>

      ${canEdit ? `
        <div class="edp-edit-row">
          <div class="modal-label" style="margin-bottom:5px">Date</div>
          <input class="modal-input" id="edp-date-field" type="date" value="${existingDate}" style="margin-bottom:10px">
          <div class="modal-label" style="margin-bottom:5px">Type</div>
          <select class="modal-input modal-select" id="edp-allday-field" style="margin-bottom:10px">
            <option value="allday" ${evt.allDay?'selected':''}>All Day</option>
            <option value="timed"  ${!evt.allDay?'selected':''}>Specific Time</option>
          </select>
          <div id="edp-time-fields" style="display:${evt.allDay?'none':'flex'};gap:10px;margin-bottom:10px">
            <div style="flex:1">
              <div class="modal-label" style="margin-bottom:5px">Start</div>
              <input class="modal-input" id="edp-start-field" type="time" value="${existingStart}">
            </div>
            <div style="flex:1">
              <div class="modal-label" style="margin-bottom:5px">End</div>
              <input class="modal-input" id="edp-end-field" type="time" value="${existingEnd}">
            </div>
          </div>
        </div>` : `<div class="edp-date">${dateLabel}</div>`}

      ${evt.location ? `<div class="edp-row"><span class="edp-icon">📍</span><span class="edp-val">${evt.location}</span></div>` : ''}
      <div class="edp-row"><span class="edp-icon">🗂️</span><span class="edp-val">${CAT_LABEL[evt.cat]||evt.cat}</span></div>

      <div class="edp-desc-wrap">
        ${canEdit
          ? `<textarea class="edp-desc-edit" id="edp-desc-field" placeholder="Add a description…">${evt.description||''}</textarea>`
          : `<div class="edp-desc-read">${evt.description||'<span style="color:var(--gray-700)">No description</span>'}</div>`
        }
      </div>

      ${canEdit ? `
        <div class="edp-actions">
          <button class="btn-primary-sm" id="edp-save-btn">Save changes</button>
          <button class="btn-ghost-sm edp-delete-btn" id="edp-delete-btn">Delete event</button>
        </div>` : ''}
    `;

    document.getElementById('edp-close-btn').addEventListener('click', closeEventDetail);

    if (canEdit) {
      // toggle time fields based on all-day select
      document.getElementById('edp-allday-field').addEventListener('change', e => {
        document.getElementById('edp-time-fields').style.display =
          e.target.value === 'timed' ? 'flex' : 'none';
      });

      document.getElementById('edp-save-btn').addEventListener('click', async () => {
        const newTitle  = document.getElementById('edp-title-field')?.innerText.trim() || evt.title;
        const newDesc   = document.getElementById('edp-desc-field')?.value.trim() || '';
        const newDate   = document.getElementById('edp-date-field')?.value || evt.date;
        const isAllDay  = document.getElementById('edp-allday-field')?.value === 'allday';
        const newStart  = document.getElementById('edp-start-field')?.value || '09:00';
        const newEnd    = document.getElementById('edp-end-field')?.value   || '10:00';
        const timeStr   = isAllDay ? null
          : new Date(`${newDate}T${newStart}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
        const btn = document.getElementById('edp-save-btn');
        btn.disabled = true; btn.textContent = 'Saving…';
        await updateOfficeEvent(evt, newTitle, newDesc, newDate, isAllDay, newStart, newEnd, timeStr);
        closeEventDetail();
      });

      document.getElementById('edp-delete-btn').addEventListener('click', async () => {
        if (!confirm(`Delete "${evt.title}"?`)) return;
        await deleteOfficeEvent(evt);
        closeEventDetail();
      });
    }

    panel.classList.add('open');
    overlay.classList.add('open');
  }

  function closeEventDetail() {
    document.getElementById('evt-detail-panel').classList.remove('open');
    document.getElementById('evt-detail-overlay').classList.remove('open');
  }

  // close on overlay click
  document.getElementById('evt-detail-overlay').addEventListener('click', closeEventDetail);

  // ── Pill builder ──────────────────────────────────────────────────────────
  function makePill(evt) {
    const pill = document.createElement('div');
    pill.className = 'event-pill ' + (CAT_PILL[evt.cat]||'pill-office');
    pill.style.cursor = 'pointer';
    const t = evt.allDay ? '' : `<span class="pill-time">${evt.time}</span>`;
    pill.innerHTML = `<div class="pill-dot ${CAT_DOT[evt.cat]||'dot-office'}"></div>${t}<span class="pill-title">${evt.title}</span>`;
    pill.addEventListener('mouseenter', e => showTooltip(evt, e));
    pill.addEventListener('mouseleave', hideTooltip);
    pill.addEventListener('click', e => { e.stopPropagation(); hideTooltip(); openEventDetail(evt); });
    return pill;
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────
  const tooltip = document.getElementById('evt-tooltip');
  function showTooltip(evt, e) {
    document.getElementById('tt-title').textContent = evt.title;
    const parts = [CAT_LABEL[evt.cat]||'', evt.allDay ? 'All day' : evt.time||''];
    if (evt.location) parts.push(evt.location);
    document.getElementById('tt-meta').textContent = parts.filter(Boolean).join(' · ');
    tooltip.classList.add('show');
    placeTooltip(e.clientX, e.clientY);
  }
  function hideTooltip() { tooltip.classList.remove('show'); }
  function placeTooltip(x,y) {
    tooltip.style.left = Math.min(x+14, window.innerWidth -280)+'px';
    tooltip.style.top  = Math.min(y-10,  window.innerHeight-120)+'px';
  }
  document.addEventListener('mousemove', e => {
    if (tooltip.classList.contains('show')) placeTooltip(e.clientX, e.clientY);
  });

  // ── Overflow popup ────────────────────────────────────────────────────────
  const overflowPopup = document.getElementById('overflow-popup');
  function showOverflow(dateStr, events, me) {
    const d = new Date(dateStr+'T00:00:00');
    document.getElementById('overflow-date').textContent =
      d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
    const list = document.getElementById('overflow-list');
    list.innerHTML = '';
    events.forEach(evt => list.appendChild(makePill(evt)));
    overflowPopup.classList.add('show');
    overflowPopup.style.left = Math.min(me.clientX+10, window.innerWidth -255)+'px';
    overflowPopup.style.top  = Math.min(me.clientY+10, window.innerHeight-300)+'px';
  }
  document.getElementById('overflow-close').addEventListener('click',()=>overflowPopup.classList.remove('show'));
  document.addEventListener('click', e => { if (!overflowPopup.contains(e.target)) overflowPopup.classList.remove('show'); });

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    document.getElementById('cal-month-label').textContent = MONTHS[calMonth]+' '+calYear;
    const body = document.getElementById('cal-grid-body');
    body.innerHTML = '';
    const firstDow    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const daysInPrev  = new Date(calYear, calMonth, 0).getDate();
    const prevM = calMonth===0?11:calMonth-1; const prevY = calMonth===0?calYear-1:calYear;
    const nextM = calMonth===11?0:calMonth+1; const nextY = calMonth===11?calYear+1:calYear;
    const cells = [];
    for (let i=firstDow-1;i>=0;i--) cells.push({y:prevY,m:prevM,d:daysInPrev-i,other:true});
    for (let d=1;d<=daysInMonth;d++) cells.push({y:calYear,m:calMonth,d,other:false});
    while (cells.length%7!==0) cells.push({y:nextY,m:nextM,d:cells.length-firstDow-daysInMonth+1,other:true});
    const rows = cells.length/7;
    for (let row=0;row<rows;row++) {
      const weekEl = document.createElement('div'); weekEl.className='week-row';
      for (let col=0;col<7;col++) {
        const cell    = cells[row*7+col];
        const dateStr = ds(cell.y,cell.m,cell.d);
        const isToday = !cell.other && cell.y===today.getFullYear() && cell.m===today.getMonth() && cell.d===today.getDate();
        const dayEl   = document.createElement('div');
        dayEl.className = 'day-cell'+(cell.other?' other-month':'')+(isToday?' today':'');
        const numRow=document.createElement('div'); numRow.className='day-num-row';
        const numEl=document.createElement('div');  numEl.className='day-num'; numEl.textContent=cell.d;
        numRow.appendChild(numEl); dayEl.appendChild(numRow);
        const events=sortEvents(store[dateStr]||[]);
        events.slice(0,MAX_PILLS).forEach(evt=>dayEl.appendChild(makePill(evt)));
        if (events.length>MAX_PILLS) {
          const more=document.createElement('div'); more.className='more-link';
          more.textContent=`+ ${events.length-MAX_PILLS} more`;
          more.addEventListener('click',e=>{e.stopPropagation();showOverflow(dateStr,events,e);});
          dayEl.appendChild(more);
        }
        weekEl.appendChild(dayEl);
      }
      body.appendChild(weekEl);
    }
  }

  // ── Google Calendar — public read via API key ─────────────────────────────
  // ── Load from static events.json (generated by GitHub Actions) ──────────
  async function connectGoogle(clientId, apiKey, calEntries) {
    showLoading();
    currentApiKey     = apiKey;
    currentCalEntries = calEntries;
    await fetchEvents();
  }

  async function adminAuth(clientId) {
    const loadScript = src => new Promise(res => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s=document.createElement('script'); s.src=src; s.onload=res; document.head.appendChild(s);
    });
    await loadScript('https://accounts.google.com/gsi/client');
    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: resp => {
          if (resp.error) { reject(new Error(resp.error)); return; }
          resolve();
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
  }

  async function fetchEvents() {
    try {
      const resp = await fetch(`events.json?t=${Date.now()}`);
      if (!resp.ok) throw new Error('events.json not found — run the GitHub Action first');
      const data = await resp.json();
      store = {};
      (data.events || []).forEach(e => {
        if (!e.date) return;
        const timeStr = e.startDateTime && !e.allDay
          ? new Date(e.startDateTime).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
          : null;
        if (!store[e.date]) store[e.date] = [];
        store[e.date].push({ ...e, time: timeStr });
      });
      await loadOfficeEvents();
      hideLoading();
      render();
      // show last updated time
      if (data.updatedAt) {
        const t = new Date(data.updatedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
        const pill = document.getElementById('gcal-status-pill');
        if (pill) { pill.textContent = `● Synced ${t}`; pill.classList.add('connected'); }
      }
    } catch(err) {
      console.warn('Could not load events.json:', err.message);
      hideLoading();
      render();
    }
  }

  // ── Shared office event storage via JSONBin ──────────────────────────────
  const BIN_ID  = '6a1f2273f5f4af5e29aead82';
  const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  async function loadOfficeEvents() {
    try {
      const resp = await fetch(BIN_URL + '/latest');
      if (!resp.ok) return;
      const data = await resp.json();
      const events = data.record?.events || [];
      events.forEach(e => {
        if (!store[e.date]) store[e.date] = [];
        if (!store[e.date].find(x => x.id === e.id)) store[e.date].push(e);
      });
    } catch(e) { console.warn('Could not load office events', e); }
  }

  async function saveOfficeEvents() {
    try {
      // collect all office events currently in store
      const all = [];
      Object.values(store).forEach(evts => evts.forEach(e => { if (e.cat === 'office') all.push(e); }));
      await fetch(BIN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: all }),
      });
    } catch(e) { console.warn('Could not save office events', e); }
  }

  // ── Add event — stored in shared JSONBin, visible to all users ────────────
  async function addOfficeEvent(evt) {
    const id = 'office-' + Date.now().toString(36);
    const timeStr = evt.allDay ? null
      : new Date(`${evt.date}T${evt.startTime}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const newEvt = {
      id, title: evt.title, date: evt.date,
      time: timeStr, allDay: evt.allDay, cat: 'office',
      description: evt.description||'', location: evt.location||'',
      startDateTime: evt.allDay ? evt.date : `${evt.date}T${evt.startTime}:00`,
      endDateTime:   evt.allDay ? evt.date : `${evt.date}T${evt.endTime}:00`,
    };
    if (!store[evt.date]) store[evt.date] = [];
    store[evt.date].push(newEvt);
    await saveOfficeEvents();
    render();
    return newEvt;
  }

  async function updateOfficeEvent(evt, newTitle, newDesc, newDate, isAllDay, newStart, newEnd, timeStr) {
    // remove from old date slot
    const oldDate = evt.date;
    if (store[oldDate]) store[oldDate] = store[oldDate].filter(e => e.id !== evt.id);

    // apply all updates to the event object
    evt.title       = newTitle;
    evt.description = newDesc;
    evt.date        = newDate        || evt.date;
    evt.allDay      = isAllDay       ?? evt.allDay;
    evt.time        = timeStr        ?? evt.time;
    evt.startDateTime = isAllDay ? evt.date : `${newDate}T${newStart}:00`;
    evt.endDateTime   = isAllDay ? evt.date : `${newDate}T${newEnd}:00`;

    // place in new date slot
    if (!store[evt.date]) store[evt.date] = [];
    store[evt.date].push(evt);

    await saveOfficeEvents();
    render();
  }

  async function deleteOfficeEvent(evt) {
    Object.keys(store).forEach(date => { store[date] = store[date].filter(e => e.id !== evt.id); });
    await saveOfficeEvents();
    render();
  }

  // ── Export iCal ───────────────────────────────────────────────────────────
  function exportICal() {
    const allEvents=[];
    Object.values(store).forEach(evts=>evts.forEach(e=>allEvents.push(e)));
    if (!allEvents.length) { alert('No events to export.'); return; }
    const esc=s=>(s||'').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const uid=()=>Math.random().toString(36).slice(2)+'-experient-hub';
    const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    const toD=s=>s.replace(/-/g,'');
    const toDT=d=>new Date(d).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Experient CLT Hub//EN',
               'CALSCALE:GREGORIAN','METHOD:PUBLISH',
               `X-WR-CALNAME:Experient CLT Hub — ${MONTHS[calMonth]} ${calYear}`];
    allEvents.forEach(e=>{
      ics.push('BEGIN:VEVENT',`UID:${uid()}`,`DTSTAMP:${stamp}`,`SUMMARY:${esc(e.title)}`);
      if (e.description) ics.push(`DESCRIPTION:${esc(e.description)}`);
      if (e.location)    ics.push(`LOCATION:${esc(e.location)}`);
      ics.push(`CATEGORIES:${e.cat.toUpperCase()}`);
      if (e.allDay||!e.startDateTime) {
        ics.push(`DTSTART;VALUE=DATE:${toD(e.date)}`,`DTEND;VALUE=DATE:${toD(e.date)}`);
      } else {
        ics.push(`DTSTART:${toDT(e.startDateTime)}`,`DTEND:${toDT(e.endDateTime||e.startDateTime)}`);
      }
      ics.push('END:VEVENT');
    });
    ics.push('END:VCALENDAR');
    const content=ics.join('\r\n');
    const filename=`experient-clt-${calYear}-${String(calMonth+1).padStart(2,'0')}.ics`;
    const dataUri='data:text/calendar;charset=utf-8,'+encodeURIComponent(content);
    const a=document.createElement('a');
    a.href=dataUri; a.download=filename; a.style.display='none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  let loadingEl=null;
  function showLoading() {
    const body=document.getElementById('cal-grid-body'); body.innerHTML='';
    loadingEl=document.createElement('div'); loadingEl.className='loading-state';
    loadingEl.innerHTML='<div class="loading-spinner"></div><div class="loading-text">Loading calendars…</div>';
    body.appendChild(loadingEl);
  }
  function hideLoading() { loadingEl=null; }

  // ── Nav ───────────────────────────────────────────────────────────────────
  document.getElementById('prev-month').addEventListener('click', async () => {
    const prevYear=calYear; calMonth--; if(calMonth<0){calMonth=11;calYear--;} render();
    if (calYear!==prevYear) await fetchEvents();
  });
  document.getElementById('next-month').addEventListener('click', async () => {
    const prevYear=calYear; calMonth++; if(calMonth>11){calMonth=0;calYear++;} render();
    if (calYear!==prevYear) await fetchEvents();
  });

  return { render, loadSample, connectGoogle, adminAuth, addOfficeEvent, exportICal };
})();
