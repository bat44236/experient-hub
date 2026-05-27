/* ── QUINCY MODULE ───────────────────────────────────────────────────────────
   People intelligence layer for E.inCLT Hub
   Drop this file into your repo alongside calendar.js / workspace.js
   Then add <script src="quincy.js"></script> to index.html before app.js
   ─────────────────────────────────────────────────────────────────────────── */

const QUINCY = (() => {

  /* ── Storage keys ────────────────────────────────────────────────────────── */
  const STORE_KEY   = 'quincy_people';
  const SURVEY_DEFS = 'quincy_survey_fields';

  /* ── Default survey field schema ─────────────────────────────────────────── */
  /* Each field: { id, label, type ('text'|'select'|'scale'|'tags'), options? } */
  const DEFAULT_FIELDS = [
    { id:'workstyle',    label:'Workstyle',              type:'text',   placeholder:'e.g. Collaborative, analytical, detail-oriented' },
    { id:'interests',    label:'Interests & hobbies',    type:'text',   placeholder:'e.g. cycling, organizational design, sci-fi' },
    { id:'comm_style',   label:'Communication style',    type:'text',   placeholder:'e.g. Prefers bullet points, needs context first' },
    { id:'mbti',         label:'MBTI type',              type:'select', options:['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'] },
    { id:'learning',     label:'Learning style',         type:'select', options:['Visual','Auditory','Kinesthetic','Reading/Writing'] },
    { id:'hbdi_a',       label:'HBDI — Analytical (A)',  type:'scale',  min:0, max:150 },
    { id:'hbdi_b',       label:'HBDI — Sequential (B)',  type:'scale',  min:0, max:150 },
    { id:'hbdi_c',       label:'HBDI — Interpersonal (C)',type:'scale', min:0, max:150 },
    { id:'hbdi_d',       label:'HBDI — Imaginative (D)', type:'scale',  min:0, max:150 },
    { id:'motivators',   label:'Key motivators',         type:'tags',   placeholder:'e.g. autonomy, recognition, impact' },
    { id:'strengths',    label:'Strengths',              type:'tags',   placeholder:'e.g. strategic thinking, empathy' },
    { id:'dev_areas',    label:'Development areas',      type:'text',   placeholder:'Areas they are actively working on' },
    { id:'notes',        label:'Admin notes',            type:'text',   placeholder:'Private context for team leads only' },
  ];

  /* ── Seed data (replace or clear once real profiles exist) ───────────────── */
  const SEED_PEOPLE = [
    {
      id: 'p1', initials:'SR', avatarColor:'#1D9E75',
      name:'Sandra Reyes', role:'Director of People & Culture', dept:'HR',
      email:'sreyes@experientclt.com', added: Date.now() - 86400000*30,
      data:{
        workstyle:'Collaborative · Relationship-driven',
        interests:'Community engagement, organizational design, yoga',
        comm_style:'Prefers 1:1 conversations, storytelling approach, needs context before decisions',
        mbti:'ENFJ', learning:'Kinesthetic',
        hbdi_a:55, hbdi_b:80, hbdi_c:120, hbdi_d:90,
        motivators:'empathy,community,impact',
        strengths:'relationship building,facilitation,strategic empathy',
        dev_areas:'', notes:''
      }
    },
    {
      id:'p2', initials:'MT', avatarColor:'#185FA5',
      name:'Marcus Tran', role:'Senior Project Manager', dept:'Operations',
      email:'mtran@experientclt.com', added: Date.now() - 86400000*25,
      data:{
        workstyle:'Analytical · Process-oriented · Detail-focused',
        interests:'Data systems, tabletop RPGs, urban cycling',
        comm_style:'Values written summaries, bullet-point clarity, dislikes surprises in meetings',
        mbti:'ISTJ', learning:'Reading/Writing',
        hbdi_a:120, hbdi_b:140, hbdi_c:60, hbdi_d:50,
        motivators:'structure,efficiency,mastery',
        strengths:'systems thinking,documentation,risk management',
        dev_areas:'', notes:''
      }
    },
    {
      id:'p3', initials:'AK', avatarColor:'#BA7517',
      name:'Amara Khoury', role:'Creative Strategist', dept:'Marketing',
      email:'akhoury@experientclt.com', added: Date.now() - 86400000*20,
      data:{
        workstyle:'Conceptual · Visionary · Non-linear thinker',
        interests:'Contemporary art, speculative fiction, travel',
        comm_style:'Thrives in brainstorms, dislikes rigid agendas, needs space to think out loud',
        mbti:'ENFP', learning:'Visual',
        hbdi_a:60, hbdi_b:45, hbdi_c:100, hbdi_d:130,
        motivators:'creativity,exploration,expression',
        strengths:'ideation,storytelling,trend sensing',
        dev_areas:'', notes:''
      }
    },
  ];

  /* ── State ───────────────────────────────────────────────────────────────── */
  let people        = [];
  let fields        = [];
  let activePerson  = null;
  let chatHistory   = [];
  let isAdmin       = false;
  let chatWaiting   = false;
  let searchQuery   = '';

  /* ── Persistence helpers ─────────────────────────────────────────────────── */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      people = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SEED_PEOPLE));
    } catch { people = JSON.parse(JSON.stringify(SEED_PEOPLE)); }
    try {
      const rf = localStorage.getItem(SURVEY_DEFS);
      fields = rf ? JSON.parse(rf) : JSON.parse(JSON.stringify(DEFAULT_FIELDS));
    } catch { fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS)); }
  }

  function savePeople() { localStorage.setItem(STORE_KEY, JSON.stringify(people)); }
  function saveFields()  { localStorage.setItem(SURVEY_DEFS, JSON.stringify(fields)); }

  function uid() { return 'p' + Date.now() + Math.random().toString(36).slice(2,6); }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0,2).map(w=>w[0].toUpperCase()).join('');
  }

  const AVATAR_COLORS = ['#1D9E75','#185FA5','#BA7517','#993556','#3B6D11','#534AB7','#993C1D','#0F6E56'];
  function nextColor() { return AVATAR_COLORS[people.length % AVATAR_COLORS.length]; }

  /* ── Notify app.js that admin state changed (for connect-gcal etc.) ───────── */
  function notifyAdminChange(state) {
    isAdmin = state;
    renderPeopleList();
    if (activePerson) renderProfile(activePerson);
  }

  /* ── DOM helpers ─────────────────────────────────────────────────────────── */
  function qs(sel, root) { return (root||document).querySelector(sel); }

  /* ── HBDI dominant quadrant ──────────────────────────────────────────────── */
  function dominantQuadrant(d) {
    const map = { hbdi_a:'Analytical (A)', hbdi_b:'Sequential (B)', hbdi_c:'Interpersonal (C)', hbdi_d:'Imaginative (D)' };
    let best = 'hbdi_a', max = 0;
    for (const k of Object.keys(map)) {
      const v = parseInt(d[k]) || 0;
      if (v > max) { max = v; best = k; }
    }
    return map[best];
  }

  /* ── System prompt for Quincy AI ─────────────────────────────────────────── */
  function buildSystem(p) {
    const d = p.data;
    const hbdiLine = `A (analytical): ${d.hbdi_a||'?'}, B (sequential): ${d.hbdi_b||'?'}, C (interpersonal): ${d.hbdi_c||'?'}, D (imaginative): ${d.hbdi_d||'?'}`;
    return `You are Quincy, the people-intelligence layer for an internal team application called E.inCLT (Experient Charlotte). Your role is to help team members understand one another — factually and through thoughtful inference.

You have access to the following profile:

Name: ${p.name}
Role: ${p.role}
Department: ${p.dept}
Workstyle: ${d.workstyle||'Not yet collected'}
Interests: ${d.interests||'Not yet collected'}
Communication style: ${d.comm_style||'Not yet collected'}
HBDI profile: ${hbdiLine}. Score range 0–150 (higher = stronger preference). Dominant quadrant: ${dominantQuadrant(d)}.
MBTI: ${d.mbti||'Not yet collected'}
Learning style: ${d.learning||'Not yet collected'}
Key motivators: ${d.motivators||'Not yet collected'}
Strengths: ${d.strengths||'Not yet collected'}
Development areas: ${d.dev_areas||'Not yet collected'}

Guidelines:
- Answer factually when the profile contains the answer.
- When making inferences, label them clearly: "Based on their HBDI profile…" or "Given their MBTI type…"
- Help users think about collaboration, communication strategies, meeting facilitation, conflict patterns, project fit, and team dynamics.
- If a field is missing, acknowledge it and offer what inferences you can from available data.
- Keep responses concise (2–5 sentences) unless depth is clearly needed.
- Tone: warm, professional, insightful — not clinical or HR-jargon-heavy.
- You may compare this person to others on the team if asked, but focus on the current person unless asked otherwise.`;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — People list
  ═══════════════════════════════════════════════════════════════════════════ */
  function renderPeopleList() {
    const container = qs('#quincy-people-list');
    if (!container) return;

    const filtered = people.filter(p =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery) ||
      p.role.toLowerCase().includes(searchQuery) ||
      p.dept.toLowerCase().includes(searchQuery)
    );

    container.innerHTML = filtered.length ? filtered.map(p => `
      <div class="qp-item ${activePerson?.id===p.id?'active':''}" data-id="${p.id}">
        <div class="qp-avatar" style="background:${p.avatarColor}">${p.initials}</div>
        <div class="qp-info">
          <div class="qp-name">${p.name}</div>
          <div class="qp-role">${p.role}</div>
        </div>
        <div class="qp-dept">${p.dept}</div>
      </div>
    `).join('') : `<div class="qp-empty">No people match "${searchQuery}"</div>`;

    container.querySelectorAll('.qp-item').forEach(el => {
      el.addEventListener('click', () => {
        activePerson = people.find(p => p.id === el.dataset.id);
        chatHistory  = [];
        renderPeopleList();
        renderProfile(activePerson);
        renderChat();
      });
    });

    // Admin: add-person button
    const addBtn = qs('#quincy-add-person');
    if (addBtn) addBtn.style.display = isAdmin ? '' : 'none';
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Profile detail
  ═══════════════════════════════════════════════════════════════════════════ */
  function renderProfile(p) {
    const panel = qs('#quincy-profile');
    if (!panel) return;
    if (!p) {
      panel.innerHTML = `<div class="qp-placeholder">Select a person to view their profile.</div>`;
      return;
    }

    const d = p.data;
    const hbdiBars = [
      { label:'Analytical (A)',    key:'hbdi_a', color:'#185FA5' },
      { label:'Sequential (B)',    key:'hbdi_b', color:'#1D9E75' },
      { label:'Interpersonal (C)', key:'hbdi_c', color:'#993556' },
      { label:'Imaginative (D)',   key:'hbdi_d', color:'#BA7517' },
    ];

    const completedFields = fields.filter(f => d[f.id] && String(d[f.id]).trim()).length;
    const totalFields     = fields.length;
    const pct             = Math.round(completedFields / totalFields * 100);

    panel.innerHTML = `
      <div class="qpr-top">
        <div class="qpr-avatar" style="background:${p.avatarColor}">${p.initials}</div>
        <div class="qpr-meta">
          <div class="qpr-name">${p.name}</div>
          <div class="qpr-sub">${p.role} · ${p.dept}</div>
          ${p.email ? `<div class="qpr-email">${p.email}</div>` : ''}
        </div>
        <div class="qpr-actions">
          <div class="qpr-completeness" title="${completedFields} of ${totalFields} fields filled">
            <div class="qpr-comp-bar"><div class="qpr-comp-fill" style="width:${pct}%"></div></div>
            <div class="qpr-comp-label">${pct}% profile complete</div>
          </div>
          ${isAdmin ? `<button class="q-btn-edit" id="quincy-edit-btn">Edit profile</button>` : ''}
        </div>
      </div>

      ${(d.hbdi_a||d.hbdi_b||d.hbdi_c||d.hbdi_d) ? `
      <div class="qpr-section">
        <div class="qpr-section-label">HBDI thinking preferences</div>
        ${hbdiBars.map(b => {
          const val = parseInt(d[b.key]) || 0;
          return `
          <div class="qpr-hbdi-row">
            <div class="qpr-hbdi-quad">${b.label}</div>
            <div class="qpr-hbdi-track"><div class="qpr-hbdi-fill" style="width:${Math.round(val/150*100)}%;background:${b.color}"></div></div>
            <div class="qpr-hbdi-score">${val}</div>
          </div>`;
        }).join('')}
      </div>` : ''}

      <div class="qpr-fields">
        ${fields.filter(f => !f.id.startsWith('hbdi_') && !f.id==='notes' && d[f.id]).map(f => `
          <div class="qpr-field">
            <div class="qpr-field-label">${f.label}</div>
            <div class="qpr-field-value">${formatFieldValue(f, d[f.id])}</div>
          </div>
        `).join('')}
        ${(isAdmin && d.notes) ? `
          <div class="qpr-field qpr-field-admin">
            <div class="qpr-field-label">Admin notes <span class="qpr-admin-badge">admin only</span></div>
            <div class="qpr-field-value">${d.notes}</div>
          </div>` : ''}
      </div>
    `;

    if (isAdmin) {
      qs('#quincy-edit-btn', panel)?.addEventListener('click', () => openEditModal(p));
    }
  }

  function formatFieldValue(field, val) {
    if (!val) return '—';
    if (field.type === 'tags') {
      return val.split(',').map(t => t.trim()).filter(Boolean)
        .map(t => `<span class="qpr-tag">${t}</span>`).join('');
    }
    return val;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Chat
  ═══════════════════════════════════════════════════════════════════════════ */
  const QUICK_PROMPTS = [
    'How should I communicate with them?',
    'What motivates them most?',
    'How do they handle ambiguity?',
    'Best way to pitch a new idea to them?',
    'What project type would suit them?',
  ];

  function renderChat() {
    const wrap = qs('#quincy-chat-messages');
    const chips = qs('#quincy-chat-chips');
    const badge = qs('#quincy-context-badge');
    if (!wrap) return;

    if (badge) badge.textContent = activePerson ? activePerson.name : 'No person selected';

    if (!activePerson) {
      wrap.innerHTML = `<div class="qc-hint">Select a person from the list to start asking Quincy about them.</div>`;
      if (chips) chips.innerHTML = '';
      return;
    }

    if (chatHistory.length === 0) {
      wrap.innerHTML = `<div class="qc-hint">Ask Quincy anything about ${activePerson.name} — communication tips, collaboration strategies, HBDI inferences, and more.</div>`;
    } else {
      wrap.innerHTML = chatHistory.map(m => `
        <div class="qc-msg qc-msg-${m.role}">
          <div class="qc-bubble">${m.content}</div>
          ${m.role==='assistant' ? `<div class="qc-source">Quincy · ${activePerson.name}'s profile</div>` : ''}
        </div>
      `).join('');
    }
    wrap.scrollTop = wrap.scrollHeight;

    if (chips) {
      chips.innerHTML = QUICK_PROMPTS.map(p =>
        `<button class="qc-chip">${p}</button>`
      ).join('');
      chips.querySelectorAll('.qc-chip').forEach(btn => {
        btn.addEventListener('click', () => submitChat(btn.textContent));
      });
    }
  }

  async function submitChat(text) {
    if (chatWaiting || !activePerson || !text.trim()) return;
    const input = qs('#quincy-chat-input');
    if (input) input.value = '';

    chatHistory.push({ role:'user', content: text.trim() });
    chatWaiting = true;
    renderChat();

    const wrap = qs('#quincy-chat-messages');
    if (wrap) {
      const typing = document.createElement('div');
      typing.className = 'qc-msg qc-msg-assistant qc-typing';
      typing.innerHTML = `<div class="qc-bubble"><span></span><span></span><span></span></div>`;
      wrap.appendChild(typing);
      wrap.scrollTop = wrap.scrollHeight;
    }

    const apiKey = sessionStorage.getItem('hub_anthropic_key') || '';
    const headers = { 'Content-Type':'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystem(activePerson),
          messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
        })
      });
      const data = await res.json();
      const reply = data.content?.find(b => b.type==='text')?.text
        || 'I couldn\'t generate a response. Check the API key in admin settings.';
      chatHistory.push({ role:'assistant', content: reply });
    } catch (e) {
      chatHistory.push({ role:'assistant', content:'Connection error — verify the Anthropic API key is set in admin settings.' });
    }

    chatWaiting = false;
    renderChat();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MODAL — Add / Edit person
  ═══════════════════════════════════════════════════════════════════════════ */
  function openAddModal() {
    openPersonModal(null);
  }

  function openEditModal(p) {
    openPersonModal(p);
  }

  function openPersonModal(p) {
    const existing = qs('#quincy-person-modal');
    if (existing) existing.remove();

    const isEdit = !!p;
    const d      = p?.data || {};

    const modal = document.createElement('div');
    modal.id    = 'quincy-person-modal';
    modal.className = 'q-modal-overlay';

    /* Build field inputs */
    const coreFields = `
      <div class="qm-section-label">Basic info</div>
      <div class="qm-row">
        <div class="qm-field">
          <label>Full name *</label>
          <input type="text" id="qm-name" value="${p?.name||''}" placeholder="Jane Smith">
        </div>
        <div class="qm-field">
          <label>Email</label>
          <input type="email" id="qm-email" value="${p?.email||''}" placeholder="jane@experientclt.com">
        </div>
      </div>
      <div class="qm-row">
        <div class="qm-field">
          <label>Job title *</label>
          <input type="text" id="qm-role" value="${p?.role||''}" placeholder="e.g. Project Manager">
        </div>
        <div class="qm-field">
          <label>Department</label>
          <input type="text" id="qm-dept" value="${p?.dept||''}" placeholder="e.g. Operations">
        </div>
      </div>
      <div class="qm-row">
        <div class="qm-field qm-field-sm">
          <label>Avatar initials</label>
          <input type="text" id="qm-initials" value="${p?.initials||''}" placeholder="JD" maxlength="2">
        </div>
        <div class="qm-field qm-field-sm">
          <label>Avatar color</label>
          <input type="color" id="qm-color" value="${p?.avatarColor||nextColor()}">
        </div>
      </div>
    `;

    const surveyFields = fields.map(f => {
      if (f.type === 'scale') {
        const val = parseInt(d[f.id]) || 0;
        return `
          <div class="qm-field">
            <label>${f.label} <span class="qm-scale-val" id="sv-${f.id}">${val}</span></label>
            <input type="range" min="${f.min||0}" max="${f.max||150}" step="1" value="${val}"
              id="qm-${f.id}" oninput="document.getElementById('sv-${f.id}').textContent=this.value">
          </div>`;
      }
      if (f.type === 'select') {
        return `
          <div class="qm-field">
            <label>${f.label}</label>
            <select id="qm-${f.id}">
              <option value="">— Select —</option>
              ${(f.options||[]).map(o => `<option ${d[f.id]===o?'selected':''} value="${o}">${o}</option>`).join('')}
            </select>
          </div>`;
      }
      // text or tags
      const isTextarea = f.id === 'notes' || f.id === 'dev_areas' || f.id === 'comm_style';
      return `
        <div class="qm-field">
          <label>${f.label}${f.type==='tags'?' <span class="qm-hint">(comma-separated)</span>':''}</label>
          ${isTextarea
            ? `<textarea id="qm-${f.id}" placeholder="${f.placeholder||''}" rows="2">${d[f.id]||''}</textarea>`
            : `<input type="text" id="qm-${f.id}" value="${d[f.id]||''}" placeholder="${f.placeholder||''}">`}
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div class="q-modal q-modal-wide">
        <div class="q-modal-header">
          <div class="q-modal-title">${isEdit ? `Edit — ${p.name}` : 'Add new person'}</div>
          <button class="q-modal-close" id="qm-close">✕</button>
        </div>
        <div class="q-modal-body">
          <div class="qm-tabs">
            <button class="qm-tab active" data-tab="basic">Basic info</button>
            <button class="qm-tab" data-tab="survey">Profile data</button>
          </div>
          <div class="qm-tab-panel" id="qmt-basic">${coreFields}</div>
          <div class="qm-tab-panel" id="qmt-survey" style="display:none">
            <div class="qm-section-label">Survey &amp; preference data</div>
            <p class="qm-tab-hint">These fields are populated over time from surveys. Fill in what you have — Quincy uses whatever is available.</p>
            ${surveyFields}
          </div>
        </div>
        <div class="q-modal-footer">
          ${isEdit ? `<button class="q-btn-danger" id="qm-delete">Delete person</button>` : '<span></span>'}
          <div style="display:flex;gap:8px">
            <button class="q-btn-ghost" id="qm-cancel">Cancel</button>
            <button class="q-btn-primary" id="qm-save">${isEdit ? 'Save changes' : 'Add person'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    /* Tab switching */
    modal.querySelectorAll('.qm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.qm-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        modal.querySelectorAll('.qm-tab-panel').forEach(p => p.style.display = 'none');
        qs(`#qmt-${tab.dataset.tab}`, modal).style.display = '';
      });
    });

    /* Close / cancel */
    const closeModal = () => modal.remove();
    qs('#qm-close', modal).addEventListener('click', closeModal);
    qs('#qm-cancel', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    /* Save */
    qs('#qm-save', modal).addEventListener('click', () => {
      const name = qs('#qm-name', modal).value.trim();
      const role = qs('#qm-role', modal).value.trim();
      if (!name || !role) {
        alert('Name and job title are required.');
        return;
      }

      const newData = {};
      fields.forEach(f => {
        const el = qs(`#qm-${f.id}`, modal);
        if (el) newData[f.id] = el.value;
      });

      if (isEdit) {
        p.name         = name;
        p.email        = qs('#qm-email', modal).value.trim();
        p.role         = role;
        p.dept         = qs('#qm-dept', modal).value.trim();
        p.initials     = qs('#qm-initials', modal).value.trim().toUpperCase() || initials(name);
        p.avatarColor  = qs('#qm-color', modal).value;
        p.data         = newData;
      } else {
        const newPerson = {
          id:          uid(),
          name,
          email:       qs('#qm-email', modal).value.trim(),
          role,
          dept:        qs('#qm-dept', modal).value.trim(),
          initials:    qs('#qm-initials', modal).value.trim().toUpperCase() || initials(name),
          avatarColor: qs('#qm-color', modal).value,
          added:       Date.now(),
          data:        newData,
        };
        people.push(newPerson);
        activePerson = newPerson;
      }

      savePeople();
      closeModal();
      renderPeopleList();
      renderProfile(activePerson);
      chatHistory = [];
      renderChat();
    });

    /* Delete */
    if (isEdit) {
      qs('#qm-delete', modal)?.addEventListener('click', () => {
        if (!confirm(`Delete ${p.name}'s profile? This cannot be undone.`)) return;
        people = people.filter(x => x.id !== p.id);
        activePerson = people[0] || null;
        savePeople();
        closeModal();
        renderPeopleList();
        renderProfile(activePerson);
        chatHistory = [];
        renderChat();
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MODAL — Manage survey fields (admin)
  ═══════════════════════════════════════════════════════════════════════════ */
  function openFieldsModal() {
    const existing = qs('#quincy-fields-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id    = 'quincy-fields-modal';
    modal.className = 'q-modal-overlay';

    const renderRows = () => fields.map((f,i) => `
      <div class="qf-row" data-idx="${i}">
        <span class="qf-handle">⠿</span>
        <input class="qf-label-input" value="${f.label}" placeholder="Field label">
        <select class="qf-type-select">
          ${['text','select','scale','tags'].map(t => `<option ${f.type===t?'selected':''} value="${t}">${t}</option>`).join('')}
        </select>
        <button class="qf-remove" title="Remove field">✕</button>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="q-modal q-modal-wide">
        <div class="q-modal-header">
          <div class="q-modal-title">Manage survey fields</div>
          <button class="q-modal-close" id="qf-close">✕</button>
        </div>
        <div class="q-modal-body">
          <p class="qm-tab-hint" style="margin-bottom:12px">These fields define what data is collected per person. Changes apply to all profiles — existing data is preserved.</p>
          <div id="qf-rows">${renderRows()}</div>
          <button class="q-btn-ghost" id="qf-add-field" style="margin-top:10px">+ Add field</button>
        </div>
        <div class="q-modal-footer">
          <button class="q-btn-ghost" id="qf-reset">Reset to defaults</button>
          <div style="display:flex;gap:8px">
            <button class="q-btn-ghost" id="qf-cancel">Cancel</button>
            <button class="q-btn-primary" id="qf-save">Save fields</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    qs('#qf-close', modal).addEventListener('click', closeModal);
    qs('#qf-cancel', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    qs('#qf-add-field', modal).addEventListener('click', () => {
      fields.push({ id:'field_'+Date.now(), label:'New field', type:'text', placeholder:'' });
      qs('#qf-rows', modal).innerHTML = renderRows();
      bindRowEvents();
    });

    qs('#qf-reset', modal).addEventListener('click', () => {
      if (!confirm('Reset all fields to defaults? Custom fields will be removed.')) return;
      fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS));
      qs('#qf-rows', modal).innerHTML = renderRows();
      bindRowEvents();
    });

    qs('#qf-save', modal).addEventListener('click', () => {
      const rows = modal.querySelectorAll('.qf-row');
      fields = Array.from(rows).map((row, i) => {
        const label = qs('.qf-label-input', row).value.trim() || `Field ${i+1}`;
        const type  = qs('.qf-type-select', row).value;
        const existing_f = fields[i] || {};
        return { ...existing_f, label, type };
      });
      saveFields();
      closeModal();
    });

    function bindRowEvents() {
      modal.querySelectorAll('.qf-remove').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          fields.splice(i, 1);
          qs('#qf-rows', modal).innerHTML = renderRows();
          bindRowEvents();
        });
      });
    }
    bindRowEvents();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     INIT — Wire up the Quincy view HTML
  ═══════════════════════════════════════════════════════════════════════════ */
  function init() {
    loadData();

    /* Search */
    const searchEl = qs('#quincy-search');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderPeopleList();
      });
    }

    /* Add person button */
    const addBtn = qs('#quincy-add-person');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    /* Survey fields button */
    const fieldsBtn = qs('#quincy-manage-fields');
    if (fieldsBtn) fieldsBtn.addEventListener('click', openFieldsModal);

    /* Chat input */
    const chatInput = qs('#quincy-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitChat(chatInput.value);
        }
      });
    }

    /* Chat send button */
    const sendBtn = qs('#quincy-chat-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const input = qs('#quincy-chat-input');
        if (input) submitChat(input.value);
      });
    }

    /* Initial render */
    activePerson = people[0] || null;
    renderPeopleList();
    renderProfile(activePerson);
    renderChat();
  }

  /* ── Public API ──────────────────────────────────────────────────────────── */
  return { init, notifyAdminChange };

})();
