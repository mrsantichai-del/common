/**
 * Enterprise Core Application Logic
 * Integrates ApiClient SDK pointing to Backend (Port 3000)
 */

const api = new ApiClient({
  baseUrl: 'http://localhost:3000',
});

// App Startup
document.addEventListener('DOMContentLoaded', async () => {
  initDemoMode();
  initAdminJourneyState();
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

function logConsole(title, data, isError = false) {
  if (isError) {
    console.error(`[ULTRON ${title}]`, data);
  } else {
    console.log(`[ULTRON ${title}]`, data);
  }
}

// ----------------------------------------------------
// Authentication & Environment Mode
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

// ----------------------------------------------------
// Setup Checklist State
// ----------------------------------------------------

function initAdminJourneyState() {
  const isCollapsed = localStorage.getItem('admin_journey_collapsed') === 'true';
  const content = document.getElementById('adminJourneyContent');
  const label = document.getElementById('journeyToggleLabel');
  if (content) {
    if (isCollapsed) {
      content.classList.add('hidden');
      if (label) label.textContent = 'ขยาย';
    } else {
      content.classList.remove('hidden');
      if (label) label.textContent = 'ย่อเก็บ';
    }
  }
}

function toggleAdminJourneyCollapse() {
  const content = document.getElementById('adminJourneyContent');
  const label = document.getElementById('journeyToggleLabel');
  if (!content) return;

  const isCollapsed = content.classList.contains('hidden');
  if (isCollapsed) {
    content.classList.remove('hidden');
    if (label) label.textContent = 'ย่อเก็บ';
    localStorage.setItem('admin_journey_collapsed', 'false');
  } else {
    content.classList.add('hidden');
    if (label) label.textContent = 'ขยาย';
    localStorage.setItem('admin_journey_collapsed', 'true');
  }
}

async function updateAdminSetupJourney() {
  const card = document.getElementById('adminSetupJourneyCard');
  if (!card || card.classList.contains('hidden')) return;

  try {
    const [permsRes, groupsRes, usersRes] = await Promise.all([
      api.masterTable.findAll('Permission', { limit: 100 }),
      api.masterTable.findAll('Group', { limit: 100 }),
      api.masterTable.findAll('User', { limit: 100 }),
    ]);

    const perms = permsRes.data || [];
    const groups = groupsRes.data || [];
    const users = usersRes.data || [];

    // Step 1: Permissions
    const b1 = document.getElementById('journeyBadge1');
    const step1Done = perms.length >= 16;
    if (b1) {
      b1.textContent = step1Done ? `${perms.length} สิทธิ์พร้อม` : `${perms.length} สิทธิ์`;
      b1.className = step1Done
        ? 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600';
    }

    // Step 2: Role Groups
    const b2 = document.getElementById('journeyBadge2');
    const step2Done = groups.length >= 2;
    if (b2) {
      b2.textContent = step2Done ? `${groups.length} กลุ่มบทบาท` : `${groups.length} กลุ่ม`;
      b2.className = step2Done
        ? 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600';
    }

    // Step 3: Permissions assignment
    const b3 = document.getElementById('journeyBadge3');
    const groupsWithPerms = groups.filter((g) => g.permissions && g.permissions.length > 0);
    const step3Done = groupsWithPerms.length > 0;
    if (b3) {
      b3.textContent = step3Done ? `ผูกแล้ว ${groupsWithPerms.length} กลุ่ม` : 'ยังไม่ผูกสิทธิ์';
      b3.className = step3Done
        ? 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600';
    }

    // Step 4: Users with Employee ID
    const b4 = document.getElementById('journeyBadge4');
    const usersWithEmpId = users.filter((u) => u.employeeId && u.employeeId.trim() !== '');
    const step4Done = users.length >= 2;
    if (b4) {
      b4.textContent = step4Done
        ? `${users.length} บัญชี (${usersWithEmpId.length} มีรหัสพนักงาน)`
        : `${users.length} ผู้ใช้`;
      b4.className = step4Done
        ? 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600';
    }

    // Step 5: Group delegation
    const b5 = document.getElementById('journeyBadge5');
    const usersInGroups = users.filter((u) => u.groups && u.groups.length > 0);
    const step5Done = usersInGroups.length >= 2;
    if (b5) {
      b5.textContent = step5Done ? `มอบหมายแล้ว ${usersInGroups.length} คน` : `มอบหมาย ${usersInGroups.length} คน`;
      b5.className = step5Done
        ? 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600';
    }

    // Calculate Completion
    const stepsCompleted = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;
    const percent = Math.round((stepsCompleted / 5) * 100);

    const bar = document.getElementById('journeyProgressBar');
    const percentText = document.getElementById('journeyPercentText');
    const statusMsg = document.getElementById('journeyStatusMessage');

    if (bar) bar.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (statusMsg) {
      if (percent === 100) {
        statusMsg.textContent = `โครงสร้างระบบเสร็จสมบูรณ์ (${stepsCompleted}/5 ขั้นตอนพร้อมใช้งาน)`;
        statusMsg.className = 'font-semibold text-emerald-700 text-xs';
      } else {
        statusMsg.textContent = `ดำเนินการแล้ว ${stepsCompleted} จาก 5 ขั้นตอนหลัก`;
        statusMsg.className = 'font-medium text-slate-700 text-xs';
      }
    }
  } catch (err) {
    console.warn('Checklist status query failed:', err.message);
  }
}

// ----------------------------------------------------
// Authentication Handlers
// ----------------------------------------------------

async function refreshAuthStatus() {
  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  const setupCard = document.getElementById('adminSetupJourneyCard');
  const adminBadge = document.getElementById('sidebarAdminBadge');
  const masterSection = document.getElementById('sidebarSectionMasterTables');
  const govSection = document.getElementById('sidebarSectionGovernance');

  if (api.isAuthenticated()) {
    try {
      const user = await api.auth.getProfile();

      if (viewLogin) viewLogin.classList.add('hidden');
      if (viewApp) viewApp.classList.remove('hidden');

      // Update Sidebar profile info
      const nameDisp = document.getElementById('sidebarUsername');
      const roleDisp = document.getElementById('sidebarUserRole');
      if (nameDisp) nameDisp.textContent = user.username;
      if (roleDisp) roleDisp.textContent = user.groups[0] || 'USER';

      const isSuperAdmin = user.groups.includes('SUPER_ADMIN');

      if (isSuperAdmin) {
        if (adminBadge) adminBadge.classList.remove('hidden');
        if (masterSection) masterSection.classList.remove('hidden');
        if (govSection) govSection.classList.remove('hidden');
        if (setupCard) setupCard.classList.remove('hidden');
        await updateAdminSetupJourney();
      } else {
        if (adminBadge) adminBadge.classList.add('hidden');
        if (govSection) govSection.classList.add('hidden');
        if (setupCard) setupCard.classList.add('hidden');
      }

      updateSidebarActiveButtons('overview');
      await loadDashboardStats();

      return user;
    } catch (e) {
      console.warn('Session check failed:', e.message);
      api.auth.logout();
    }
  }

  if (viewLogin) viewLogin.classList.remove('hidden');
  if (viewApp) viewApp.classList.add('hidden');
  return null;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const errBox = document.getElementById('loginErrorMsg');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  if (!uInput || !pInput) return;
  const username = uInput.value.trim();
  const password = pInput.value.trim();

  if (errBox) errBox.classList.add('hidden');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'กำลังตรวจสอบข้อมูล...';
  }

  try {
    const res = await api.auth.login(username, password);
    logConsole('LOGIN SUCCESSFUL', res);
    await refreshAuthStatus();
  } catch (err) {
    const errMsg = err.data?.message || err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    if (errBox) {
      errBox.textContent = `ไม่สามารถเข้าสู่ระบบ: ${Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}`;
      errBox.classList.remove('hidden');
    }
    logConsole('AUTHENTICATION REJECTED', err.data || err.message, true);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'เข้าสู่ระบบ (Sign In)';
    }
  }
}

async function quickLoginAs(username) {
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const errBox = document.getElementById('loginErrorMsg');
  if (errBox) errBox.classList.add('hidden');

  if (uInput) uInput.value = username;
  if (pInput) pInput.value = '123456';

  try {
    const res = await api.auth.login(username, '123456');
    logConsole(`AUTHENTICATED AS ${username.toUpperCase()}`, res);
    await refreshAuthStatus();
  } catch (err) {
    const errMsg = err.data?.message || err.message || 'เข้าสู่ระบบไม่สำเร็จ';
    if (errBox) {
      errBox.textContent = errMsg;
      errBox.classList.remove('hidden');
    }
    logConsole('QUICK LOGIN FAILED', err.data || err.message, true);
  }
}

function handleLogout() {
  api.auth.logout();
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  if (uInput) uInput.value = '';
  if (pInput) pInput.value = '';
  const errBox = document.getElementById('loginErrorMsg');
  if (errBox) errBox.classList.add('hidden');

  refreshAuthStatus();
  switchAppTab('overview');
}

// ----------------------------------------------------
// Navigation & Sidebar Management
// ----------------------------------------------------

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebarNav');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;
  const isClosed = sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

function navigateToMasterTable(tableName) {
  selectMasterTable(tableName);
  switchAppTab('masterTable', tableName);
  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('sidebarNav');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

function updateSidebarActiveButtons(activeTab, subTable = null) {
  const mainButtons = [
    { id: 'sidebarBtn_overview', tab: 'overview' },
    { id: 'sidebarBtn_documents', tab: 'documents' },
    { id: 'sidebarBtn_governance', tab: 'governance' },
  ];

  mainButtons.forEach(({ id, tab }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (tab === activeTab && activeTab !== 'masterTable') {
      btn.className = 'w-full flex items-center space-x-2.5 px-2.5 py-2 rounded font-medium transition-colors text-white bg-blue-600 shadow-xs';
    } else {
      btn.className = 'w-full flex items-center space-x-2.5 px-2.5 py-2 rounded font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800';
    }
  });

  const masterTables = ['Document', 'User', 'Group', 'Permission', 'AuditLog'];
  const targetSubTable = subTable || (typeof activeMasterTable !== 'undefined' ? activeMasterTable : 'Document');
  masterTables.forEach((t) => {
    const btn = document.getElementById(`sidebarBtn_master_${t}`);
    if (!btn) return;
    if (activeTab === 'masterTable' && t === targetSubTable) {
      btn.className = 'w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded font-medium transition-colors text-white bg-blue-600 shadow-xs font-semibold';
    } else {
      btn.className = 'w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-800';
    }
  });
}

function switchAppTab(tab, subTable = null) {
  const tabs = ['overview', 'documents', 'masterTable', 'governance'];
  tabs.forEach((t) => {
    const section = document.getElementById(`tabSection_${t}`);
    if (section) section.classList.add('hidden');
  });

  const activeSection = document.getElementById(`tabSection_${tab}`);
  if (activeSection) activeSection.classList.remove('hidden');

  updateSidebarActiveButtons(tab, subTable);

  const headerTitle = document.getElementById('headerViewTitle');
  const headerSubtitle = document.getElementById('headerViewSubtitle');

  if (tab === 'overview') {
    if (headerTitle) headerTitle.innerHTML = '<span>ภาพรวมระบบ (Overview)</span>';
    if (headerSubtitle) headerSubtitle.textContent = 'สถานะภาพรวมและรายการที่ต้องดำเนินการในระบบ';
    loadDashboardStats();
  } else if (tab === 'documents') {
    if (headerTitle) headerTitle.innerHTML = '<span>จัดการเอกสาร (Documents)</span>';
    if (headerSubtitle) headerSubtitle.textContent = 'สร้าง ตรวจสอบ ค้นหา ยืนยันอนุมัติ ยกเลิก และพิมพ์เอกสาร';
    loadDocumentsData();
  } else if (tab === 'masterTable') {
    const currentTable = subTable || activeMasterTable || 'Document';
    const thNames = {
      Document: 'เอกสาร (Document)',
      User: 'ผู้ใช้งาน (User)',
      Group: 'กลุ่มบทบาท (Group)',
      Permission: 'สิทธิ์ในระบบ (Permission)',
      AuditLog: 'ประวัติการใช้งาน (AuditLog)',
    };
    if (headerTitle) headerTitle.innerHTML = `<span>ข้อมูลหลัก: ${thNames[currentTable] || currentTable}</span>`;
    if (headerSubtitle) headerSubtitle.textContent = 'จัดการข้อมูล เพิ่ม ลบ แก้ไข ค้นหา ยืนยัน นำเข้า และส่งออก';
    loadMasterTableData();
  } else if (tab === 'governance') {
    if (headerTitle) headerTitle.innerHTML = '<span>กำหนดสิทธิ์บทบาทและผู้ใช้งาน (PBAC)</span>';
    if (headerSubtitle) headerSubtitle.textContent = 'นโยบายความปลอดภัยและจัดสรรสิทธิ์ตามสถาปัตยกรรม Many-to-Many';
    loadGovernanceData();
  }

  if (window.innerWidth < 768) {
    const sidebar = document.getElementById('sidebarNav');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

// ----------------------------------------------------
// Dashboard Overview Logic
// ----------------------------------------------------

async function loadDashboardStats() {
  try {
    const [docsRes, usersRes] = await Promise.all([
      api.masterTable.findAll('Document', { limit: 100 }),
      api.masterTable.findAll('User', { limit: 100 }),
    ]);

    const docs = docsRes.data || [];
    const users = usersRes.data || [];

    const totalDocs = docs.length;
    const pendingDocs = docs.filter((d) => d.status === 'DRAFT');
    const approvedDocs = docs.filter((d) => d.status === 'CONFIRMED');

    const elTotal = document.getElementById('statTotalDocs');
    const elPending = document.getElementById('statPendingDocs');
    const elApproved = document.getElementById('statApprovedDocs');
    const elUsers = document.getElementById('statTotalUsers');

    if (elTotal) elTotal.textContent = totalDocs;
    if (elPending) elPending.textContent = pendingDocs.length;
    if (elApproved) elApproved.textContent = approvedDocs.length;
    if (elUsers) elUsers.textContent = users.length;

    const pendingContainer = document.getElementById('dashboardPendingList');
    if (pendingContainer) {
      if (pendingDocs.length === 0) {
        pendingContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs font-medium">
            ไม่มีเอกสารค้างรอการตรวจสอบในขณะนี้
          </div>
        `;
      } else {
        pendingContainer.innerHTML = pendingDocs
          .map(
            (doc) => `
          <div class="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div class="space-y-0.5">
              <div class="flex items-center space-x-2">
                <span class="font-semibold text-slate-900 text-xs">${doc.title}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">รออนุมัติ</span>
              </div>
              <div class="text-[11px] text-slate-500 flex items-center space-x-3">
                <span>รหัส: <strong class="text-slate-700 font-mono">${doc.docNumber}</strong></span>
                <span>ผู้จัดทำ: <strong class="text-slate-700 font-mono">${doc.author}</strong></span>
                <span>หมวดหมู่: <strong class="text-slate-700 font-mono">${doc.category}</strong></span>
              </div>
            </div>
            <div class="flex items-center space-x-1.5">
              <button onclick="confirmMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors shadow-2xs">
                อนุมัติ
              </button>
              <button onclick="cancelMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition-colors">
                ยกเลิก
              </button>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    const setupCard = document.getElementById('adminSetupJourneyCard');
    if (setupCard && !setupCard.classList.contains('hidden')) {
      updateAdminSetupJourney();
    }
  } catch (err) {
    console.warn('Dashboard stats query failed:', err);
  }
}

// ----------------------------------------------------
// Documents View Logic
// ----------------------------------------------------

let currentDocStatusFilter = 'ALL';

function filterDocsByStatus(status) {
  switchAppTab('documents');
  setDocStatusFilter(status);
}

function setDocStatusFilter(status) {
  currentDocStatusFilter = status;
  const filterButtons = ['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'];
  filterButtons.forEach((s) => {
    const btn = document.getElementById(`filterDoc_${s}`);
    if (btn) {
      if (s === status) {
        btn.className = 'px-2.5 py-1 rounded bg-white shadow-2xs font-semibold text-slate-900';
      } else {
        btn.className = 'px-2.5 py-1 rounded text-slate-600 hover:text-slate-900';
      }
    }
  });
  loadDocumentsData();
}

function executeDocSearch() {
  loadDocumentsData();
}

async function loadDocumentsData() {
  const tbody = document.getElementById('documentTableBody');
  const countDisp = document.getElementById('docTableCountDisplay');
  const searchInput = document.getElementById('docSearchInput');
  const search = searchInput ? searchInput.value.trim() : '';

  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="p-6 text-center text-slate-400 text-xs">
        กำลังโหลดข้อมูล...
      </td>
    </tr>
  `;

  try {
    const res = await api.masterTable.findAll('Document', {
      search: search || undefined,
      status: currentDocStatusFilter !== 'ALL' ? currentDocStatusFilter : undefined,
      limit: 100,
    });

    const docs = res.data || [];
    if (countDisp) countDisp.textContent = `${docs.length} รายการ`;

    if (docs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400 text-xs">
            ไม่พบเอกสารตรงตามเงื่อนไข
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = docs
      .map((doc) => {
        let badge = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">รออนุมัติ</span>';
        if (doc.status === 'CONFIRMED') {
          badge = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">อนุมัติแล้ว</span>';
        } else if (doc.status === 'CANCELLED') {
          badge = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">ยกเลิกแล้ว</span>';
        }

        return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="py-2.5 px-3 font-mono font-bold text-slate-900">${doc.docNumber}</td>
          <td class="py-2.5 px-3 font-medium text-slate-900">${doc.title}</td>
          <td class="py-2.5 px-3 text-slate-500 font-mono text-[11px]">${doc.category}</td>
          <td class="py-2.5 px-3">${badge}</td>
          <td class="py-2.5 px-3 text-slate-600 font-mono text-[11px]">${doc.author}</td>
          <td class="py-2.5 px-3 text-slate-600 font-mono text-[11px]">${doc.confirmedBy || '-'}</td>
          <td class="py-2.5 px-3 text-right space-x-1 no-print">
            ${
              doc.status === 'DRAFT'
                ? `<button onclick="confirmMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors">
                    อนุมัติ
                  </button>
                  <button onclick="cancelMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded transition-colors">
                    ยกเลิก
                  </button>
                  <button onclick="openMasterEditModal('${doc.id}')" class="px-2 py-0.5 text-slate-600 hover:text-slate-900 text-xs">
                    แก้ไข
                  </button>`
                : doc.status === 'CONFIRMED'
                ? `<button onclick="openDocPrintModal('${doc.id}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded">
                    พิมพ์
                  </button>
                  <button onclick="cancelMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-rose-700 font-medium text-xs rounded">
                    ยกเลิก
                  </button>`
                : `<button onclick="openDocPrintModal('${doc.id}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded">
                    ดูข้อมูล
                  </button>`
            }
            <button onclick="deleteMasterRecord('${doc.id}', '${doc.docNumber}')" class="px-2 py-0.5 text-rose-600 hover:text-rose-800 text-xs">
              ลบ
            </button>
          </td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-rose-600 text-xs">
          เกิดข้อผิดพลาด: ${err.message}
        </td>
      </tr>
    `;
  }
}

function openMasterCreateModalFor(table) {
  selectMasterTable(table);
  openMasterCreateModal();
}

function openMasterImportModalFor(table) {
  selectMasterTable(table);
  openMasterImportModal();
}

// ----------------------------------------------------
// Governance & PBAC Logic
// ----------------------------------------------------

let adminGroups = [];
let adminUsers = [];
let adminPermissions = [];
let selectedAdminGroup = null;

async function loadGovernanceData() {
  try {
    const [groupsRes, usersRes, permsRes] = await Promise.all([
      api.admin.listGroups(),
      api.admin.listUsers(),
      api.masterTable.findAll('Permission', { limit: 100 }),
    ]);

    adminGroups = groupsRes || [];
    adminUsers = usersRes || [];
    adminPermissions = permsRes.data || [];

    renderAdminGroupSelector();
    renderAdminUserTable();

    if (!selectedAdminGroup && adminGroups.length > 0) {
      selectAdminGroup(adminGroups[0].id);
    }
  } catch (err) {
    logConsole('GOVERNANCE ACCESS DENIED', err.data || err.message, true);
  }
}

function renderAdminGroupSelector() {
  const container = document.getElementById('adminGroupSelector');
  if (!container) return;
  container.innerHTML = adminGroups
    .map((g) => {
      const isSelected = selectedAdminGroup && selectedAdminGroup.id === g.id;
      return `
      <button onclick="selectAdminGroup('${g.id}')" class="w-full text-left p-2 rounded border ${
        isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
      } text-xs transition-colors">
        <div class="font-semibold flex justify-between">
          <span class="font-mono">${g.name}</span>
          <span class="text-[10px] opacity-75">${g._count ? g._count.users : 0} บัญชี</span>
        </div>
        <div class="text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'} truncate mt-0.5">${g.description || ''}</div>
      </button>
    `;
    })
    .join('');
}

function selectAdminGroup(groupId) {
  selectedAdminGroup = adminGroups.find((g) => g.id === groupId);
  renderAdminGroupSelector();

  if (!selectedAdminGroup) return;

  const nameEl = document.getElementById('governanceGroupName');
  const descEl = document.getElementById('governanceGroupDesc');
  if (nameEl) nameEl.textContent = selectedAdminGroup.name;
  if (descEl) descEl.textContent = selectedAdminGroup.description || 'ไม่มีคำอธิบายบทบาท';

  const btnDel = document.getElementById('btnDelGroup');
  if (btnDel) {
    btnDel.style.display = selectedAdminGroup.name === 'SUPER_ADMIN' ? 'none' : 'inline-block';
  }

  const grid = document.getElementById('governancePermissionsGrid');
  if (!grid) return;

  const assignedPerms = new Set(
    selectedAdminGroup.permissions ? selectedAdminGroup.permissions.map((gp) => gp.permission.code) : []
  );

  grid.innerHTML = adminPermissions
    .map((p) => {
      const isChecked = assignedPerms.has(p.code);
      return `
      <label class="flex items-start gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
        <input type="checkbox" value="${p.code}" ${isChecked ? 'checked' : ''} class="perm-chk mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900">
        <div>
          <strong class="text-slate-900 font-mono text-[11px]">${p.code}</strong>
          <span class="text-[10px] text-slate-500 block leading-tight">${p.description || ''}</span>
        </div>
      </label>
    `;
    })
    .join('');
}

async function saveAdminGroupPermissions() {
  if (!selectedAdminGroup) return;
  const checkboxes = document.querySelectorAll('#governancePermissionsGrid .perm-chk:checked');
  const codes = Array.from(checkboxes).map((cb) => cb.value);

  try {
    const res = await api.admin.updateGroupPermissions(selectedAdminGroup.id, codes);
    showToast(`บันทึกสิทธิ์สำหรับกลุ่ม ${selectedAdminGroup.name} เรียบร้อย`, 'success');
    await loadGovernanceData();
  } catch (err) {
    showToast('บันทึกสิทธิ์ไม่สำเร็จ: ' + (err.data?.message || err.message), 'error');
  }
}

async function deleteSelectedAdminGroup() {
  if (!selectedAdminGroup) return;
  if (!confirm(`คุณต้องการลบกลุ่มบทบาท '${selectedAdminGroup.name}' ออกจากระบบใช่หรือไม่?`)) return;

  try {
    await api.admin.deleteGroup(selectedAdminGroup.id);
    showToast(`ลบกลุ่มบทบาท ${selectedAdminGroup.name} เรียบร้อย`, 'success');
    selectedAdminGroup = null;
    await loadGovernanceData();
  } catch (err) {
    showToast('ไม่สามารถลบกลุ่ม: ' + (err.data?.message || err.message), 'error');
  }
}

function renderAdminUserTable() {
  const tbody = document.getElementById('governanceUserTableBody');
  if (!tbody) return;

  tbody.innerHTML = adminUsers
    .map(
      (u) => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="py-2.5 px-3 font-semibold text-slate-900 font-mono">${u.username}</td>
      <td class="py-2.5 px-3">
        <div class="flex gap-1 flex-wrap font-mono">
          ${u.groups.map((g) => `<span class="border border-slate-300 px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-700">${g}</span>`).join('')}
        </div>
      </td>
      <td class="py-2.5 px-3 text-slate-600 font-mono text-[11px]">${u.permissions.length} สิทธิ์</td>
      <td class="py-2.5 px-3 text-right">
        <button onclick="openUserGroupDelegationModal('${u.id}')" class="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded mr-1">
          มอบหมายกลุ่ม
        </button>
        ${
          u.username !== 'root_admin'
            ? `<button onclick="deleteUserAccount('${u.id}', '${u.username}')" class="px-2 py-1 text-rose-600 hover:text-rose-800 text-xs">
                ลบ
              </button>`
            : ''
        }
      </td>
    </tr>
  `
    )
    .join('');
}

let activeDelegationUserId = null;

function openUserGroupDelegationModal(userId) {
  const modal = document.getElementById('modalUserDelegation');
  const user = adminUsers.find((u) => u.id === userId);
  if (!modal || !user) return;

  activeDelegationUserId = userId;
  document.getElementById('delegationModalUsername').textContent = user.username;

  const container = document.getElementById('delegationModalCheckboxes');
  const userGroups = new Set(user.groups);

  container.innerHTML = adminGroups
    .map(
      (g) => `
    <label class="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
      <input type="checkbox" value="${g.name}" ${userGroups.has(g.name) ? 'checked' : ''} class="delegation-group-chk rounded border-slate-300 text-slate-900">
      <span class="font-mono text-slate-800 font-semibold">${g.name}</span>
      <span class="text-slate-400 text-[11px]">(${g.description || '-'})</span>
    </label>
  `
    )
    .join('');

  modal.classList.remove('hidden');
}

function closeUserGroupDelegationModal() {
  const modal = document.getElementById('modalUserDelegation');
  if (modal) modal.classList.add('hidden');
  activeDelegationUserId = null;
}

async function saveUserDelegation() {
  if (!activeDelegationUserId) return;
  const checkboxes = document.querySelectorAll('.delegation-group-chk:checked');
  const selectedGroups = Array.from(checkboxes).map((cb) => cb.value);

  try {
    await api.admin.assignUserGroups(activeDelegationUserId, selectedGroups);
    showToast('มอบหมายกลุ่มผู้ใช้งานเรียบร้อย', 'success');
    closeUserGroupDelegationModal();
    await loadGovernanceData();
    await refreshAuthStatus();
  } catch (err) {
    showToast('มอบหมายกลุ่มไม่สำเร็จ: ' + (err.data?.message || err.message), 'error');
  }
}

async function deleteUserAccount(userId, username) {
  if (!confirm(`คุณต้องการลบบัญชีผู้ใช้งาน '${username}' ออกจากระบบใช่หรือไม่?`)) return;

  try {
    await api.users.delete(userId);
    showToast(`ลบบัญชี '${username}' เรียบร้อย`, 'success');
    await loadGovernanceData();
  } catch (err) {
    showToast('ลบบัญชีไม่สำเร็จ: ' + (err.data?.message || err.message), 'error');
  }
}

// ----------------------------------------------------
// Master Table Generic Engine
// ----------------------------------------------------

let activeMasterTable = 'Document';
let masterCurrentPage = 1;
let masterTableRecords = [];
let masterTableTotalCount = 0;
let parsedImportData = [];

function selectMasterTable(tableName) {
  activeMasterTable = tableName;
  masterCurrentPage = 1;

  const tableNames = ['Document', 'User', 'Group', 'Permission', 'AuditLog'];
  tableNames.forEach((t) => {
    const btn = document.getElementById(`masterTabBtn_${t}`);
    if (btn) {
      if (t === tableName) {
        btn.className = 'px-3 py-1.5 rounded border border-slate-900 bg-slate-900 text-white text-xs font-medium transition-colors';
      } else {
        btn.className = 'px-3 py-1.5 rounded border border-slate-200 hover:border-slate-400 bg-white text-slate-700 text-xs font-medium transition-colors';
      }
    }
  });

  const statusFilter = document.getElementById('masterStatusFilter');
  if (statusFilter) {
    statusFilter.style.display = tableName === 'Document' ? 'inline-block' : 'none';
  }

  const btnAdd = document.getElementById('masterBtnAdd');
  const btnImport = document.getElementById('masterBtnImport');
  if (btnAdd) btnAdd.style.display = tableName === 'AuditLog' ? 'none' : 'inline-flex';
  if (btnImport) btnImport.style.display = tableName === 'AuditLog' ? 'none' : 'inline-flex';

  updateSidebarActiveButtons('masterTable', tableName);
  const headerTitle = document.getElementById('headerViewTitle');
  if (headerTitle) {
    const thNames = {
      Document: 'เอกสาร (Document)',
      User: 'ผู้ใช้งาน (User)',
      Group: 'กลุ่มบทบาท (Group)',
      Permission: 'สิทธิ์ในระบบ (Permission)',
      AuditLog: 'ประวัติการใช้งาน (AuditLog)',
    };
    headerTitle.innerHTML = `<span>ข้อมูลหลัก: ${thNames[tableName] || tableName}</span>`;
  }

  loadMasterTableData();
}

function executeMasterSearch() {
  masterCurrentPage = 1;
  loadMasterTableData();
}

async function loadMasterTableData() {
  const searchInput = document.getElementById('masterSearchInput');
  const search = searchInput ? searchInput.value.trim() : '';
  const statusFilter = document.getElementById('masterStatusFilter');
  const status = statusFilter && statusFilter.value !== 'ALL' ? statusFilter.value : undefined;

  renderMasterTableHeader();

  const tbody = document.getElementById('masterTableTbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-6 text-center text-slate-400 text-xs">
          กำลังโหลดข้อมูล...
        </td>
      </tr>
    `;
  }

  try {
    const res = await api.masterTable.findAll(activeMasterTable, {
      page: masterCurrentPage,
      limit: 15,
      search: search || undefined,
      status: activeMasterTable === 'Document' ? status : undefined,
    });

    masterTableRecords = res.data || [];
    masterTableTotalCount = res.total || 0;

    renderMasterTableRows();
    updateMasterPagination();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-6 text-center text-rose-600 text-xs">
            เกิดข้อผิดพลาด: ${err.data?.message || err.message}
          </td>
        </tr>
      `;
    }
  }
}

function renderMasterTableHeader() {
  const thead = document.getElementById('masterTableThead');
  if (!thead) return;

  let headers = [];
  switch (activeMasterTable) {
    case 'Document':
      headers = ['รหัสเอกสาร', 'ชื่อเอกสาร', 'หมวดหมู่', 'สถานะ', 'ผู้จัดทำ', 'ผู้อนุมัติ', 'การจัดการ'];
      break;
    case 'User':
      headers = ['ชื่อผู้ใช้', 'รหัสพนักงาน', 'กลุ่มสิทธิ์', 'สถานะ', 'วันที่สร้าง', 'การจัดการ'];
      break;
    case 'Group':
      headers = ['ชื่อกลุ่มบทบาท', 'คำอธิบาย', 'ผู้ใช้งาน', 'สิทธิ์ที่ครอบครอง', 'การจัดการ'];
      break;
    case 'Permission':
      headers = ['รหัสสิทธิ์', 'คำอธิบาย', 'กลุ่มที่ผูกไว้', 'การจัดการ'];
      break;
    case 'AuditLog':
      headers = ['การกระทำ', 'เป้าหมาย', 'รายละเอียด', 'ผู้ใช้งาน', 'IP Address', 'เวลา'];
      break;
  }

  thead.innerHTML = `
    <tr>
      ${headers
        .map(
          (h, i) =>
            `<th class="py-2.5 px-3 ${i === headers.length - 1 && activeMasterTable !== 'AuditLog' ? 'text-right' : ''}">${h}</th>`
        )
        .join('')}
    </tr>
  `;
}

function renderMasterTableRows() {
  const tbody = document.getElementById('masterTableTbody');
  if (!tbody) return;

  if (masterTableRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-400 font-mono text-xs">
          ไม่พบข้อมูลในตารางนี้
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = masterTableRecords
    .map((row) => {
      switch (activeMasterTable) {
        case 'Document': {
          let statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">รออนุมัติ</span>';
          if (row.status === 'CONFIRMED') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">อนุมัติแล้ว</span>';
          } else if (row.status === 'CANCELLED') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">ยกเลิกแล้ว</span>';
          }

          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-2 px-3 font-bold font-mono text-slate-900">${row.docNumber}</td>
              <td class="py-2 px-3 font-medium text-slate-900">${row.title}</td>
              <td class="py-2 px-3 font-mono text-slate-500 text-[11px]">${row.category}</td>
              <td class="py-2 px-3">${statusBadge}</td>
              <td class="py-2 px-3 font-mono text-slate-600 text-[11px]">${row.author}</td>
              <td class="py-2 px-3 font-mono text-slate-600 text-[11px]">${row.confirmedBy || '-'}</td>
              <td class="py-2 px-3 text-right space-x-1 no-print">
                ${
                  row.status === 'DRAFT'
                    ? `<button onclick="confirmMasterDocument('${row.id}', '${row.docNumber}')" class="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors">
                        อนุมัติ
                      </button>
                      <button onclick="cancelMasterDocument('${row.id}', '${row.docNumber}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded">
                        ยกเลิก
                      </button>
                      <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-0.5 text-slate-600 hover:text-slate-900 text-xs">
                        แก้ไข
                      </button>`
                    : row.status === 'CONFIRMED'
                    ? `<button onclick="openDocPrintModal('${row.id}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded">
                        พิมพ์
                      </button>
                      <button onclick="cancelMasterDocument('${row.id}', '${row.docNumber}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-rose-700 font-medium text-xs rounded">
                        ยกเลิก
                      </button>`
                    : `<button onclick="openDocPrintModal('${row.id}')" class="px-2 py-0.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded">
                        ดูข้อมูล
                      </button>`
                }
                <button onclick="deleteMasterRecord('${row.id}', '${row.docNumber}')" class="px-2 py-0.5 text-rose-600 hover:text-rose-800 text-xs">
                  ลบ
                </button>
              </td>
            </tr>
          `;
        }

        case 'User': {
          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-2 px-3 font-bold font-mono text-slate-900">${row.username}</td>
              <td class="py-2 px-3 font-mono text-slate-700 text-[11px]">
                ${row.employeeId ? `<span class="bg-slate-100 text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded font-mono font-semibold">${row.employeeId}</span>` : '<span class="text-slate-400 italic">ไม่ระบุ</span>'}
              </td>
              <td class="py-2 px-3">
                <div class="flex gap-1 flex-wrap font-mono">
                  ${(row.groups || []).map((g) => `<span class="border border-slate-300 px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-700">${g}</span>`).join('')}
                </div>
              </td>
              <td class="py-2 px-3 font-mono text-[11px]">
                ${row.isActive ? '<span class="text-emerald-700 font-medium">เปิดใช้งาน</span>' : '<span class="text-slate-400">ปิดใช้งาน</span>'}
              </td>
              <td class="py-2 px-3 font-mono text-slate-500 text-[11px]">${new Date(row.createdAt).toLocaleDateString('th-TH')}</td>
              <td class="py-2 px-3 text-right space-x-1 no-print">
                <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-0.5 text-slate-600 hover:text-slate-900 text-xs">
                  แก้ไข
                </button>
                ${
                  row.username !== 'root_admin'
                    ? `<button onclick="deleteMasterRecord('${row.id}', '${row.username}')" class="px-2 py-0.5 text-rose-600 hover:text-rose-800 text-xs">
                        ลบ
                      </button>`
                    : ''
                }
              </td>
            </tr>
          `;
        }

        case 'Group': {
          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-2 px-3 font-bold font-mono text-slate-900">${row.name}</td>
              <td class="py-2 px-3 text-slate-700">${row.description || '-'}</td>
              <td class="py-2 px-3 font-mono text-[11px]">${row.userCount || 0} บัญชี</td>
              <td class="py-2 px-3 font-mono text-slate-500 text-[11px]">${(row.permissions || []).length} สิทธิ์</td>
              <td class="py-2 px-3 text-right space-x-1 no-print">
                <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-0.5 text-slate-600 hover:text-slate-900 text-xs">
                  แก้ไข
                </button>
                ${
                  row.name !== 'SUPER_ADMIN'
                    ? `<button onclick="deleteMasterRecord('${row.id}', '${row.name}')" class="px-2 py-0.5 text-rose-600 hover:text-rose-800 text-xs">
                        ลบ
                      </button>`
                    : ''
                }
              </td>
            </tr>
          `;
        }

        case 'Permission': {
          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-2 px-3 font-bold font-mono text-slate-900">${row.code}</td>
              <td class="py-2 px-3 text-slate-700">${row.description || '-'}</td>
              <td class="py-2 px-3 font-mono">
                <div class="flex gap-1 flex-wrap">
                  ${(row.attachedGroups || []).map((g) => `<span class="border border-slate-300 px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-700">${g}</span>`).join('')}
                </div>
              </td>
              <td class="py-2 px-3 text-right space-x-1 no-print">
                <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-0.5 text-slate-600 hover:text-slate-900 text-xs">
                  แก้ไข
                </button>
                <button onclick="deleteMasterRecord('${row.id}', '${row.code}')" class="px-2 py-0.5 text-rose-600 hover:text-rose-800 text-xs">
                  ลบ
                </button>
              </td>
            </tr>
          `;
        }

        case 'AuditLog': {
          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-2 px-3 font-bold font-mono text-slate-900">${row.action}</td>
              <td class="py-2 px-3 font-mono text-slate-600 text-[11px]">${row.target}</td>
              <td class="py-2 px-3 text-slate-700">${row.details || '-'}</td>
              <td class="py-2 px-3 font-mono font-semibold text-slate-800 text-[11px]">${row.username}</td>
              <td class="py-2 px-3 font-mono text-slate-500 text-[11px]">${row.ipAddress || '127.0.0.1'}</td>
              <td class="py-2 px-3 font-mono text-slate-500 text-[11px]">${new Date(row.createdAt).toLocaleString('th-TH')}</td>
            </tr>
          `;
        }
      }
    })
    .join('');
}

function updateMasterPagination() {
  const metricsEl = document.getElementById('masterTableMetrics');
  const pageDispEl = document.getElementById('masterCurrentPageDisplay');
  const btnPrev = document.getElementById('btnMasterPrevPage');
  const btnNext = document.getElementById('btnMasterNextPage');

  const totalPages = Math.ceil(masterTableTotalCount / 15) || 1;

  if (metricsEl) metricsEl.textContent = `${masterTableTotalCount} รายการ`;
  if (pageDispEl) pageDispEl.textContent = `หน้า ${masterCurrentPage} / ${totalPages}`;

  if (btnPrev) btnPrev.disabled = masterCurrentPage <= 1;
  if (btnNext) btnNext.disabled = masterCurrentPage >= totalPages;
}

function changeMasterPage(delta) {
  masterCurrentPage += delta;
  loadMasterTableData();
}

// ----------------------------------------------------
// Master Record Actions (Confirm, Cancel, Delete)
// ----------------------------------------------------

async function confirmMasterDocument(id, docNumber) {
  try {
    await api.masterTable.confirmDocument(id);
    showToast(`อนุมัติเอกสาร ${docNumber} เรียบร้อย`, 'success');
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    showToast('ไม่สามารถยืนยันเอกสาร: ' + (err.data?.message || err.message), 'error');
  }
}

async function cancelMasterDocument(id, docNumber) {
  if (!confirm(`คุณต้องการยกเลิกเอกสาร ${docNumber} ใช่หรือไม่?`)) return;

  try {
    await api.masterTable.cancelDocument(id);
    showToast(`ยกเลิกเอกสาร ${docNumber} เรียบร้อย`, 'success');
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    showToast('ไม่สามารถยกเลิกเอกสาร: ' + (err.data?.message || err.message), 'error');
  }
}

async function deleteMasterRecord(id, identifier) {
  if (!confirm(`คุณต้องการลบรายการ '${identifier}' ออกจากระบบใช่หรือไม่?`)) return;

  try {
    await api.masterTable.delete(activeMasterTable, id);
    showToast(`ลบรายการ '${identifier}' เรียบร้อย`, 'success');
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    showToast('ไม่สามารถลบข้อมูล: ' + (err.data?.message || err.message), 'error');
  }
}

// ----------------------------------------------------
// Master Modal Form Handlers (Create / Edit)
// ----------------------------------------------------

function openMasterCreateModal() {
  const modal = document.getElementById('modalMasterForm');
  const title = document.getElementById('masterFormTitle');
  const subtitle = document.getElementById('masterFormSubtitle');
  const recordIdInput = document.getElementById('masterFormRecordId');
  const container = document.getElementById('masterFormFieldsContainer');

  if (!modal || !container) return;

  recordIdInput.value = '';
  title.textContent = `เพิ่มข้อมูล: ${activeMasterTable}`;
  subtitle.textContent = 'กรอกข้อมูลตามแบบฟอร์มด้านล่าง';

  renderFormFieldsFor(activeMasterTable, null);
  modal.classList.remove('hidden');
}

async function openMasterEditModal(id) {
  const modal = document.getElementById('modalMasterForm');
  const title = document.getElementById('masterFormTitle');
  const subtitle = document.getElementById('masterFormSubtitle');
  const recordIdInput = document.getElementById('masterFormRecordId');
  const container = document.getElementById('masterFormFieldsContainer');

  if (!modal || !container) return;

  try {
    const record = await api.masterTable.findOne(activeMasterTable, id);
    recordIdInput.value = id;
    title.textContent = `แก้ไขข้อมูล: ${activeMasterTable}`;
    subtitle.textContent = `รหัสอ้างอิง: ${id}`;

    renderFormFieldsFor(activeMasterTable, record);
    modal.classList.remove('hidden');
  } catch (err) {
    showToast('ไม่สามารถดึงข้อมูลรายการ: ' + (err.data?.message || err.message), 'error');
  }
}

function closeMasterFormModal() {
  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.add('hidden');
}

function renderFormFieldsFor(tableName, record) {
  const container = document.getElementById('masterFormFieldsContainer');
  if (!container) return;

  container.innerHTML = '';

  switch (tableName) {
    case 'Document': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อเอกสาร *</label>
          <input type="text" id="mField_title" required value="${record?.title || ''}" placeholder="ระบุชื่อเอกสาร" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">หมวดหมู่</label>
          <select id="mField_category" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs bg-white outline-none">
            <option value="GENERAL" ${record?.category === 'GENERAL' ? 'selected' : ''}>ทั่วไป (GENERAL)</option>
            <option value="PROJECT" ${record?.category === 'PROJECT' ? 'selected' : ''}>โครงการ (PROJECT)</option>
            <option value="CONTRACT" ${record?.category === 'CONTRACT' ? 'selected' : ''}>สัญญา (CONTRACT)</option>
            <option value="FINANCIAL" ${record?.category === 'FINANCIAL' ? 'selected' : ''}>การเงิน (FINANCIAL)</option>
            <option value="CONFIDENTIAL" ${record?.category === 'CONFIDENTIAL' ? 'selected' : ''}>เอกสารลับ (CONFIDENTIAL)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">เนื้อหา / รายละเอียดเอกสาร *</label>
          <textarea id="mField_content" required rows="4" placeholder="พิมพ์รายละเอียดเนื้อหาเอกสาร..." class="w-full p-2.5 rounded border border-slate-300 text-xs outline-none">${record?.content || ''}</textarea>
        </div>
      `;
      break;
    }

    case 'User': {
      const isEdit = Boolean(record);
      container.innerHTML = `
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username) *</label>
          <input type="text" id="mField_username" required ${isEdit ? 'disabled' : ''} value="${record?.username || ''}" placeholder="เช่น somchai_p" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono outline-none ${isEdit ? 'bg-slate-100 text-slate-500' : ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">รหัสพนักงาน (Employee ID)</label>
          <input type="text" id="mField_employeeId" value="${record?.employeeId || ''}" placeholder="เช่น EMP-001 หรือปล่อยว่างได้" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono outline-none">
          <p class="text-[10px] text-slate-400 mt-1">ใช้สำหรับเชื่อมโยงกับบุคลากรในองค์กรในอนาคต</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${isEdit ? 'รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน *'}</label>
          <input type="password" id="mField_password" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'เว้นว่างไว้เพื่อคงรหัสเดิม' : 'กำหนดรหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)'}" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs outline-none">
        </div>
        <div class="flex items-center space-x-2 pt-1">
          <input type="checkbox" id="mField_isActive" ${record ? (record.isActive ? 'checked' : '') : 'checked'} class="rounded border-slate-300 text-slate-900">
          <label for="mField_isActive" class="text-xs text-slate-700">เปิดใช้งานบัญชีนี้ (Active)</label>
        </div>
      `;
      break;
    }

    case 'Group': {
      const isEdit = Boolean(record);
      container.innerHTML = `
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ชื่อกลุ่มบทบาท (Group Name) *</label>
          <input type="text" id="mField_name" required ${isEdit ? 'disabled' : ''} value="${record?.name || ''}" placeholder="เช่น APPROVER_GROUP" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono outline-none ${isEdit ? 'bg-slate-100 text-slate-500' : ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">คำอธิบายหน้าที่ / ความรับผิดชอบ</label>
          <input type="text" id="mField_description" value="${record?.description || ''}" placeholder="เช่น กลุ่มผู้มีอำนาจอนุมัติเอกสารฝ่ายปฏิบัติการ" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs outline-none">
        </div>
      `;
      break;
    }

    case 'Permission': {
      const isEdit = Boolean(record);
      container.innerHTML = `
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">รหัสสิทธิ์ (Permission Code) *</label>
          <input type="text" id="mField_code" required ${isEdit ? 'disabled' : ''} value="${record?.code || ''}" placeholder="เช่น doc:read" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono outline-none ${isEdit ? 'bg-slate-100 text-slate-500' : ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">คำอธิบายความสามารถของสิทธิ์</label>
          <input type="text" id="mField_description" value="${record?.description || ''}" placeholder="เช่น สิทธิ์สำหรับดูเนื้อหาเอกสาร" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs outline-none">
        </div>
      `;
      break;
    }
  }
}

async function handleMasterFormSubmit(event) {
  event.preventDefault();
  const recordId = document.getElementById('masterFormRecordId').value;
  const btnSubmit = document.getElementById('btnMasterFormSubmit');
  if (btnSubmit) btnSubmit.disabled = true;

  const payload = {};

  switch (activeMasterTable) {
    case 'Document': {
      payload.title = document.getElementById('mField_title').value.trim();
      payload.category = document.getElementById('mField_category').value;
      payload.content = document.getElementById('mField_content').value.trim();
      break;
    }
    case 'User': {
      const uEl = document.getElementById('mField_username');
      const pEl = document.getElementById('mField_password');
      const empEl = document.getElementById('mField_employeeId');
      const actEl = document.getElementById('mField_isActive');

      if (!recordId) payload.username = uEl.value.trim();
      if (pEl && pEl.value.trim()) payload.password = pEl.value.trim();
      payload.employeeId = empEl ? empEl.value.trim() : null;
      payload.isActive = actEl ? actEl.checked : true;
      break;
    }
    case 'Group': {
      const nEl = document.getElementById('mField_name');
      const dEl = document.getElementById('mField_description');
      if (!recordId) payload.name = nEl.value.trim();
      payload.description = dEl ? dEl.value.trim() : '';
      break;
    }
    case 'Permission': {
      const cEl = document.getElementById('mField_code');
      const dEl = document.getElementById('mField_description');
      if (!recordId) payload.code = cEl.value.trim();
      payload.description = dEl ? dEl.value.trim() : '';
      break;
    }
  }

  try {
    if (recordId) {
      await api.masterTable.update(activeMasterTable, recordId, payload);
      showToast('บันทึกการแก้ไขเรียบร้อย', 'success');
    } else {
      await api.masterTable.create(activeMasterTable, payload);
      showToast('สร้างรายการใหม่เรียบร้อย', 'success');
    }

    closeMasterFormModal();
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    showToast('บันทึกข้อมูลไม่สำเร็จ: ' + (err.data?.message || err.message), 'error');
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

// ----------------------------------------------------
// Bulk Import Operations
// ----------------------------------------------------

function openMasterImportModal() {
  const modal = document.getElementById('modalMasterImport');
  const targetEl = document.getElementById('importTargetTableName');
  const fileInput = document.getElementById('masterImportFileInput');
  const textInput = document.getElementById('masterImportTextInput');
  const previewContainer = document.getElementById('importPreviewContainer');

  if (!modal) return;
  if (targetEl) targetEl.textContent = activeMasterTable;
  if (fileInput) fileInput.value = '';
  if (textInput) textInput.value = '';
  if (previewContainer) previewContainer.classList.add('hidden');
  parsedImportData = [];

  modal.classList.remove('hidden');
}

function closeMasterImportModal() {
  const modal = document.getElementById('modalMasterImport');
  if (modal) modal.classList.add('hidden');
  parsedImportData = [];
}

function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const textInput = document.getElementById('masterImportTextInput');
    if (textInput) textInput.value = e.target.result;
    parseAndPreviewImportData();
  };
  reader.readAsText(file);
}

function parseAndPreviewImportData() {
  const textInput = document.getElementById('masterImportTextInput');
  const container = document.getElementById('importPreviewContainer');
  const countEl = document.getElementById('importPreviewCount');
  const table = document.getElementById('importPreviewTable');

  if (!textInput || !container || !table) return;
  const raw = textInput.value.trim();
  if (!raw) {
    showToast('กรุณาระบุข้อมูลสำหรับนำเข้า', 'error');
    return;
  }

  try {
    let rows = [];
    if (raw.startsWith('[') || raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error('ข้อมูล CSV ต้องมีแถวหัวตารางและอย่างน้อย 1 แถวข้อมูล');

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] !== undefined ? values[i] : '';
        });
        return obj;
      });
    }

    parsedImportData = rows;
    countEl.textContent = `พบข้อมูล ${rows.length} แถวที่พร้อมนำเข้า`;

    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      table.innerHTML = `
        <thead>
          <tr class="bg-slate-100 border-b border-slate-200">
            ${keys.map((k) => `<th class="p-1.5 font-bold">${k}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows
            .slice(0, 5)
            .map(
              (r) => `
            <tr>
              ${keys.map((k) => `<td class="p-1.5">${r[k] !== undefined ? String(r[k]) : ''}</td>`).join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      `;
    }

    container.classList.remove('hidden');
    showToast(`ตรวจสอบข้อมูลสำเร็จ: พร้อมนำเข้า ${rows.length} แถว`, 'success');
  } catch (err) {
    showToast('รูปแบบข้อมูลไม่ถูกต้อง: ' + err.message, 'error');
    container.classList.add('hidden');
    parsedImportData = [];
  }
}

async function executeBulkImport() {
  if (!parsedImportData || parsedImportData.length === 0) {
    showToast('ไม่มีข้อมูลสำหรับนำเข้า กรุณาตรวจสอบข้อมูลก่อน', 'error');
    return;
  }

  const btn = document.getElementById('btnExecuteImport');
  if (btn) btn.disabled = true;

  try {
    const res = await api.masterTable.import(activeMasterTable, parsedImportData);
    showToast(res.message || 'นำเข้าข้อมูลเรียบร้อย', 'success');
    closeMasterImportModal();
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    showToast('การนำเข้าข้อมูลล้มเหลว: ' + (err.data?.message || err.message), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ----------------------------------------------------
// Export Operations (CSV / JSON)
// ----------------------------------------------------

async function exportMasterData(format = 'csv') {
  try {
    const blob = await api.masterTable.exportFile(activeMasterTable, format);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMasterTable}_export_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`ส่งออกข้อมูล ${activeMasterTable} (${format.toUpperCase()}) สำเร็จ`, 'success');
  } catch (err) {
    showToast('ไม่สามารถส่งออกข้อมูล: ' + (err.data?.message || err.message), 'error');
  }
}

function printMasterTable() {
  window.print();
}

// ----------------------------------------------------
// Official Document Print Sheet
// ----------------------------------------------------

async function openDocPrintModal(docId) {
  const modal = document.getElementById('modalDocPrint');
  if (!modal) return;

  try {
    const doc = await api.masterTable.findOne('Document', docId);
    if (!doc) throw new Error('ไม่พบเอกสาร');

    document.getElementById('printDocTitle').textContent = doc.title || '-';
    document.getElementById('printDocNumber').textContent = doc.docNumber || '-';
    document.getElementById('printDocCategory').textContent = doc.category || '-';
    document.getElementById('printDocAuthor').textContent = doc.author?.username || doc.author || '-';
    document.getElementById('printDocConfirmedBy').textContent = doc.confirmedBy?.username || doc.confirmedBy || '-';
    document.getElementById('printDocConfirmedAt').textContent = doc.confirmedAt
      ? new Date(doc.confirmedAt).toLocaleString('th-TH')
      : 'ยังไม่ได้รับการอนุมัติ';
    document.getElementById('printDocContent').textContent = doc.content || '-';

    const statusBadge = document.getElementById('printDocStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = doc.status;
      statusBadge.className =
        doc.status === 'CONFIRMED'
          ? 'px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white'
          : doc.status === 'CANCELLED'
          ? 'px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300'
          : 'px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300';
    }

    modal.classList.remove('hidden');
  } catch (err) {
    showToast('ไม่สามารถโหลดข้อมูลเอกสาร: ' + (err.data?.message || err.message), 'error');
  }
}

function closeDocPrintModal() {
  const modal = document.getElementById('modalDocPrint');
  if (modal) modal.classList.add('hidden');
}
