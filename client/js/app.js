/**
 * ULTRON Core System - Enterprise Application Controller
 * Dynamic Role & Permission-based Navigation + Minimal Home Workspace
 * MasterData Module with Submenus & Searchable Filterable Comboboxes for Relational Tables
 */

const api = new ApiClient({
  baseUrl: 'http://localhost:3000',
});

// Global Application Configuration & Asset Registry
const APP_CONFIG = {
  logoPath: '/assets/logo/logo.jpg',
  companyName: 'PYLON PUBLIC COMPANY LIMITED',
};
window.APP_CONFIG = APP_CONFIG;

let currentUser = null;
let activeMenu = 'home';
let activeMasterTable = 'company';
let masterTableRawData = [];

// Menu Definitions with granular permission constraints and submenus
const MENU_DEFINITIONS = [
  {
    id: 'home',
    label: 'หน้าหลัก (Home)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    requiredPermission: null,
    adminOnly: false,
  },
  {
    id: 'masterData',
    label: 'MasterData (จัดการตาราง)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    requiredPermission: 'system:configure',
    adminOnly: true, // ปรากฏเฉพาะ Admin เท่านั้น
    submenus: [
      { id: 'company', label: 'บริษัท (Company)' },
      { id: 'user', label: 'ผู้ใช้งาน (User)' },
      { id: 'group', label: 'กลุ่มสิทธิ์ (Group)' },
      { id: 'permission', label: 'สิทธิ์การใช้งาน (Permission)' },
      { id: 'document', label: 'เอกสาร (Document)' },
      { id: 'auditlog', label: 'ประวัติ (AuditLog)' },
    ],
  },
  {
    id: 'users',
    label: 'จัดการผู้ใช้งาน (Users)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
    requiredPermission: 'users:read',
    adminOnly: false,
  },
  {
    id: 'roles',
    label: 'จัดการกลุ่มและสิทธิ์ (Roles)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
    requiredPermission: 'system:configure',
    adminOnly: false,
  },
  {
    id: 'documents',
    label: 'จัดการเอกสาร (Documents)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    requiredPermission: 'documents:read',
    adminOnly: false,
  },
  {
    id: 'reports',
    label: 'รายงานระบบ (Reports)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    requiredPermission: 'reports:view',
    adminOnly: false,
  },
  {
    id: 'audit',
    label: 'บันทึกการทำงาน (Audit Trail)',
    icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    requiredPermission: 'audit:read',
    adminOnly: false,
  },
];

// App Startup
document.addEventListener('DOMContentLoaded', async () => {
  initDemoMode();
  await initCorporateBranding();
  await refreshAuthStatus();
});

// ----------------------------------------------------
// Corporate Branding & Identity Loader
// ----------------------------------------------------

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

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (icon) {
    if (isPassword) {
      // Eye Slash Icon (Visible state)
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      `;
    } else {
      // Eye Normal Icon (Hidden state)
      icon.innerHTML = `
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      `;
    }
  }
}

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

function hasPermission(user, item) {
  if (!item) return false;
  if (!item.requiredPermission && !item.adminOnly) return true;
  if (!user) return false;

  const isSuperAdmin = Array.isArray(user.groups) && user.groups.includes('SUPER_ADMIN');
  if (isSuperAdmin) return true;

  if (item.adminOnly) return false;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(item.requiredPermission);
}

function renderSidebarMenu(user) {
  const container = document.getElementById('sidebarMenuContainer');
  if (!container) return;

  container.innerHTML = '';

  MENU_DEFINITIONS.forEach((item) => {
    if (hasPermission(user, item)) {
      const isParentActive = item.id === activeMenu;

      // Check if menu has submenus (e.g. MasterData)
      if (item.submenus && item.submenus.length > 0) {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'space-y-0.5';

        const parentBtn = document.createElement('button');
        parentBtn.id = `sidebarBtn_${item.id}`;
        parentBtn.type = 'button';
        parentBtn.onclick = () => navigateToMenu(item.id);
        parentBtn.className = isParentActive
          ? 'w-full flex items-center justify-between px-3 py-2 rounded font-medium transition-colors text-white bg-blue-600 shadow-xs'
          : 'w-full flex items-center justify-between px-3 py-2 rounded font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800';

        parentBtn.innerHTML = `
          <div class="flex items-center space-x-2.5 truncate">
            <span class="flex-shrink-0">${item.icon}</span>
            <span class="truncate">${item.label}</span>
          </div>
          <svg class="w-3 h-3 text-slate-400 flex-shrink-0 transform ${isParentActive ? 'rotate-90 text-white' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        `;

        itemWrapper.appendChild(parentBtn);

        // Submenu Container
        const subContainer = document.createElement('div');
        subContainer.id = `sidebarSubmenu_${item.id}`;
        subContainer.className = `ml-4 pl-2 border-l border-slate-800 space-y-0.5 mt-0.5 ${isParentActive ? '' : 'hidden'}`;

        item.submenus.forEach((sub) => {
          const isSubActive = isParentActive && activeMasterTable === sub.id;
          const subBtn = document.createElement('button');
          subBtn.id = `sidebarSub_${sub.id}`;
          subBtn.type = 'button';
          subBtn.onclick = () => navigateToMasterTable(sub.id);
          subBtn.className = isSubActive
            ? 'w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors text-white bg-slate-800 border-l-2 border-blue-400 pl-2'
            : 'w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-[11px] transition-colors text-slate-400 hover:text-white hover:bg-slate-800/60';

          subBtn.innerHTML = `
            <span class="w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-400' : 'bg-slate-600'} flex-shrink-0"></span>
            <span class="truncate">${sub.label}</span>
          `;

          subContainer.appendChild(subBtn);
        });

        itemWrapper.appendChild(subContainer);
        container.appendChild(itemWrapper);
      } else {
        // Standard Menu Item
        const btn = document.createElement('button');
        btn.id = `sidebarBtn_${item.id}`;
        btn.type = 'button';
        btn.onclick = () => navigateToMenu(item.id);
        btn.className = isParentActive
          ? 'w-full flex items-center space-x-2.5 px-3 py-2 rounded font-medium transition-colors text-white bg-blue-600 shadow-xs'
          : 'w-full flex items-center space-x-2.5 px-3 py-2 rounded font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800';

        btn.innerHTML = `
          <span class="flex-shrink-0">${item.icon}</span>
          <span class="flex-1 text-left truncate">${item.label}</span>
        `;

        container.appendChild(btn);
      }
    }
  });
}

function navigateToMenu(menuId) {
  activeMenu = menuId;

  // Refresh Sidebar styling
  if (currentUser) {
    renderSidebarMenu(currentUser);
  }

  const pageTitle = document.getElementById('pageTitle');
  const sectionHome = document.getElementById('sectionHome');
  const sectionPlaceholder = document.getElementById('sectionPlaceholder');
  const sectionMasterData = document.getElementById('sectionMasterData');
  const placeholderModuleTitle = document.getElementById('placeholderModuleTitle');

  const menuInfo = MENU_DEFINITIONS.find((m) => m.id === menuId);

  if (menuId === 'home') {
    if (pageTitle) pageTitle.textContent = 'หน้าหลัก (Home)';
    if (sectionHome) sectionHome.classList.remove('hidden');
    if (sectionPlaceholder) sectionPlaceholder.classList.add('hidden');
    if (sectionMasterData) sectionMasterData.classList.add('hidden');
  } else if (menuId === 'masterData') {
    if (pageTitle) pageTitle.textContent = 'MasterData (จัดการข้อมูลในตารางทั้งหมด)';
    if (sectionHome) sectionHome.classList.add('hidden');
    if (sectionPlaceholder) sectionPlaceholder.classList.add('hidden');
    if (sectionMasterData) sectionMasterData.classList.remove('hidden');
    switchMasterTable(activeMasterTable || 'user');
  } else {
    const titleText = menuInfo ? menuInfo.label : menuId;
    if (pageTitle) pageTitle.textContent = titleText;
    if (sectionHome) sectionHome.classList.add('hidden');
    if (sectionMasterData) sectionMasterData.classList.add('hidden');
    if (sectionPlaceholder) {
      sectionPlaceholder.classList.remove('hidden');
      if (placeholderModuleTitle) placeholderModuleTitle.textContent = titleText;
    }
  }
}

function navigateToMasterTable(tableName) {
  activeMasterTable = tableName.toLowerCase();
  navigateToMenu('masterData');
  switchMasterTable(tableName);
}

// ----------------------------------------------------
// MasterData Management Engine (Admin Only)
// ----------------------------------------------------

const MASTER_TABLES = ['company', 'user', 'group', 'permission', 'document', 'auditlog'];

function switchMasterTable(tableName) {
  activeMasterTable = tableName.toLowerCase();

  // Update Top Tab Styling
  MASTER_TABLES.forEach((tbl) => {
    const tabBtn = document.getElementById(`masterTab_${tbl}`);
    if (tabBtn) {
      if (tbl === activeMasterTable) {
        tabBtn.className =
          'px-4 py-2.5 text-xs font-semibold border-b-2 border-blue-600 text-blue-700 bg-white rounded-t transition-colors cursor-pointer flex items-center space-x-1.5 flex-shrink-0';
      } else {
        tabBtn.className =
          'px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 flex-shrink-0';
      }
    }
  });

  // Update Sidebar Submenu active highlighting
  MASTER_TABLES.forEach((tbl) => {
    const subBtn = document.getElementById(`sidebarSub_${tbl}`);
    if (subBtn) {
      const isSubActive = tbl === activeMasterTable;
      subBtn.className = isSubActive
        ? 'w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors text-white bg-slate-800 border-l-2 border-blue-400 pl-2'
        : 'w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-[11px] transition-colors text-slate-400 hover:text-white hover:bg-slate-800/60';

      const dot = subBtn.querySelector('span');
      if (dot) dot.className = `w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-400' : 'bg-slate-600'} flex-shrink-0`;
    }
  });

  const titleSpan = document.getElementById('masterCurrentTableName');
  if (titleSpan) titleSpan.textContent = activeMasterTable.toUpperCase();

  // AuditLog is read-only for compliance; hide create button
  const btnCreate = document.getElementById('btnMasterCreate');
  if (btnCreate) {
    if (activeMasterTable === 'auditlog') {
      btnCreate.classList.add('hidden');
    } else {
      btnCreate.classList.remove('hidden');
    }
  }

  // Reset search
  const searchInput = document.getElementById('masterSearchInput');
  if (searchInput) searchInput.value = '';

  loadMasterTableData();
}

async function loadMasterTableData() {
  const tbody = document.getElementById('masterTableTbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="100%" class="p-6 text-center text-xs text-slate-400 font-sans">กำลังดึงข้อมูลจากตาราง ${activeMasterTable.toUpperCase()}...</td></tr>`;
  }

  try {
    const res = await api.masterTable.findAll(activeMasterTable, { limit: 100 });
    masterTableRawData = res && res.data ? res.data : [];

    // Update Tab Count Badge
    const tabCount = document.getElementById(`tabCount_${activeMasterTable}`);
    if (tabCount) tabCount.textContent = masterTableRawData.length;

    renderMasterTable(masterTableRawData);
  } catch (err) {
    console.error(`Failed to load master table ${activeMasterTable}:`, err);
    showToast(`เกิดข้อผิดพลาดในการโหลดตาราง ${activeMasterTable}`, 'error');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="100%" class="p-6 text-center text-xs text-rose-600 font-sans">ไม่สามารถเชื่อมต่อข้อมูลได้: ${err.message}</td></tr>`;
    }
  }
}

function handleMasterSearchInput(event) {
  const query = (event.target.value || '').trim().toLowerCase();
  if (!query) {
    renderMasterTable(masterTableRawData);
    return;
  }

  const filtered = masterTableRawData.filter((row) => {
    return JSON.stringify(row).toLowerCase().includes(query);
  });

  renderMasterTable(filtered);
}

function renderMasterTable(records) {
  const thead = document.getElementById('masterTableThead');
  const tbody = document.getElementById('masterTableTbody');
  const countText = document.getElementById('masterTableCountText');

  if (!thead || !tbody) return;

  if (countText) countText.textContent = `แสดง ${records.length} รายการ`;

  let headersHtml = '';
  let rowsHtml = '';

  switch (activeMasterTable) {
    case 'company': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">ชื่อบริษัท (Company Name)</th>
          <th class="p-3">เลขผู้เสียภาษี (Tax ID)</th>
          <th class="p-3">สาขา (Branch)</th>
          <th class="p-3">เบอร์โทรศัพท์ & ติดต่อ</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลบริษัท</td></tr>`;
      } else {
        rowsHtml = records
          .map((c, i) => {
            const defaultBadge = c.isDefault
              ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold font-mono mr-1">สำนักงานหลัก</span>'
              : '';
            const statusBadge = c.isActive !== false
              ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-sans font-semibold">ใช้งานได้</span>'
              : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-sans">ปิดใช้งาน</span>';

            const branchDisplay = c.branchName
              ? `${c.branchName} <span class="font-mono text-slate-400 text-[10px]">(${c.branchCode || '00000'})</span>`
              : (c.branchCode || '-');

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3">
                  <div class="font-semibold text-slate-900">${c.nameTh}</div>
                  <div class="text-[11px] text-slate-500 font-sans">${c.nameEn}</div>
                </td>
                <td class="p-3 text-blue-700 font-mono font-medium">${c.taxId}</td>
                <td class="p-3 font-sans text-xs">${branchDisplay}</td>
                <td class="p-3 font-sans text-xs text-slate-600">
                  <div>${c.telephone || '-'}</div>
                  <div class="text-[10px] text-slate-400 truncate max-w-xs" title="${c.addressTh}">${c.addressTh}</div>
                </td>
                <td class="p-3">
                  ${defaultBadge}
                  ${statusBadge}
                </td>
                <td class="p-3 text-right font-sans space-x-1.5 whitespace-nowrap">
                  <button type="button" onclick="openCompanyPrintPreview('${c.id}')" title="พิมพ์ข้อมูลแบบทางการ / ส่งออก PDF" class="px-2 py-1 text-[11px] font-medium rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 cursor-pointer inline-flex items-center space-x-1 shadow-2xs">
                    <svg class="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    <span>พิมพ์ / PDF</span>
                  </button>
                  <button type="button" onclick="exportSingleCompanyToExcel('${c.id}')" title="ส่งออกข้อมูลบริษัทนี้เป็นไฟล์ Excel (CSV UTF-8)" class="px-2 py-1 text-[11px] font-medium rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 cursor-pointer inline-flex items-center space-x-1 shadow-2xs">
                    <svg class="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Excel</span>
                  </button>
                  <button type="button" onclick="openEditMasterRecordModal('${c.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  ${
                    c.isDefault
                      ? ''
                      : `<button type="button" onclick="deleteMasterRecord('${c.id}', '${c.nameTh}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
                          ลบ
                        </button>`
                  }
                </td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }

    case 'user': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">ชื่อบัญชี (Username)</th>
          <th class="p-3">รหัสพนักงาน (Employee ID)</th>
          <th class="p-3">กลุ่มสิทธิ์ (Groups)</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลผู้ใช้งาน</td></tr>`;
      } else {
        rowsHtml = records
          .map((u, i) => {
            const groupsBadge = (u.groups || [])
              .map(
                (g) =>
                  `<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 mr-1 font-mono">${g}</span>`
              )
              .join('');
            const statusBadge = u.isActive !== false
              ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-sans font-semibold">ใช้งานได้</span>'
              : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-sans">ปิดใช้งาน</span>';

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900">${u.username}</td>
                <td class="p-3 text-blue-700">${u.employeeId || '<span class="text-slate-400 italic font-sans">-</span>'}</td>
                <td class="p-3">${groupsBadge || '<span class="text-slate-400 italic font-sans">-</span>'}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right font-sans space-x-1.5">
                  <button type="button" onclick="openEditMasterRecordModal('${u.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${u.id}', '${u.username}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
                    ลบ
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }

    case 'group': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">ชื่อกลุ่ม (Group Name)</th>
          <th class="p-3">คำอธิบาย</th>
          <th class="p-3">สิทธิ์ที่ผูก (Permissions)</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลกลุ่มสิทธิ์</td></tr>`;
      } else {
        rowsHtml = records
          .map((g, i) => {
            const permCount = Array.isArray(g.permissions) ? g.permissions.length : 0;
            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900">${g.name}</td>
                <td class="p-3 text-slate-500 font-sans text-xs">${g.description || '-'}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold font-mono">
                    ${permCount} สิทธิ์
                  </span>
                </td>
                <td class="p-3 text-right font-sans space-x-1.5">
                  <button type="button" onclick="openEditMasterRecordModal('${g.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${g.id}', '${g.name}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
                    ลบ
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }

    case 'permission': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">รหัสสิทธิ์ (Permission Code)</th>
          <th class="p-3">คำอธิบายหน้าที่</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="4" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลสิทธิ์</td></tr>`;
      } else {
        rowsHtml = records
          .map((p, i) => {
            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900">${p.code}</td>
                <td class="p-3 text-slate-600 font-sans text-xs">${p.description || '-'}</td>
                <td class="p-3 text-right font-sans space-x-1.5">
                  <button type="button" onclick="openEditMasterRecordModal('${p.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${p.id}', '${p.code}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
                    ลบ
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }

    case 'document': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">เลขที่เอกสาร</th>
          <th class="p-3">ชื่อเรื่อง</th>
          <th class="p-3">ผู้จัดทำ (Author)</th>
          <th class="p-3">หมวดหมู่</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลเอกสาร</td></tr>`;
      } else {
        rowsHtml = records
          .map((d, i) => {
            const statusClass =
              d.status === 'CONFIRMED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : d.status === 'CANCELLED'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            const authorDisplay = d.author ? d.author.username : (d.authorId ? d.authorId.slice(0, 8) : '-');

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900">${d.docNumber}</td>
                <td class="p-3 text-slate-800 font-sans font-medium">${d.title}</td>
                <td class="p-3 text-blue-700 font-medium">
                  <span class="inline-flex items-center space-x-1">
                    <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span>${authorDisplay}</span>
                  </span>
                </td>
                <td class="p-3 text-slate-500 font-mono text-[11px]">${d.category}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-[10px] border font-bold font-mono ${statusClass}">
                    ${d.status}
                  </span>
                </td>
                <td class="p-3 text-right font-sans space-x-1.5">
                  <button type="button" onclick="openEditMasterRecordModal('${d.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${d.id}', '${d.docNumber}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
                    ลบ
                  </button>
                </td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }

    case 'auditlog': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">Action</th>
          <th class="p-3">Target</th>
          <th class="p-3">รายละเอียด (Details)</th>
          <th class="p-3">ผู้ใช้งาน</th>
          <th class="p-3 text-right">วันเวลา</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่มีประวัติการทำงาน (Audit Log)</td></tr>`;
      } else {
        rowsHtml = records
          .map((a, i) => {
            const dt = a.createdAt ? new Date(a.createdAt).toLocaleString('th-TH') : '-';
            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3">
                  <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-white font-bold">${a.action}</span>
                </td>
                <td class="p-3 text-blue-700 font-semibold">${a.target || '-'}</td>
                <td class="p-3 text-slate-600 font-sans text-xs max-w-xs truncate" title="${a.details || ''}">${a.details || '-'}</td>
                <td class="p-3 text-slate-700">${a.user ? a.user.username : (a.userId || '-')}</td>
                <td class="p-3 text-right text-slate-500 text-[11px]">${dt}</td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }
  }

  thead.innerHTML = headersHtml;
  tbody.innerHTML = rowsHtml;
}

// ----------------------------------------------------
// Searchable Combobox Component (Filterable Select)
// ----------------------------------------------------

const comboboxRegistry = {};

function initCombobox(containerId, { hiddenInputId, searchInputId, dropdownId, items, selectedValue, onSelect }) {
  comboboxRegistry[containerId] = {
    hiddenInputId,
    searchInputId,
    dropdownId,
    items: items || [],
    selectedValue: selectedValue || '',
    onSelect,
  };

  const hiddenInput = document.getElementById(hiddenInputId);
  const searchInput = document.getElementById(searchInputId);

  if (hiddenInput) hiddenInput.value = selectedValue || '';

  if (selectedValue) {
    const found = items.find((it) => it.value === selectedValue);
    if (found && searchInput) {
      searchInput.value = found.label + (found.sublabel ? ` (${found.sublabel})` : '');
    }
  }

  renderComboboxDropdown(containerId, items);
}

function renderComboboxDropdown(containerId, list) {
  const reg = comboboxRegistry[containerId];
  if (!reg) return;
  const dropdown = document.getElementById(reg.dropdownId);
  if (!dropdown) return;

  if (!list || list.length === 0) {
    dropdown.innerHTML = `
      <div class="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        ผลการค้นหา
      </div>
      <div class="p-4 text-center text-xs text-slate-400 font-sans">
        ไม่พบข้อมูลที่ตรงกับคำค้นหา
      </div>
    `;
    return;
  }

  const headerHtml = `
    <div class="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10">
      <span>เลือกรายการ (${list.length})</span>
      <span class="text-slate-400 font-normal">คลิกเพื่อเลือก</span>
    </div>
  `;

  const itemsHtml = list
    .map((item) => {
      const isSelected = item.value === reg.selectedValue;
      return `
        <div 
          onclick="selectComboboxItem('${containerId}', '${item.value}')" 
          class="px-3.5 py-2.5 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center justify-between transition-colors group ${
            isSelected ? 'bg-blue-50/90 font-bold text-blue-700' : 'text-slate-800'
          }"
        >
          <div>
            <div class="text-xs font-mono group-hover:text-white font-semibold">${item.label}</div>
            ${item.sublabel ? `<div class="text-[11px] text-slate-500 group-hover:text-blue-100 font-sans mt-0.5">${item.sublabel}</div>` : ''}
          </div>
          ${
            isSelected
              ? '<svg class="w-4 h-4 text-blue-600 group-hover:text-white flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
              : ''
          }
        </div>
      `;
    })
    .join('');

  dropdown.innerHTML = headerHtml + itemsHtml;
}

function filterCombobox(containerId, event) {
  const reg = comboboxRegistry[containerId];
  if (!reg) return;
  const query = (event.target.value || '').trim().toLowerCase();
  openCombobox(containerId);

  const filtered = reg.items.filter((it) => {
    return (
      it.label.toLowerCase().includes(query) ||
      (it.sublabel && it.sublabel.toLowerCase().includes(query)) ||
      it.value.toLowerCase().includes(query)
    );
  });

  renderComboboxDropdown(containerId, filtered);
}

function selectComboboxItem(containerId, value) {
  const reg = comboboxRegistry[containerId];
  if (!reg) return;

  reg.selectedValue = value;
  const hiddenInput = document.getElementById(reg.hiddenInputId);
  const searchInput = document.getElementById(reg.searchInputId);
  const dropdown = document.getElementById(reg.dropdownId);

  const found = reg.items.find((it) => it.value === value);
  if (hiddenInput) hiddenInput.value = value;
  if (searchInput && found) {
    searchInput.value = found.label + (found.sublabel ? ` (${found.sublabel})` : '');
  }
  if (dropdown) dropdown.classList.add('hidden');

  if (reg.onSelect) reg.onSelect(value, found);
}

function toggleCombobox(containerId) {
  const reg = comboboxRegistry[containerId];
  if (!reg) return;
  const dropdown = document.getElementById(reg.dropdownId);
  if (dropdown) {
    if (dropdown.classList.contains('hidden')) {
      openCombobox(containerId);
    } else {
      dropdown.classList.add('hidden');
    }
  }
}

function openCombobox(containerId) {
  const reg = comboboxRegistry[containerId];
  if (!reg) return;
  const dropdown = document.getElementById(reg.dropdownId);
  if (!dropdown) return;

  dropdown.classList.remove('hidden');
  renderComboboxDropdown(containerId, reg.items);

  // คำนวณตำแหน่งอัจฉริยะ ให้ Dropdown ลอยอยู่บนสุดเสมอ ไม่ถูก Modal บังคับหรือตัดขอบ
  const container = document.getElementById(containerId);
  if (container) {
    const rect = container.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 240 && rect.top > 240) {
      dropdown.classList.remove('top-full', 'mt-1', 'mt-1.5');
      dropdown.classList.add('bottom-full', 'mb-1.5');
    } else {
      dropdown.classList.remove('bottom-full', 'mb-1', 'mb-1.5');
      dropdown.classList.add('top-full', 'mt-1.5');
    }
  }
}

// Global click outside to close open combobox dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchable-combobox')) {
    Object.values(comboboxRegistry).forEach((reg) => {
      const dropdown = document.getElementById(reg.dropdownId);
      if (dropdown) dropdown.classList.add('hidden');
    });
  }
});

// ----------------------------------------------------
// Master Modal: Add / Edit Record Handling
// ----------------------------------------------------

function closeMasterModal() {
  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.add('hidden');
}

async function openCreateMasterRecordModal() {
  const recordIdInput = document.getElementById('masterFormRecordId');
  const title = document.getElementById('masterModalTitle');
  const subtitle = document.getElementById('masterModalSubtitle');
  const container = document.getElementById('masterFormFieldsContainer');

  if (recordIdInput) recordIdInput.value = '';
  if (title) title.textContent = `เพิ่มข้อมูลใหม่: ตาราง ${activeMasterTable.toUpperCase()}`;
  if (subtitle) subtitle.textContent = `กรอกข้อมูลเพื่อบันทึกลงในฐานข้อมูลระบบ`;

  if (container) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">กำลังเตรียมฟอร์มและดึงข้อมูลตารางที่สัมพันธ์...</div>`;
  }

  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.remove('hidden');

  await renderMasterFormFields(container, activeMasterTable, null);
}

async function openEditMasterRecordModal(id) {
  const record = masterTableRawData.find((r) => r.id === id);
  if (!record) {
    showToast('ไม่พบข้อมูลรายการที่ต้องการแก้ไข', 'error');
    return;
  }

  const recordIdInput = document.getElementById('masterFormRecordId');
  const title = document.getElementById('masterModalTitle');
  const subtitle = document.getElementById('masterModalSubtitle');
  const container = document.getElementById('masterFormFieldsContainer');

  if (recordIdInput) recordIdInput.value = id;
  if (title) title.textContent = `แก้ไขข้อมูล: ตาราง ${activeMasterTable.toUpperCase()}`;
  if (subtitle) subtitle.textContent = `รหัสรายการ (ID): ${id}`;

  if (container) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">กำลังเตรียมฟอร์มและดึงข้อมูลตารางที่สัมพันธ์...</div>`;
  }

  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.remove('hidden');

  await renderMasterFormFields(container, activeMasterTable, record);
}

async function renderMasterFormFields(container, table, existing) {
  if (!container) return;
  container.innerHTML = '';

  switch (table) {
    case 'company': {
      const isEdit = Boolean(existing);
      const isDefault = existing ? Boolean(existing.isDefault) : true;
      const isActive = existing ? existing.isActive !== false : true;
      const branchType = existing ? (existing.branchType || 'HEAD_OFFICE') : 'HEAD_OFFICE';

      container.innerHTML = `
        <!-- ส่วนที่ 1: ข้อมูลนิติบุคคลและสาขา -->
        <div class="border-b border-slate-200 pb-3">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>1. ข้อมูลนิติบุคคลและสาขา (Legal Entity & Branch)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID 13 หลัก) *</label>
              <input type="text" id="f_company_taxId" required maxlength="13" value="${existing ? existing.taxId : ''}" placeholder="เช่น 0107548000451" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">เลขทะเบียนพาณิชย์ / เลขทะเบียนนิติบุคคล</label>
              <input type="text" id="f_company_commercialRegNo" value="${existing && existing.commercialRegNo ? existing.commercialRegNo : ''}" placeholder="เช่น 0107548000451" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ประเภทสาขา</label>
              <select id="f_company_branchType" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white">
                <option value="HEAD_OFFICE" ${branchType === 'HEAD_OFFICE' ? 'selected' : ''}>สำนักงานใหญ่ (Head Office)</option>
                <option value="BRANCH" ${branchType === 'BRANCH' ? 'selected' : ''}>สาขา (Branch)</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสสาขา</label>
                <input type="text" id="f_company_branchCode" value="${existing ? existing.branchCode : '00000'}" placeholder="เช่น 00000" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อสาขา</label>
                <input type="text" id="f_company_branchName" value="${existing ? existing.branchName : 'สำนักงานใหญ่'}" placeholder="เช่น สำนักงานใหญ่" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
            </div>
          </div>
        </div>

        <!-- ส่วนที่ 2: ชื่อองค์กร -->
        <div class="border-b border-slate-200 pb-3">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>2. ชื่อองค์กร (Corporate Names)</span>
          </div>
          <div class="space-y-2.5">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อบริษัทภาษาไทย *</label>
              <input type="text" id="f_company_nameTh" required value="${existing ? existing.nameTh : ''}" placeholder="เช่น บริษัท ไพลอน จำกัด (มหาชน)" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อบริษัทภาษาอังกฤษ *</label>
                <input type="text" id="f_company_nameEn" required value="${existing ? existing.nameEn : ''}" placeholder="เช่น PYLON PUBLIC COMPANY LIMITED" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อย่อ (Short Name)</label>
                <input type="text" id="f_company_shortName" value="${existing && existing.shortName ? existing.shortName : ''}" placeholder="เช่น PYLON" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
            </div>
          </div>
        </div>

        <!-- ส่วนที่ 3: ที่อยู่และช่องทางติดต่อ -->
        <div class="border-b border-slate-200 pb-3">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>3. ที่อยู่และช่องทางติดต่อ (Address & Contact)</span>
          </div>
          <div class="space-y-2.5">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่ภาษาไทย *</label>
              <textarea id="f_company_addressTh" rows="2" required placeholder="ระบุเลขที่ อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">${existing ? existing.addressTh : ''}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่ภาษาอังกฤษ</label>
              <textarea id="f_company_addressEn" rows="2" placeholder="Address in English..." class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">${existing && existing.addressEn ? existing.addressEn : ''}</textarea>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสไปรษณีย์</label>
                <input type="text" id="f_company_postalCode" maxlength="5" value="${existing && existing.postalCode ? existing.postalCode : ''}" placeholder="เช่น 10400" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input type="text" id="f_company_telephone" value="${existing && existing.telephone ? existing.telephone : ''}" placeholder="เช่น 02-615-1259" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">เบอร์แฟกซ์</label>
                <input type="text" id="f_company_fax" value="${existing && existing.fax ? existing.fax : ''}" placeholder="เช่น 02-615-1258" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">อีเมลติดต่อ</label>
                <input type="email" id="f_company_email" value="${existing && existing.email ? existing.email : ''}" placeholder="contact@domain.com" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">เว็บไซต์</label>
              <input type="text" id="f_company_website" value="${existing && existing.website ? existing.website : ''}" placeholder="เช่น https://www.pylon.co.th" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
          </div>
        </div>

        <!-- ส่วนที่ 4: บัญชีธนาคารสำหรับเอกสารทางการเงิน -->
        <div class="border-b border-slate-200 pb-3">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>4. บัญชีธนาคารสำหรับออกเอกสาร (Banking Information)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อธนาคาร</label>
              <input type="text" id="f_company_bankName" value="${existing && existing.bankName ? existing.bankName : ''}" placeholder="เช่น ธนาคารกสิกรไทย" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">สาขาธนาคาร</label>
              <input type="text" id="f_company_bankBranch" value="${existing && existing.bankBranch ? existing.bankBranch : ''}" placeholder="เช่น สาขาสนามเป้า" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ประเภทบัญชี</label>
              <input type="text" id="f_company_accountType" value="${existing && existing.accountType ? existing.accountType : ''}" placeholder="เช่น กระแสรายวัน / ออมทรัพย์" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">เลขที่บัญชี</label>
              <input type="text" id="f_company_accountNumber" value="${existing && existing.accountNumber ? existing.accountNumber : ''}" placeholder="เช่น 029-1-08999-9" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี</label>
              <input type="text" id="f_company_accountName" value="${existing && existing.accountName ? existing.accountName : ''}" placeholder="เช่น บริษัท ไพลอน จำกัด (มหาชน)" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
          </div>
        </div>

        <!-- ส่วนที่ 5: อัตลักษณ์และการตั้งค่า -->
        <div>
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>5. อัตลักษณ์และการตั้งค่า (Branding & Settings)</span>
          </div>
          <div class="space-y-2.5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">ไฟล์โลโก้ (Logo URL)</label>
                <input type="text" id="f_company_logoUrl" value="${existing && existing.logoUrl ? existing.logoUrl : '/assets/logo/logo.jpg'}" placeholder="/assets/logo/logo.jpg" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">ไฟล์ตรายาง (Stamp URL)</label>
                <input type="text" id="f_company_stampUrl" value="${existing && existing.stampUrl ? existing.stampUrl : ''}" placeholder="เช่น /assets/stamp/stamp.png" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ข้อความท้ายเอกสาร (Document Footer Notice)</label>
              <input type="text" id="f_company_docFooterNotice" value="${existing && existing.docFooterNotice ? existing.docFooterNotice : ''}" placeholder="เช่น เอกสารนี้ออกโดยระบบอัตโนมัติ ULTRON Core System" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
            </div>
            <div class="flex items-center space-x-6 pt-1">
              <label class="inline-flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" id="f_company_isDefault" ${isDefault ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer">
                <span class="text-xs font-medium text-slate-700">ตั้งเป็นข้อมูลบริษัทหลัก (Default Company)</span>
              </label>
              <label class="inline-flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" id="f_company_isActive" ${isActive ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer">
                <span class="text-xs font-medium text-slate-700">สถานะเปิดใช้งาน (Active)</span>
              </label>
            </div>
          </div>
        </div>
      `;
      break;
    }

    case 'user': {
      // ดึงข้อมูลกลุ่มสิทธิ์จากตาราง Group ที่สัมพันธ์กัน
      let groupOptions = [];
      try {
        const groupsRes = await api.masterTable.findAll('group', { limit: 100 });
        groupOptions = (groupsRes && groupsRes.data ? groupsRes.data : []).map((g) => ({
          value: g.name,
          label: g.name,
          sublabel: g.description || 'กลุ่มสิทธิ์ระบบ',
        }));
      } catch (e) {
        console.warn('Could not fetch groups lookup:', e);
      }

      const currentGroups = existing && existing.groups ? existing.groups : ['GENERAL_USER'];

      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชีผู้ใช้งาน (Username) *</label>
          <input type="text" id="f_user_username" required value="${existing ? existing.username : ''}" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
        ${
          !existing
            ? `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน (Password) *</label>
          <input type="password" id="f_user_password" required value="123456" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
          <p class="text-[10px] text-slate-400 mt-0.5">ค่าเริ่มต้นคือ 123456</p>
        </div>`
            : `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่เปลี่ยน)</label>
          <input type="password" id="f_user_password" placeholder="รหัสผ่านใหม่" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
        </div>`
        }
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสพนักงาน (Employee ID) <span class="font-normal text-slate-400">(ถ้ามี)</span></label>
          <input type="text" id="f_user_employeeId" placeholder="เช่น EMP-001" value="${existing && existing.employeeId ? existing.employeeId : ''}" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
        </div>

        <!-- ความสัมพันธ์: ตาราง Group -->
        <div class="searchable-combobox relative" id="combo_user_group">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            กลุ่มสิทธิ์หลัก (Primary Group) * <span class="text-blue-700 font-mono font-normal">(ดึงจากตาราง Group)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_user_group_val" value="${currentGroups[0] || 'GENERAL_USER'}">
            <input 
              type="text" 
              id="f_user_group_search" 
              autocomplete="off"
              placeholder="พิมพ์เพื่อค้นหากลุ่มสิทธิ์..."
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_user_group')"
              oninput="filterCombobox('combo_user_group', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_user_group')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_user_group_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>
      `;

      initCombobox('combo_user_group', {
        hiddenInputId: 'f_user_group_val',
        searchInputId: 'f_user_group_search',
        dropdownId: 'combo_user_group_dropdown',
        items: groupOptions,
        selectedValue: currentGroups[0] || 'GENERAL_USER',
      });
      break;
    }

    case 'group': {
      // ดึงสิทธิ์จากตาราง Permission ที่สัมพันธ์กัน
      let permOptions = [];
      try {
        const permsRes = await api.masterTable.findAll('permission', { limit: 100 });
        permOptions = (permsRes && permsRes.data ? permsRes.data : []).map((p) => ({
          value: p.code,
          label: p.code,
          sublabel: p.description || '',
        }));
      } catch (e) {
        console.warn('Could not fetch permissions lookup:', e);
      }

      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อกลุ่มบทบาท (Group Name) *</label>
          <input type="text" id="f_group_name" required value="${existing ? existing.name : ''}" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายหน้าที่</label>
          <input type="text" id="f_group_description" value="${existing && existing.description ? existing.description : ''}" placeholder="ระบุหน้าที่ของกลุ่มสิทธิ์" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
        </div>

        <!-- ค้นหาและตรวจสอบสิทธิ์จากตาราง Permission -->
        <div class="searchable-combobox relative" id="combo_group_perm">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            ค้นหาตัวอย่างสิทธิ์ <span class="text-blue-700 font-mono font-normal">(ดึงจากตาราง Permission)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_group_perm_val" value="">
            <input 
              type="text" 
              id="f_group_perm_search" 
              autocomplete="off"
              placeholder="พิมพ์เพื่อค้นหารหัสสิทธิ์ (เช่น users:read)..."
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_group_perm')"
              oninput="filterCombobox('combo_group_perm', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_group_perm')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_group_perm_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>
      `;

      initCombobox('combo_group_perm', {
        hiddenInputId: 'f_group_perm_val',
        searchInputId: 'f_group_perm_search',
        dropdownId: 'combo_group_perm_dropdown',
        items: permOptions,
        selectedValue: '',
      });
      break;
    }

    case 'permission': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสสิทธิ์ (Permission Code) *</label>
          <input type="text" id="f_perm_code" required value="${existing ? existing.code : ''}" placeholder="เช่น users:create" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายสิทธิ์</label>
          <input type="text" id="f_perm_description" value="${existing && existing.description ? existing.description : ''}" placeholder="หน้าที่ของสิทธิ์นี้" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
      `;
      break;
    }

    case 'document': {
      const cat = existing ? existing.category : 'GENERAL';

      // ดึงรายชื่อผู้ใช้งานจากตาราง User ที่สัมพันธ์กัน
      let userOptions = [];
      try {
        const usersRes = await api.masterTable.findAll('user', { limit: 100 });
        userOptions = (usersRes && usersRes.data ? usersRes.data : []).map((u) => ({
          value: u.id,
          label: u.username,
          sublabel: u.employeeId ? `รหัสพนักงาน: ${u.employeeId}` : `ID: ${u.id.slice(0, 8)}`,
        }));
      } catch (e) {
        console.warn('Could not fetch users lookup for document author:', e);
      }

      const defaultAuthorId = existing && existing.authorId ? existing.authorId : (currentUser ? currentUser.id : '');

      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อเอกสาร (Title) *</label>
          <input type="text" id="f_doc_title" required value="${existing ? existing.title : ''}" placeholder="ระบุชื่อเอกสาร" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
        </div>

        <!-- ความสัมพันธ์: ตาราง User (Searchable Combobox) -->
        <div class="searchable-combobox relative" id="combo_doc_author">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            ผู้จัดทำเอกสาร (Author) * <span class="text-blue-700 font-mono font-normal">(ดึงจากตาราง User)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_doc_authorId" value="${defaultAuthorId}">
            <input 
              type="text" 
              id="f_doc_authorId_search" 
              autocomplete="off"
              placeholder="พิมพ์เพื่อค้นหาชื่อผู้ใช้ หรือรหัสพนักงาน..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_doc_author')"
              oninput="filterCombobox('combo_doc_author', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_doc_author')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_doc_author_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่เอกสาร</label>
          <select id="f_doc_category" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white">
            <option value="GENERAL" ${cat === 'GENERAL' ? 'selected' : ''}>GENERAL</option>
            <option value="FINANCIAL" ${cat === 'FINANCIAL' ? 'selected' : ''}>FINANCIAL</option>
            <option value="TECHNICAL" ${cat === 'TECHNICAL' ? 'selected' : ''}>TECHNICAL</option>
            <option value="COMPLIANCE" ${cat === 'COMPLIANCE' ? 'selected' : ''}>COMPLIANCE</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">เนื้อหาเอกสาร (Content)</label>
          <textarea id="f_doc_content" rows="4" placeholder="กรอกเนื้อหาเอกสาร..." class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">${existing && existing.content ? existing.content : ''}</textarea>
        </div>
      `;

      initCombobox('combo_doc_author', {
        hiddenInputId: 'f_doc_authorId',
        searchInputId: 'f_doc_authorId_search',
        dropdownId: 'combo_doc_author_dropdown',
        items: userOptions,
        selectedValue: defaultAuthorId,
      });
      break;
    }
  }
}

async function handleMasterFormSubmit(event) {
  event.preventDefault();
  const recordId = document.getElementById('masterFormRecordId').value;
  const btnSubmit = document.getElementById('btnMasterModalSubmit');

  const payload = {};

  switch (activeMasterTable) {
    case 'company': {
      payload.taxId = document.getElementById('f_company_taxId')?.value.trim();
      payload.nameTh = document.getElementById('f_company_nameTh')?.value.trim();
      payload.nameEn = document.getElementById('f_company_nameEn')?.value.trim();
      payload.shortName = document.getElementById('f_company_shortName')?.value.trim() || null;
      payload.branchType = document.getElementById('f_company_branchType')?.value || 'HEAD_OFFICE';
      payload.branchCode = document.getElementById('f_company_branchCode')?.value.trim() || '00000';
      payload.branchName = document.getElementById('f_company_branchName')?.value.trim() || 'สำนักงานใหญ่';
      payload.commercialRegNo = document.getElementById('f_company_commercialRegNo')?.value.trim() || null;
      payload.addressTh = document.getElementById('f_company_addressTh')?.value.trim();
      payload.addressEn = document.getElementById('f_company_addressEn')?.value.trim() || null;
      payload.postalCode = document.getElementById('f_company_postalCode')?.value.trim() || null;
      payload.telephone = document.getElementById('f_company_telephone')?.value.trim() || null;
      payload.fax = document.getElementById('f_company_fax')?.value.trim() || null;
      payload.email = document.getElementById('f_company_email')?.value.trim() || null;
      payload.website = document.getElementById('f_company_website')?.value.trim() || null;
      payload.bankName = document.getElementById('f_company_bankName')?.value.trim() || null;
      payload.bankBranch = document.getElementById('f_company_bankBranch')?.value.trim() || null;
      payload.accountType = document.getElementById('f_company_accountType')?.value.trim() || null;
      payload.accountName = document.getElementById('f_company_accountName')?.value.trim() || null;
      payload.accountNumber = document.getElementById('f_company_accountNumber')?.value.trim() || null;
      payload.logoUrl = document.getElementById('f_company_logoUrl')?.value.trim() || '/assets/logo/logo.jpg';
      payload.stampUrl = document.getElementById('f_company_stampUrl')?.value.trim() || null;
      payload.docFooterNotice = document.getElementById('f_company_docFooterNotice')?.value.trim() || null;
      payload.isDefault = Boolean(document.getElementById('f_company_isDefault')?.checked);
      payload.isActive = Boolean(document.getElementById('f_company_isActive')?.checked);
      break;
    }

    case 'user': {
      const u = document.getElementById('f_user_username').value.trim();
      const p = document.getElementById('f_user_password')?.value;
      const emp = document.getElementById('f_user_employeeId')?.value.trim();
      const selectedGroup = document.getElementById('f_user_group_val')?.value;

      payload.username = u;
      if (p) payload.password = p;
      payload.employeeId = emp || null;
      if (selectedGroup) payload.groups = [selectedGroup];
      break;
    }

    case 'group': {
      payload.name = document.getElementById('f_group_name').value.trim();
      payload.description = document.getElementById('f_group_description').value.trim();
      break;
    }

    case 'permission': {
      payload.code = document.getElementById('f_perm_code').value.trim();
      payload.description = document.getElementById('f_perm_description').value.trim();
      break;
    }

    case 'document': {
      payload.title = document.getElementById('f_doc_title').value.trim();
      payload.category = document.getElementById('f_doc_category').value;
      payload.content = document.getElementById('f_doc_content').value.trim();
      const authorId = document.getElementById('f_doc_authorId')?.value;
      if (authorId) payload.authorId = authorId;
      break;
    }
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'กำลังบันทึก...';
  }

  try {
    if (recordId) {
      await api.masterTable.update(activeMasterTable, recordId, payload);
      showToast(`แก้ไขข้อมูลในตาราง ${activeMasterTable.toUpperCase()} สำเร็จ`, 'success');
    } else {
      await api.masterTable.create(activeMasterTable, payload);
      showToast(`เพิ่มข้อมูลใหม่ลงในตาราง ${activeMasterTable.toUpperCase()} สำเร็จ`, 'success');
    }

    closeMasterModal();
    await loadMasterTableData();
  } catch (err) {
    console.error('Master form submit error:', err);
    showToast(err.message || 'บันทึกข้อมูลไม่สำเร็จ ตรวจสอบข้อมูลซ้ำซ้อน', 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'บันทึกข้อมูล';
    }
  }
}

async function deleteMasterRecord(id, label) {
  const confirmMsg = `ยืนยันการลบข้อมูล "${label || id}" ออกจากตาราง ${activeMasterTable.toUpperCase()} หรือไม่?`;
  if (!confirm(confirmMsg)) return;

  try {
    await api.masterTable.delete(activeMasterTable, id);
    showToast(`ลบข้อมูล "${label || id}" เรียบร้อยแล้ว`, 'success');
    await loadMasterTableData();
  } catch (err) {
    console.error('Delete master record failed:', err);
    showToast(err.message || 'ลบข้อมูลไม่สำเร็จ อาจมีข้อมูลอื่นอ้างอิงอยู่', 'error');
  }
}

// ----------------------------------------------------
// Sign In / Sign Out Actions
// ----------------------------------------------------

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
  activeMasterTable = 'user';
  showToast('ลงชื่อออกจากระบบเรียบร้อยแล้ว', 'success');

  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  const passwordInput = document.getElementById('loginPassword');

  if (passwordInput) passwordInput.value = '';
  if (viewApp) viewApp.classList.add('hidden');
  if (viewLogin) viewLogin.classList.remove('hidden');
}

// ----------------------------------------------------
// Formal Company Profile Print / PDF & Excel Engines
// ----------------------------------------------------

let currentPreviewCompany = null;

function openCompanyPrintPreview(companyId) {
  const company = masterTableRawData.find((c) => c.id === companyId);
  if (!company) {
    showToast('ไม่พบข้อมูลบริษัทที่ต้องการพิมพ์', 'error');
    return;
  }

  currentPreviewCompany = company;
  const container = document.getElementById('companyPrintDocument');
  if (container) {
    container.innerHTML = renderCompanyPrintDocumentHtml(company);
  }

  const modal = document.getElementById('modalCompanyPrintPreview');
  if (modal) modal.classList.remove('hidden');
}

function closeCompanyPrintPreview() {
  const modal = document.getElementById('modalCompanyPrintPreview');
  if (modal) modal.classList.add('hidden');
}

function printCompanyDocument(company) {
  const comp = company || currentPreviewCompany;
  if (!comp) {
    showToast('ไม่พบข้อมูลบริษัทที่ต้องการพิมพ์', 'error');
    return;
  }

  // ใช้ Isolated Iframe ที่ตัดขาดจาก Layout ของหน้าจอหลักและ Modal
  // เพื่อแก้ปัญหาเบราว์เซอร์สับสนทิศทางกระดาษ (Landscape/Portrait Bug) ได้ 100%
  let printFrame = document.getElementById('companyPrintIframe');
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'companyPrintIframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const htmlContent = generateCompanyPrintFullHtml(comp);
  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  // รอให้ฟอนต์และรูปภาพพร้อม แล้วเรียก Dialog การพิมพ์
  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to new window:', e);
      openCompanyPrintInNewTab(comp.id);
    }
  }, 400);
}

function openCompanyPrintInNewTab(companyId) {
  const comp = companyId ? masterTableRawData.find((c) => c.id === companyId) : currentPreviewCompany;
  if (!comp) {
    showToast('ไม่พบข้อมูลบริษัท', 'error');
    return;
  }

  const newWin = window.open('', '_blank');
  if (!newWin) {
    showToast('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัป', 'error');
    return;
  }

  newWin.document.open();
  newWin.document.write(generateCompanyPrintFullHtml(comp));
  newWin.document.close();
  newWin.focus();
}

function generateCompanyPrintFullHtml(company) {
  const innerBody = renderCompanyPrintDocumentHtml(company);
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>แบบแสดงรายการข้อมูลนิติบุคคล - ${company.nameTh}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
  <style>
    @page {
      size: A4 portrait !important;
      margin: 10mm 14mm 10mm 14mm !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Sarabun', 'TH Sarabun New', sans-serif !important;
      font-size: 16px !important;
      line-height: 1.45 !important;
    }
    .print-sheet {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 4px 0;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #94a3b8;
      font-size: 16px;
      line-height: 1.4;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      vertical-align: middle;
    }
    .lbl {
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
      width: 25%;
    }
    .val {
      color: #0f172a;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    ${innerBody}
  </div>
</body>
</html>`;
}

function renderCompanyPrintDocumentHtml(company) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateTimeFormatted = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const logoSrc = company.logoUrl || '/assets/logo/logo.jpg';
  const branchText =
    company.branchType === 'HEAD_OFFICE'
      ? `สำนักงานใหญ่ (รหัส ${company.branchCode || '00000'})`
      : `${company.branchName || 'สาขา'} (รหัส ${company.branchCode || '-'})`;

  return `
    <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 16px; line-height: 1.45; color: #0f172a;">
      
      <!-- 1. Corporate Official Letterhead Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #0f172a; padding-bottom: 10px; margin-bottom: 12px; gap: 16px;">
        <!-- Corporate Logo -->
        <div style="flex-shrink: 0; max-width: 190px; height: 52px; display: flex; align-items: center;">
          <img src="${logoSrc}" alt="Logo" style="max-height: 52px; max-width: 190px; object-fit: contain; display: block;" onerror="this.style.display='none';">
        </div>

        <!-- Corporate Header Text (Right Aligned) -->
        <div style="flex: 1; text-align: right; min-width: 0;">
          <div style="font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.2;">
            ${company.nameTh}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.25; margin-top: 1px;">
            ${company.nameEn}
          </div>
          <div style="font-size: 13px; color: #334155; margin-top: 2px;">
            เลขประจำตัวผู้เสียภาษี: <strong style="font-family: 'JetBrains Mono', monospace; font-size: 14px;">${company.taxId}</strong> 
            &nbsp;|&nbsp; สถานประกอบการ: <strong>${branchText}</strong>
          </div>
        </div>
      </div>

      <!-- 2. Formal Document Title Banner -->
      <div style="text-align: center; margin: 12px 0 14px 0;">
        <div style="font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: 0.02em;">
          แบบแสดงรายการข้อมูลนิติบุคคลและสถานประกอบการ
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px;">
          Official Corporate Profile & Registered Legal Entity Details
        </div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
          เลขที่เอกสารอ้างอิง: <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1e293b;">COMP-DOC-${company.taxId}-${now.getFullYear()}</span>
          &nbsp;&nbsp;•&nbsp;&nbsp; วันที่ออกเอกสาร: <span style="color: #1e293b; font-weight: 500;">${dateFormatted}</span>
        </div>
      </div>

      <!-- 3. Section 1: ข้อมูลทางทะเบียนนิติบุคคล -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #94a3b8; padding-bottom: 3px; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>1. ข้อมูลการจดทะเบียนนิติบุคคล (Corporate Registration & Legal Status)</span>
          <span style="font-size: 13px; font-weight: 400; color: #64748b;">หมวดที่ 1</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 16px; line-height: 1.4; margin-bottom: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ชื่อบริษัท (ภาษาไทย)</td>
              <td style="width: 75%; padding: 5px 10px; font-weight: 700; color: #0f172a;" colspan="3">${company.nameTh}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ชื่อบริษัท (ภาษาอังกฤษ)</td>
              <td style="padding: 5px 10px; font-weight: 600; color: #334155;" colspan="3">${company.nameEn}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">เลขประจำตัวผู้เสียภาษี</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.taxId}</td>
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">เลขทะเบียนพาณิชย์/นิติบุคคล</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a;">${company.commercialRegNo || company.taxId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ประเภทสถานประกอบการ</td>
              <td style="padding: 5px 10px; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.branchType === 'HEAD_OFFICE' ? 'สำนักงานใหญ่ (Head Office)' : 'สาขา (Branch)'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">รหัสและชื่อสาขา</td>
              <td style="padding: 5px 10px; color: #0f172a;">${company.branchName} (${company.branchCode || '00000'})</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ชื่อย่อองค์กร (Short Name)</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.shortName || '-'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">สถานะในระบบ</td>
              <td style="padding: 5px 10px; color: #0f172a;">${company.isDefault ? 'สำนักงานหลัก (Default Company)' : 'สาขา/บริษัทย่อย'} • ${company.isActive !== false ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 4. Section 2: ที่ตั้งสำนักงานและการติดต่อ -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #94a3b8; padding-bottom: 3px; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>2. ที่ตั้งสำนักงานและการติดต่อสื่อสาร (Registered Office Address & Contacts)</span>
          <span style="font-size: 13px; font-weight: 400; color: #64748b;">หมวดที่ 2</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 16px; line-height: 1.4; margin-bottom: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ที่อยู่จดทะเบียน (ภาษาไทย)</td>
              <td style="width: 75%; padding: 5px 10px; color: #0f172a;" colspan="3">${company.addressTh}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ที่อยู่ (ภาษาอังกฤษ)</td>
              <td style="padding: 5px 10px; color: #334155;" colspan="3">${company.addressEn || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">รหัสไปรษณีย์</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.postalCode || '-'}</td>
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">หมายเลขโทรศัพท์</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #0f172a;">${company.telephone || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">หมายเลขโทรสาร (แฟกซ์)</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.fax || '-'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">จดหมายอิเล็กทรอนิกส์ (อีเมล)</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a;">${company.email || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">เว็บไซต์ทางการ</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a;" colspan="3">${company.website || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 5. Section 3: ข้อมูลสถาบันการเงินสำหรับธุรกรรม -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #94a3b8; padding-bottom: 3px; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>3. ข้อมูลบัญชีสถาบันการเงินสำหรับธุรกรรม (Corporate Banking Information)</span>
          <span style="font-size: 13px; font-weight: 400; color: #64748b;">หมวดที่ 3</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 16px; line-height: 1.4; margin-bottom: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">สถาบันการเงิน / ธนาคาร</td>
              <td style="width: 25%; padding: 5px 10px; font-weight: 600; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.bankName || '-'}</td>
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">สาขาธนาคาร</td>
              <td style="width: 25%; padding: 5px 10px; color: #0f172a;">${company.bankBranch || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ประเภทบัญชี</td>
              <td style="padding: 5px 10px; color: #0f172a; border-right: 1px solid #cbd5e1;">${company.accountType || '-'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">เลขที่บัญชี</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a;">${company.accountNumber || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1;">ชื่อบัญชี</td>
              <td style="padding: 5px 10px; font-weight: 600; color: #0f172a;" colspan="3">${company.accountName || company.nameTh}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 6. Section 4: คำรับรองความถูกต้องและตรายางนิติบุคคล -->
      <div style="margin-top: 14px; page-break-inside: avoid;">
        <div style="text-align: center; font-size: 15px; font-weight: 500; font-style: italic; color: #334155; margin-bottom: 10px;">
          "ขอรับรองว่ารายการและข้อมูลตามที่ปรากฏในเอกสารฉบับนี้ ถูกต้องตรงตามทะเบียนประวัติของบริษัททุกประการ"
        </div>

        <div style="display: flex; gap: 20px; font-size: 16px;">
          <!-- Signatory Box -->
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; background-color: #f8fafc; min-height: 125px;">
            <div style="height: 38px;"></div>
            <div style="width: 200px; border-bottom: 1px solid #0f172a; margin: 0 auto 6px auto;"></div>
            <div style="font-weight: 700; color: #0f172a; font-size: 15px;">( .................................................................... )</div>
            <div style="font-size: 14px; color: #334155; margin-top: 2px;">กรรมการผู้มีอำนาจลงนาม / ผู้รับมอบอำนาจ</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 2px;">วันที่ .......... / .......... / ................</div>
          </div>

          <!-- Official Stamp Box -->
          <div style="flex: 1; border: 2px dashed #94a3b8; border-radius: 4px; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 125px; background-color: #f8fafc;">
            ${
              company.stampUrl
                ? `<img src="${company.stampUrl}" alt="Corporate Seal" style="max-height: 75px; max-width: 120px; object-fit: contain; margin-bottom: 4px;">`
                : `
                <div style="color: #64748b; font-size: 15px; line-height: 1.3;">
                  <div style="font-weight: 600; color: #475569;">( ประทับตราสำคัญของบริษัท )</div>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Official Corporate Seal</div>
                </div>
                `
            }
          </div>
        </div>
      </div>

      <!-- 7. Official Document Footer -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b;">
        <div>${company.docFooterNotice || 'เอกสารนี้ออกโดยระบบอัตโนมัติ ULTRON Core System'}</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">พิมพ์เมื่อ: ${dateTimeFormatted} • Local Sovereignty Architecture</div>
      </div>

    </div>
  `;
}
        <div>${company.docFooterNotice || 'เอกสารนี้ออกโดยระบบอัตโนมัติ ULTRON Core System'}</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">พิมพ์เมื่อ: ${dateTimeFormatted} • Local Sovereignty Architecture</div>
      </div>

    </div>
  `;
}

// ----------------------------------------------------
// Excel Export Engines (Microsoft Excel UTF-8 BOM Compliant)
// ----------------------------------------------------

function downloadCsvFile(content, filename) {
  const bomContent = content.startsWith('\uFEFF') ? content : '\uFEFF' + content;
  const blob = new Blob([bomContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `company_export_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportSingleCompanyToExcel(companyId) {
  const company = masterTableRawData.find((c) => c.id === companyId);
  if (!company) {
    showToast('ไม่พบข้อมูลบริษัทที่ต้องการส่งออก', 'error');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Escape CSV value helper
  const esc = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Text formula helper to preserve leading zeros in Excel (e.g. Tax ID, Branch Code, Postal Code, Tel)
  const escText = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `="""${s}"""`;
  };

  const rows = [
    ['แบบแสดงรายการข้อมูลนิติบุคคลและสถานประกอบการ (Official Corporate Profile)'],
    [`บริษัท: ${company.nameTh} (${company.nameEn})`],
    [`พิมพ์เมื่อ: ${dateStr}`],
    [''],
    ['ลำดับ', 'หมวดหมู่ข้อมูล', 'หัวข้อรายการ (Field Description)', 'รายละเอียดข้อมูล (Field Value)'],
    ['1', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อบริษัท (ภาษาไทย)', esc(company.nameTh)],
    ['2', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อบริษัท (ภาษาอังกฤษ)', esc(company.nameEn)],
    ['3', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อย่อองค์กร (Short Name)', esc(company.shortName || '-')],
    ['4', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)', escText(company.taxId)],
    ['5', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'เลขทะเบียนพาณิชย์ / เลขทะเบียนนิติบุคคล', escText(company.commercialRegNo || company.taxId)],
    ['6', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ประเภทสถานประกอบการ', esc(company.branchType === 'HEAD_OFFICE' ? 'สำนักงานใหญ่ (Head Office)' : 'สาขา (Branch)')],
    ['7', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'รหัสสาขา', escText(company.branchCode || '00000')],
    ['8', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อสาขา', esc(company.branchName || 'สำนักงานใหญ่')],
    ['9', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'สถานะบริษัทหลักในระบบ', esc(company.isDefault ? 'ใช่ (Default Company)' : 'ไม่ใช่')],
    ['10', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'สถานะการดำเนินงาน', esc(company.isActive !== false ? 'เปิดใช้งานตามปกติ (Active)' : 'ปิดใช้งาน')],
    ['11', '2. ที่ตั้งและการติดต่อ', 'ที่อยู่จดทะเบียน (ภาษาไทย)', esc(company.addressTh)],
    ['12', '2. ที่ตั้งและการติดต่อ', 'ที่อยู่ (ภาษาอังกฤษ)', esc(company.addressEn || '-')],
    ['13', '2. ที่ตั้งและการติดต่อ', 'รหัสไปรษณีย์', escText(company.postalCode || '-')],
    ['14', '2. ที่ตั้งและการติดต่อ', 'หมายเลขโทรศัพท์', escText(company.telephone || '-')],
    ['15', '2. ที่ตั้งและการติดต่อ', 'หมายเลขโทรสาร (แฟกซ์)', escText(company.fax || '-')],
    ['16', '2. ที่ตั้งและการติดต่อ', 'จดหมายอิเล็กทรอนิกส์ (อีเมล)', esc(company.email || '-')],
    ['17', '2. ที่ตั้งและการติดต่อ', 'เว็บไซต์ทางการ', esc(company.website || '-')],
    ['18', '3. บัญชีสถาบันการเงิน', 'ชื่อสถาบันการเงิน / ธนาคาร', esc(company.bankName || '-')],
    ['19', '3. บัญชีสถาบันการเงิน', 'สาขาธนาคาร', esc(company.bankBranch || '-')],
    ['20', '3. บัญชีสถาบันการเงิน', 'ประเภทบัญชี', esc(company.accountType || '-')],
    ['21', '3. บัญชีสถาบันการเงิน', 'เลขที่บัญชี', escText(company.accountNumber || '-')],
    ['22', '3. บัญชีสถาบันการเงิน', 'ชื่อบัญชี', esc(company.accountName || company.nameTh)],
    ['23', '4. ท้ายเอกสาร', 'ข้อความท้ายเอกสาร (Footer Notice)', esc(company.docFooterNotice || '-')],
  ];

  const csvContent = rows.map((r) => r.join(',')).join('\r\n');
  const filename = `Company_${company.shortName || company.taxId}_${Date.now()}.csv`;
  downloadCsvFile(csvContent, filename);
  showToast(`ส่งออกข้อมูลบริษัท ${company.nameTh} เป็นไฟล์ Excel สำเร็จ`, 'success');
}

function exportCurrentCompanyProfileToExcel() {
  if (!currentPreviewCompany) {
    showToast('ไม่พบข้อมูลบริษัทที่เปิดอยู่', 'error');
    return;
  }
  exportSingleCompanyToExcel(currentPreviewCompany.id);
}

async function exportCurrentMasterTableToExcel() {
  try {
    showToast(`กำลังส่งออกข้อมูลตาราง ${activeMasterTable.toUpperCase()} เป็น Excel...`, 'success');
    const res = await api.masterTable.exportFile(activeMasterTable, 'csv');
    if (res && res.content) {
      downloadCsvFile(res.content, res.filename || `${activeMasterTable}_export_${Date.now()}.csv`);
      showToast(`ส่งออกข้อมูลตาราง ${activeMasterTable.toUpperCase()} สำเร็จ`, 'success');
    } else {
      throw new Error('No content returned from server');
    }
  } catch (err) {
    console.error('Export error:', err);
    showToast(`ส่งออกข้อมูลไม่สำเร็จ: ${err.message}`, 'error');
  }
}

