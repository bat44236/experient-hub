/* ── QUINCY MODULE ───────────────────────────────────────────────────────────
   People intelligence layer for E.inCLT Hub
   - Default view: chatbot only (all profiles fed silently into context)
   - Admin view: full three-panel layout (people list, profiles, edit controls)
   ─────────────────────────────────────────────────────────────────────────── */

const QUINCY = (() => {

  /* ── Storage keys ────────────────────────────────────────────────────────── */
  const STORE_KEY  = 'quincy_people';
  const FIELDS_KEY = 'quincy_survey_fields';

  /* ── Default survey field schema ─────────────────────────────────────────── */
  const DEFAULT_FIELDS = [
    { id:'workstyle',  label:'Workstyle',               type:'text',   placeholder:'e.g. Collaborative, analytical, detail-oriented' },
    { id:'interests',  label:'Interests & hobbies',     type:'text',   placeholder:'e.g. cycling, organizational design, sci-fi' },
    { id:'comm_style', label:'Communication style',     type:'text',   placeholder:'e.g. Prefers bullet points, needs context first' },
    { id:'mbti',       label:'MBTI type',               type:'select', options:['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'] },
    { id:'learning',   label:'Learning style',          type:'select', options:['Visual','Auditory','Kinesthetic','Reading/Writing'] },
    { id:'hbdi_a',     label:'HBDI — Analytical (A)',   type:'scale',  min:0, max:150 },
    { id:'hbdi_b',     label:'HBDI — Sequential (B)',   type:'scale',  min:0, max:150 },
    { id:'hbdi_c',     label:'HBDI — Interpersonal (C)',type:'scale',  min:0, max:150 },
    { id:'hbdi_d',     label:'HBDI — Imaginative (D)',  type:'scale',  min:0, max:150 },
    { id:'motivators', label:'Key motivators',          type:'tags',   placeholder:'e.g. autonomy, recognition, impact' },
    { id:'strengths',  label:'Strengths',               type:'tags',   placeholder:'e.g. strategic thinking, empathy' },
    { id:'dev_areas',  label:'Development areas',       type:'text',   placeholder:'Areas they are actively working on' },
    { id:'notes',      label:'Admin notes',             type:'text',   placeholder:'Private context for team leads only' },
  ];

  /* ── Seed data ───────────────────────────────────────────────────────────── */
  const SEED_PEOPLE = [
    {
      id:'p1', initials:'SR', avatarColor:'#1D9E75',
      name:'Sandra Reyes', role:'Director of People & Culture', dept:'HR',
      email:'sreyes@experientclt.com', added: Date.now() - 86400000*30,
      data:{ workstyle:'Collaborative · Relationship-driven', interests:'Community engagement, organizational design, yoga', comm_style:'Prefers 1:1 conversations, storytelling approach, needs context before decisions', mbti:'ENFJ', learning:'Kinesthetic', hbdi_a:55, hbdi_b:80, hbdi_c:120, hbdi_d:90, motivators:'empathy,community,impact', strengths:'relationship building,facilitation,strategic empathy', dev_areas:'', notes:'' }
    },
    {
      id:'p2', initials:'MT', avatarColor:'#185FA5',
      name:'Marcus Tran', role:'Senior Project Manager', dept:'Operations',
      email:'mtran@experientclt.com', added: Date.now() - 86400000*25,
      data:{ workstyle:'Analytical · Process-oriented · Detail-focused', interests:'Data systems, tabletop RPGs, urban cycling', comm_style:'Values written summaries, bullet-point clarity, dislikes surprises in meetings', mbti:'ISTJ', learning:'Reading/Writing', hbdi_a:120, hbdi_b:140, hbdi_c:60, hbdi_d:50, motivators:'structure,efficiency,mastery', strengths:'systems thinking,documentation,risk management', dev_areas:'', notes:'' }
    },
    {
      id:'p3', initials:'AK', avatarColor:'#BA7517',
      name:'Amara Khoury', role:'Creative Strategist', dept:'Marketing',
      email:'akhoury@experientclt.com', added: Date.now() - 86400000*20,
      data:{ workstyle:'Conceptual · Visionary · Non-linear thinker', interests:'Contemporary art, speculative fiction, travel', comm_style:'Thrives in brainstorms, dislikes rigid agendas, needs space to think out loud', mbti:'ENFP', learning:'Visual', hbdi_a:60, hbdi_b:45, hbdi_c:100, hbdi_d:130, motivators:'creativity,exploration,expression', strengths:'ideation,storytelling,trend sensing', dev_areas:'', notes:'' }
    },
    {
      id:'p4', initials:'JW', avatarColor:'#993556',
      name:'James Whitfield', role:'Finance & Compliance Lead', dept:'Finance',
      email:'jwhitfield@experientclt.com', added: Date.now() - 86400000*15,
      data:{ workstyle:'Structured · Risk-aware · Methodical', interests:'Investing, military history, golf', comm_style:'Responds well to data-backed proposals, prefers formal communication, skeptical of ambiguity', mbti:'INTJ', learning:'Reading/Writing', hbdi_a:130, hbdi_b:145, hbdi_c:55, hbdi_d:40, motivators:'structure,accuracy,control', strengths:'risk management,compliance,financial modeling', dev_areas:'', notes:'' }
    },
    {
      id:'p5', initials:'LP', avatarColor:'#3B6D11',
      name:'Layla Patel', role:'Learning & Development Specialist', dept:'HR',
      email:'lpatel@experientclt.com', added: Date.now() - 86400000*10,
      data:{ workstyle:'Empathetic · Adaptive · People-first', interests:'Neuroscience, podcast production, hiking', comm_style:'Open to all formats, uses active listening, builds rapport before getting to business', mbti:'INFJ', learning:'Auditory', hbdi_a:75, hbdi_b:70, hbdi_c:115, hbdi_d:105, motivators:'growth,connection,purpose', strengths:'coaching,curriculum design,empathy', dev_areas:'', notes:'' }
    },
  ];

  /* ── State ───────────────────────────────────────────────────────────────── */
  let people       = [];
  let fields       = [];
  let activePerson = null;
  let chatHistory  = [];
  let isAdmin      = false;
  let chatWaiting  = false;
  let searchQuery  = '';

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function uid() { return 'p' + Date.now() + Math.random().toString(36).slice(2,6); }
  function initials(name) { return name.trim().split(/\s+/).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
  const AVATAR_COLORS = ['#1D9E75','#185FA5','#BA7517','#993556','#3B6D11','#534AB7','#993C1D','#0F6E56'];
  function nextColor() { return AVATAR_COLORS[people.length % AVATAR_COLORS.length]; }

  /* ── Persistence ─────────────────────────────────────────────────────────── */
  function loadData() {
    try { people = JSON.parse(localStorage.getItem(STORE_KEY)) || JSON.parse(JSON.stringify(SEED_PEOPLE)); }
    catch { people = JSON.parse(JSON.stringify(SEED_PEOPLE)); }
    try { fields = JSON.parse(localStorage.getItem(FIELDS_KEY)) || JSON.parse(JSON.stringify(DEFAULT_FIELDS)); }
    catch { fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS)); }
  }
  function savePeople() { localStorage.setItem(STORE_KEY, JSON.stringify(people)); }
  function saveFields()  { localStorage.setItem(FIELDS_KEY, JSON.stringify(fields)); }

  /* ── HBDI dominant ───────────────────────────────────────────────────────── */
  function dominantQuadrant(d) {
    const map = { hbdi_a:'Analytical (A)', hbdi_b:'Sequential (B)', hbdi_c:'Interpersonal (C)', hbdi_d:'Imaginative (D)' };
    let best = 'hbdi_a', max = 0;
    for (const k of Object.keys(map)) { const v = parseInt(d[k])||0; if (v > max) { max=v; best=k; } }
    return map[best];
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SYSTEM PROMPTS
  ══════════════════════════════════════════════════════════════════════════ */

  /* Public chatbot: all profiles baked in, but Quincy never dumps raw data */
  function buildPublicSystem() {
    const teamContext = people.map(p => {
      const d = p.data;
      const hbdi = `A(analytical):${d.hbdi_a||'?'} B(sequential):${d.hbdi_b||'?'} C(interpersonal):${d.hbdi_c||'?'} D(imaginative):${d.hbdi_d||'?'}`;
      return `
---
Name: ${p.name}
Role: ${p.role} · ${p.dept}
Workstyle: ${d.workstyle||'unknown'}
Interests: ${d.interests||'unknown'}
Communication style: ${d.comm_style||'unknown'}
MBTI: ${d.mbti||'unknown'} | Learning style: ${d.learning||'unknown'}
HBDI (0-150): ${hbdi} | Dominant: ${dominantQuadrant(d)}
Motivators: ${d.motivators||'unknown'}
Strengths: ${d.strengths||'unknown'}`;
    }).join('\n');

    return `You are Quincy, the people-intelligence assistant for the E.inCLT team at Experient Charlotte. You have deep knowledge of every team member's workstyle, communication preferences, HBDI thinking profile, MBTI type, motivators, and strengths.

Your job is to help team members work better together — answering questions about how to collaborate, communicate, assign work, resolve tension, run meetings, and understand one another.

TEAM PROFILES (confidential — never reproduce as raw data):
${teamContext}

RULES:
- Never dump raw profile data, scores, or field values verbatim. Always translate into natural, useful insight.
- You CAN reference people by name and speak about them specifically — just do so conversationally, not as a data readout.
- When making inferences beyond what the profile says, label it: "Based on their HBDI profile..." or "Given their MBTI type..."
- If someone asks a question you can answer from the profiles, answer it. If they ask to see someone's raw data or scores, politely explain that profile details are admin-only.
- Be warm, direct, and practically useful. No HR jargon. No overly cautious hedging.
- Keep responses concise unless depth is clearly needed (2–5 sentences is usually right).
- You can compare people, suggest pairings, flag potential friction points, and recommend communication approaches.`;
  }

  /* Admin single-person prompt (for the profile chat panel) */
  function buildAdminSystem(p) {
    const d = p.data;
    return `You are Quincy, the people-intelligence layer for E.inCLT. You are in admin mode reviewing ${p.name}'s full profile.

Name: ${p.name} | Role: ${p.role} | Dept: ${p.dept}
Workstyle: ${d.workstyle||'N/A'}
Interests: ${d.interests||'N/A'}
Communication style: ${d.comm_style||'N/A'}
MBTI: ${d.mbti||'N/A'} | Learning style: ${d.learning||'N/A'}
HBDI — A(analytical):${d.hbdi_a||'?'} B(sequential):${d.hbdi_b||'?'} C(interpersonal):${d.hbdi_c||'?'} D(imaginative):${d.hbdi_d||'?'} | Dominant: ${dominantQuadrant(d)}
Motivators: ${d.motivators||'N/A'}
Strengths: ${d.strengths||'N/A'}
Development areas: ${d.dev_areas||'N/A'}
Admin notes: ${d.notes||'N/A'}

You are in admin mode — you may reference specific scores and field values directly. Be thorough and specific. Flag gaps in the profile when relevant.`;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     VIEW SWITCHING — public chatbot vs admin full panel
  ══════════════════════════════════════════════════════════════════════════ */
  function applyView() {
    const view = qs('#view-quincy');
    if (!view) return;
    if (isAdmin) {
      view.classList.add('q-admin-mode');
    } else {
      view.classList.remove('q-admin-mode');
    }
    // Reset chat context label
    const badge = qs('#quincy-context-badge');
    if (badge) badge.textContent = isAdmin && activePerson ? activePerson.name : 'E.inCLT team';
    renderChat();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER — People list (admin only)
  ══════════════════════════════════════════════════════════════════════════ */
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
    `).join('') : `<div class="qp-empty">No results for "${searchQuery}"</div>`;

    container.querySelectorAll('.qp-item').forEach(el => {
      el.addEventListener('click', () => {
        activePerson = people.find(p => p.id === el.dataset.id);
        chatHistory  = [];
        renderPeopleList();
        renderProfile(activePerson);
        const badge = qs('#quincy-context-badge');
        if (badge) badge.textContent = activePerson.name;
        renderChat();
      });
    });

    const addBtn = qs('#quincy-add-person');
    if (addBtn) addBtn.style.display = isAdmin ? '' : 'none';
    const fieldsBtn = qs('#quincy-manage-fields');
    if (fieldsBtn) fieldsBtn.style.display = isAdmin ? '' : 'none';
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER — Profile detail (admin only)
  ══════════════════════════════════════════════════════════════════════════ */
  function renderProfile(p) {
    const panel = qs('#quincy-profile');
    if (!panel) return;
    if (!p) { panel.innerHTML = `<div class="qp-placeholder">Select a person to view their profile.</div>`; return; }
    const d = p.data;
    const hbdiBars = [
      { label:'Analytical (A)',    key:'hbdi_a', color:'#185FA5' },
      { label:'Sequential (B)',    key:'hbdi_b', color:'#1D9E75' },
      { label:'Interpersonal (C)', key:'hbdi_c', color:'#993556' },
      { label:'Imaginative (D)',   key:'hbdi_d', color:'#BA7517' },
    ];
    const completedFields = fields.filter(f => d[f.id] && String(d[f.id]).trim()).length;
    const pct = Math.round(completedFields / fields.length * 100);

    panel.innerHTML = `
      <div class="qpr-top">
        <div class="qpr-avatar" style="background:${p.avatarColor}">${p.initials}</div>
        <div class="qpr-meta">
          <div class="qpr-name">${p.name}</div>
          <div class="qpr-sub">${p.role} · ${p.dept}</div>
          ${p.email ? `<div class="qpr-email">${p.email}</div>` : ''}
        </div>
        <div class="qpr-actions">
          <div class="qpr-completeness">
            <div class="qpr-comp-bar"><div class="qpr-comp-fill" style="width:${pct}%"></div></div>
            <div class="qpr-comp-label">${pct}% complete</div>
          </div>
          <button class="q-btn-edit" id="quincy-edit-btn">Edit profile</button>
        </div>
      </div>
      ${(d.hbdi_a||d.hbdi_b||d.hbdi_c||d.hbdi_d) ? `
      <div class="qpr-section">
        <div class="qpr-section-label">HBDI thinking preferences</div>
        ${hbdiBars.map(b => { const val=parseInt(d[b.key])||0; return `
          <div class="qpr-hbdi-row">
            <div class="qpr-hbdi-quad">${b.label}</div>
            <div class="qpr-hbdi-track"><div class="qpr-hbdi-fill" style="width:${Math.round(val/150*100)}%;background:${b.color}"></div></div>
            <div class="qpr-hbdi-score">${val}</div>
          </div>`; }).join('')}
      </div>` : ''}
      <div class="qpr-fields">
        ${fields.filter(f => !f.id.startsWith('hbdi_') && f.id !== 'notes' && d[f.id]).map(f => `
          <div class="qpr-field">
            <div class="qpr-field-label">${f.label}</div>
            <div class="qpr-field-value">${formatFieldValue(f, d[f.id])}</div>
          </div>
        `).join('')}
        ${(d.notes) ? `
          <div class="qpr-field qpr-field-admin">
            <div class="qpr-field-label">Admin notes <span class="qpr-admin-badge">admin only</span></div>
            <div class="qpr-field-value">${d.notes}</div>
          </div>` : ''}
      </div>`;

    qs('#quincy-edit-btn', panel)?.addEventListener('click', () => openEditModal(p));
  }

  function formatFieldValue(field, val) {
    if (!val) return '—';
    if (field.type === 'tags') return val.split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="qpr-tag">${t}</span>`).join('');
    return val;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER — Chat
  ══════════════════════════════════════════════════════════════════════════ */
  const PUBLIC_CHIPS = [
    'Who should lead a creative project?',
    'How do I communicate a big change to the team?',
    'Who works well together on detail-heavy work?',
    'How should I run a brainstorm with this team?',
    'Who might clash and why?',
  ];

  const ADMIN_CHIPS = [
    'How should I communicate with them?',
    'What motivates them most?',
    'How do they handle ambiguity?',
    'Best way to pitch a new idea to them?',
    'What project type would suit them?',
  ];

  function renderChat() {
    const wrap  = qs('#quincy-chat-messages');
    const chips = qs('#quincy-chat-chips');
    const input = qs('#quincy-chat-input');
    if (!wrap) return;

    if (chatHistory.length === 0) {
      if (isAdmin && activePerson) {
        wrap.innerHTML = `<div class="qc-hint">Ask Quincy anything about ${activePerson.name} — communication tips, collaboration strategies, HBDI inferences, and more.</div>`;
      } else {
        wrap.innerHTML = `<div class="qc-hint">Ask me anything about the team — who to pair together, how to communicate a decision, who thrives in which environment, and more.</div>`;
      }
    } else {
      wrap.innerHTML = chatHistory.map(m => `
        <div class="qc-msg qc-msg-${m.role}">
          <div class="qc-bubble">${m.content}</div>
          ${m.role==='assistant' ? `<div class="qc-source">Quincy · E.inCLT people intelligence</div>` : ''}
        </div>
      `).join('');
    }
    wrap.scrollTop = wrap.scrollHeight;

    if (chips) {
      const chipList = (isAdmin && activePerson) ? ADMIN_CHIPS : PUBLIC_CHIPS;
      chips.innerHTML = chipList.map(c => `<button class="qc-chip">${c}</button>`).join('');
      chips.querySelectorAll('.qc-chip').forEach(btn => {
        btn.addEventListener('click', () => submitChat(btn.textContent));
      });
    }

    if (input) {
      input.placeholder = (isAdmin && activePerson)
        ? `Ask about ${activePerson.name}…`
        : 'Ask about the team…';
    }
  }

  async function submitChat(text) {
    if (chatWaiting || !text.trim()) return;
    const input = qs('#quincy-chat-input');
    if (input) { input.value = ''; input.style.height = '36px'; }

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
    const system = (isAdmin && activePerson) ? buildAdminSystem(activePerson) : buildPublicSystem();

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key': apiKey, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system,
          messages: chatHistory.map(m => ({ role: m.role, content: m.content })),
        })
      });
      const data = await res.json();
      const reply = data.content?.find(b => b.type==='text')?.text
        || 'Something went wrong — please try again.';
      chatHistory.push({ role:'assistant', content: reply });
    } catch {
      chatHistory.push({ role:'assistant', content:'Connection error. Check that your Anthropic API key is set in admin settings.' });
    }

    chatWaiting = false;
    renderChat();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MODALS — Add / Edit person
  ══════════════════════════════════════════════════════════════════════════ */
  function openAddModal()    { openPersonModal(null); }
  function openEditModal(p)  { openPersonModal(p); }

  function openPersonModal(p) {
    qs('#quincy-person-modal')?.remove();
    const isEdit = !!p;
    const d = p?.data || {};
    const modal = document.createElement('div');
    modal.id = 'quincy-person-modal';
    modal.className = 'q-modal-overlay';

    const coreFields = `
      <div class="qm-section-label">Basic info</div>
      <div class="qm-row">
        <div class="qm-field"><label>Full name *</label><input type="text" id="qm-name" value="${p?.name||''}" placeholder="Jane Smith"></div>
        <div class="qm-field"><label>Email</label><input type="email" id="qm-email" value="${p?.email||''}" placeholder="jane@experientclt.com"></div>
      </div>
      <div class="qm-row">
        <div class="qm-field"><label>Job title *</label><input type="text" id="qm-role" value="${p?.role||''}" placeholder="e.g. Project Manager"></div>
        <div class="qm-field"><label>Department</label><input type="text" id="qm-dept" value="${p?.dept||''}" placeholder="e.g. Operations"></div>
      </div>
      <div class="qm-row">
        <div class="qm-field qm-field-sm"><label>Initials</label><input type="text" id="qm-initials" value="${p?.initials||''}" placeholder="JD" maxlength="2"></div>
        <div class="qm-field qm-field-sm"><label>Avatar color</label><input type="color" id="qm-color" value="${p?.avatarColor||nextColor()}"></div>
      </div>`;

    const surveyFields = fields.map(f => {
      if (f.type === 'scale') {
        const val = parseInt(d[f.id])||0;
        return `<div class="qm-field"><label>${f.label} <span class="qm-scale-val" id="sv-${f.id}">${val}</span></label>
          <input type="range" min="${f.min||0}" max="${f.max||150}" step="1" value="${val}" id="qm-${f.id}"
            oninput="document.getElementById('sv-${f.id}').textContent=this.value"></div>`;
      }
      if (f.type === 'select') {
        return `<div class="qm-field"><label>${f.label}</label><select id="qm-${f.id}">
          <option value="">— Select —</option>
          ${(f.options||[]).map(o=>`<option ${d[f.id]===o?'selected':''} value="${o}">${o}</option>`).join('')}
          </select></div>`;
      }
      const isTextarea = ['notes','dev_areas','comm_style'].includes(f.id);
      return `<div class="qm-field"><label>${f.label}${f.type==='tags'?' <span class="qm-hint">(comma-separated)</span>':''}</label>
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
            <p class="qm-tab-hint">Fill in what you have — Quincy uses whatever is available.</p>
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
      </div>`;

    document.body.appendChild(modal);

    modal.querySelectorAll('.qm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('.qm-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        modal.querySelectorAll('.qm-tab-panel').forEach(p => p.style.display = 'none');
        qs(`#qmt-${tab.dataset.tab}`, modal).style.display = '';
      });
    });

    const closeModal = () => modal.remove();
    qs('#qm-close', modal).addEventListener('click', closeModal);
    qs('#qm-cancel', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    qs('#qm-save', modal).addEventListener('click', () => {
      const name = qs('#qm-name', modal).value.trim();
      const role = qs('#qm-role', modal).value.trim();
      if (!name || !role) { alert('Name and job title are required.'); return; }
      const newData = {};
      fields.forEach(f => { const el = qs(`#qm-${f.id}`, modal); if (el) newData[f.id] = el.value; });
      if (isEdit) {
        p.name = name; p.email = qs('#qm-email',modal).value.trim(); p.role = role;
        p.dept = qs('#qm-dept',modal).value.trim();
        p.initials = qs('#qm-initials',modal).value.trim().toUpperCase() || initials(name);
        p.avatarColor = qs('#qm-color',modal).value; p.data = newData;
      } else {
        const newPerson = { id:uid(), name, email:qs('#qm-email',modal).value.trim(), role, dept:qs('#qm-dept',modal).value.trim(), initials:qs('#qm-initials',modal).value.trim().toUpperCase()||initials(name), avatarColor:qs('#qm-color',modal).value, added:Date.now(), data:newData };
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

    if (isEdit) {
      qs('#qm-delete', modal)?.addEventListener('click', () => {
        if (!confirm(`Delete ${p.name}'s profile? This cannot be undone.`)) return;
        people = people.filter(x => x.id !== p.id);
        activePerson = people[0] || null;
        savePeople(); closeModal();
        renderPeopleList(); renderProfile(activePerson);
        chatHistory = []; renderChat();
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MODAL — Manage survey fields
  ══════════════════════════════════════════════════════════════════════════ */
  function openFieldsModal() {
    qs('#quincy-fields-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'quincy-fields-modal';
    modal.className = 'q-modal-overlay';

    const renderRows = () => fields.map((f,i) => `
      <div class="qf-row" data-idx="${i}">
        <span class="qf-handle">⠿</span>
        <input class="qf-label-input" value="${f.label}" placeholder="Field label">
        <select class="qf-type-select">
          ${['text','select','scale','tags'].map(t=>`<option ${f.type===t?'selected':''} value="${t}">${t}</option>`).join('')}
        </select>
        <button class="qf-remove" title="Remove">✕</button>
      </div>`).join('');

    modal.innerHTML = `
      <div class="q-modal q-modal-wide">
        <div class="q-modal-header">
          <div class="q-modal-title">Manage survey fields</div>
          <button class="q-modal-close" id="qf-close">✕</button>
        </div>
        <div class="q-modal-body">
          <p class="qm-tab-hint" style="margin-bottom:12px">These fields define what data is collected per person. Changes apply to all profiles.</p>
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
      </div>`;

    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    qs('#qf-close', modal).addEventListener('click', closeModal);
    qs('#qf-cancel', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    function bindRows() {
      modal.querySelectorAll('.qf-remove').forEach((btn,i) => {
        btn.addEventListener('click', () => { fields.splice(i,1); qs('#qf-rows',modal).innerHTML=renderRows(); bindRows(); });
      });
    }
    bindRows();

    qs('#qf-add-field', modal).addEventListener('click', () => {
      fields.push({ id:'field_'+Date.now(), label:'New field', type:'text', placeholder:'' });
      qs('#qf-rows',modal).innerHTML = renderRows(); bindRows();
    });

    qs('#qf-reset', modal).addEventListener('click', () => {
      if (!confirm('Reset all fields to defaults?')) return;
      fields = JSON.parse(JSON.stringify(DEFAULT_FIELDS));
      qs('#qf-rows',modal).innerHTML = renderRows(); bindRows();
    });

    qs('#qf-save', modal).addEventListener('click', () => {
      fields = Array.from(modal.querySelectorAll('.qf-row')).map((row,i) => ({
        ...(fields[i]||{}),
        label: qs('.qf-label-input',row).value.trim() || `Field ${i+1}`,
        type:  qs('.qf-type-select',row).value,
      }));
      saveFields(); closeModal();
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════════════ */
  function init() {
    loadData();

    qs('#quincy-search')?.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderPeopleList();
    });

    qs('#quincy-add-person')?.addEventListener('click', openAddModal);
    qs('#quincy-manage-fields')?.addEventListener('click', openFieldsModal);

    const chatInput = qs('#quincy-chat-input');
    chatInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChat(chatInput.value); }
    });
    qs('#quincy-chat-send')?.addEventListener('click', () => submitChat(qs('#quincy-chat-input')?.value || ''));

    activePerson = null;
    applyView();
  }

  /* ── Public API ──────────────────────────────────────────────────────────── */
  function notifyAdminChange(state) {
    isAdmin = state;
    if (!state) { activePerson = null; chatHistory = []; }
    applyView();
    renderPeopleList();
    if (activePerson) renderProfile(activePerson);
    const fieldsBtn = qs('#quincy-manage-fields');
    if (fieldsBtn) fieldsBtn.style.display = isAdmin ? '' : 'none';
  }

  return { init, notifyAdminChange };

})();
