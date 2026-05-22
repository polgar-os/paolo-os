/* ─── Paolo Garito Portfolio ─── */

// ── AI API call (via Vercel serverless — key is never in this file) ──
let conversationHistory = [];

async function callAI(userMsg) {
  conversationHistory.push({ role: 'user', parts: [{ text: userMsg }] });

  const body = {
    contents: conversationHistory,
    generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.error?.message || res.statusText;
    console.error('AI HTTP error', res.status, msg, errData);
    throw new Error(`AI ${res.status}: ${msg}`);
  }

  const data = await res.json();
  console.log('AI raw response:', JSON.stringify(data, null, 2));

  // Models sometimes wrap in ```json ... ``` despite instructions
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) {
    console.error('No text in AI response:', data);
    throw new Error('Risposta vuota dall\'AI — riprova.');
  }

  conversationHistory.push({ role: 'model', parts: [{ text: raw }] });

  // Strip markdown code fences if present
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract a JSON object from anywhere in the string
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { parsed = null; }
    }
    // Final fallback: treat the whole text as the answer
    if (!parsed) {
      parsed = { chat: raw.slice(0, 200), title: 'Answer', paragraphs: [raw] };
    }
  }

  // Ensure required fields always exist
  parsed.intent = parsed.intent || 'portfolio';
  parsed.display = parsed.display === 'notice' ? 'notice' : 'canvas_window';
  parsed.chat = parsed.chat || parsed.paragraphs?.[0] || raw.slice(0, 200);
  parsed.title = parsed.title || 'Note';
  parsed.paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [parsed.chat];
  parsed.contactRecommended = Boolean(parsed.contactRecommended);

  return parsed;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Sound ─────────────────────────────────────────────────────────────────
const interfaceClickAudio = new Audio('assets/interface-click.m4a');
interfaceClickAudio.volume = 0.15;
function playClick() {
  try {
    interfaceClickAudio.currentTime = 0;
    interfaceClickAudio.play().catch(e => console.log('Interface click audio failed', e));
  } catch(e) {}
}

const switchAudio = new Audio('assets/switch.mp3');
switchAudio.volume = 0.25;
function playSwitch() {
  try {
    switchAudio.currentTime = 0;
    switchAudio.play().catch(e => console.log('Switch audio failed', e));
  } catch(e) {}
}

const trashAudio = new Audio('assets/trash.m4a');
function playTrash() {
  try {
    trashAudio.currentTime = 0;
    trashAudio.play().catch(e => console.log('Trash audio failed', e));
  } catch(e) {}
}

const homeAudio = new Audio('assets/home.m4a');
homeAudio.volume = 0.25;
function playHome() {
  try {
    homeAudio.currentTime = 0;
    homeAudio.play().catch(e => console.log('Home audio failed', e));
  } catch(e) {}
}

const errorAudio = new Audio('assets/error.m4a');
errorAudio.volume = 0.25;
function playError() {
  try {
    errorAudio.currentTime = 0;
    errorAudio.play().catch(e => console.log('Error audio failed', e));
  } catch(e) {}
}

// ── Canvas pan/zoom ───────────────────────────────────────────────────────
let ox = 0, oy = 0, sc = 1;
let pan = false, px = 0, py = 0, pox = 0, poy = 0;
let wz = 10, wi = 0;

const container = document.getElementById('canvas-container');
const canvas    = document.getElementById('canvas');
const zoomEl    = document.getElementById('zoom-indicator');

function applyT() {
  canvas.style.transform = `translate(${ox}px,${oy}px) scale(${sc})`;
  zoomEl.textContent = Math.round(sc * 100) + '%';
  // Keep the dot grid locked to pan/zoom so it appears truly infinite
  const gridSize = 28 * sc;
  container.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  container.style.backgroundPosition = `${ox % gridSize}px ${oy % gridSize}px`;
}

(function initOffset() {
  const cw = container.clientWidth, ch = container.clientHeight;

  // Sidebar top = 50vh - sidebarHeight/2
  const sidebar = document.getElementById('sidebar');
  const sidebarTop = ch / 2 - sidebar.offsetHeight / 2;

  // Trigger canvas Y: we want the top of the trigger group to sit at sidebarTop on screen.
  // Screen Y of a canvas point p: screenY = p * sc + oy
  // We want screenY of trigger.top == sidebarTop
  // trigger.top (canvas) = 560 (fixed in CSS), but we need to set oy so that:
  //   560 * sc + oy = sidebarTop  →  oy = sidebarTop - 560 * sc
  // And ox centers canvas x=1000 in the viewport:
  ox = cw / 2 - 1000 * sc;
  oy = sidebarTop - 560 * sc;
  applyT();
})();

container.addEventListener('mousedown', e => {
  if (e.target.closest('.cwin') || e.target.closest('#chat-trigger') || e.target.closest('#easter-egg')) return;
  pan = true; px = e.clientX; py = e.clientY; pox = ox; poy = oy;
});
window.addEventListener('mousemove', e => {
  if (!pan) return;
  ox = pox + (e.clientX - px);
  oy = poy + (e.clientY - py);
  applyT();
});
window.addEventListener('mouseup', () => { pan = false; });

container.addEventListener('wheel', e => {
  e.preventDefault();
  const ns = Math.min(Math.max(sc + e.deltaY * -0.001, 0.25), 2);
  const r = container.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  ox = mx - (mx - ox) * (ns / sc);
  oy = my - (my - oy) * (ns / sc);
  sc = ns; applyT();
}, { passive: false });

// ── Tooltip ───────────────────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');
document.querySelectorAll('.sb-btn[data-tip]').forEach(btn => {
  btn.addEventListener('mouseenter', e => {
    tooltip.textContent = btn.dataset.tip;
    tooltip.classList.add('show');
  });
  btn.addEventListener('mousemove', e => {
    const leftAlign = btn.id === 'home-btn';
    if (leftAlign) {
      // Show to the left: position off-screen first to measure width, then place
      tooltip.style.left = '-9999px';
      const w = tooltip.offsetWidth;
      tooltip.style.left = (e.clientX - w - 14) + 'px';
    } else {
      tooltip.style.left = (e.clientX + 14) + 'px';
    }
    tooltip.style.top = (e.clientY - 10) + 'px';
  });
  btn.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
});

// ── Home button — recenter on trigger ────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', () => {
  playHome();
  const cw = container.clientWidth, ch = container.clientHeight;
  // Animate to center — trigger is at canvas (1000, 560)
  const targetSC = 1;
  const sidebar = document.getElementById('sidebar');
  const sidebarTop = ch / 2 - sidebar.offsetHeight / 2;
  const targetOX = cw / 2 - 1000 * targetSC;
  const targetOY = sidebarTop - 560 * targetSC;
  const startOX = ox, startOY = oy, startSC = sc;
  const duration = 500;
  const start = performance.now();
  function animate(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    ox = startOX + (targetOX - startOX) * ease;
    oy = startOY + (targetOY - startOY) * ease;
    sc = startSC + (targetSC - startSC) * ease;
    applyT();
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
});

// ── Theme ─────────────────────────────────────────────────────────────────
document.getElementById('theme-btn').addEventListener('click', () => {
  playSwitch();
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
});

// ── Clear canvas ──────────────────────────────────────────────────────────
const clearConfirm = document.getElementById('clear-confirm');
const clearCancel = document.getElementById('clear-cancel');
const clearConfirmBtn = document.getElementById('clear-confirm-btn');

function openClearConfirm() {
  clearConfirm.classList.remove('hidden');
  clearConfirmBtn.focus();
}

function closeClearConfirm() {
  clearConfirm.classList.add('hidden');
}

document.getElementById('clear-btn').addEventListener('click', () => {
  openClearConfirm();
});

clearCancel.addEventListener('click', closeClearConfirm);
clearConfirm.addEventListener('click', e => {
  if (e.target === clearConfirm) closeClearConfirm();
});

clearConfirmBtn.addEventListener('click', () => {
  playTrash();
  document.getElementById('windows-layer').innerHTML = '';
  wi = 0;
  closeClearConfirm();
});

// ── Sidebar sections → predefined windows ────────────────────────────────
const SECTION_DEFS = {
  about: {
    label: 'About me',
    build: () => `
      <div class="wabout">
        <div class="ab-name">Paolo Garito</div>
        <div class="ab-role">Senior Service &amp; Product Designer · avvale · Milan</div>
        <div class="ab-bio">Born as a management engineer, transformed into a service and product designer. For me, life and work are all about <strong>experimenting</strong>. I love moving across emerging technologies and design trends, looking for ways to improve products and services that empower people and drive business growth.</div>
        <div class="ab-tags">
          <span class="ab-tag">AI &amp; vibe-coding</span>
          <span class="ab-tag">service design</span>
          <span class="ab-tag">systems thinking</span>
          <span class="ab-tag">blockchain</span>
        </div>
        <div class="ab-quote">"An open-minded creative, always eager to try something new, observant and meticulous in achieving goals."</div>
        <div class="ab-langs">
          <span class="ab-lang">🇮🇹 Italian</span>
          <span class="ab-lang">🇬🇧 English</span>
          <span class="ab-lang">🇪🇸 Spanish</span>
        </div>
      </div>`
  },

  projects: {
    label: 'Projects',
    width: 300,
    build: () => `
      <div class="wprojects">
        <div class="proj-item"><div class="proj-year">2024–2025</div><div class="proj-name">AI in Public Sector</div><div class="proj-role">Lead Service Designer · avvale</div></div>
        <div class="proj-item"><div class="proj-year">2023–2024</div><div class="proj-name">Intelligent Asset Management Platform</div><div class="proj-role">Lead Service Designer · avvale</div></div>
        <div class="proj-item"><div class="proj-year">2024–2025</div><div class="proj-name">Business Model &amp; Identity Re-design</div><div class="proj-role">Lead Service Designer</div></div>
        <div class="proj-item"><div class="proj-year">2022–2023</div><div class="proj-name">Notar.ESG — Documents Notarization</div><div class="proj-role">Service Designer · Techedge</div></div>
        <div class="proj-item"><div class="proj-year">2021–2022</div><div class="proj-name">E2E Sales Platform</div><div class="proj-role">UX Designer · Techedge</div></div>
        <div class="proj-item"><div class="proj-year">2025</div><div class="proj-name">Flights &amp; Capacity Platform</div><div class="proj-role">Lead Designer · Alpitour</div></div>
      </div>`
  },

  skills: {
    label: 'Skills & Certifications',
    width: 290,
    build: () => `
      <div class="wskills">
        <div class="skill-item"><div class="skill-name">Vibecoding for Designers</div><div class="skill-meta">2025 · Lovable &amp; Uxcel</div></div>
        <div class="skill-item"><div class="skill-name">McKinsey Forward Program</div><div class="skill-meta">2024 · McKinsey</div></div>
        <div class="skill-item"><div class="skill-name">Enterprise Design Thinking Co-creator</div><div class="skill-meta">2021 · IBM</div></div>
        <div class="skill-item"><div class="skill-name">Scrum Master PSM I</div><div class="skill-meta">2020 · Scrum.org</div></div>
        <div class="skill-item"><div class="skill-name">Automation Business Analyst</div><div class="skill-meta">2020 · UiPath</div></div>
        <div class="skill-item"><div class="skill-name">Industry 4.0 — Digital Twining</div><div class="skill-meta">2019 · Bucharest Polytechnic</div></div>
      </div>`
  },

  sideproject: {
    label: 'Side project',
    build: () => `
      <div class="wside">
        <div class="sp-year">2022 – present</div>
        <div class="sp-title">arrampico.male</div>
        <div class="sp-desc">A climbing community I built from scratch — real website, real Instagram community, real people. Started as a passion project, grew into something with its own life. It's about bouldering, connection, and doing things properly even when no one's paying you.</div>
        <div class="sp-links">
          <a class="sp-link" href="https://arrampico.male" target="_blank">Website ↗</a>
          <a class="sp-link" href="https://instagram.com/arrampico.male" target="_blank">Instagram ↗</a>
        </div>
      </div>`
  },

  workstyle: {
    label: 'How I work',
    build: () => `
      <div class="wworkstyle">
        <div class="sticky"><div class="sticky-t">I appreciate direct communication</div><div class="sticky-b">I wouldn't say I like it when people talk too much about abstract matters. Straightforward communication works best for me.</div></div>
        <div class="sticky"><div class="sticky-t">I love asking questions</div><div class="sticky-b">I ask a ton of questions. I do this to understand and frame problems and the logic behind decisions.</div></div>
        <div class="sticky"><div class="sticky-t">I am a visual learner</div><div class="sticky-b">The best way to explain a concept to me is to visualize it. I understand connections immediately when I see them.</div></div>
        <div class="sticky"><div class="sticky-t">Independence + Teamwork</div><div class="sticky-b">Skilled in both remote and on-site collaboration with international teams. I love sharing ideas. I hate micromanaging.</div></div>
      </div>`
  },

  cv: {
    label: 'CV',
    width: 290,
    build: () => `
      <div class="wcv">
        <div class="cv-section">
          <div class="cv-heading">Experience</div>
          <div class="cv-item">Senior Service Designer &amp; Digital Innovation Advisor<span>avvale · 2023–present</span></div>
          <div class="cv-item">Founder<span>arrampico.male · 2022–present</span></div>
          <div class="cv-item">Sustainability Strategist &amp; Facilitator<span>Techedge Italy · 2021–2022</span></div>
          <div class="cv-item">Service Designer &amp; Digital Innovation Advisor<span>Techedge Italy · 2019–2023</span></div>
        </div>
        <div class="cv-section">
          <div class="cv-heading">Education</div>
          <div class="cv-item">MSc Digital Business &amp; Innovation<span>Politecnico di Milano</span></div>
          <div class="cv-item">Master Blockchain &amp; Web3<span>MasterZ Education</span></div>
          <div class="cv-item">Executive Master Emerging Countries<span>IBS Brazil</span></div>
          <div class="cv-item">Bachelor Management Engineering<span>Politecnico di Milano</span></div>
        </div>
        <div class="cv-section">
          <div class="cv-heading">Contact</div>
          <div class="cv-contact">
            <a class="cv-link" href="mailto:garito.paolo@gmail.com">garito.paolo@gmail.com</a>
            <a class="cv-link" href="https://linkedin.com/in/paologarito" target="_blank">linkedin.com/in/paologarito</a>
          </div>
        </div>
      </div>`
  }
};

// Spawn windows in the visible canvas first; if crowded, place them nearby and pan to them.
const ROTS = [-1.5, 1.2, -0.8, 2, -1, 0.6, -1.8, 1.5, -0.5, 1, -2, 0.8];
const WINDOW_GAP = 28;

function getSafeScreenBounds() {
  const sidebar = document.getElementById('sidebar');
  const sidebarRect = sidebar.getBoundingClientRect();
  const chatBar = document.getElementById('chat-bar');
  const chatOpen = chatBar && !chatBar.classList.contains('hidden');
  return {
    left: Math.max(24, sidebarRect.right + 24),
    top: 24,
    right: container.clientWidth - 24,
    bottom: container.clientHeight - (chatOpen ? 132 : 24)
  };
}

function screenToCanvasRect(rect) {
  return {
    left: (rect.left - ox) / sc,
    top: (rect.top - oy) / sc,
    right: (rect.right - ox) / sc,
    bottom: (rect.bottom - oy) / sc
  };
}

function expandRect(rect, amount) {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount
  };
}

function getVisibleCanvasBounds() {
  return screenToCanvasRect(getSafeScreenBounds());
}

function getTriggerReservedRect() {
  const trigger = document.getElementById('chat-trigger');
  if (!trigger) return null;
  const rect = screenToCanvasRect(trigger.getBoundingClientRect());
  return expandRect(rect, 24 / sc);
}

function getWindowRects(exceptWin) {
  return [...document.querySelectorAll('.cwin')]
    .filter(win => win !== exceptWin)
    .map(win => {
      const left = parseFloat(win.style.left) || 0;
      const top = parseFloat(win.style.top) || 0;
      return {
        left,
        top,
        right: left + win.offsetWidth,
        bottom: top + win.offsetHeight
      };
    });
}

function rectsOverlap(a, b, gap = WINDOW_GAP) {
  return !(
    a.right + gap <= b.left ||
    a.left >= b.right + gap ||
    a.bottom + gap <= b.top ||
    a.top >= b.bottom + gap
  );
}

function rectIsFree(rect, others) {
  return others.every(other => !rectsOverlap(rect, other));
}

function getBlockedRects(exceptWin) {
  const triggerRect = getTriggerReservedRect();
  return [
    ...getWindowRects(exceptWin),
    ...(triggerRect ? [triggerRect] : [])
  ];
}

function clampToCanvas(rect) {
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;
  const maxLeft = canvas.offsetWidth - width - 40;
  const maxTop = canvas.offsetHeight - height - 40;
  const left = Math.min(Math.max(rect.left, 40), Math.max(40, maxLeft));
  const top = Math.min(Math.max(rect.top, 40), Math.max(40, maxTop));
  return { left, top, right: left + width, bottom: top + height };
}

function findVisibleWindowPosition(width, height, others) {
  const bounds = getVisibleCanvasBounds();
  const minLeft = bounds.left;
  const minTop = bounds.top;
  const maxLeft = bounds.right - width;
  const maxTop = bounds.bottom - height;
  if (maxLeft < minLeft || maxTop < minTop) return null;

  const centerX = (bounds.left + bounds.right - width) / 2;
  const centerY = (bounds.top + bounds.bottom - height) / 2;
  const candidates = [];
  const step = 54;
  const xs = [];
  const ys = [];

  for (let y = minTop; y <= maxTop; y += step) {
    ys.push(y);
  }
  for (let x = minLeft; x <= maxLeft; x += step) {
    xs.push(x);
  }
  xs.push(centerX, maxLeft);
  ys.push(centerY, maxTop);

  for (const y of ys) {
    for (const x of xs) {
      candidates.push({ left: x, top: y, right: x + width, bottom: y + height });
    }
  }

  candidates.sort((a, b) => {
    const da = Math.hypot(a.left - centerX, a.top - centerY);
    const db = Math.hypot(b.left - centerX, b.top - centerY);
    return da - db;
  });

  return candidates.find(rect => rectIsFree(rect, others)) || null;
}

function findOffscreenWindowPosition(width, height, others) {
  const bounds = getVisibleCanvasBounds();
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;

  for (let radius = 180; radius <= 2600; radius += 120) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const left = centerX + Math.cos(angle) * radius - width / 2;
      const top = centerY + Math.sin(angle) * radius - height / 2;
      const rect = clampToCanvas({ left, top, right: left + width, bottom: top + height });
      if (rectIsFree(rect, others)) return rect;
    }
  }

  return clampToCanvas({
    left: bounds.right + 80,
    top: centerY - height / 2,
    right: bounds.right + 80 + width,
    bottom: centerY + height / 2
  });
}

function centerCanvasOnRect(rect) {
  const targetOX = container.clientWidth / 2 - ((rect.left + rect.right) / 2) * sc;
  const targetOY = container.clientHeight / 2 - ((rect.top + rect.bottom) / 2) * sc;
  const startOX = ox, startOY = oy;
  const duration = 420;
  const start = performance.now();

  function animate(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    ox = startOX + (targetOX - startOX) * ease;
    oy = startOY + (targetOY - startOY) * ease;
    applyT();
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function getWindowRect(win) {
  const left = parseFloat(win.style.left) || 0;
  const top = parseFloat(win.style.top) || 0;
  return {
    left,
    top,
    right: left + win.offsetWidth,
    bottom: top + win.offsetHeight
  };
}

function animateWindowToRect(win, rect) {
  const start = getWindowRect(win);
  const duration = 260;
  const startedAt = performance.now();

  function animate(now) {
    const t = Math.min((now - startedAt) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    win.style.left = (start.left + (rect.left - start.left) * ease) + 'px';
    win.style.top = (start.top + (rect.top - start.top) * ease) + 'px';
    if (t < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function findTriggerEscapeRect(win, originRect) {
  const triggerRect = getTriggerReservedRect();
  if (!triggerRect) return null;

  const current = getWindowRect(win);
  if (!rectsOverlap(current, triggerRect, 0)) return null;

  const width = current.right - current.left;
  const height = current.bottom - current.top;
  const triggerCenter = {
    x: (triggerRect.left + triggerRect.right) / 2,
    y: (triggerRect.top + triggerRect.bottom) / 2
  };
  const originCenter = {
    x: (originRect.left + originRect.right) / 2,
    y: (originRect.top + originRect.bottom) / 2
  };
  let vx = originCenter.x - triggerCenter.x;
  let vy = originCenter.y - triggerCenter.y;
  if (Math.abs(vx) + Math.abs(vy) < 1) {
    vx = ((current.left + current.right) / 2) - triggerCenter.x;
    vy = ((current.top + current.bottom) / 2) - triggerCenter.y;
  }
  if (Math.abs(vx) + Math.abs(vy) < 1) vx = 1;

  const sides = [
    {
      name: 'right',
      score: vx >= 0 ? 0 : 1,
      rect: { left: triggerRect.right + WINDOW_GAP, top: current.top, right: triggerRect.right + WINDOW_GAP + width, bottom: current.top + height }
    },
    {
      name: 'left',
      score: vx < 0 ? 0 : 1,
      rect: { left: triggerRect.left - WINDOW_GAP - width, top: current.top, right: triggerRect.left - WINDOW_GAP, bottom: current.top + height }
    },
    {
      name: 'bottom',
      score: vy >= 0 ? 0 : 1,
      rect: { left: current.left, top: triggerRect.bottom + WINDOW_GAP, right: current.left + width, bottom: triggerRect.bottom + WINDOW_GAP + height }
    },
    {
      name: 'top',
      score: vy < 0 ? 0 : 1,
      rect: { left: current.left, top: triggerRect.top - WINDOW_GAP - height, right: current.left + width, bottom: triggerRect.top - WINDOW_GAP }
    }
  ];

  const blocked = getBlockedRects(win);
  const candidates = [];
  for (const side of sides) {
    const base = side.rect;
    for (let offset = -180; offset <= 180; offset += 60) {
      const shifted = side.name === 'left' || side.name === 'right'
        ? { left: base.left, top: base.top + offset, right: base.right, bottom: base.bottom + offset }
        : { left: base.left + offset, top: base.top, right: base.right + offset, bottom: base.bottom };
      candidates.push({ ...side, rect: clampToCanvas(shifted) });
    }
  }

  candidates.sort((a, b) => {
    const ac = { x: (a.rect.left + a.rect.right) / 2, y: (a.rect.top + a.rect.bottom) / 2 };
    const bc = { x: (b.rect.left + b.rect.right) / 2, y: (b.rect.top + b.rect.bottom) / 2 };
    const ad = Math.hypot(ac.x - originCenter.x, ac.y - originCenter.y);
    const bd = Math.hypot(bc.x - originCenter.x, bc.y - originCenter.y);
    return a.score - b.score || ad - bd;
  });

  return candidates.find(candidate => rectIsFree(candidate.rect, blocked))?.rect
    || findOffscreenWindowPosition(width, height, blocked);
}

function spawnWindow({ label, html, width, isAI, sectionId }) {
  const layer = document.getElementById('windows-layer');
  const win = document.createElement('div');
  win.className = 'cwin' + (isAI ? ' cwin-ai' : ' cwin-section');
  if (sectionId) win.dataset.section = sectionId;

  const rot = ROTS[wi % ROTS.length];
  win.style.left = '-9999px';
  win.style.top  = '-9999px';
  win.style.transform = `rotate(${rot}deg)`;
  win.style.zIndex = wz++;
  if (width) win.style.width = width + 'px';

  const bar = document.createElement('div');
  bar.className = 'cwin-bar';
  bar.innerHTML = `<span class="cwin-label">${escapeHtml(label)}</span><button class="cwin-close">✕</button>`;
  bar.querySelector('.cwin-close').addEventListener('click', () => win.remove());

  const body = document.createElement('div');
  body.className = 'cwin-body' + (isAI ? ' wfree' : '');
  body.innerHTML = html;

  win.appendChild(bar);
  win.appendChild(body);
  layer.appendChild(win);

  const others = getBlockedRects(win);
  const winWidth = win.offsetWidth;
  const winHeight = win.offsetHeight;
  let shouldCenter = false;
  let rect = findVisibleWindowPosition(winWidth, winHeight, others);
  if (!rect) {
    rect = findOffscreenWindowPosition(winWidth, winHeight, others);
    shouldCenter = true;
  }
  win.style.left = rect.left + 'px';
  win.style.top = rect.top + 'px';

  makeDraggable(win, bar);
  win.addEventListener('mousedown', () => win.style.zIndex = wz++);
  if (shouldCenter) centerCanvasOnRect(rect);
  wi++;
}

// Sidebar buttons
document.querySelectorAll('.sb-btn[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.dataset.section;
    const existingWin = document.querySelector(`.cwin[data-section="${sec}"]`);
    
    if (existingWin) {
      playError();
      const cw = container.clientWidth, ch = container.clientHeight;
      const left = parseFloat(existingWin.style.left) || 0;
      const top = parseFloat(existingWin.style.top) || 0;
      const winW = existingWin.offsetWidth || 280;
      const winH = existingWin.offsetHeight || 200;
      
      const targetOX = cw / 2 - (left + winW / 2) * sc;
      const targetOY = ch / 2 - (top + winH / 2) * sc;
      
      const startOX = ox, startOY = oy;
      const duration = 400;
      const start = performance.now();
      function animate(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
        ox = startOX + (targetOX - startOX) * ease;
        oy = startOY + (targetOY - startOY) * ease;
        applyT();
        if (t < 1) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
      
      existingWin.style.zIndex = wz++;
      existingWin.classList.remove('vibrate');
      void existingWin.offsetWidth; // trigger reflow
      existingWin.classList.add('vibrate');
      return;
    }

    playClick();
    const def = SECTION_DEFS[sec];
    if (!def) return;
    spawnWindow({ label: def.label, html: def.build(), width: def.width, sectionId: sec });
  });
});

// ── Chat ──────────────────────────────────────────────────────────────────
const chatOverlay = document.getElementById('chat-bar');
const chatInput    = document.getElementById('chat-input');
const chatSend     = document.getElementById('chat-send');

// Auto-close timer (60s of inactivity)
let chatCloseTimer = null;
let noticeTimer = null;

function showNotice(message) {
  const existing = document.querySelector('.chat-notice');
  if (existing) existing.remove();

  const notice = document.createElement('div');
  notice.className = 'chat-notice';
  notice.textContent = message;
  document.body.appendChild(notice);
  playError();

  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.classList.add('is-leaving');
    notice.addEventListener('animationend', () => notice.remove(), { once: true });
  }, 4200);
}

function resetChatTimer() {
  clearTimeout(chatCloseTimer);
  chatCloseTimer = setTimeout(closeChat, 60000);
}

function openChat() {
  chatOverlay.classList.remove('hidden', 'closing');
  void chatOverlay.offsetWidth;
  chatOverlay.style.animation = 'none';
  void chatOverlay.offsetWidth;
  chatOverlay.style.animation = '';
  // Measure real single-line height once after first render
  if (!singleLineHeight) {
    chatInput.style.height = '';
    singleLineHeight = chatInput.scrollHeight;
    chatInput.style.height = singleLineHeight + 'px';
  }
  chatInput.focus();
  resetChatTimer();
}

function closeChat() {
  clearTimeout(chatCloseTimer);
  chatOverlay.classList.add('closing');
  chatOverlay.addEventListener('animationend', () => {
    chatOverlay.classList.add('hidden');
    chatOverlay.classList.remove('closing');
  }, { once: true });
}

document.getElementById('chat-trigger').addEventListener('click', () => {
  const isOpen = !chatOverlay.classList.contains('hidden');
  if (isOpen) {
    closeChat();
  } else {
    openChat();
  }
});

// Close chat bar on Escape
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !clearConfirm.classList.contains('hidden')) closeClearConfirm();
  if (e.key === 'Escape' && !chatOverlay.classList.contains('hidden')) closeChat();
});

// Reset timer on any interaction inside the chat bar
chatOverlay.addEventListener('mousedown', resetChatTimer);
chatOverlay.addEventListener('keydown', resetChatTimer);

chatSend.addEventListener('click', sendMsg);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});

// Auto-resize textarea
const chatInputWrap = document.getElementById('chat-input-wrap');
let singleLineHeight = 0;

chatInput.addEventListener('input', () => {
  chatInput.style.height = singleLineHeight + 'px';
  const h = chatInput.scrollHeight;
  chatInput.style.height = Math.min(h, 160) + 'px';
  chatInput.style.overflowY = h > 160 ? 'auto' : 'hidden';
  chatInputWrap.classList.toggle('is-multiline', h > singleLineHeight + 4);
});

async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  chatInput.style.height = singleLineHeight + 'px';
  chatInput.style.overflowY = 'hidden';
  document.getElementById('chat-input-wrap').classList.remove('is-multiline');
  chatSend.disabled = true;
  resetChatTimer();

  // Show loading state
  const loading = document.getElementById('chat-loading');
  if (loading) loading.classList.remove('hidden');
  chatSend.style.display = 'none';

  try {
    const parsed = await callAI(text);

    if (parsed.display === 'notice') {
      showNotice(parsed.chat || parsed.paragraphs?.[0] || 'This question is not relevant to Paolo\'s portfolio.');
    } else {
      const html = (parsed.paragraphs || [parsed.chat])
        .map(p => `<p>${escapeHtml(p)}</p>`)
        .join('');
      spawnWindow({ label: parsed.title || text, html, isAI: true });
    }

    // Bar stays open — reset the inactivity timer
    resetChatTimer();

  } catch (err) {
    console.error(err);
    showNotice('Something went wrong while answering. Please try again in a moment.');
  } finally {
    if (loading) loading.classList.add('hidden');
    chatSend.style.display = 'flex';
    chatSend.disabled = false;
    chatInput.focus();
  }
}

// ── Draggable ─────────────────────────────────────────────────────────────
function makeDraggable(win, handle) {
  let dr = false, sx = 0, sy = 0, ol = 0, ot = 0, or_ = 0, originRect = null;
  handle.addEventListener('mousedown', e => {
    if (e.target.classList.contains('cwin-close')) return;
    e.preventDefault();
    dr = true; sx = e.clientX; sy = e.clientY;
    ol = parseInt(win.style.left) || 0;
    ot = parseInt(win.style.top)  || 0;
    originRect = getWindowRect(win);
    or_ = parseFloat(win.style.transform?.match(/rotate\(([^)]+)deg\)/)?.[1] || 0);
    win.classList.add('dragging');
    win.style.zIndex = wz++;
  });
  window.addEventListener('mousemove', e => {
    if (!dr) return;
    const dx = (e.clientX - sx) / sc;
    const dy = (e.clientY - sy) / sc;
    win.style.left = (ol + dx) + 'px';
    win.style.top  = (ot + dy) + 'px';
    const t = Math.sqrt(dx*dx + dy*dy);
    win.style.transform = `rotate(${or_ * Math.max(0, 1 - t / 110)}deg)`;
  });
  window.addEventListener('mouseup', () => {
    if (!dr) return;
    dr = false;
    win.classList.remove('dragging');
    const escapeRect = findTriggerEscapeRect(win, originRect || getWindowRect(win));
    if (escapeRect) animateWindowToRect(win, escapeRect);
  });
}
