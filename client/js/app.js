/**
 * ULTRON Core System - Enterprise Application Controller
 * Dynamic Role & Permission-based Navigation + Minimal Home Workspace
 */

const api = new ApiClient({
  baseUrl: 'http://localhost:3000',
});

let currentUser = null;
let activeMenu = 'home';

// Menu Definitions with granular permission constraints
const MENU_DEFINITIONS = [
  {
    id: 'home',
    label: 'หน้าหลัก (Home)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    requiredPermission: null, // เข้าได้ทุกคน ทุกบทบาทหน้าที่
  },
  {
    id: 'users',
    label: 'จัดการผู้ใช้งาน (Users)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
    requiredPermission: 'users:read',
  },
  {
    id: 'roles',
    label: 'จัดการกลุ่มและสิทธิ์ (Roles)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
    requiredPermission: 'system:configure',
  },
  {
    id: 'documents',
    label: 'จัดการเอกสาร (Documents)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    requiredPermission: 'documents:read',
  },
  {
    id: 'reports',
    label: 'รายงานระบบ (Reports)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    requiredPermission: 'reports:view',
  },
  {
    id: 'audit',
    label: 'บันทึกการทำงาน (Audit Trail)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    requiredPermission: 'audit:read',
  },
];

// App Startup
document.addEventListener('DOMContentLoaded', async () => {
  initDemoMode();
  await refreshAuthStatus();
});

// ----------------------------------------------------
// UI Notification Engine
// ----------------------------------------------------

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  toast.className = `py-2 px-3 rounded text-xs font-medium flex items-center space-x-2 transition-all transform duration-200 translate-y-1 opacity-0 pointer-events-auto shadow-md border ${
    isSuccess
      ? 'bg-slate-900 text-white border-slate-800'
      : 'bg-rose-50 text-rose-800 border-rose-300'
  }`;

  const iconSvg = isSuccess
    ? '<svg class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
    : '<svg class="w-3.5 h-3.5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-1', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-1');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ----------------------------------------------------
// Demo Accounts Helper (Developer Mode)
// ----------------------------------------------------

function initDemoMode() {
  const isDemo = localStorage.getItem('app_demo_mode') === 'true';
  applyDemoMode(isDemo);
}

function toggleDemoMode() {
  const current = localStorage.getItem('app_demo_mode') === 'true';
  const next = !current;
  localStorage.setItem('app_demo_mode', next ? 'true' : 'false');
  applyDemoMode(next);
  showToast(
    next
      ? 'เปิดโหมดทดสอบระบบสำหรับผู้พัฒนา'
      : 'เข้าสู่โหมดการทำงานจริง',
    'success'
  );
}

function applyDemoMode(enabled) {
  const panel = document.getElementById('loginDemoAccountsPanel');
  const badge = document.getElementById('demoModeBadge');
  const btn = document.getElementById('btnToggleDemoMode');

  if (panel) {
    if (enabled) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  }
  if (badge) {
    badge.textContent = enabled ? 'ON' : 'OFF';
    badge.className = enabled ? 'text-blue-700 font-bold font-mono' : 'text-slate-500 font-mono';
  }
  if (btn) {
    if (enabled) {
      btn.className =
        'text-xs text-blue-700 transition-colors inline-flex items-center space-x-1.5 py-1 px-3 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-2xs cursor-pointer';
    } else {
      btn.className =
        'text-xs text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center space-x-1.5 py-1 px-3 rounded border border-slate-300 bg-white shadow-2xs cursor-pointer';
    }
  }
}

function quickLoginAs(username) {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorMsg = document.getElementById('loginErrorMsg');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  // กรอกข้อมูลลงในฟอร์มเท่านั้น ไม่ยิง Request อัตโนมัติ (รหัสผ่านฐานข้อมูลตั้งต้นคือ 123456)
  if (usernameInput) usernameInput.value = username;
  if (passwordInput) passwordInput.value = '123456';
  if (errorMsg) errorMsg.classList.add('hidden');

  showToast(`เลือกบัญชี ${username} แล้ว กรุณากดปุ่ม "เข้าสู่ระบบ"`, 'success');
  if (btnSubmit) btnSubmit.focus();
}

// ----------------------------------------------------
// Authentication Flow & Role-based Menu Rendering
// ----------------------------------------------------

async function refreshAuthStatus() {
  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');

  if (!api.isAuthenticated()) {
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
    const employeeId = user.employeeId || 'ไม่มี (ยังไม่ได้ระบุ)';

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

    // Render Dynamic Left Sidebar Menu based on permissions
    renderSidebarMenu(user);

    // Default to Home View for every user role
    navigateToMenu('home');

    return user;
  } catch (err) {
    console.error('Session validation failed:', err);
    api.auth.logout();
    currentUser = null;
    if (viewLogin) viewLogin.classList.remove('hidden');
    if (viewApp) viewApp.classList.add('hidden');
    return null;
  }
}

function hasPermission(user, requiredPermission) {
  if (!requiredPermission) return true; // Accessible to all roles
  if (!user) return false;

  // Super Admin bypasses all checks
  const isSuperAdmin = Array.isArray(user.groups) && user.groups.includes('SUPER_ADMIN');
  if (isSuperAdmin) return true;

  // Check granular permissions array
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(requiredPermission);
}

function renderSidebarMenu(user) {
  const container = document.getElementById('sidebarMenuContainer');
  if (!container) return;

  container.innerHTML = '';

  MENU_DEFINITIONS.forEach((item) => {
    // Only display menu item if user has the assigned permission
    if (hasPermission(user, item.requiredPermission)) {
      const btn = document.createElement('button');
      btn.id = `sidebarBtn_${item.id}`;
      btn.type = 'button';
      btn.onclick = () => navigateToMenu(item.id);
      btn.className =
        item.id === activeMenu
          ? 'w-full flex items-center space-x-2.5 px-3 py-2 rounded font-medium transition-colors text-white bg-blue-600 shadow-xs'
          : 'w-full flex items-center space-x-2.5 px-3 py-2 rounded font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800';

      btn.innerHTML = `
        <span class="flex-shrink-0">${item.icon}</span>
        <span class="flex-1 text-left truncate">${item.label}</span>
      `;

      container.appendChild(btn);
    }
  });
}

function navigateToMenu(menuId) {
  activeMenu = menuId;

  // Update Sidebar active button styling
  MENU_DEFINITIONS.forEach((item) => {
    const btn = document.getElementById(`sidebarBtn_${item.id}`);
    if (btn) {
      if (item.id === menuId) {
        btn.className = 'w-full flex items-center space-x-2.5 px-3 py-2 rounded font-medium transition-colors text-white bg-blue-600 shadow-xs';
      } else {
        btn.className = 'w-full flex items-center space-x-2.5 px-3 py-2 rounded font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800';
      }
    }
  });

  const pageTitle = document.getElementById('pageTitle');
  const sectionHome = document.getElementById('sectionHome');
  const sectionPlaceholder = document.getElementById('sectionPlaceholder');
  const placeholderModuleTitle = document.getElementById('placeholderModuleTitle');

  const menuInfo = MENU_DEFINITIONS.find((m) => m.id === menuId);

  if (menuId === 'home') {
    if (pageTitle) pageTitle.textContent = 'หน้าหลัก (Home)';
    if (sectionHome) sectionHome.classList.remove('hidden');
    if (sectionPlaceholder) sectionPlaceholder.classList.add('hidden');
  } else {
    const titleText = menuInfo ? menuInfo.label : menuId;
    if (pageTitle) pageTitle.textContent = titleText;
    if (sectionHome) sectionHome.classList.add('hidden');
    if (sectionPlaceholder) {
      sectionPlaceholder.classList.remove('hidden');
      if (placeholderModuleTitle) placeholderModuleTitle.textContent = titleText;
    }
  }
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
    await api.auth.login(username, password);
    showToast(`เข้าสู่ระบบสำเร็จ: ${username}`, 'success');
    await refreshAuthStatus();
  } catch (err) {
    console.error('Login failed:', err);
    if (errorMsg) {
      errorMsg.textContent = err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      errorMsg.classList.remove('hidden');
    }
    showToast('เข้าสู่ระบบไม่สำเร็จ ตรวจสอบรหัสผ่าน', 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'เข้าสู่ระบบ (Sign In)';
    }
  }
}

function handleLogout() {
  api.auth.logout();
  currentUser = null;
  activeMenu = 'home';
  showToast('ลงชื่อออกจากระบบเรียบร้อยแล้ว', 'success');

  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  const passwordInput = document.getElementById('loginPassword');

  if (passwordInput) passwordInput.value = '';
  if (viewApp) viewApp.classList.add('hidden');
  if (viewLogin) viewLogin.classList.remove('hidden');
}
