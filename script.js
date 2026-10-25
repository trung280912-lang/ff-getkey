// ===== Get Key AUTO - MAIN SCRIPT =====
'use strict';

// ============================================================
//  CONSTANTS & CONFIG
// ============================================================
const CONFIG = {
  COOLDOWN_HOURS: 3,
  COUNTDOWN_SECONDS: 60,
  KEY_FORMAT: 'TDZ-XXX',
  LS_LAST_KEY: 'ffkey_last_claim',
  LS_WEBHOOK: 'ffkey_webhook_url',
  LS_SYSTEM: 'ffkey_system_enabled',
  LS_KEYS_ISSUED: 'ffkey_keys_issued',
  LS_HISTORY: 'ffkey_history',
};

// ============================================================
//  STATE
// ============================================================
const state = {
  currentKey: null,
  countdownTimer: null,
  countdownSeconds: CONFIG.COUNTDOWN_SECONDS,
  step: 1, // 1=initial, 2=processing, 3=revealed
  confettiAnimFrame: null,
};

// ============================================================
//  DOM REFS
// ============================================================
const DOM = {
  // Steps
  step1El: document.getElementById('step1'),
  step2El: document.getElementById('step2'),
  step3El: document.getElementById('step3'),
  // Key display
  keyText: document.getElementById('keyText'),
  keyBox: document.getElementById('keyBox'),
  // Buttons
  getKeyBtn: document.getElementById('getKeyBtn'),
  copyBtn: document.getElementById('copyBtn'),
  // Timer
  timerWrapper: document.getElementById('timerWrapper'),
  timerBar: document.getElementById('timerBar'),
  timerCount: document.getElementById('timerCount'),
  // Processing
  processingState: document.getElementById('processingState'),
  // Cooldown
  cooldownBox: document.getElementById('cooldownBox'),
  cooldownRemaining: document.getElementById('cooldownRemaining'),
  // Action area
  actionArea: document.getElementById('actionArea'),
  copyArea: document.getElementById('copyArea'),
  // Canvas
  particlesCanvas: document.getElementById('particles-canvas'),
  confettiCanvas: document.getElementById('confetti-canvas'),
};

// ============================================================
//  INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  checkCooldown();
  updateStepUI(1);
  loadStatsDisplay();
  startCounterAnimations();
});

// ============================================================
//  KEY GENERATION
// ============================================================
function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FFKEY-${seg()}-${seg()}-${seg()}`;
}

// ============================================================
//  COOLDOWN CHECK
// ============================================================
function checkCooldown() {
  const systemEnabled = localStorage.getItem(CONFIG.LS_SYSTEM);
  if (systemEnabled === 'false') {
    showSystemOffline();
    return;
  }

  const lastClaim = localStorage.getItem(CONFIG.LS_LAST_KEY);
  if (!lastClaim) return;

  const data = JSON.parse(lastClaim);
  const now = Date.now();
  const elapsed = now - data.timestamp;
  const cooldownMs = CONFIG.COOLDOWN_HOURS * 60 * 60 * 1000;

  if (elapsed < cooldownMs) {
    const remaining = cooldownMs - elapsed;
    showCooldown(remaining, data.key);
  }
}

function showCooldown(remainingMs, lastKey) {
  DOM.actionArea.style.display = 'none';
  DOM.cooldownBox.style.display = 'block';
  if (lastKey) {
    DOM.keyText.textContent = lastKey;
    DOM.keyText.classList.remove('masked');
    DOM.keyBox.classList.add('revealed');
    DOM.copyArea.style.display = 'block';
    state.currentKey = lastKey;
  }
  updateCooldownTimer(remainingMs);
  const interval = setInterval(() => {
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      clearInterval(interval);
      DOM.cooldownBox.style.display = 'none';
      DOM.actionArea.style.display = 'block';
      DOM.copyArea.style.display = 'none';
      DOM.keyText.textContent = '';
      DOM.keyBox.classList.remove('revealed');
      checkCooldown();
    } else {
      updateCooldownTimer(remainingMs);
    }
  }, 1000);
}

function updateCooldownTimer(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  DOM.cooldownRemaining.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function showSystemOffline() {
  DOM.actionArea.style.display = 'none';
  DOM.cooldownBox.style.display = 'block';
  DOM.cooldownBox.innerHTML = `
    <div class="cooldown-icon">🔴</div>
    <div class="cooldown-title">HỆ THỐNG TẠM DỪNG</div>
    <div class="cooldown-text">Hệ thống cấp key đang bảo trì. Vui lòng quay lại sau!</div>
  `;
}

// ============================================================
//  MAIN GET KEY FLOW
// ============================================================
async function startGetKeyFlow() {
  // Phase 1: Redirect to shortlink (simulated)
  DOM.getKeyBtn.disabled = true;
  updateStepUI(2);

  showToast('🔗 Đang chuyển hướng qua shortlink...', 'info');

  // Simulate opening shortlink
  await sleep(800);
  showToast('✅ Xác minh thành công! Đang xử lý...', 'success');

  // Show processing + timer
  DOM.actionArea.style.display = 'none';
  DOM.timerWrapper.style.display = 'block';
  DOM.processingState.style.display = 'block';

  startCountdown();
}

function startCountdown() {
  state.countdownSeconds = CONFIG.COUNTDOWN_SECONDS;
  updateTimerUI(CONFIG.COUNTDOWN_SECONDS);

  state.countdownTimer = setInterval(() => {
    state.countdownSeconds--;
    updateTimerUI(state.countdownSeconds);
    if (state.countdownSeconds <= 0) {
      clearInterval(state.countdownTimer);
      revealKey();
    }
  }, 1000);
}

function updateTimerUI(seconds) {
  DOM.timerCount.textContent = String(seconds).padStart(2, '0') + 's';
  const pct = (seconds / CONFIG.COUNTDOWN_SECONDS) * 100;
  DOM.timerBar.style.width = pct + '%';
}

function revealKey() {
  DOM.timerWrapper.style.display = 'none';
  DOM.processingState.style.display = 'none';

  const key = generateKey();
  state.currentKey = key;

  DOM.keyText.textContent = key;
  DOM.keyText.classList.remove('masked');
  DOM.keyBox.classList.add('revealed');
  DOM.copyArea.style.display = 'block';

  updateStepUI(3);

  // Save to localStorage
  const claimData = { key, timestamp: Date.now() };
  localStorage.setItem(CONFIG.LS_LAST_KEY, JSON.stringify(claimData));

  // Update stats
  const totalIssued = parseInt(localStorage.getItem(CONFIG.LS_KEYS_ISSUED) || '0') + 1;
  localStorage.setItem(CONFIG.LS_KEYS_ISSUED, String(totalIssued));

  // Save history
  saveToHistory(key);

  // Discord webhook
  sendDiscordWebhook(key);

  // Confetti!
  launchConfetti();

  showToast('🎉 LẤY KEY THÀNH CÔNG!', 'success');
}

// ============================================================
//  STEP UI
// ============================================================
function updateStepUI(step) {
  state.step = step;
  const steps = [DOM.step1El, DOM.step2El, DOM.step3El];
  steps.forEach((el, idx) => {
    el.classList.remove('active', 'completed');
    if (idx + 1 < step) el.classList.add('completed');
    if (idx + 1 === step) el.classList.add('active');
  });
}

// ============================================================
//  COPY TO CLIPBOARD
// ============================================================
function copyKey() {
  if (!state.currentKey) return;
  navigator.clipboard.writeText(state.currentKey).then(() => {
    DOM.copyBtn.classList.add('copied');
    DOM.copyBtn.innerHTML = '✅ ĐÃ COPY!';
    showToast('📋 Đã copy key vào clipboard!', 'success');
    setTimeout(() => {
      DOM.copyBtn.classList.remove('copied');
      DOM.copyBtn.innerHTML = '📋 COPY KEY';
    }, 2500);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = state.currentKey;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 Đã copy key!', 'success');
  });
}

// ============================================================
//  HISTORY
// ============================================================
function saveToHistory(key) {
  const history = JSON.parse(localStorage.getItem(CONFIG.LS_HISTORY) || '[]');
  history.unshift({
    key,
    timestamp: Date.now(),
    ip: generateFakeIP(),
    status: 'claimed',
  });
  if (history.length > 200) history.pop();
  localStorage.setItem(CONFIG.LS_HISTORY, JSON.stringify(history));
}

function generateFakeIP() {
  return `${Math.floor(Math.random()*200)+10}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;
}

// ============================================================
//  DISCORD WEBHOOK
// ============================================================
async function sendDiscordWebhook(key) {
  const webhookUrl = localStorage.getItem(CONFIG.LS_WEBHOOK);
  if (!webhookUrl) return;

  const now = new Date();
  const payload = {
    username: 'FF KEY CENTER',
    avatar_url: 'https://i.imgur.com/wSTFkRM.png',
    embeds: [{
      title: '🔑 KEY MỚI ĐÃ ĐƯỢC LẤY!',
      color: 0xFF6B00,
      fields: [
        { name: '🎮 Key', value: `\`${key}\``, inline: false },
        { name: '⏰ Thời gian', value: now.toLocaleString('vi-VN'), inline: true },
        { name: '🌐 IP', value: generateFakeIP(), inline: true },
      ],
      footer: { text: 'Get Key AUTO • System Alert' },
      timestamp: now.toISOString(),
    }],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('Webhook error:', e);
  }
}

// ============================================================
//  STATS DISPLAY
// ============================================================
function loadStatsDisplay() {
  const totalEl = document.getElementById('statTotal');
  const todayEl = document.getElementById('statToday');
  const onlineEl = document.getElementById('statOnline');

  if (totalEl) {
    const total = parseInt(localStorage.getItem(CONFIG.LS_KEYS_ISSUED) || '0');
    animateNumber(totalEl, 0, 12847 + total, 2000);
  }
  if (todayEl) animateNumber(todayEl, 0, 342, 1800);
  if (onlineEl) animateNumber(onlineEl, 0, Math.floor(Math.random() * 80) + 40, 1600);
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(from + (to - from) * eased).toLocaleString('vi-VN');
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function startCounterAnimations() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(el => {
    const target = parseInt(el.getAttribute('data-count'));
    animateNumber(el, 0, target, 2000 + Math.random() * 500);
  });
}

// ============================================================
//  TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
  const existing = document.querySelectorAll('.toast');
  existing.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ============================================================
//  UTILITY
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
//  PARTICLES BACKGROUND (CANVAS)
// ============================================================
function initParticles() {
  const canvas = DOM.particlesCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  const COLORS = ['#FF6B00', '#FF0000', '#FF8C00', '#FFD700', '#FF4500'];
  const NUM_PARTICLES = Math.min(120, Math.floor(W * H / 8000));

  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : H + 10;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedY = -(Math.random() * 0.6 + 0.2);
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.6 + 0.1;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.life = 0;
      this.maxLife = Math.random() * 300 + 200;
      this.twinkle = Math.random() * Math.PI * 2;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.life++;
      this.twinkle += 0.03;
      const lifeRatio = this.life / this.maxLife;
      this.currentOpacity = this.opacity * Math.sin(lifeRatio * Math.PI) * (0.7 + 0.3 * Math.sin(this.twinkle));
      if (this.life >= this.maxLife || this.y < -10) this.reset();
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.currentOpacity);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.size * 4;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Connection lines
  class ConnectionLine {
    constructor(p1, p2) {
      this.p1 = p1;
      this.p2 = p2;
    }
    draw() {
      const dx = this.p1.x - this.p2.x;
      const dy = this.p1.y - this.p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 120) return;
      const alpha = (1 - dist / 120) * 0.15;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#FF6B00';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(this.p1.x, this.p1.y);
      ctx.lineTo(this.p2.x, this.p2.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  const particles = Array.from({ length: NUM_PARTICLES }, () => new Particle());

  function animate() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        new ConnectionLine(particles[i], particles[j]).draw();
      }
    }

    // Draw particles
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Resize
  window.addEventListener('resize', () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  });
}

// ============================================================
//  CONFETTI EFFECT
// ============================================================
function launchConfetti() {
  const canvas = DOM.confettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#FF6B00', '#FF0000', '#FFD700', '#ffffff', '#FF8C00', '#ff69b4'];
  const confetti = Array.from({ length: 200 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: Math.random() * 4 + 2,
    speedX: (Math.random() - 0.5) * 3,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.1,
    opacity: 1,
  }));

  let startTime = null;
  const duration = 4000;

  function drawConfetti(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confetti.forEach(c => {
      c.y += c.speedY;
      c.x += c.speedX;
      c.rot += c.rotSpeed;
      if (c.y > canvas.height) {
        c.y = -10;
        c.x = Math.random() * canvas.width;
      }
      c.opacity = Math.max(0, 1 - (elapsed / duration));

      ctx.save();
      ctx.globalAlpha = c.opacity;
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    });

    if (elapsed < duration) {
      state.confettiAnimFrame = requestAnimationFrame(drawConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  if (state.confettiAnimFrame) cancelAnimationFrame(state.confettiAnimFrame);
  requestAnimationFrame(drawConfetti);
}

// ============================================================
//  SCROLL REVEAL (optional enhancement)
// ============================================================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.guide-step, .benefit-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  revealObserver.observe(el);
});

// ============================================================
//  EXPOSE TO HTML
// ============================================================
window.startGetKeyFlow = startGetKeyFlow;
window.copyKey = copyKey;
