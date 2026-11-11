/**
 * ULTRON Authentication & Corporate Identity Module
 * Manages branding loading, dynamic demo accounts, quick login, and session validation
 */

async function initCorporateBranding() {
  try {
    const info = await api.auth.getPublicInfo();
    if (info) {
      if (info.nameTh) {
        APP_CONFIG.companyName = info.nameTh;
        const nameThEl = document.getElementById('loginCompanyNameTh');
        if (nameThEl) nameThEl.textContent = info.nameTh;
      }
      if (info.nameEn) {
        const nameEnEl = document.getElementById('loginCompanyNameEn');
        if (nameEnEl) nameEnEl.textContent = info.nameEn;
      }
      if (info.logoUrl) {
        APP_CONFIG.logoPath = info.logoUrl;
        const loginLogo = document.getElementById('loginCompanyLogo');
        if (loginLogo) loginLogo.src = info.logoUrl;

        // Update all corporate brand logos across the app
        document.querySelectorAll('.brand-logo-img').forEach((img) => {
          img.src = info.logoUrl;
        });
      }
    }
  } catch (err) {
    console.warn('[Branding] Could not fetch remote branding, using system default:', err.message);
  }
}

async function loadDynamicDemoAccounts() {
  const grid = document.getElementById('loginDemoAccountsGrid');
  if (!grid) return;

  try {
    const accounts = await api.auth.getDemoAccounts();
    if (!Array.isArray(accounts) || accounts.length === 0) {
      grid.innerHTML = '<div class="col-span-2 text-center py-2 text-slate-400 text-xs">ไม่พบบัญชีผู้ใช้งานที่เปิดใช้งานในระบบ</div>';
      return;
    }

    grid.innerHTML = '';
    accounts.forEach((acc) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.onclick = () => quickLoginAs(acc.username);
      btn.className =
        'p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-all cursor-pointer shadow-2xs group hover:border-blue-400 focus:ring-1 focus:ring-blue-400';

      const empBadge = acc.employeeId ? `<span class="text-slate-400">(${acc.employeeId})</span>` : '';
      btn.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="font-bold text-slate-900 text-[11px] truncate">${acc.groupDescription || acc.groupName}</div>
          <span class="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-mono">${acc.groupName}</span>
        </div>
        <div class="text-[10px] text-blue-700 font-mono mt-0.5 truncate">
          ${acc.username} ${empBadge}
        </div>
      `;
      grid.appendChild(btn);
    });
  } catch (err) {
    console.warn('[DemoAccounts] Could not load dynamic demo accounts from database:', err.message);
    grid.innerHTML = `
      <div class="col-span-2 text-center py-2 text-amber-600 text-[11px]">
        ไม่สามารถดึงข้อมูลจากตารางได้ (${err.message})
      </div>
    `;
  }
}

function quickLoginAs(username) {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorMsg = document.getElementById('loginErrorMsg');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  if (usernameInput) usernameInput.value = username;
  if (passwordInput) passwordInput.value = '123456';
  if (errorMsg) errorMsg.classList.add('hidden');

  showToast(`เลือกบัญชี ${username} แล้ว กรุณากดปุ่ม "เข้าสู่ระบบ"`, 'success');
  if (btnSubmit) btnSubmit.focus();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorMsg = document.getElementById('loginErrorMsg');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    if (errorMsg) {
      errorMsg.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  if (errorMsg) errorMsg.classList.add('hidden');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'กำลังตรวจสอบข้อมูล...';
  }

  try {
    const res = await api.auth.login(username, password);
    const loginUser = res && res.user ? res.user : null;
    const displayName = loginUser
      ? `${loginUser.username}${loginUser.employeeId ? ` (รหัส: ${loginUser.employeeId})` : ''}`
      : username;
    showToast(`เข้าสู่ระบบสำเร็จ: ${displayName}`, 'success');
    const now = Date.now();
    localStorage.setItem(SESSION_SECURITY_CONFIG.KEY_LOGIN_TIME, String(now));
    localStorage.setItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE, String(now));
    startSessionMonitor();
    await refreshAuthStatus();
  } catch (err) {
    console.error('Login failed:', err);
    if (errorMsg) {
      errorMsg.textContent = err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      errorMsg.classList.remove('hidden');
    }
    showToast('เข้าสู่ระบบไม่สำเร็จ: ' + (err.message || 'ตรวจสอบข้อมูล'), 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'เข้าสู่ระบบ (Sign In)';
    }
  }
}

function handleLogout() {
  stopSessionMonitor();
  localStorage.removeItem(SESSION_SECURITY_CONFIG.KEY_LOGIN_TIME);
  localStorage.removeItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE);
  api.auth.logout();
  currentUser = null;
  activeMenu = 'home';
  activeMasterTable = 'user';
  showToast('ลงชื่อออกจากระบบเรียบร้อยแล้ว', 'success');

  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  const passwordInput = document.getElementById('loginPassword');

  if (passwordInput) passwordInput.value = '';
  if (viewApp) viewApp.classList.add('hidden');
  if (viewLogin) viewLogin.classList.remove('hidden');
}

async function refreshAuthStatus() {
  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');

  if (!api.isAuthenticated()) {
    stopSessionMonitor();
    currentUser = null;
    if (viewLogin) viewLogin.classList.remove('hidden');
    if (viewApp) viewApp.classList.add('hidden');
    return null;
  }

  try {
    const user = await api.auth.getProfile();
    if (!user) {
      throw new Error('ไม่พบข้อมูลผู้ใช้');
    }

    currentUser = user;

    // Switch View to Application Workspace
    if (viewLogin) viewLogin.classList.add('hidden');
    if (viewApp) viewApp.classList.remove('hidden');

    // Populate Sidebar Identity
    const username = user.username || '-';
    const groups = Array.isArray(user.groups) && user.groups.length > 0 ? user.groups : ['GENERAL_USER'];
    const primaryGroup = groups[0];

    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarUsernameText = document.getElementById('sidebarUsernameText');
    const sidebarEmployeeIdText = document.getElementById('sidebarEmployeeIdText');
    const sidebarUserRoleBadge = document.getElementById('sidebarUserRoleBadge');

    if (sidebarUserAvatar) sidebarUserAvatar.textContent = username.charAt(0).toUpperCase();
    if (sidebarUsernameText) sidebarUsernameText.textContent = username;
    if (sidebarEmployeeIdText) sidebarEmployeeIdText.textContent = user.employeeId ? `ID: ${user.employeeId}` : 'ID: -';
    if (sidebarUserRoleBadge) sidebarUserRoleBadge.textContent = primaryGroup;

    // Populate Home Page Greeting
    const homeWelcomeUsername = document.getElementById('homeWelcomeUsername');
    if (homeWelcomeUsername) homeWelcomeUsername.textContent = username;

    // Render Dynamic Left Sidebar Menu based on permissions & submenus
    renderSidebarMenu(user);

    // Default to Home View for every user role
    navigateToMenu(activeMenu || 'home');

    // Start Dual-Tier Session Security Monitor (1hr Idle / 8hr Hard Expiry)
    startSessionMonitor();

    return user;
  } catch (err) {
    console.error('Session validation failed:', err);
    stopSessionMonitor();
    api.auth.logout();
    currentUser = null;
    if (viewLogin) viewLogin.classList.remove('hidden');
    if (viewApp) viewApp.classList.add('hidden');
    return null;
  }
}

// --------------------------------------------------------------------------
// Enterprise Dual-Tier Session Security Policy:
// 1. Idle Timeout (1 hr without mouse/keyboard activity)
// 2. Hard Expiry  (8 hrs maximum session lifetime from login)
// --------------------------------------------------------------------------
const SESSION_SECURITY_CONFIG = {
  IDLE_TIMEOUT_MS: 60 * 60 * 1000,      // 1 hour (60 minutes)
  HARD_TIMEOUT_MS: 8 * 60 * 60 * 1000,  // 8 hours
  CHECK_INTERVAL_MS: 15 * 1000,         // Evaluates policy every 15 seconds
  ACTIVITY_THROTTLE_MS: 5 * 1000,       // Throttles writing last active to 5 seconds
  KEY_LAST_ACTIVE: 'app_session_last_active',
  KEY_LOGIN_TIME: 'app_session_login_time',
};

let _sessionMonitorTimer = null;
let _lastActivityRecordTime = 0;

function startSessionMonitor() {
  stopSessionMonitor();

  const now = Date.now();
  if (!localStorage.getItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE)) {
    localStorage.setItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE, String(now));
  }
  if (!localStorage.getItem(SESSION_SECURITY_CONFIG.KEY_LOGIN_TIME)) {
    localStorage.setItem(SESSION_SECURITY_CONFIG.KEY_LOGIN_TIME, String(now));
  }

  // Monitor mouse movement, clicks, keystrokes, touch, and scrolling
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach((evt) => {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

  _sessionMonitorTimer = setInterval(evaluateSessionPolicy, SESSION_SECURITY_CONFIG.CHECK_INTERVAL_MS);
}

function stopSessionMonitor() {
  if (_sessionMonitorTimer) {
    clearInterval(_sessionMonitorTimer);
    _sessionMonitorTimer = null;
  }
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach((evt) => {
    window.removeEventListener(evt, recordUserActivity);
  });
}

function recordUserActivity() {
  const now = Date.now();
  if (now - _lastActivityRecordTime > SESSION_SECURITY_CONFIG.ACTIVITY_THROTTLE_MS) {
    _lastActivityRecordTime = now;
    if (api && api.isAuthenticated()) {
      localStorage.setItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE, String(now));
    }
  }
}

function evaluateSessionPolicy() {
  if (!api || !api.isAuthenticated()) {
    stopSessionMonitor();
    return;
  }

  const now = Date.now();
  const rawLastActive = localStorage.getItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE);
  const rawLoginTime = localStorage.getItem(SESSION_SECURITY_CONFIG.KEY_LOGIN_TIME);

  const lastActive = rawLastActive ? parseInt(rawLastActive, 10) : now;
  const loginTime = rawLoginTime ? parseInt(rawLoginTime, 10) : now;

  // 1. Check Idle / Inactivity Timeout (1 hour)
  const idleElapsed = now - lastActive;
  if (idleElapsed >= SESSION_SECURITY_CONFIG.IDLE_TIMEOUT_MS) {
    console.warn(`[Security] Session Idle Timeout triggered (${Math.round(idleElapsed / 60000)} mins inactive)`);
    handleSessionExpired('เซสชันหมดอายุเนื่องจากไม่มีการใช้งานหน้าจอเกิน 1 ชั่วโมง (Idle Timeout)');
    return;
  }

  // 2. Check Absolute Hard Lifetime (8 hours)
  const totalElapsed = now - loginTime;
  if (totalElapsed >= SESSION_SECURITY_CONFIG.HARD_TIMEOUT_MS) {
    console.warn(`[Security] Maximum Session Lifetime reached (${Math.round(totalElapsed / 3600000)} hrs elapsed)`);
    handleSessionExpired('เซสชันหมดอายุเนื่องจากเข้าใช้งานครบ 8 ชั่วโมงตามนโยบายความปลอดภัย (Maximum Lifetime)');
    return;
  }
}

function handleSessionExpired(reasonMessage) {
  stopSessionMonitor();
  localStorage.removeItem(SESSION_SECURITY_CONFIG.KEY_LAST_ACTIVE);
  localStorage.removeItem(SESSION_SECURITY_CONFIG.KEY_LOGIN_TIME);

  if (typeof api !== 'undefined' && api.auth) {
    api.auth.logout();
  }
  currentUser = null;

  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  if (viewApp) viewApp.classList.add('hidden');
  if (viewLogin) viewLogin.classList.remove('hidden');

  if (typeof showToast === 'function') {
    showToast(reasonMessage || 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warning');
  }
}
