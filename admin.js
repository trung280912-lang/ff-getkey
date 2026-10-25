// ===== Get Key AUTO - ADMIN SCRIPT =====
'use strict';

// ============================================================
//  CONSTANTS
// ============================================================
const ADMIN = {
  USERNAME: 'admin',
  PASSWORD: 'admin123',
  LS_SESSION: 'ffkey_admin_session',
  LS_WEBHOOK: 'ffkey_webhook_url',
  LS_SYSTEM: 'ffkey_system_enabled',
  LS_KEYS_ISSUED: 'ffkey_keys_issued',
  LS_HISTORY: 'ffkey_history',
  LS_MANAGED_KEYS: 'ffkey_managed_keys',
};

// ============================================================
//  STATE
// ============================================================
const adminState = {
  panel: 'dashboard',
  history: [],
  managedKeys: [],
  systemEnabled: true,
  searchQuery: '',
};

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupLoginForm();
  loadSettings();
});

// ============================================================
//  SESSION
// ============================================================
function checkSession() {
  const session = sessionStorage.getItem(ADMIN.LS_SESSION);
  if (session === 'active') {
    showDashboard();
  } else {
    document.getElementById('loginPage').style.display = 'flex';
  }
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    if (username === ADMIN.USERNAME && password === ADMIN.PASSWORD) {
      sessionStorage.setItem(ADMIN.LS_SESSION, 'active');
      document.getElementById('loginPage').style.display = 'none';
      showDashboard();
      showToast('✅ Đăng nhập thành công!', 'success');
    } else {
      errorEl.style.display = 'flex';
      errorEl.textContent = '❌ Sai tên đăng nhập hoặc mật khẩu!';
      document.getElementById('loginPassword').value = '';
      setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
    }
  });
}

function logout() {
  sessionStorage.removeItem(ADMIN.LS_SESSION);
  document.getElementById('adminLayout').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  showToast('👋 Đã đăng xuất!', 'info');
}

// ============================================================
//  SHOW DASHBOARD
// ============================================================
function showDashboard() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminLayout').style.display = 'flex';
  loadData();
  switchPanel('dashboard');
}

function loadData() {
  // Load history
  adminState.history = JSON.parse(localStorage.getItem(ADMIN.LS_HISTORY) || '[]');
  // Load managed keys
  adminState.managedKeys = JSON.parse(localStorage.getItem(ADMIN.LS_MANAGED_KEYS) || '[]');
  // Load system state
  const sysState = localStorage.getItem(ADMIN.LS_SYSTEM);
  adminState.systemEnabled = sysState !== 'false';

  // Seed demo history if empty
  if (adminState.history.length === 0) {
    seedDemoHistory();
  }

  // Seed demo managed keys if empty
  if (adminState.managedKeys.length === 0) {
    seedDemoKeys();
  }

  updateSystemToggleUI();
}

function seedDemoHistory() {
  const ips = ['192.168.1.100', '10.0.0.55', '172.16.0.12', '203.113.154.22', '113.161.88.45', '27.72.99.184', '14.161.31.200'];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    adminState.history.push({
      key: generateKey(),
      timestamp: now - i * 3600000 * Math.random() * 3,
      ip: ips[Math.floor(Math.random() * ips.length)],
      status: Math.random() > 0.1 ? 'claimed' : 'expired',
    });
  }
  localStorage.setItem(ADMIN.LS_HISTORY, JSON.stringify(adminState.history));
}

function seedDemoKeys() {
  for (let i = 0; i < 10; i++) {
    adminState.managedKeys.push({
      id: generateId(),
      key: generateKey(),
      createdAt: Date.now() - i * 86400000,
      status: Math.random() > 0.3 ? 'available' : 'used',
      note: i % 3 === 0 ? 'VIP Key' : '',
    });
  }
  localStorage.setItem(ADMIN.LS_MANAGED_KEYS, JSON.stringify(adminState.managedKeys));
}

// ============================================================
//  PANEL SWITCHING
// ============================================================
function switchPanel(panelName) {
  adminState.panel = panelName;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-panel') === panelName);
  });

  // Update panels
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + panelName);
  });

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard',
    history: 'Lịch Sử Lấy Key',
    keys: 'Quản Lý Key',
    settings: 'Cài Đặt',
    webhook: 'Discord Webhook',
  };
  document.getElementById('topbarTitle').textContent = titles[panelName] || '';

  // Load panel data
  if (panelName === 'dashboard') renderDashboard();
  if (panelName === 'history') renderHistoryTable();
  if (panelName === 'keys') renderKeysTable();
  if (panelName === 'settings') loadSettings();
}

// ============================================================
//  DASHBOARD
// ============================================================
function renderDashboard() {
  const totalIssued = parseInt(localStorage.getItem(ADMIN.LS_KEYS_ISSUED) || '0');
  const baseTotal = 12847;
  const history = JSON.parse(localStorage.getItem(ADMIN.LS_HISTORY) || '[]');

  // Today's claims
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayCount = history.filter(h => h.timestamp >= todayStart.getTime()).length;

  // Available keys
  const managedKeys = JSON.parse(localStorage.getItem(ADMIN.LS_MANAGED_KEYS) || '[]');
  const availableKeys = managedKeys.filter(k => k.status === 'available').length;

  // Animate stats
  animateNumber('statTotal', baseTotal + totalIssued);
  animateNumber('statToday', todayCount + Math.floor(Math.random() * 50) + 20);
  animateNumber('statAvailable', availableKeys);
  animateNumber('statOnline', Math.floor(Math.random() * 80) + 40);

  // Recent activity
  renderRecentActivity(history.slice(0, 8));
}

function renderRecentActivity(items) {
  const container = document.getElementById('recentActivity');
  if (!container) return;
  container.innerHTML = items.map(item => {
    const timeAgo = getTimeAgo(item.timestamp);
    const dotClass = item.status === 'claimed' ? 'success' : 'warning';
    return `
      <div class="activity-item">
        <div class="activity-dot ${dotClass}"></div>
        <div class="activity-content">
          <p><strong>${item.ip}</strong> đã lấy key <code style="color:var(--primary);font-size:11px;">${item.key}</code></p>
          <span>${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
}

function animateNumber(elId, to) {
  const el = document.getElementById(elId);
  if (!el) return;
  const from = 0;
  const duration = 1500;
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

// ============================================================
//  HISTORY TABLE
// ============================================================
function renderHistoryTable(filter = '') {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  let items = [...adminState.history];
  if (filter) {
    const q = filter.toLowerCase();
    items = items.filter(h =>
      h.key.toLowerCase().includes(q) ||
      h.ip.includes(q) ||
      h.status.includes(q)
    );
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:40px;">Không có dữ liệu</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((h, i) => `
    <tr>
      <td class="key-cell">${h.key}</td>
      <td>${h.ip}</td>
      <td>${formatDateTime(h.timestamp)}</td>
      <td>
        <span class="badge ${h.status === 'claimed' ? 'badge-success' : 'badge-warning'}">
          ${h.status === 'claimed' ? '✅ Đã lấy' : '⚠️ Hết hạn'}
        </span>
      </td>
    </tr>
  `).join('');
}

function searchHistory(query) {
  renderHistoryTable(query);
}

function clearHistory() {
  if (!confirm('Xóa toàn bộ lịch sử? Thao tác không thể hoàn tác!')) return;
  adminState.history = [];
  localStorage.removeItem(ADMIN.LS_HISTORY);
  renderHistoryTable();
  showToast('🗑️ Đã xóa lịch sử!', 'success');
}

function exportHistory() {
  const data = adminState.history.map(h => ({
    Key: h.key,
    IP: h.ip,
    'Thời gian': formatDateTime(h.timestamp),
    Trạng_thái: h.status,
  }));
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ffkey_history_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Đã xuất dữ liệu!', 'success');
}

// ============================================================
//  KEY MANAGEMENT
// ============================================================
function renderKeysTable(filter = '') {
  const tbody = document.getElementById('keysTableBody');
  if (!tbody) return;

  let items = [...adminState.managedKeys];
  if (filter) {
    const q = filter.toLowerCase();
    items = items.filter(k => k.key.toLowerCase().includes(q) || k.note.toLowerCase().includes(q));
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:40px;">Chưa có key nào</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(k => `
    <tr>
      <td class="key-cell">${k.key}</td>
      <td>${formatDateTime(k.createdAt)}</td>
      <td><span class="badge ${k.status === 'available' ? 'badge-success' : 'badge-warning'}">${k.status === 'available' ? '✅ Khả dụng' : '⚠️ Đã dùng'}</span></td>
      <td>${k.note || '<span style="color:rgba(255,255,255,0.2)">—</span>'}</td>
      <td>
        <button class="btn-icon delete" onclick="deleteKey('${k.id}')" title="Xóa key">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function searchKeys(query) {
  renderKeysTable(query);
}

function openCreateKeyModal() {
  document.getElementById('createKeyModal').classList.add('active');
  document.getElementById('newKeyValue').value = generateKey();
}

function closeCreateKeyModal() {
  document.getElementById('createKeyModal').classList.remove('active');
}

function regenerateKey() {
  document.getElementById('newKeyValue').value = generateKey();
}

function createKey() {
  const keyValue = document.getElementById('newKeyValue').value.trim();
  const keyNote = document.getElementById('newKeyNote').value.trim();

  if (!keyValue) {
    showToast('❌ Vui lòng nhập giá trị key!', 'error');
    return;
  }

  const newKey = {
    id: generateId(),
    key: keyValue,
    createdAt: Date.now(),
    status: 'available',
    note: keyNote,
  };

  adminState.managedKeys.unshift(newKey);
  localStorage.setItem(ADMIN.LS_MANAGED_KEYS, JSON.stringify(adminState.managedKeys));
  renderKeysTable();
  closeCreateKeyModal();
  showToast('✅ Tạo key thành công!', 'success');
}

function deleteKey(id) {
  if (!confirm('Xóa key này?')) return;
  adminState.managedKeys = adminState.managedKeys.filter(k => k.id !== id);
  localStorage.setItem(ADMIN.LS_MANAGED_KEYS, JSON.stringify(adminState.managedKeys));
  renderKeysTable();
  showToast('🗑️ Đã xóa key!', 'success');
}

function generateBulkKeys() {
  const count = parseInt(document.getElementById('bulkCount')?.value || '10');
  const note = document.getElementById('bulkNote')?.value || '';

  for (let i = 0; i < Math.min(count, 100); i++) {
    adminState.managedKeys.unshift({
      id: generateId(),
      key: generateKey(),
      createdAt: Date.now(),
      status: 'available',
      note,
    });
  }
  localStorage.setItem(ADMIN.LS_MANAGED_KEYS, JSON.stringify(adminState.managedKeys));
  renderKeysTable();
  showToast(`✅ Đã tạo ${count} key mới!`, 'success');
}

function clearAllKeys() {
  if (!confirm('Xóa tất cả key đã tạo? Thao tác không thể hoàn tác!')) return;
  adminState.managedKeys = [];
  localStorage.removeItem(ADMIN.LS_MANAGED_KEYS);
  renderKeysTable();
  showToast('🗑️ Đã xóa tất cả key!', 'success');
}

// ============================================================
//  SETTINGS
// ============================================================
function loadSettings() {
  const webhookUrl = localStorage.getItem(ADMIN.LS_WEBHOOK) || '';
  const webhookInput = document.getElementById('webhookUrl');
  if (webhookInput) webhookInput.value = webhookUrl;

  const cooldown = document.getElementById('cooldownSetting');
  if (cooldown) cooldown.value = '24';

  updateSystemToggleUI();
}

function saveSettings() {
  const webhookUrl = document.getElementById('webhookUrl')?.value.trim() || '';
  if (webhookUrl) {
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      showToast('❌ URL webhook không hợp lệ! Phải bắt đầu bằng https://discord.com/api/webhooks/', 'error');
      return;
    }
    localStorage.setItem(ADMIN.LS_WEBHOOK, webhookUrl);
  } else {
    localStorage.removeItem(ADMIN.LS_WEBHOOK);
  }
  showToast('✅ Đã lưu cài đặt!', 'success');
}

async function testWebhook() {
  const webhookUrl = document.getElementById('webhookUrl')?.value.trim();
  if (!webhookUrl) {
    showToast('❌ Chưa nhập webhook URL!', 'error');
    return;
  }

  const btn = document.getElementById('testWebhookBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; }

  const payload = {
    username: 'FF KEY CENTER',
    embeds: [{
      title: '🔔 TEST WEBHOOK',
      description: 'Webhook đã được kết nối thành công với FF KEY CENTER!',
      color: 0xFF6B00,
      fields: [
        { name: '✅ Trạng thái', value: 'Kết nối thành công', inline: true },
        { name: '⏰ Thời gian', value: new Date().toLocaleString('vi-VN'), inline: true },
      ],
      footer: { text: 'FF KEY CENTER Admin Panel' },
    }],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status === 204) {
      showToast('✅ Webhook test thành công!', 'success');
    } else {
      showToast(`❌ Webhook lỗi: ${res.status}`, 'error');
    }
  } catch (e) {
    showToast('❌ Không thể kết nối webhook!', 'error');
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '🧪 TEST WEBHOOK'; }
}

// ============================================================
//  SYSTEM TOGGLE
// ============================================================
function toggleSystem() {
  adminState.systemEnabled = !adminState.systemEnabled;
  localStorage.setItem(ADMIN.LS_SYSTEM, String(adminState.systemEnabled));
  updateSystemToggleUI();
  showToast(
    adminState.systemEnabled ? '✅ Hệ thống đã BẬT!' : '🔴 Hệ thống đã TẮT!',
    adminState.systemEnabled ? 'success' : 'warning'
  );
}

function updateSystemToggleUI() {
  const btn = document.getElementById('systemToggleBtn');
  if (!btn) return;
  if (adminState.systemEnabled) {
    btn.className = 'system-toggle';
    btn.innerHTML = `<div class="toggle-dot"></div><span class="toggle-text">ONLINE</span>`;
  } else {
    btn.className = 'system-toggle off';
    btn.innerHTML = `<div class="toggle-dot"></div><span class="toggle-text">OFFLINE</span>`;
  }
}

// ============================================================
//  UTILITIES
// ============================================================
function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FFKEY-${seg()}-${seg()}-${seg()}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleString('vi-VN', { hour12: false });
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return `${Math.floor(diff / 86400000)} ngày trước`;
}

// ============================================================
//  TOAST
// ============================================================
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ============================================================
//  EXPOSE GLOBALS
// ============================================================
window.logout = logout;
window.switchPanel = switchPanel;
window.toggleSystem = toggleSystem;
window.searchHistory = searchHistory;
window.clearHistory = clearHistory;
window.exportHistory = exportHistory;
window.openCreateKeyModal = openCreateKeyModal;
window.closeCreateKeyModal = closeCreateKeyModal;
window.regenerateKey = regenerateKey;
window.createKey = createKey;
window.deleteKey = deleteKey;
window.generateBulkKeys = generateBulkKeys;
window.clearAllKeys = clearAllKeys;
window.saveSettings = saveSettings;
window.testWebhook = testWebhook;

// ============================================================
//  RÚT GỌN LINK LINK4M
// ============================================================
const FOURM_LS_API_KEY  = 'ffkey_link4m_api_key';
const FOURM_LS_HISTORY  = 'ffkey_link4m_history';

/** Lưu API Key */
function save4mApiKey() {
  const val = document.getElementById('fourm_api_key').value.trim();
  if (!val) { showToast('⚠️ Vui lòng nhập API Key!', 'warning'); return; }
  localStorage.setItem(FOURM_LS_API_KEY, val);
  update4mApiStatus();
  showToast('✅ Đã lưu API Key Link4M!', 'success');
}

/** Hiện/ẩn API Key */
function toggle4mApiKeyVisibility() {
  const inp = document.getElementById('fourm_api_key');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

/** Cập nhật badge trạng thái */
function update4mApiStatus() {
  const key = localStorage.getItem(FOURM_LS_API_KEY);
  const el  = document.getElementById('apiKeyStatus');
  if (!el) return;
  if (key) {
    el.textContent = '● Đã cấu hình';
    el.className = 'badge badge-success';
    // Điền sẵn input (dấu ẩn)
    document.getElementById('fourm_api_key').value = key;
  } else {
    el.textContent = '● Chưa cấu hình';
    el.className = 'badge badge-warning';
  }
}

/** Rút gọn link qua API 4M */
async function shorten4mLink() {
  const apiKey  = localStorage.getItem(FOURM_LS_API_KEY);
  const longUrl = document.getElementById('fourm_original_url').value.trim();
  const errBox  = document.getElementById('fourm_error_box');
  const resBox  = document.getElementById('fourm_result_box');
  const btn     = document.getElementById('shortenBtn');

  // Reset
  errBox.style.display = 'none';
  resBox.style.display = 'none';

  if (!apiKey) {
    errBox.textContent = '❌ Bạn chưa nhập API Key 4M! Vui lòng điền vào phần "Cấu Hình API 4M" phía trên.';
    errBox.style.display = 'block';
    return;
  }
  if (!longUrl) {
    showToast('⚠️ Vui lòng nhập link cần rút gọn!', 'warning');
    return;
  }
  try { new URL(longUrl); } catch {
    errBox.textContent = '❌ Link không hợp lệ! Hãy bắt đầu bằng https:// hoặc http://';
    errBox.style.display = 'block';
    return;
  }

  // Loading
  btn.disabled = true;
  btn.textContent = '⏳ Đang rút gọn...';

  try {
    // Gọi API Link4M
    // Endpoint: https://link4m.co/api?api=API_KEY&url=LONG_URL
    const apiUrl = `https://link4m.co/api?api=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(longUrl)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'success' && data.shortenedUrl) {
      const shortUrl = data.shortenedUrl;
      document.getElementById('fourm_short_url').value = shortUrl;
      document.getElementById('fourm_open_link').href = shortUrl;
      resBox.style.display = 'block';

      // Lưu vào lịch sử
      add4mHistory(longUrl, shortUrl);
      render4mHistory();
      showToast('✅ Rút gọn link thành công!', 'success');
    } else {
      // Hiển thị lỗi từ API
      const msg = data.message || data.error || JSON.stringify(data);
      errBox.innerHTML = `❌ API 4M trả về lỗi: <code style="color:#ffaa44;">${msg}</code><br><br>
        💡 Kiểm tra lại: API Key có đúng không? Link có bị chặn không?`;
      errBox.style.display = 'block';
    }
  } catch (err) {
    // Fallback thông báo lỗi CORS
    errBox.innerHTML = `❌ Không kết nối được đến API Link4M.<br><br>
      <strong>Nguyên nhân có thể:</strong><br>
      • Trình duyệt chặn CORS (chạy file HTML trực tiếp bị giới hạn)<br>
      • API Key sai hoặc hết hạn<br>
      • Mạng bị chặn truy cập link4m.co<br><br>
      💡 <strong>Giải pháp:</strong> Deploy website lên Vercel/Netlify rồi sử dụng tính năng này.`;
    errBox.style.display = 'block';
    console.error('[Link4M API Error]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔗 RÚT GỌN LINK';
  }
}

/** Copy link rút gọn */
function copy4mLink() {
  const val = document.getElementById('fourm_short_url').value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => {
    showToast('📋 Đã copy link!', 'success');
  });
}

/** Xóa form */
function clear4mForm() {
  document.getElementById('fourm_original_url').value = '';
  document.getElementById('fourm_short_url').value = '';
  document.getElementById('fourm_result_box').style.display = 'none';
  document.getElementById('fourm_error_box').style.display = 'none';
}

/** Thêm vào lịch sử */
function add4mHistory(longUrl, shortUrl) {
  const history = JSON.parse(localStorage.getItem(FOURM_LS_HISTORY) || '[]');
  history.unshift({
    id: Date.now(),
    longUrl,
    shortUrl,
    time: new Date().toLocaleString('vi-VN'),
  });
  // Giữ tối đa 50 mục
  if (history.length > 50) history.pop();
  localStorage.setItem(FOURM_LS_HISTORY, JSON.stringify(history));
}

/** Render lịch sử */
function render4mHistory() {
  const list    = document.getElementById('fourm_history_list');
  if (!list) return;
  const history = JSON.parse(localStorage.getItem(FOURM_LS_HISTORY) || '[]');
  if (!history.length) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);font-size:14px;">Chưa có link nào được rút gọn</div>';
    return;
  }
  list.innerHTML = history.map(item => `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.04);flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:3px;">${item.time}</div>
        <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;" title="${item.longUrl}">
          🔗 ${item.longUrl}
        </div>
        <div style="font-size:13px;color:#00ff80;font-family:'Orbitron',monospace;margin-top:4px;">
          ✂️ <a href="${item.shortUrl}" target="_blank" style="color:#00ff80;text-decoration:none;">${item.shortUrl}</a>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="navigator.clipboard.writeText('${item.shortUrl}').then(()=>showToast('📋 Đã copy!','success'))">📋</button>
        <button class="btn btn-danger"    style="padding:6px 12px;font-size:12px;" onclick="delete4mHistory(${item.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

/** Xóa 1 mục lịch sử */
function delete4mHistory(id) {
  let history = JSON.parse(localStorage.getItem(FOURM_LS_HISTORY) || '[]');
  history = history.filter(item => item.id !== id);
  localStorage.setItem(FOURM_LS_HISTORY, JSON.stringify(history));
  render4mHistory();
  showToast('🗑️ Đã xóa!', 'info');
}

/** Xóa toàn bộ lịch sử 4M */
function clear4mHistory() {
  if (!confirm('Xóa toàn bộ lịch sử rút gọn link?')) return;
  localStorage.removeItem(FOURM_LS_HISTORY);
  render4mHistory();
  showToast('🗑️ Đã xóa lịch sử!', 'info');
}

// Expose 4M functions
window.save4mApiKey          = save4mApiKey;
window.toggle4mApiKeyVisibility = toggle4mApiKeyVisibility;
window.shorten4mLink         = shorten4mLink;
window.copy4mLink            = copy4mLink;
window.clear4mForm           = clear4mForm;
window.delete4mHistory       = delete4mHistory;
window.clear4mHistory        = clear4mHistory;

// Load 4M panel data khi chuyển sang panel
const _origSwitchPanel = window.switchPanel;
window.switchPanel = function(panel) {
  _origSwitchPanel(panel);
  if (panel === 'shortlink') {
    update4mApiStatus();
    render4mHistory();
  }
};
