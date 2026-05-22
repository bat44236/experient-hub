/* ── WORKSPACE MODULE ────────────────────────────────────────────────────── */

const WS = (() => {
  const DEFAULT_NOTES = [
    {
      id: 1,
      title: 'Archer Migration — Kickoff Notes',
      body: 'Attendees: Barry, Dev Team, BRC Leads\n\nKey decisions:\n- Sprint 0 scope finalized\n- BRD discrepancy flagged for review\n- Stakeholder review call set for Week 2\n\nNext steps:\n→ Confirm BRD alignment with vendor\n→ Draft onboarding checklist\n→ Schedule standing weekly with Archer team',
      tag: 'Project',
      ts: Date.now() - 86400000 * 2,
    },
    {
      id: 2,
      title: 'Q2 Team Priorities',
      body: '1. Archer Migration — Phase 1 go-live\n2. Quincy expansion — HR integration scoping\n3. BRC Weekly Digest automation\n4. Client retention touchpoints (3 accounts)\n5. K26 session notes — ServiceNow Risk track',
      tag: 'Priorities',
      ts: Date.now() - 86400000,
    },
    {
      id: 3,
      title: 'CNE Events to Watch',
      body: '• Block Party — May 29 (volunteer signup open)\n• Summer Market Series — June 13, July 11\n• Food Truck Fridays return June 6\n• Hygge show — check website for July dates',
      tag: 'Culture',
      ts: Date.now() - 3600000 * 4,
    },
  ];

  let notes = JSON.parse(localStorage.getItem('hub_notes') || 'null') || DEFAULT_NOTES;
  let activeId = notes[0]?.id || null;
  let saveTimer = null;

  function persist() { localStorage.setItem('hub_notes', JSON.stringify(notes)); }

  function setStatus(msg) {
    const el = document.getElementById('ws-status');
    if (!el) return;
    el.textContent = msg;
    setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 2000);
  }

  function renderList() {
    const list = document.getElementById('note-list');
    list.innerHTML = notes.map(n => {
      const date    = new Date(n.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const preview = n.body.replace(/\n/g, ' ').substring(0, 55);
      return `<div class="ws-note ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">
        <div class="ws-note-title">${n.title || 'Untitled'}</div>
        <div class="ws-note-preview">${preview || '—'}</div>
        <div class="ws-note-meta">
          <span class="ws-note-date">${date}</span>
          ${n.tag ? `<span class="ws-note-tag">${n.tag}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.ws-note').forEach(el => {
      el.addEventListener('click', () => {
        flushSave();
        activeId = Number(el.dataset.id);
        renderList();
        loadActive();
      });
    });
  }

  function loadActive() {
    const n = notes.find(x => x.id === activeId);
    if (!n) return;
    document.getElementById('note-title').value = n.title;
    document.getElementById('note-body').value  = n.body;
  }

  function flushSave() {
    clearTimeout(saveTimer);
    const n = notes.find(x => x.id === activeId);
    if (!n) return;
    n.title = document.getElementById('note-title').value;
    n.body  = document.getElementById('note-body').value;
    n.ts    = Date.now();
    persist();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      flushSave();
      renderList();
      setStatus('Saved');
    }, 1200);
  }

  // ── Controls
  document.getElementById('save-note-btn').addEventListener('click', () => {
    flushSave(); renderList(); setStatus('Saved');
  });

  document.getElementById('del-note-btn').addEventListener('click', () => {
    if (notes.length <= 1) return;
    notes = notes.filter(x => x.id !== activeId);
    activeId = notes[0]?.id || null;
    persist(); renderList(); loadActive();
  });

  document.getElementById('new-note-btn').addEventListener('click', () => {
    flushSave();
    const n = { id: Date.now(), title: '', body: '', tag: '', ts: Date.now() };
    notes.unshift(n);
    activeId = n.id;
    persist(); renderList(); loadActive();
    document.getElementById('note-title').focus();
  });

  ['note-title', 'note-body'].forEach(id => {
    document.getElementById(id).addEventListener('input', scheduleSave);
  });

  // ── Public API
  return { init() { renderList(); loadActive(); } };
})();
