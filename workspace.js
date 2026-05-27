/* ── WORKSPACE v4 — Rich Text Editor ────────────────────────────────────── */
const WS = (() => {

  const STORE_KEY = 'ws-pages';
  const POLL_MS   = 8000;

  let pages     = [];
  let activeId  = null;
  let saveTimer = null;
  let pollTimer = null;
  let lastSaved = null;
  let expanded  = {};
  let dragId=null, dragOverId=null, dropZone=null, ctxPageId=null;

  // ── Default pages ─────────────────────────────────────────────────────────
  const DEFAULT_PAGES = [
    { id:'p1', parentId:null, icon:'🏕️', title:'Camp North End — Things to Know',
      body:'<p>Welcome to the <strong>Experient CLT</strong> team hub.</p><p>This workspace is shared across the office. Add pages, take notes, and collaborate in real-time.</p><p>Use the sidebar to navigate pages and the <em>context menu (···)</em> to reorganize them.</p>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
    { id:'p2', parentId:'p1', icon:'🍔', title:'Food Review',
      body:'<p>A running list of food spots around Camp North End worth trying.</p><ul><li>⭐ <strong>Rosewood Deli</strong> — excellent lunch spot</li><li>⭐ <strong>Pasture</strong> — great for team outings</li><li>⭐ <strong>Boileryard Clarke</strong> — rooftop happy hour</li></ul>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
    { id:'p3', parentId:'p1', icon:'🗂️', title:'Internal Initiatives',
      body:'<p>Track internal projects, experiments, and improvement ideas here.</p><ul><li>Quincy AI assistant expansion</li><li>BRC Weekly Digest automation</li><li>Hub v2 rollout</li></ul>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
    { id:'p4', parentId:'p1', icon:'📅', title:'Team Meeting Agenda Topics',
      body:'<p>Add topics here before our weekly syncs.</p><h2>Standing Items</h2><ul><li>Project status updates</li><li>Blockers</li><li>Calendar review</li></ul><h2>This Week</h2><p></p>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
    { id:'p5', parentId:'p1', icon:'📊', title:'Disengagement Priorities (TIAA)',
      body:'<p>Tracking TIAA disengagement workstreams and priorities for the BRC team.</p>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
    { id:'p6', parentId:'p1', icon:'🏢', title:'Office Space Ideas',
      body:'<p>Ideas and proposals for improving our Camp North End office space.</p><ul><li>Standing desk rotation schedule</li><li>Phone booth for calls</li><li>Whiteboard wall section</li></ul>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
    { id:'p7', parentId:'p1', icon:'🐛', title:'E.inCLT Bug Catcher',
      body:'<p>Log issues, glitches, and improvement requests for team tools here.</p><table><thead><tr><th>Issue</th><th>Status</th><th>Owner</th></tr></thead><tbody><tr><td>Hub calendar not loading on mobile</td><td>Open</td><td>—</td></tr></tbody></table>',
      createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'Barry' },
  ];

  // ── Storage ───────────────────────────────────────────────────────────────
  async function storageGet() {
    try { const r=await window.storage.get(STORE_KEY,true); return r?JSON.parse(r.value):null; }
    catch { return null; }
  }
  async function storageSet(data) {
    try { await window.storage.set(STORE_KEY,JSON.stringify(data),true); return true; }
    catch { return false; }
  }
  function setSyncState(state,msg) {
    const dot=document.getElementById('ws-sync-dot');
    const lbl=document.getElementById('ws-sync-label');
    if(dot) dot.className='ws-sync-dot '+state;
    if(lbl) lbl.textContent=msg;
  }
  async function loadFromRemote(force=false) {
    setSyncState('syncing','Syncing…');
    const remote=await storageGet();
    if (remote&&Array.isArray(remote.pages)) {
      const str=JSON.stringify(remote.pages);
      if (force||str!==lastSaved) { pages=remote.pages; lastSaved=str; renderTree(); if(activeId) renderEditor(); }
      setSyncState('ok',`Synced · ${now()}`);
    } else { pages=DEFAULT_PAGES; await saveToRemote(); setSyncState('ok','Workspace ready'); }
  }
  async function saveToRemote() {
    setSyncState('syncing','Saving…');
    const ok=await storageSet({pages,v:4});
    if(ok){lastSaved=JSON.stringify(pages);setSyncState('ok',`Saved · ${now()}`);}
    else setSyncState('error','Save failed');
  }
  function scheduleSync() { clearTimeout(saveTimer); saveTimer=setTimeout(saveToRemote,1200); }
  function startPolling() { clearInterval(pollTimer); pollTimer=setInterval(()=>loadFromRemote(),POLL_MS); }
  function now() { return new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }

  // ── Page helpers ──────────────────────────────────────────────────────────
  function getPage(id)    { return pages.find(p=>p.id===id); }
  function childrenOf(id) { return pages.filter(p=>p.parentId===id); }
  function ancestorsOf(id) {
    const chain=[]; let cur=getPage(id);
    while(cur){chain.unshift(cur);cur=cur.parentId?getPage(cur.parentId):null;} return chain;
  }
  function allDescendants(id) {
    const ids=[]; childrenOf(id).forEach(c=>{ids.push(c.id);ids.push(...allDescendants(c.id));}); return ids;
  }
  function newId() { return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }

  // ── Hierarchy moves ───────────────────────────────────────────────────────
  function movePage(id,newParentId,beforeId) {
    const page=getPage(id); if(!page) return;
    page.parentId=newParentId||null;
    pages=pages.filter(p=>p.id!==id);
    if(beforeId){const idx=pages.findIndex(p=>p.id===beforeId);pages.splice(idx<0?pages.length:idx,0,page);}
    else pages.push(page);
    page.updatedAt=Date.now();
  }
  function promotePage(id) {
    const page=getPage(id); if(!page||!page.parentId) return;
    const parent=getPage(page.parentId);
    movePage(id,parent?parent.parentId:null,null);
    const pi=pages.findIndex(p=>p.id===(parent?.id));
    const mi=pages.findIndex(p=>p.id===id);
    if(pi>=0&&mi!==pi+1){pages.splice(mi,1);pages.splice(pi+1,0,page);}
    renderTree();scheduleSync();
  }
  function demotePage(id) {
    const page=getPage(id); if(!page) return;
    const sibs=pages.filter(p=>p.parentId===page.parentId);
    const myIdx=sibs.findIndex(p=>p.id===id);
    if(myIdx<=0) return;
    const prev=sibs[myIdx-1];
    movePage(id,prev.id,null);expanded[prev.id]=true;
    renderTree();scheduleSync();
  }
  function moveUp(id) {
    const page=getPage(id); if(!page) return;
    const sibs=pages.filter(p=>p.parentId===page.parentId);
    const myIdx=sibs.findIndex(p=>p.id===id); if(myIdx<=0) return;
    const prev=sibs[myIdx-1];
    const ai=pages.findIndex(p=>p.id===id); const bi=pages.findIndex(p=>p.id===prev.id);
    [pages[ai],pages[bi]]=[pages[bi],pages[ai]]; renderTree();scheduleSync();
  }
  function moveDown(id) {
    const page=getPage(id); if(!page) return;
    const sibs=pages.filter(p=>p.parentId===page.parentId);
    const myIdx=sibs.findIndex(p=>p.id===id); if(myIdx>=sibs.length-1) return;
    const next=sibs[myIdx+1];
    const ai=pages.findIndex(p=>p.id===id); const bi=pages.findIndex(p=>p.id===next.id);
    [pages[ai],pages[bi]]=[pages[bi],pages[ai]]; renderTree();scheduleSync();
  }

  // ── Context menu ──────────────────────────────────────────────────────────
  const ctxMenu=document.createElement('div'); ctxMenu.id='ws-ctx-menu'; ctxMenu.className='ws-ctx-menu'; document.body.appendChild(ctxMenu);
  function openCtxMenu(pageId,x,y) {
    closeCtxMenu(); ctxPageId=pageId;
    const page=getPage(pageId);
    const sibs=pages.filter(p=>p.parentId===page.parentId);
    const myIdx=sibs.findIndex(p=>p.id===pageId);
    const items=[
      {label:'+ Add sub-page',icon:'📄',action:()=>openNewPageModal(pageId)},
      {sep:true},
      {label:'Rename',icon:'✏️',action:()=>startInlineRename(pageId)},
      {label:'Change icon',icon:'🎨',action:()=>changeIcon(pageId)},
      {sep:true},
      {label:'Promote (up a level)',icon:'⬆️',action:()=>promotePage(pageId),disabled:!page.parentId},
      {label:'Demote (into prev.)', icon:'⬇️',action:()=>demotePage(pageId), disabled:myIdx<=0},
      {sep:true},
      {label:'Move up',  icon:'↑',action:()=>moveUp(pageId),   disabled:myIdx<=0},
      {label:'Move down',icon:'↓',action:()=>moveDown(pageId), disabled:myIdx>=sibs.length-1},
      {sep:true},
      {label:'Delete page',icon:'🗑️',action:()=>deletePage(pageId),danger:true},
    ];
    ctxMenu.innerHTML=items.map((item,i)=>{
      if(item.sep) return `<div class="ctx-sep"></div>`;
      const dis=item.disabled?' disabled':''; const dan=item.danger?' danger':'';
      return `<div class="ctx-item${dis}${dan}" data-idx="${i}"><span class="ctx-icon">${item.icon}</span><span>${item.label}</span></div>`;
    }).join('');
    ctxMenu.querySelectorAll('.ctx-item:not(.disabled)').forEach(el=>{
      const item=items[Number(el.dataset.idx)];
      el.addEventListener('click',e=>{e.stopPropagation();closeCtxMenu();item.action();});
    });
    ctxMenu.style.display='block';
    const rect=ctxMenu.getBoundingClientRect();
    ctxMenu.style.left=Math.min(x,window.innerWidth -rect.width -8)+'px';
    ctxMenu.style.top =Math.min(y,window.innerHeight-rect.height-8)+'px';
  }
  function closeCtxMenu(){ctxMenu.style.display='none';ctxPageId=null;}
  document.addEventListener('click',()=>closeCtxMenu());
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCtxMenu();});

  // ── Inline rename ─────────────────────────────────────────────────────────
  function startInlineRename(pageId) {
    const row=document.querySelector(`.page-row[data-id="${pageId}"]`); if(!row) return;
    const titleEl=row.querySelector('.page-row-title'); if(!titleEl) return;
    const page=getPage(pageId); const orig=page.title||'';
    const input=document.createElement('input'); input.className='page-inline-rename'; input.value=orig;
    titleEl.replaceWith(input); input.focus(); input.select();
    function commit(){const val=input.value.trim()||orig;page.title=val;page.updatedAt=Date.now();scheduleSync();renderTree();if(activeId===pageId)renderEditor();}
    input.addEventListener('blur',commit);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'){input.value=orig;input.blur();}});
    input.addEventListener('click',e=>e.stopPropagation());
  }
  function changeIcon(pageId){
    const page=getPage(pageId); if(!page) return;
    const emoji=prompt('Enter an emoji for this page:',page.icon||'📄');
    if(emoji!==null){page.icon=emoji.trim().slice(0,4)||'📄';scheduleSync();renderTree();if(activeId===pageId)renderEditor();}
  }
  function deletePage(pageId){
    const page=getPage(pageId); if(!page) return;
    const kids=allDescendants(pageId);
    const msg=kids.length?`Delete "${page.title||'Untitled'}" and its ${kids.length} sub-page(s)?`:`Delete "${page.title||'Untitled'}"?`;
    if(!confirm(msg+' This cannot be undone.')) return;
    const toRemove=new Set([pageId,...kids]);
    pages=pages.filter(p=>!toRemove.has(p.id));
    if(toRemove.has(activeId)) activeId=pages[0]?.id||null;
    saveToRemote();renderTree();renderEditor();
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  function attachDrag(rowEl,pageId){
    rowEl.draggable=true;
    rowEl.addEventListener('dragstart',e=>{dragId=pageId;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',pageId);setTimeout(()=>rowEl.classList.add('dragging'),0);});
    rowEl.addEventListener('dragend',()=>{dragId=null;dragOverId=null;dropZone=null;document.querySelectorAll('.drop-before,.drop-inside,.drop-after,.dragging').forEach(el=>el.classList.remove('drop-before','drop-inside','drop-after','dragging'));});
    rowEl.addEventListener('dragover',e=>{
      e.preventDefault(); if(!dragId||dragId===pageId) return;
      if(allDescendants(dragId).includes(pageId)) return;
      e.dataTransfer.dropEffect='move';
      const rect=rowEl.getBoundingClientRect(); const pct=(e.clientY-rect.top)/rect.height;
      document.querySelectorAll('.drop-before,.drop-inside,.drop-after').forEach(el=>el.classList.remove('drop-before','drop-inside','drop-after'));
      if(pct<0.25){dropZone='before';rowEl.classList.add('drop-before');}
      else if(pct>0.75){dropZone='after';rowEl.classList.add('drop-after');}
      else{dropZone='inside';rowEl.classList.add('drop-inside');}
      dragOverId=pageId;
    });
    rowEl.addEventListener('dragleave',()=>rowEl.classList.remove('drop-before','drop-inside','drop-after'));
    rowEl.addEventListener('drop',e=>{
      e.preventDefault(); if(!dragId||!dragOverId||dragId===dragOverId) return;
      if(allDescendants(dragId).includes(dragOverId)) return;
      const target=getPage(dragOverId); const dragged=getPage(dragId);
      if(dropZone==='inside'){dragged.parentId=dragOverId;expanded[dragOverId]=true;pages=pages.filter(p=>p.id!==dragId);const lastChildIdx=pages.reduce((best,p,i)=>p.parentId===dragOverId?i:best,pages.findIndex(p=>p.id===dragOverId));pages.splice(lastChildIdx+1,0,dragged);}
      else if(dropZone==='before'){dragged.parentId=target.parentId;pages=pages.filter(p=>p.id!==dragId);pages.splice(pages.findIndex(p=>p.id===dragOverId),0,dragged);}
      else{dragged.parentId=target.parentId;pages=pages.filter(p=>p.id!==dragId);pages.splice(pages.findIndex(p=>p.id===dragOverId)+1,0,dragged);}
      dragged.updatedAt=Date.now(); dragId=null;dragOverId=null;dropZone=null;
      renderTree();scheduleSync();
    });
  }

  // ── Tree render ───────────────────────────────────────────────────────────
  function renderTree(){
    const tree=document.getElementById('ws-page-tree'); if(!tree) return;
    const scrollTop=tree.scrollTop;
    tree.innerHTML='';
    pages.filter(p=>!p.parentId).forEach(p=>tree.appendChild(buildNode(p,0)));
    tree.scrollTop=scrollTop;
  }
  function buildNode(page,depth){
    const children=childrenOf(page.id); const isOpen=expanded[page.id]!==false;
    const item=document.createElement('div'); item.className='page-tree-item'; item.dataset.id=page.id;
    const row=document.createElement('div'); row.className='page-row'+(page.id===activeId?' active':''); row.dataset.id=page.id;
    const indent=document.createElement('div'); indent.className='page-row-indent'; indent.style.width=(depth*16+4)+'px'; row.appendChild(indent);
    const toggle=document.createElement('button'); toggle.className='page-toggle'+(children.length?(isOpen?' open':''):' no-children'); toggle.textContent='›';
    toggle.addEventListener('click',e=>{e.stopPropagation();if(!children.length)return;expanded[page.id]=!isOpen;renderTree();}); row.appendChild(toggle);
    const iconEl=document.createElement('span'); iconEl.className='page-icon'; iconEl.textContent=page.icon||'📄'; row.appendChild(iconEl);
    const titleEl=document.createElement('span'); titleEl.className='page-row-title'; titleEl.textContent=page.title||'Untitled'; row.appendChild(titleEl);
    const actions=document.createElement('div'); actions.className='page-row-actions';
    const addBtn=document.createElement('button'); addBtn.className='page-action-btn'; addBtn.title='Add sub-page'; addBtn.textContent='+';
    addBtn.addEventListener('click',e=>{e.stopPropagation();openNewPageModal(page.id);}); actions.appendChild(addBtn);
    const moreBtn=document.createElement('button'); moreBtn.className='page-action-btn'; moreBtn.title='More options'; moreBtn.textContent='···';
    moreBtn.addEventListener('click',e=>{e.stopPropagation();const r=moreBtn.getBoundingClientRect();openCtxMenu(page.id,r.left,r.bottom+4);}); actions.appendChild(moreBtn);
    row.appendChild(actions);
    row.addEventListener('contextmenu',e=>{e.preventDefault();openCtxMenu(page.id,e.clientX,e.clientY);});
    row.addEventListener('click',e=>{if(e.target.classList.contains('page-action-btn')||e.target===toggle)return;selectPage(page.id);});
    attachDrag(row,page.id); item.appendChild(row);
    if(children.length){const wrap=document.createElement('div');wrap.className='page-children'+(isOpen?'':' collapsed');children.forEach(c=>wrap.appendChild(buildNode(c,depth+1)));item.appendChild(wrap);}
    return item;
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  function selectPage(id){flushSave();activeId=id;renderTree();renderEditor();}

  function renderEditor(){
    const body=document.getElementById('ws-editor-body'); if(!body) return;
    if(!activeId){
      body.innerHTML=`<div class="ws-empty-state"><div class="ws-empty-icon">📄</div><div class="ws-empty-title">No page selected</div><div class="ws-empty-sub">Select a page from the sidebar or create a new one.</div><button class="btn-primary" id="ws-empty-create-btn">+ Create first page</button></div>`;
      document.getElementById('ws-empty-create-btn')?.addEventListener('click',()=>openNewPageModal(null)); return;
    }
    const page=getPage(activeId); if(!page) return;
    const children=childrenOf(activeId);
    const ancestors=ancestorsOf(activeId);
    const bc=document.getElementById('ws-breadcrumb');
    if(bc){
      bc.innerHTML=ancestors.map((p,i)=>{const cur=i===ancestors.length-1;return `<span class="crumb${cur?' current':''}" data-id="${p.id}">${p.icon||'📄'} ${p.title||'Untitled'}</span>`+(cur?'':'<span class="crumb-sep">›</span>');}).join('');
      bc.querySelectorAll('.crumb:not(.current)').forEach(el=>el.addEventListener('click',()=>selectPage(el.dataset.id)));
    }

    body.innerHTML=`<div class="ws-page-editor">
      <div class="ws-page-icon-display" id="ws-icon-display">${page.icon||'📄'}</div>
      <div class="ws-page-title-display" id="ws-page-title-wrap">
        <div class="ws-page-title-input" id="ws-page-title" contenteditable="true" spellcheck="true" data-placeholder="Untitled">${page.title||''}</div>
      </div>
      <div class="ws-page-meta">Last edited ${timeAgo(page.updatedAt)}${page.updatedBy?' by '+page.updatedBy:''}</div>
      <div class="ws-divider"></div>

      <div class="ws-rich-toolbar" id="ws-rich-toolbar">
        <button class="rt-btn" data-cmd="bold"        title="Bold (Ctrl+B)"><b>B</b></button>
        <button class="rt-btn" data-cmd="italic"      title="Italic (Ctrl+I)"><i>I</i></button>
        <button class="rt-btn" data-cmd="underline"   title="Underline (Ctrl+U)"><u>U</u></button>
        <button class="rt-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        <div class="rt-sep"></div>
        <button class="rt-btn" data-cmd="formatBlock" data-val="h1" title="Heading 1">H1</button>
        <button class="rt-btn" data-cmd="formatBlock" data-val="h2" title="Heading 2">H2</button>
        <button class="rt-btn" data-cmd="formatBlock" data-val="h3" title="Heading 3">H3</button>
        <button class="rt-btn" data-cmd="formatBlock" data-val="p"  title="Paragraph">¶</button>
        <div class="rt-sep"></div>
        <button class="rt-btn" data-cmd="insertUnorderedList" title="Bullet list">• List</button>
        <button class="rt-btn" data-cmd="insertOrderedList"   title="Numbered list">1. List</button>
        <div class="rt-sep"></div>
        <button class="rt-btn" data-cmd="indent"  title="Indent">→</button>
        <button class="rt-btn" data-cmd="outdent" title="Outdent">←</button>
        <div class="rt-sep"></div>
        <button class="rt-btn" id="rt-table-btn" title="Insert table">⊞ Table</button>
        <button class="rt-btn" id="rt-link-btn"  title="Insert link">🔗 Link</button>
        <button class="rt-btn" id="rt-hr-btn"    title="Horizontal rule">― Rule</button>
        <div class="rt-sep"></div>
        <button class="rt-btn" data-cmd="removeFormat" title="Clear formatting">✕ Format</button>
      </div>

      <div class="ws-page-body-input" id="ws-page-body" contenteditable="true" spellcheck="true">${page.body||''}</div>

      ${children.length?`<div class="ws-subpages-block">
        <div class="ws-subpages-label">Sub-pages</div>
        <div class="ws-subpage-cards">${children.map(c=>`<div class="ws-subpage-card" data-id="${c.id}"><span class="sp-icon">${c.icon||'📄'}</span><span>${c.title||'Untitled'}</span></div>`).join('')}</div>
      </div>`:''}
    </div>`;

    // wire toolbar
    document.querySelectorAll('.rt-btn[data-cmd]').forEach(btn=>{
      btn.addEventListener('mousedown',e=>{
        e.preventDefault(); // keep focus in editor
        const cmd=btn.dataset.cmd; const val=btn.dataset.val||null;
        document.execCommand(cmd,false,val);
        updateToolbarState();
      });
    });

    document.getElementById('rt-table-btn').addEventListener('mousedown', e=>{
      e.preventDefault();
      const rows=parseInt(prompt('Rows:','3')||'0'); if(!rows||rows<1) return;
      const cols=parseInt(prompt('Columns:','3')||'0'); if(!cols||cols<1) return;
      let html='<table><thead><tr>'+Array(cols).fill('<th>Header</th>').join('')+'</tr></thead><tbody>';
      for(let r=0;r<rows-1;r++){html+='<tr>'+Array(cols).fill('<td></td>').join('')+'</tr>';}
      html+='</tbody></table><p></p>';
      document.execCommand('insertHTML',false,html);
    });

    document.getElementById('rt-link-btn').addEventListener('mousedown', e=>{
      e.preventDefault();
      const url=prompt('URL:','https://');
      if(url) document.execCommand('createLink',false,url);
    });

    document.getElementById('rt-hr-btn').addEventListener('mousedown', e=>{
      e.preventDefault();
      document.execCommand('insertHTML',false,'<hr><p></p>');
    });

    // track formatting state
    const editor=document.getElementById('ws-page-body');
    editor.addEventListener('keyup',  updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);
    editor.addEventListener('input',   onEdit);

    // title events
    const titleEl=document.getElementById('ws-page-title');
    titleEl.addEventListener('input', onEdit);
    titleEl.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();editor.focus();}});

    // subpage click
    body.querySelectorAll('.ws-subpage-card').forEach(el=>el.addEventListener('click',()=>selectPage(el.dataset.id)));
    document.getElementById('ws-icon-display').addEventListener('click',()=>changeIcon(activeId));

    // place cursor at end of body
    editor.focus();
    const range=document.createRange(); range.selectNodeContents(editor); range.collapse(false);
    const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }

  function updateToolbarState(){
    document.querySelectorAll('.rt-btn[data-cmd]').forEach(btn=>{
      const cmd=btn.dataset.cmd;
      try { btn.classList.toggle('active', document.queryCommandState(cmd)); } catch{}
    });
  }

  function getEditorContent(){
    const el=document.getElementById('ws-page-body');
    return el ? el.innerHTML : '';
  }
  function getTitleContent(){
    const el=document.getElementById('ws-page-title');
    return el ? el.innerText.trim() : '';
  }

  function onEdit(){
    const page=getPage(activeId); if(!page) return;
    page.title=getTitleContent();
    page.body =getEditorContent();
    page.updatedAt=Date.now();
    page.updatedBy=localStorage.getItem('hub_username')||'Team';
    clearTimeout(onEdit._t); onEdit._t=setTimeout(renderTree,600);
    scheduleSync();
  }

  function flushSave(){
    clearTimeout(saveTimer); clearTimeout(onEdit._t);
    const page=getPage(activeId); if(!page) return;
    page.title=getTitleContent();
    page.body =getEditorContent();
    page.updatedAt=Date.now();
  }

  function timeAgo(ts){
    const d=Date.now()-ts;
    if(d<60000) return 'just now';
    if(d<3600000) return Math.floor(d/60000)+'m ago';
    if(d<86400000) return Math.floor(d/3600000)+'h ago';
    return new Date(ts).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }

  // ── New page modal ────────────────────────────────────────────────────────
  let newPageParentId=null;
  function openNewPageModal(parentId){
    newPageParentId=parentId||null;
    const modal=document.getElementById('new-page-modal');
    document.getElementById('new-page-modal-title').textContent=parentId?'New Sub-page':'New Page';
    document.getElementById('new-page-title').value='';
    document.getElementById('new-page-icon').value='';
    document.getElementById('new-page-error').style.display='none';
    modal.classList.add('open');
    setTimeout(()=>document.getElementById('new-page-title').focus(),80);
  }
  function closeNewPageModal(){document.getElementById('new-page-modal').classList.remove('open');}

  document.getElementById('new-page-submit').addEventListener('click',async()=>{
    const title=document.getElementById('new-page-title').value.trim();
    const icon=document.getElementById('new-page-icon').value.trim()||'📄';
    const errEl=document.getElementById('new-page-error');
    if(!title){errEl.textContent='Please enter a title.';errEl.style.display='block';return;}
    errEl.style.display='none';
    const page={id:newId(),parentId:newPageParentId,icon,title,body:'<p></p>',createdAt:Date.now(),updatedAt:Date.now(),updatedBy:localStorage.getItem('hub_username')||'Team'};
    pages.push(page);
    if(newPageParentId) expanded[newPageParentId]=true;
    closeNewPageModal();
    await saveToRemote();
    renderTree();
    selectPage(page.id);
    setTimeout(()=>document.getElementById('ws-page-body')?.focus(),100);
  });
  document.getElementById('new-page-close').addEventListener('click',closeNewPageModal);
  document.getElementById('new-page-cancel').addEventListener('click',closeNewPageModal);
  document.getElementById('new-page-modal').addEventListener('click',e=>{if(e.target===document.getElementById('new-page-modal'))closeNewPageModal();});
  document.getElementById('new-page-title').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('new-page-submit').click();}});

  // ── Toolbar controls ──────────────────────────────────────────────────────
  document.getElementById('ws-new-root-btn').addEventListener('click',()=>openNewPageModal(null));
  document.getElementById('ws-add-child-btn').addEventListener('click',()=>openNewPageModal(activeId||null));
  document.getElementById('ws-delete-btn').addEventListener('click',()=>{if(activeId)deletePage(activeId);});

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init(){
    renderTree();
    if(window.storage){await loadFromRemote(true);startPolling();}
    else{const saved=localStorage.getItem('hub_pages_local');pages=saved?JSON.parse(saved):DEFAULT_PAGES;setSyncState('error','Local only');renderTree();}
  }

  return {init,openNewPageModal};
})();
