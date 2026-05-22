/* ─── Paolo Garito Portfolio ─── */

// ── Gemini system prompt ──────────────────────────────────────────────────
const SYSTEM = `You are an AI assistant embedded in Paolo Garito's portfolio website. You help recruiters and visitors learn about Paolo. You always speak about Paolo in the THIRD PERSON — never say "I" or "me" as if you are Paolo. Say "Paolo is", "Paolo has", "he works", etc.

Respond ONLY with raw JSON (no markdown, no backticks, no preamble).

Format:
{
  "chat": "2-3 sentence warm conversational reply for the chat UI (always third person — Paolo is…, he…)",
  "title": "very short window title (4 words max)",
  "paragraphs": ["paragraph 1", "paragraph 2", ...]
}

Keep paragraphs focused and specific to the question. Tone: warm, direct, a bit witty. Max 3 paragraphs total. Always third person.

KNOWLEDGE BASE:

IDENTITY: Paolo Garito. Italian, Milan. "Unconventional engineer" — started as management engineer, became service & product designer. 6+ years experience. Italian (native), English (fluent), Spanish (conversational). Colleagues say: "open-minded creative", "always eager to try something new", "observant and meticulous", "a discussion partner", "always ready for a laugh".

CURRENT: Senior Service Designer & Digital Innovation Advisor at avvale (2023–present).

PAST: Sustainability Strategist & Facilitator at Techedge Italy (2021–2022). Service Designer & Digital Innovation Advisor at Techedge Italy (2019–2023). Founder arrampico.male (2022–present).

EDUCATION: Master II Blockchain Project Lead (MasterZ). Master Blockchain & Web3 Technologies (MasterZ). MSc Digital Business & Innovation (Politecnico di Milano). Executive Master Strategy for Emerging Countries (IBS Brazil). Bachelor Management Engineering (Politecnico di Milano).

CERTIFICATIONS: Vibecoding for Designers 2025 (Lovable & Uxcel). McKinsey Forward Program 2024. Enterprise Design Thinking Co-creator 2021 (IBM). Scrum Master PSM I 2020 (Scrum.org). Automation Business Analyst 2020 (UiPath). Industry 4.0 Digital Twining 2019 (Bucharest Polytechnic).

MAIN PROJECTS: 1) AI in Public Sector 2024-2025. 2) Intelligent Asset Management Platform 2023-2024. 3) Business Model & Identity Re-design 2024-2025. 4) Notar.ESG Documents Notarization Platform 2022-2023. 5) E2E Sales Platform 2021-2022.

OTHER PROJECTS: Flights & Capacity Platform Improvement (Alpitour, 2025, Lead Designer). Refinery Commercial App (Saras S.p.A., 2022, UX Designer). Coffee machines experience re-design (Rhea coffee, 2023-2024, Service Designer). Energy Monitoring Platform (E.ON Energy, 2021, UX Designer). Data Department Intranet & Intraverse (BPER Bank, 2023, Lead Designer). Intelligent Automations (various companies 2020-2022, Automation PM).

SIDE PROJECT: arrampico.male — climbing community founded 2022. Website + Instagram community. Real passion project.

HOW HE WORKS: Loves direct communication (no abstract talk). Asks tons of questions to frame problems. Visual learner — visualize it and he gets it immediately. Works well both independently and in international teams. Hates micromanaging.

PERSONALITY: Second sport: surf. First: bouldering/climbing. Tools: Figma (expert), Miro (expert), Framer (advanced), Claude/AI (advanced), Lovable (intermediate), Notion (advanced), HTML/CSS (intermediate), Python (beginner). Traits: curious, systems thinker, builder, anti-micromanagement, direct communicator, visual learner, loves espresso.

CONTACT: garito.paolo@gmail.com — linkedin.com/in/paologarito

RULES: Never invent info. If asked about Figma files, say they are available on request. Always third person. Never use "I" or "me" as if you are Paolo. Keep chat reply to 2-3 sentences. Paragraphs carry the detail.`;

// ── Gemini API call (via Vercel serverless — key is never in this file) ──
let conversationHistory = [];

async function callGemini(userMsg) {
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
    console.error('Gemini HTTP error', res.status, msg, errData);
    throw new Error(`Gemini ${res.status}: ${msg}`);
  }

  const data = await res.json();
  console.log('Gemini raw response:', JSON.stringify(data, null, 2));

  // Gemini sometimes wraps in ```json ... ``` despite instructions
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) {
    console.error('No text in Gemini response:', data);
    throw new Error('Risposta vuota da Gemini — riprova.');
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
  parsed.chat       = parsed.chat       || parsed.paragraphs?.[0] || raw.slice(0, 200);
  parsed.title      = parsed.title      || 'Note';
  parsed.paragraphs = parsed.paragraphs || [parsed.chat];

  return parsed;
}

// ── Sound ─────────────────────────────────────────────────────────────────
function playClick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.setValueAtTime(800, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.start(); o.stop(ctx.currentTime + 0.12);
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
document.getElementById('clear-btn').addEventListener('click', () => {
  playTrash();
  document.getElementById('windows-layer').innerHTML = '';
  wi = 0;
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

// Spawn positions — spread across canvas around trigger
const POSITIONS = [
  [680, 520], [1340, 510], [670, 920], [1350, 900],
  [680, 1120], [1340, 1120], [480, 720], [1540, 720],
  [1010, 480], [1010, 1100], [480, 1050], [1540, 1050]
];
const ROTS = [-1.5, 1.2, -0.8, 2, -1, 0.6, -1.8, 1.5, -0.5, 1, -2, 0.8];

function spawnWindow({ label, html, width, isAI, sectionId }) {
  const layer = document.getElementById('windows-layer');
  const win = document.createElement('div');
  win.className = 'cwin';
  if (sectionId) win.dataset.section = sectionId;

  const pos = POSITIONS[wi % POSITIONS.length];
  const rot = ROTS[wi % ROTS.length];
  const jitter = wi * 20;
  win.style.left = (pos[0] + (jitter % 60) - 30) + 'px';
  win.style.top  = (pos[1] + (jitter % 40) - 20) + 'px';
  win.style.transform = `rotate(${rot}deg)`;
  win.style.zIndex = wz++;
  if (width) win.style.width = width + 'px';
  wi++;

  const bar = document.createElement('div');
  bar.className = 'cwin-bar';
  bar.innerHTML = `<span class="cwin-label">${label}</span><button class="cwin-close">✕</button>`;
  bar.querySelector('.cwin-close').addEventListener('click', () => win.remove());

  const body = document.createElement('div');
  body.className = 'cwin-body' + (isAI ? ' wfree' : '');
  body.innerHTML = html;

  win.appendChild(bar);
  win.appendChild(body);
  layer.appendChild(win);
  makeDraggable(win, bar);
  win.addEventListener('mousedown', () => win.style.zIndex = wz++);
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
// chatMessages removed — no bubble UI
const chatInput    = document.getElementById('chat-input');
const chatSend     = document.getElementById('chat-send');

// Auto-close timer (60s of inactivity)
let chatCloseTimer = null;

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
  chatInput.style.height = '';   // let CSS height: 1.5em take over
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
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  const h = chatInput.scrollHeight;
  chatInput.style.height = Math.min(h, 160) + 'px';
  chatInput.style.overflowY = h > 160 ? 'auto' : 'hidden';
  chatInputWrap.classList.toggle('is-multiline', h > 24);
});

// Suggestion chips
document.querySelectorAll('.suggestion').forEach(btn => {
  btn.addEventListener('click', () => {
    chatInput.value = btn.dataset.q;
    sendMsg();
  });
});

async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  chatInput.style.height = '';   // back to CSS height: 1.5em
  document.getElementById('chat-input-wrap').classList.remove('is-multiline');
  chatSend.disabled = true;
  resetChatTimer();

  // Show loading state
  const suggestions = document.getElementById('chat-suggestions');
  const loading = document.getElementById('chat-loading');
  if (suggestions) suggestions.style.display = 'none';
  if (loading) loading.classList.remove('hidden');
  chatSend.style.display = 'none';

  try {
    const parsed = await callGemini(text);

    // Build free-form window — title is the question
    const html = (parsed.paragraphs || [parsed.chat]).map(p => `<p>${p}</p>`).join('');
    spawnWindow({ label: text, html, isAI: true });

    // Bar stays open — reset the inactivity timer
    resetChatTimer();

  } catch (err) {
    console.error(err);
  } finally {
    if (loading) loading.classList.add('hidden');
    if (suggestions) suggestions.style.display = 'flex';
    chatSend.style.display = 'flex';
    chatSend.disabled = false;
    chatInput.focus();
  }
}

function appendMsg(cls, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.innerHTML = `<div class="msg-bubble">${text}</div>`;
  chatMessages.appendChild(d);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return d;
}

function appendTyping() {
  const d = document.createElement('div');
  d.className = 'msg msg-agent msg-typing';
  d.innerHTML = '<div class="msg-bubble"><div class="dots"><span></span><span></span><span></span></div></div>';
  chatMessages.appendChild(d);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return d;
}

// ── Draggable ─────────────────────────────────────────────────────────────
function makeDraggable(win, handle) {
  let dr = false, sx = 0, sy = 0, ol = 0, ot = 0, or_ = 0;
  handle.addEventListener('mousedown', e => {
    if (e.target.classList.contains('cwin-close')) return;
    e.preventDefault();
    dr = true; sx = e.clientX; sy = e.clientY;
    ol = parseInt(win.style.left) || 0;
    ot = parseInt(win.style.top)  || 0;
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
  });
}
