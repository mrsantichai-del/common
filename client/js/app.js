/**
 * ULTRON Core System - Enterprise Application Controller
 * Dynamic Role & Permission-based Navigation + Minimal Home Workspace + MasterData Module
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
let activeMasterTable = 'user';
let masterTableRawData = [];

// Menu Definitions with granular permission constraints
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

    // Render Dynamic Left Sidebar Menu based on permissions
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

  // หากกำหนดว่าสำหรับ Admin เท่านั้น แต่ไม่ใช่ Super Admin ให้ปฏิเสธ
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

// ----------------------------------------------------
// MasterData Management Engine (Admin Only)
// ----------------------------------------------------

const MASTER_TABLES = ['user', 'group', 'permission', 'document', 'auditlog'];

function switchMasterTable(tableName) {
  activeMasterTable = tableName.toLowerCase();

  // Update Tab Styling
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
                  `<span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 mr-1">${g}</span>`
              )
              .join('');
            const statusBadge = u.isActive !== false
              ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-sans font-semibold">ใช้งานได้</span>'
              : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-sans">ปิดใช้งาน</span>';

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900">${u.username}</td>
                <td class="p-3 text-blue-700">${u.employeeId || '<span class="text-slate-400 italic">-</span>'}</td>
                <td class="p-3">${groupsBadge || '<span class="text-slate-400 italic">-</span>'}</td>
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
          <th class="p-3">หมวดหมู่</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="6" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลเอกสาร</td></tr>`;
      } else {
        rowsHtml = records
          .map((d, i) => {
            const statusClass =
              d.status === 'CONFIRMED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : d.status === 'CANCELLED'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900">${d.docNumber}</td>
                <td class="p-3 text-slate-800 font-sans font-medium">${d.title}</td>
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
// Master Modal: Add / Edit Record Handling
// ----------------------------------------------------

function closeMasterModal() {
  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.add('hidden');
}

function openCreateMasterRecordModal() {
  const recordIdInput = document.getElementById('masterFormRecordId');
  const title = document.getElementById('masterModalTitle');
  const subtitle = document.getElementById('masterModalSubtitle');
  const container = document.getElementById('masterFormFieldsContainer');

  if (recordIdInput) recordIdInput.value = '';
  if (title) title.textContent = `เพิ่มข้อมูลใหม่: ตาราง ${activeMasterTable.toUpperCase()}`;
  if (subtitle) subtitle.textContent = `กรอกข้อมูลเพื่อบันทึกลงในฐานข้อมูลระบบ`;

  renderMasterFormFields(container, activeMasterTable, null);

  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.remove('hidden');
}

function openEditMasterRecordModal(id) {
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

  renderMasterFormFields(container, activeMasterTable, record);

  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.remove('hidden');
}

function renderMasterFormFields(container, table, existing) {
  if (!container) return;
  container.innerHTML = '';

  switch (table) {
    case 'user': {
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
      `;
      break;
    }

    case 'group': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อกลุ่มบทบาท (Group Name) *</label>
          <input type="text" id="f_group_name" required value="${existing ? existing.name : ''}" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายหน้าที่</label>
          <input type="text" id="f_group_description" value="${existing && existing.description ? existing.description : ''}" placeholder="ระบุหน้าที่ของกลุ่มสิทธิ์" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
      `;
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
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อเอกสาร (Title) *</label>
          <input type="text" id="f_doc_title" required value="${existing ? existing.title : ''}" placeholder="ระบุชื่อเอกสาร" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
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
    case 'user': {
      const u = document.getElementById('f_user_username').value.trim();
      const p = document.getElementById('f_user_password')?.value;
      const emp = document.getElementById('f_user_employeeId')?.value.trim();

      payload.username = u;
      if (p) payload.password = p;
      payload.employeeId = emp || null;
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
  activeMasterTable = 'user';
  showToast('ลงชื่อออกจากระบบเรียบร้อยแล้ว', 'success');

  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  const passwordInput = document.getElementById('loginPassword');

  if (passwordInput) passwordInput.value = '';
  if (viewApp) viewApp.classList.add('hidden');
  if (viewLogin) viewLogin.classList.remove('hidden');
}
