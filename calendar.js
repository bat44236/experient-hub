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
  let officeCalId  = 'primary';
  let isAdminAuth  = false;  // full admin (PIN unlocked)
  let isUserAuth   = false;  // regular user write (Office Activity only)
  let currentCalEntries = [];

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

  // ── User OAuth — anyone can trigger this to get write access to Office cal ─
  async function ensureUserAuth(clientId) {
    if (isUserAuth || isAdminAuth) return; // already authed
    const loadScript = src => new Promise(res => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script'); s.src=src; s.onload=res; document.head.appendChild(s);
    });
    await loadScript('https://accounts.google.com/gsi/client');
    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: resp => {
          if (resp.error) { reject(new Error(resp.error)); return; }
          isUserAuth = true;
          resolve();
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
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

    panel.innerHTML = `
      <div class="edp-header">
        <div class="edp-cat-tag" style="background:${CAT_COLOR[evt.cat]}22;color:${CAT_COLOR[evt.cat]};border-color:${CAT_COLOR[evt.cat]}44">
          ${CAT_LABEL[evt.cat]||evt.cat}
        </div>
        <button class="edp-close" id="edp-close-btn">✕</button>
      </div>

      <div class="edp-title" ${canEdit?'contenteditable="true" id="edp-title-field"':''}>${evt.title}</div>
      <div class="edp-date">${dateLabel}</div>

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
        </div>
        <div class="edp-auth-note" id="edp-auth-note" style="display:none">
          <span>Signing in to Google to save changes…</span>
        </div>` : ''}
    `;

    document.getElementById('edp-close-btn').addEventListener('click', closeEventDetail);

    if (canEdit) {
      document.getElementById('edp-save-btn').addEventListener('click', async () => {
        const saveBtn  = document.getElementById('edp-save-btn');
        const authNote = document.getElementById('edp-auth-note');
        const newTitle = document.getElementById('edp-title-field')?.innerText.trim() || evt.title;
        const newDesc  = document.getElementById('edp-desc-field')?.value.trim() || '';
        saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
        try {
          if (!isUserAuth && !isAdminAuth) {
            authNote.style.display = 'block';
            await ensureUserAuth(localStorage.getItem('hub_gcal_client'));
            authNote.style.display = 'none';
          }
          await updateOfficeEvent(evt, newTitle, newDesc);
          closeEventDetail();
        } catch(e) {
          saveBtn.textContent = 'Save changes';
          saveBtn.disabled = false;
          authNote.style.display = 'none';
          alert('Could not save: ' + (e.message||'Unknown error'));
        }
      });

      document.getElementById('edp-delete-btn').addEventListener('click', async () => {
        if (!confirm(`Delete "${evt.title}"?`)) return;
        try {
          if (!isUserAuth && !isAdminAuth) await ensureUserAuth(localStorage.getItem('hub_gcal_client'));
          await deleteOfficeEvent(evt);
          closeEventDetail();
        } catch(e) { alert('Could not delete: ' + (e.message||'Unknown error')); }
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
  async function connectGoogle(clientId, apiKey, calEntries) {
    const loadScript = src => new Promise(res => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s=document.createElement('script'); s.src=src; s.onload=res; document.head.appendChild(s);
    });
    showLoading();
    try {
      await loadScript('https://apis.google.com/js/api.js');
      await new Promise(res => gapi.load('client', res));
      await gapi.client.init({
        apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });
      const officeEntry = calEntries.find(e=>e.cat==='office');
      if (officeEntry) officeCalId = officeEntry.id;
      currentCalEntries = calEntries;
      await fetchEvents(calEntries);
    } catch (err) {
      hideLoading();
      console.error('Google Calendar error:', err);
      alert('Could not connect. Check your API key and calendar sharing settings.');
    }
  }

  // ── Admin OAuth — PIN-gated, full write ───────────────────────────────────
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
          isAdminAuth = true; isUserAuth = true;
          resolve();
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    });
  }

  async function fetchEvents(calEntries) {
    const timeMin = new Date(calYear, 0,  1).toISOString();
    const timeMax = new Date(calYear, 11, 31, 23,59,59).toISOString();
    store = {};
    await Promise.all(calEntries.map(async entry => {
      try {
        const resp = await gapi.client.calendar.events.list({
          calendarId: entry.id, timeMin, timeMax,
          singleEvents: true, orderBy: 'startTime', maxResults: 500,
        });
        (resp.result.items||[]).forEach(item => {
          const startDate = item.start.date || item.start.dateTime?.split('T')[0];
          if (!startDate) return;
          const timeStr = item.start.dateTime
            ? new Date(item.start.dateTime).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
            : null;
          if (!store[startDate]) store[startDate]=[];
          store[startDate].push({
            id: item.id, title: item.summary||'(No title)',
            date: startDate, time: timeStr, allDay: !item.start.dateTime, cat: entry.cat,
            startDateTime: item.start.dateTime||item.start.date,
            endDateTime:   item.end?.dateTime||item.end?.date,
            description:   item.description||'',
            location:      item.location||'',
          });
        });
      } catch(e) { console.warn('Fetch failed for', entry.id, e); }
    }));
    hideLoading();
    render();
  }

  // ── Add event — available to ALL users (triggers OAuth on first use) ───────
  async function addOfficeEvent(evt) {
    const clientId = localStorage.getItem('hub_gcal_client');
    if (!clientId) throw new Error('No OAuth Client ID configured. Ask your admin to set one up.');
    if (!isUserAuth && !isAdminAuth) {
      await ensureUserAuth(clientId);
    }
    const resource = { summary: evt.title };
    if (evt.description) resource.description = evt.description;
    if (evt.location)    resource.location    = evt.location;
    if (evt.allDay) {
      resource.start = { date: evt.date };
      resource.end   = { date: evt.date };
    } else {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      resource.start = { dateTime:`${evt.date}T${evt.startTime}:00`, timeZone:tz };
      resource.end   = { dateTime:`${evt.date}T${evt.endTime}:00`,   timeZone:tz };
    }
    const resp = await gapi.client.calendar.events.insert({ calendarId:officeCalId, resource });
    const newEvt = {
      id: resp.result.id, title: evt.title, date: evt.date,
      time: evt.allDay ? null : new Date(`${evt.date}T${evt.startTime}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}),
      allDay: evt.allDay, cat:'office',
      description: evt.description||'', location: evt.location||'',
      startDateTime: resp.result.start?.dateTime||resp.result.start?.date,
      endDateTime:   resp.result.end?.dateTime  ||resp.result.end?.date,
    };
    if (!store[evt.date]) store[evt.date]=[];
    store[evt.date].push(newEvt);
    render();
    return resp.result;
  }

  async function updateOfficeEvent(evt, newTitle, newDesc) {
    try {
      await gapi.client.calendar.events.patch({
        calendarId: officeCalId, eventId: evt.id,
        resource: { summary: newTitle, description: newDesc },
      });
      evt.title=newTitle; evt.description=newDesc;
      render();
    } catch(e) { console.warn('Update failed',e); throw e; }
  }

  async function deleteOfficeEvent(evt) {
    try {
      await gapi.client.calendar.events.delete({ calendarId:officeCalId, eventId:evt.id });
      Object.keys(store).forEach(date=>{store[date]=store[date].filter(e=>e.id!==evt.id);});
      render();
    } catch(e) { console.warn('Delete failed',e); throw e; }
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
    if (calYear!==prevYear && currentCalEntries.length) await fetchEvents(currentCalEntries);
  });
  document.getElementById('next-month').addEventListener('click', async () => {
    const prevYear=calYear; calMonth++; if(calMonth>11){calMonth=0;calYear++;} render();
    if (calYear!==prevYear && currentCalEntries.length) await fetchEvents(currentCalEntries);
  });

  return { render, loadSample, connectGoogle, adminAuth, addOfficeEvent, exportICal };
})();
