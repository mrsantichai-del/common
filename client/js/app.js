/**
 * Enterprise Application Logic (Decoupled Frontend at Port 8080)
 * Integrates ApiClient SDK pointing to Backend (Port 3000)
 */

// Initialize SDK instance with explicit backend base URL
const api = new ApiClient({
  baseUrl: 'http://localhost:3000',
  onWireTelemetry: (telemetry) => {
    renderWireTelemetry(telemetry);
  },
});

let leafletMap = null;
let mapMarkers = [];

// App Startup
document.addEventListener('DOMContentLoaded', async () => {
  initUIEventHandlers();
  await refreshAuthStatus();
});

function initUIEventHandlers() {
  const cryptoToggle = document.getElementById('cryptoToggle');
  if (cryptoToggle) {
    cryptoToggle.addEventListener('change', (e) => {
      api.setEncryption(e.target.checked);
      updateCryptoBadge(e.target.checked);
    });
  }
}

function updateCryptoBadge(enabled) {
  const badge = document.getElementById('cryptoStateBadge');
  if (!badge) return;
  if (enabled) {
    badge.textContent = 'AES-256 ACTIVE';
    badge.className = 'bg-neutral-900 text-white px-1.5 py-0.2 text-[10px] font-semibold';
  } else {
    badge.textContent = 'ข้อความธรรมดา (PLAINTEXT)';
    badge.className = 'bg-neutral-300 text-neutral-800 px-1.5 py-0.2 text-[10px]';
  }
}

function renderWireTelemetry(telemetry) {
  const wireOut = document.getElementById('wireOut');
  const wireIn = document.getElementById('wireIn');
  const wireStatus = document.getElementById('wireStatus');

  if (wireOut) wireOut.textContent = telemetry.outgoingWire || 'ไม่มีข้อมูล (None)';
  if (wireIn) wireIn.textContent = telemetry.incomingWire || 'ไม่มีข้อมูล (None)';
  if (wireStatus) {
    wireStatus.textContent = `${telemetry.method} ${telemetry.endpoint} // รหัสสถานะ ${telemetry.status}`;
    wireStatus.className =
      telemetry.status >= 200 && telemetry.status < 300
        ? 'font-semibold text-neutral-900 font-mono text-xs'
        : 'font-semibold text-rose-600 font-mono text-xs';
  }
}

function logConsole(title, data, isError = false) {
  const output = document.getElementById('consoleOutput');
  const consoleTitle = document.getElementById('consoleTitle');
  if (consoleTitle) consoleTitle.textContent = title;
  if (output) {
    output.className = isError
      ? 'w-full p-3 border border-rose-300 bg-rose-50/50 font-mono text-xs text-rose-800 overflow-x-auto min-h-[110px] leading-relaxed'
      : 'w-full p-3 border border-neutral-200 bg-white font-mono text-xs text-neutral-800 overflow-x-auto min-h-[110px] leading-relaxed';
    output.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }
}

// ----------------------------------------------------
// UI Notification & Dev Drawer Handlers
// ----------------------------------------------------

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  toast.className = `p-3.5 rounded-xl border shadow-lg text-xs font-semibold flex items-center space-x-2 transition-all transform duration-300 translate-y-2 opacity-0 pointer-events-auto ${
    isSuccess
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-500/10'
      : 'bg-rose-50 text-rose-900 border-rose-200 shadow-rose-500/10'
  }`;
  toast.innerHTML = `
    <span class="text-base">${isSuccess ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function toggleDevDrawer() {
  const drawer = document.getElementById('devDrawer');
  if (!drawer) return;
  drawer.classList.toggle('hidden');
}

// ----------------------------------------------------
// Authentication & View State Handlers
// ----------------------------------------------------

function toggleDemoAccountsPanel() {
  const panel = document.getElementById('demoAccountsPanel');
  const icon = document.getElementById('demoAccountsToggleIcon');
  if (!panel) return;
  const isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    if (icon) icon.innerHTML = '&minus;';
  } else {
    panel.classList.add('hidden');
    if (icon) icon.innerHTML = '&plus;';
  }
}

async function refreshAuthStatus() {
  const viewLogin = document.getElementById('viewLogin');
  const viewApp = document.getElementById('viewApp');
  const navAdminTab = document.getElementById('navAdminTab');

  if (api.isAuthenticated()) {
    try {
      const user = await api.auth.getProfile();

      // Show Application Dashboard, Hide Login Portal
      if (viewLogin) viewLogin.classList.add('hidden');
      if (viewApp) viewApp.classList.remove('hidden');

      // Update User profile pill
      const nameDisp = document.getElementById('currentUsernameDisplay');
      const roleDisp = document.getElementById('currentUserRoleDisplay');
      if (nameDisp) nameDisp.textContent = user.username;
      if (roleDisp) roleDisp.textContent = `(${user.groups[0] || 'User'})`;

      if (navAdminTab) {
        if (user.groups.includes('SUPER_ADMIN')) {
          navAdminTab.classList.remove('hidden');
        } else {
          navAdminTab.classList.add('hidden');
        }
      }

      // Re-render map after container becomes visible
      if (!leafletMap) {
        initLeafletMap();
      } else {
        setTimeout(() => leafletMap.invalidateSize(), 150);
      }

      // Load initial Dashboard metrics
      await loadDashboardStats();

      return user;
    } catch (e) {
      console.warn('Session verification rejected:', e.message);
      api.auth.logout();
    }
  }

  // Unauthenticated State: Show Login Portal, Hide Application Dashboard
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
    btnSubmit.textContent = 'กำลังตรวจสอบข้อมูล... (AUTHENTICATING...)';
  }

  try {
    const res = await api.auth.login(username, password);
    logConsole('LOGIN SUCCESSFUL', res);
    await refreshAuthStatus();
  } catch (err) {
    const errMsg = err.data?.message || err.message || 'ข้อมูลชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    if (errBox) {
      errBox.textContent = `การยืนยันตัวตนไม่สำเร็จ: ${Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}`;
      errBox.classList.remove('hidden');
    }
    logConsole('AUTHENTICATION REJECTED', err.data || err.message, true);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'ลงชื่อเข้าสู่ระบบ (Sign In)';
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
    const errMsg = err.data?.message || err.message || 'Login failed';
    if (errBox) {
      errBox.textContent = `QUICK LOGIN FAILED: ${errMsg}`;
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
  logConsole('SESSION TERMINATED', { message: 'Token cleared from local storage' });
  switchAppTab('overview');
}

// ----------------------------------------------------
// Navigation Tab Switching
// ----------------------------------------------------

function switchAppTab(tab) {
  const tabs = ['overview', 'documents', 'masterTable', 'governance'];
  tabs.forEach((t) => {
    const section = document.getElementById(`tabSection_${t}`);
    const btn = document.getElementById(`tabBtn_${t}`);
    if (section) section.classList.add('hidden');
    if (btn) {
      btn.className = 'px-3.5 py-2 rounded-lg text-sm font-medium transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-100';
    }
  });

  const activeSection = document.getElementById(`tabSection_${tab}`);
  const activeBtn = document.getElementById(`tabBtn_${tab}`);
  if (activeSection) activeSection.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.className = 'px-3.5 py-2 rounded-lg text-sm font-semibold transition-all text-blue-600 bg-blue-50';
  }

  if (tab === 'overview') {
    loadDashboardStats();
    if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 200);
  }
  if (tab === 'documents') {
    loadDocumentsData();
  }
  if (tab === 'masterTable') {
    loadMasterTableData();
  }
  if (tab === 'governance') {
    loadGovernanceData();
  }
}

// ----------------------------------------------------
// Dashboard Overview Logic (Friendly Cards & Actions)
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

    // Update KPI counters
    const elTotal = document.getElementById('statTotalDocs');
    const elPending = document.getElementById('statPendingDocs');
    const elApproved = document.getElementById('statApprovedDocs');
    const elUsers = document.getElementById('statTotalUsers');

    if (elTotal) elTotal.textContent = totalDocs;
    if (elPending) elPending.textContent = pendingDocs.length;
    if (elApproved) elApproved.textContent = approvedDocs.length;
    if (elUsers) elUsers.textContent = users.length;

    // Populate Pending Approvals list
    const pendingContainer = document.getElementById('dashboardPendingList');
    if (pendingContainer) {
      if (pendingDocs.length === 0) {
        pendingContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs font-medium">
            ✨ ไม่มีเอกสารค้างรอการอนุมัติในขณะนี้ ทุกอย่างเรียบร้อยดี
          </div>
        `;
      } else {
        pendingContainer.innerHTML = pendingDocs
          .map(
            (doc) => `
          <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-slate-900 text-sm">${doc.title}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">รอยืนยัน</span>
              </div>
              <div class="text-xs text-slate-400 flex items-center space-x-3">
                <span>รหัส: <strong class="text-slate-600 font-mono">${doc.docNumber}</strong></span>
                <span>ผู้จัดทำ: <strong class="text-slate-600">${doc.author}</strong></span>
                <span>หมวดหมู่: <strong class="text-slate-600">${doc.category}</strong></span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button onclick="confirmMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs">
                ✅ อนุมัติทันที
              </button>
              <button onclick="cancelMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs">
                🚫 ยกเลิก
              </button>
            </div>
          </div>
        `
          )
          .join('');
      }
    }
  } catch (err) {
    console.warn('Dashboard stats load error:', err);
  }
}

// ----------------------------------------------------
// Dedicated Documents View Logic
// ----------------------------------------------------

let currentDocStatusFilter = 'ALL';

function filterDocsByStatus(status) {
  switchAppTab('documents');
  setDocStatusFilter(status);
}

function setDocStatusFilter(status) {
  currentDocStatusFilter = status;
  const statuses = ['ALL', 'DRAFT', 'CONFIRMED', 'CANCELLED'];
  statuses.forEach((s) => {
    const btn = document.getElementById(`filterDoc_${s}`);
    if (btn) {
      if (s === status) {
        btn.className = 'px-3 py-1 rounded-lg bg-white shadow-xs font-semibold text-slate-900';
      } else {
        btn.className = 'px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900';
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
      <td colspan="7" class="p-8 text-center text-slate-400 text-xs">
        กำลังโหลดข้อมูลเอกสาร...
      </td>
    </tr>
  `;

  try {
    const res = await api.masterTable.findAll('Document', {
      search,
      status: currentDocStatusFilter !== 'ALL' ? currentDocStatusFilter : undefined,
      limit: 100,
    });

    const docs = res.data || [];
    if (countDisp) countDisp.textContent = `แสดง ${docs.length} รายการ`;

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
        let badge = '<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">⏳ รอยืนยัน (Draft)</span>';
        if (doc.status === 'CONFIRMED') {
          badge = '<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ อนุมัติแล้ว</span>';
        } else if (doc.status === 'CANCELLED') {
          badge = '<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">✕ ยกเลิกแล้ว</span>';
        }

        return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="p-3.5 font-mono font-bold text-slate-900">${doc.docNumber}</td>
          <td class="p-3.5 font-medium text-slate-900">${doc.title}</td>
          <td class="p-3.5 text-slate-500 font-mono">${doc.category}</td>
          <td class="p-3.5">${badge}</td>
          <td class="p-3.5 text-slate-600">${doc.author}</td>
          <td class="p-3.5 text-slate-600">${doc.confirmedBy || '-'}</td>
          <td class="p-3.5 text-right space-x-1.5 no-print">
            ${
              doc.status === 'DRAFT'
                ? `<button onclick="confirmMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs">
                    ✅ อนุมัติ
                  </button>
                  <button onclick="cancelMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg">
                    🚫 ยกเลิก
                  </button>
                  <button onclick="openMasterEditModal('${doc.id}')" class="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs">
                    ✏️ แก้ไข
                  </button>`
                : doc.status === 'CONFIRMED'
                ? `<button onclick="openDocPrintModal('${doc.id}')" class="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded-lg border border-blue-200">
                    🖨️ พิมพ์เอกสาร
                  </button>
                  <button onclick="cancelMasterDocument('${doc.id}', '${doc.docNumber}')" class="px-2.5 py-1 border border-rose-200 hover:bg-rose-50 text-rose-600 font-medium text-xs rounded-lg">
                    🚫 ยกเลิก
                  </button>`
                : `<button onclick="openDocPrintModal('${doc.id}')" class="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs rounded-lg">
                    📄 ดูรายละเอียด
                  </button>`
            }
            <button onclick="deleteMasterRecord('${doc.id}', '${doc.docNumber}')" class="px-2 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs">
              🗑️ ลบ
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
// Leaflet.js Interactive Geospatial Map (Tech Stack)
// ----------------------------------------------------

function initLeafletMap() {
  if (leafletMap) return;
  const mapElement = document.getElementById('operationalMap');
  if (!mapElement || !window.L) return;

  leafletMap = L.map('operationalMap', {
    zoomControl: true,
  }).setView([13.7563, 100.5018], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(leafletMap);

  const stations = [
    { id: 'NODE-01', name: 'ศูนย์ปฏิบัติการกลาง (Bangkok Central Core)', lat: 13.7563, lng: 100.5018, status: 'ONLINE', cluster: 'Kernel A' },
    { id: 'NODE-02', name: 'เกตเวย์สุวรรณภูมิ (Suvarnabhumi Gateway)', lat: 13.6900, lng: 100.7501, status: 'ONLINE', cluster: 'Secure Edge' },
    { id: 'NODE-03', name: 'โหนดคลังข้อมูลชลบุรี (Chonburi Logistics Node)', lat: 13.3611, lng: 100.9847, status: 'STANDBY', cluster: 'Data Vault' },
    { id: 'NODE-04', name: 'ศูนย์สำรองอยุธยา (Ayutthaya Backup Hub)', lat: 14.3532, lng: 100.5684, status: 'ONLINE', cluster: 'Kernel B' },
  ];

  stations.forEach((st) => {
    const marker = L.circleMarker([st.lat, st.lng], {
      radius: 8,
      fillColor: st.status === 'ONLINE' ? '#171717' : '#737373',
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(leafletMap);

    marker.bindPopup(`
      <div class="text-xs">
        <strong class="font-mono">${st.name}</strong><br>
        <span class="text-neutral-500">รหัสโหนด (Node ID): ${st.id}</span><br>
        <span class="text-neutral-500">สถานะ (Status): ${st.status === 'ONLINE' ? 'ออนไลน์ (ONLINE)' : 'สแตนด์บาย (STANDBY)'}</span><br>
        <span class="text-neutral-500">กลุ่มคลัสเตอร์ (Cluster): ${st.cluster}</span>
      </div>
    `);

    mapMarkers.push(marker);
  });
}

// ----------------------------------------------------
// Workflow Actions Testing via ApiClient SDK
// ----------------------------------------------------

async function runSdkAction(actionName, fn) {
  try {
    const result = await fn();
    logConsole(`SDK OPERATION: ${actionName}`, result);
  } catch (err) {
    logConsole(`FAILED: ${actionName}`, err.data || err.message, true);
  }
}

// ----------------------------------------------------
// Governance & Admin Management (via api.admin.*)
// ----------------------------------------------------

let adminGroups = [];
let adminUsers = [];
let adminPermissions = [];
let selectedAdminGroup = null;

async function loadGovernanceData() {
  try {
    const [groups, perms, users] = await Promise.all([
      api.admin.getGroups(),
      api.admin.getPermissions(),
      api.admin.getUsers(),
    ]);

    adminGroups = groups;
    adminPermissions = perms;
    adminUsers = users;

    renderAdminGroupSelector();
    renderAdminUserTable();
    renderAdminPermissionCatalog();

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
      <button onclick="selectAdminGroup('${g.id}')" class="w-full text-left p-2 border ${
        isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'
      } text-xs font-mono transition-colors">
        <div class="font-bold flex justify-between">
          <span>${g.name}</span>
          <span class="text-[10px] opacity-75 font-sans">${g._count ? g._count.users : 0} บัญชี</span>
        </div>
        <div class="text-[10px] ${isSelected ? 'text-neutral-300' : 'text-neutral-400'} font-sans truncate">${g.description || ''}</div>
      </button>
    `;
    })
    .join('');
}

function selectAdminGroup(groupId) {
  selectedAdminGroup = adminGroups.find((g) => g.id === groupId);
  renderAdminGroupSelector();

  if (!selectedAdminGroup) return;

  document.getElementById('governanceGroupName').textContent = selectedAdminGroup.name;
  document.getElementById('governanceGroupDesc').textContent = selectedAdminGroup.description || 'ไม่มีคำอธิบายบทบาท';

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
      <label class="flex items-start gap-2 p-2 border border-neutral-200 hover:bg-neutral-50 cursor-pointer text-xs font-mono">
        <input type="checkbox" value="${p.code}" ${isChecked ? 'checked' : ''} class="perm-chk mt-0.5 rounded-none border-neutral-400">
        <div>
          <strong class="text-neutral-900">${p.code}</strong>
          <span class="text-[11px] text-neutral-500 block font-sans">${p.description || ''}</span>
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
    logConsole(`PERMISSIONS SAVED FOR ${selectedAdminGroup.name}`, res);
    await loadGovernanceData();
  } catch (err) {
    logConsole('SAVE FAILED', err.data || err.message, true);
  }
}

async function deleteSelectedAdminGroup() {
  if (!selectedAdminGroup) return;
  if (!confirm(`Maker ต้องการลบกลุ่มบทบาท '${selectedAdminGroup.name}' ออกจากระบบใช่หรือไม่?`)) return;

  try {
    const res = await api.admin.deleteGroup(selectedAdminGroup.id);
    logConsole('GROUP DELETED', res);
    selectedAdminGroup = null;
    await loadGovernanceData();
  } catch (err) {
    logConsole('DELETE GROUP FAILED', err.data || err.message, true);
  }
}

function renderAdminUserTable() {
  const tbody = document.getElementById('governanceUserTableBody');
  if (!tbody) return;

  tbody.innerHTML = adminUsers
    .map(
      (u) => `
    <tr class="hover:bg-neutral-50 transition-colors">
      <td class="p-3 font-bold text-neutral-900 font-mono">${u.username}</td>
      <td class="p-3">
        <div class="flex gap-1 flex-wrap font-mono">
          ${u.groups.map((g) => `<span class="border border-neutral-300 px-1 py-0.2 bg-white text-[10px]">${g}</span>`).join('')}
        </div>
      </td>
      <td class="p-3 text-neutral-500 font-mono">${u.permissions.length} สิทธิ์</td>
      <td class="p-3 text-right">
        <button onclick="openUserGroupDelegationModal('${u.id}')" class="px-2 py-1 border border-neutral-900 hover:bg-neutral-900 hover:text-white uppercase text-[10px] mr-1 font-semibold">
          มอบหมายสิทธิ์ (DELEGATE)
        </button>
        ${
          u.username !== 'root_admin'
            ? `<button onclick="deleteUserAccount('${u.id}', '${u.username}')" class="px-2 py-1 text-rose-600 border border-rose-300 hover:bg-rose-600 hover:text-white uppercase text-[10px] font-semibold">
                ลบบัญชี (PURGE)
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
  const user = adminUsers.find((u) => u.id === userId);
  if (!user) return;

  activeDelegationUserId = userId;
  document.getElementById('delegationModalUsername').textContent = user.username;

  const container = document.getElementById('delegationModalCheckboxes');
  const userGroups = new Set(user.groups);

  container.innerHTML = adminGroups
    .map(
      (g) => `
    <label class="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white border border-transparent hover:border-neutral-200">
      <input type="checkbox" value="${g.name}" ${userGroups.has(g.name) ? 'checked' : ''} class="del-group-chk rounded-none border-neutral-400">
      <span><strong>${g.name}</strong> <span class="text-neutral-400 text-[10px]">(${g.description || ''})</span></span>
    </label>
  `
    )
    .join('');

  document.getElementById('modalUserDelegation').classList.remove('hidden');
}

function closeUserGroupDelegationModal() {
  document.getElementById('modalUserDelegation').classList.add('hidden');
  activeDelegationUserId = null;
}

async function saveUserDelegation() {
  if (!activeDelegationUserId) return;
  const chks = document.querySelectorAll('#delegationModalCheckboxes .del-group-chk:checked');
  const groups = Array.from(chks).map((c) => c.value);

  try {
    const res = await api.admin.assignUserGroups(activeDelegationUserId, groups);
    logConsole('DELEGATION COMMITTED', res);
    closeUserGroupDelegationModal();
    await loadGovernanceData();
    await refreshAuthStatus();
  } catch (err) {
    logConsole('DELEGATION FAILED', err.data || err.message, true);
  }
}

async function deleteUserAccount(userId, username) {
  if (!confirm(`Maker ต้องการลบบัญชีผู้ใช้ '${username}' ออกจากระบบอย่างถาวรใช่หรือไม่?`)) return;
  try {
    const res = await api.admin.deleteUser(userId);
    logConsole('USER PURGED', res);
    await loadGovernanceData();
  } catch (err) {
    logConsole('DELETE USER FAILED', err.data || err.message, true);
  }
}

function renderAdminPermissionCatalog() {
  const container = document.getElementById('governancePermCatalog');
  if (!container) return;
  container.innerHTML = adminPermissions
    .map(
      (p) => `
    <div class="border border-neutral-200 p-2 bg-neutral-50/50">
      <div class="font-bold text-neutral-900">${p.code}</div>
      <div class="text-[10px] text-neutral-400 truncate">${p.description || ''}</div>
    </div>
  `
    )
    .join('');
}

// ============================================================================
// MASTER TABLE MANAGEMENT MODULE LOGIC (FULL ENTERPRISE DATA LIFECYCLE)
// ============================================================================

let activeMasterTable = 'Document';
let masterCurrentPage = 1;
const masterPageLimit = 20;
let masterTotalRecords = 0;
let masterTableRecords = [];
let parsedImportData = [];

function selectMasterTable(tableName) {
  activeMasterTable = tableName;
  masterCurrentPage = 1;

  // Update Table Selection Tabs Style
  const tableNames = ['Document', 'User', 'Group', 'Permission', 'AuditLog'];
  tableNames.forEach((t) => {
    const btn = document.getElementById(`masterTabBtn_${t}`);
    if (btn) {
      if (t === tableName) {
        btn.className = 'px-3 py-1.5 border border-neutral-900 bg-neutral-900 text-white text-xs font-mono font-semibold transition-colors';
      } else {
        btn.className = 'px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-700 text-xs font-mono font-semibold transition-colors';
      }
    }
  });

  const nameEl = document.getElementById('masterActiveTableName');
  if (nameEl) nameEl.textContent = tableName;

  // Configure Status Filter Visibility (Only Document has Status)
  const statusFilter = document.getElementById('masterStatusFilter');
  if (statusFilter) {
    statusFilter.style.display = tableName === 'Document' ? 'inline-block' : 'none';
  }

  // AuditLog is read-only: hide Add and Import buttons
  const btnAdd = document.getElementById('masterBtnAdd');
  const btnImport = document.getElementById('masterBtnImport');
  if (btnAdd) btnAdd.style.display = tableName === 'AuditLog' ? 'none' : 'inline-flex';
  if (btnImport) btnImport.style.display = tableName === 'AuditLog' ? 'none' : 'inline-flex';

  loadMasterTableData();
}

function executeMasterSearch() {
  masterCurrentPage = 1;
  loadMasterTableData();
}

async function loadMasterTableData() {
  const thead = document.getElementById('masterTableThead');
  const tbody = document.getElementById('masterTableTbody');
  if (!thead || !tbody) return;

  const searchInput = document.getElementById('masterSearchInput');
  const statusFilter = document.getElementById('masterStatusFilter');

  const search = searchInput ? searchInput.value.trim() : '';
  const status = statusFilter ? statusFilter.value : 'ALL';

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="p-8 text-center text-neutral-400 font-mono text-xs">
        กำลังโหลดข้อมูลจากฐานข้อมูล... (CONNECTING TO REST API: PORT 3000)
      </td>
    </tr>
  `;

  try {
    const res = await api.masterTable.findAll(activeMasterTable, {
      search,
      status: status !== 'ALL' ? status : undefined,
      page: masterCurrentPage,
      limit: masterPageLimit,
    });

    masterTableRecords = res.data || [];
    masterTotalRecords = res.total || 0;

    renderMasterTableHeader();
    renderMasterTableRows();
    updateMasterPagination();
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-rose-600 font-mono text-xs">
          เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message || 'Access Denied'}
        </td>
      </tr>
    `;
    logConsole('MASTER TABLE QUERY FAILED', err.data || err.message, true);
  }
}

function renderMasterTableHeader() {
  const thead = document.getElementById('masterTableThead');
  if (!thead) return;

  let headers = [];
  switch (activeMasterTable) {
    case 'Document':
      headers = ['รหัสเอกสาร (DOC NUMBER)', 'ชื่อเอกสาร (TITLE)', 'หมวดหมู่ (CATEGORY)', 'สถานะ (STATUS)', 'ผู้จัดทำ (AUTHOR)', 'ผู้อนุมัติ (CONFIRMED BY)', 'การจัดการ (OPERATIONS)'];
      break;
    case 'User':
      headers = ['ชื่อผู้ใช้ (USERNAME)', 'กลุ่มสิทธิ์ที่ได้รับ (GROUPS)', 'สถานะบัญชี (ACTIVE)', 'วันที่สร้าง (CREATED AT)', 'การจัดการ (OPERATIONS)'];
      break;
    case 'Group':
      headers = ['ชื่อกลุ่ม (GROUP NAME)', 'คำอธิบายบทบาท (DESCRIPTION)', 'จำนวนผู้ใช้ (USERS)', 'สิทธิ์ที่ครอบครอง (PERMISSIONS)', 'การจัดการ (OPERATIONS)'];
      break;
    case 'Permission':
      headers = ['รหัสสิทธิ์ (PERMISSION CODE)', 'คำอธิบาย (DESCRIPTION)', 'กลุ่มที่ผูกไว้ (ATTACHED GROUPS)', 'การจัดการ (OPERATIONS)'];
      break;
    case 'AuditLog':
      headers = ['การกระทำ (ACTION)', 'เป้าหมาย (TARGET)', 'รายละเอียดบันทึก (DETAILS)', 'ผู้ใช้งาน (USER)', 'IP HOST', 'เวลา (TIMESTAMP)'];
      break;
  }

  thead.innerHTML = `
    <tr>
      ${headers
        .map(
          (h, i) =>
            `<th class="p-3 ${i === headers.length - 1 && activeMasterTable !== 'AuditLog' ? 'text-right' : ''}">${h}</th>`
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
        <td colspan="7" class="p-8 text-center text-neutral-400 font-mono text-xs">
          ไม่พบข้อมูลในตารางนี้ (NO RECORDS FOUND)
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = masterTableRecords
    .map((row) => {
      switch (activeMasterTable) {
        case 'Document': {
          let statusBadge = '<span class="px-2 py-0.5 bg-neutral-100 text-neutral-700 font-bold border border-neutral-300">DRAFT</span>';
          if (row.status === 'CONFIRMED') {
            statusBadge = '<span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold border border-emerald-300">CONFIRMED</span>';
          } else if (row.status === 'CANCELLED') {
            statusBadge = '<span class="px-2 py-0.5 bg-rose-50 text-rose-800 font-bold border border-rose-300">CANCELLED</span>';
          }

          return `
            <tr class="hover:bg-neutral-50 transition-colors">
              <td class="p-3 font-bold font-mono text-neutral-900">${row.docNumber}</td>
              <td class="p-3 font-semibold text-neutral-900">${row.title}</td>
              <td class="p-3 font-mono text-neutral-600">${row.category}</td>
              <td class="p-3 font-mono text-xs">${statusBadge}</td>
              <td class="p-3 font-mono text-neutral-600">${row.author}</td>
              <td class="p-3 font-mono text-neutral-600">${row.confirmedBy || '-'}</td>
              <td class="p-3 text-right space-x-1 no-print">
                ${
                  row.status === 'DRAFT'
                    ? `<button onclick="confirmMasterDocument('${row.id}', '${row.docNumber}')" class="px-2 py-1 bg-neutral-900 text-white hover:bg-neutral-800 font-semibold text-[11px]" title="อนุมัติและยืนยันเอกสาร">
                        ✅ ยืนยัน (Confirm)
                      </button>
                      <button onclick="cancelMasterDocument('${row.id}', '${row.docNumber}')" class="px-2 py-1 border border-neutral-400 hover:bg-neutral-200 text-neutral-800 text-[11px]" title="ยกเลิกเอกสารนี้">
                        🚫 ยกเลิก (Cancel)
                      </button>
                      <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-1 border border-neutral-300 hover:bg-neutral-100 text-[11px]">
                        ✏️ แก้ไข
                      </button>`
                    : row.status === 'CONFIRMED'
                    ? `<button onclick="openDocPrintModal('${row.id}')" class="px-2 py-1 bg-neutral-900 text-white hover:bg-neutral-800 font-semibold text-[11px]">
                        🖨️ พิมพ์เอกสาร
                      </button>
                      <button onclick="cancelMasterDocument('${row.id}', '${row.docNumber}')" class="px-2 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px]">
                        🚫 ยกเลิก (Cancel)
                      </button>`
                    : `<button onclick="openDocPrintModal('${row.id}')" class="px-2 py-1 border border-neutral-300 hover:bg-neutral-100 text-[11px]">
                        📄 ดูรายละเอียด
                      </button>`
                }
                <button onclick="deleteMasterRecord('${row.id}', '${row.docNumber}')" class="px-2 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px]">
                  ลบ
                </button>
              </td>
            </tr>
          `;
        }

        case 'User': {
          return `
            <tr class="hover:bg-neutral-50 transition-colors">
              <td class="p-3 font-bold font-mono text-neutral-900">${row.username}</td>
              <td class="p-3">
                <div class="flex gap-1 flex-wrap font-mono">
                  ${(row.groups || []).map((g) => `<span class="border border-neutral-300 px-1.5 py-0.2 bg-white text-[10px]">${g}</span>`).join('')}
                </div>
              </td>
              <td class="p-3 font-mono">
                ${row.isActive ? '<span class="text-emerald-700 font-bold">ACTIVE</span>' : '<span class="text-neutral-400">INACTIVE</span>'}
              </td>
              <td class="p-3 font-mono text-neutral-500 text-[11px]">${new Date(row.createdAt).toLocaleString('th-TH')}</td>
              <td class="p-3 text-right space-x-1 no-print">
                <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-1 border border-neutral-300 hover:bg-neutral-100 text-[11px]">
                  ✏️ แก้ไข
                </button>
                ${
                  row.username !== 'root_admin'
                    ? `<button onclick="deleteMasterRecord('${row.id}', '${row.username}')" class="px-2 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px]">
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
            <tr class="hover:bg-neutral-50 transition-colors">
              <td class="p-3 font-bold font-mono text-neutral-900">${row.name}</td>
              <td class="p-3 text-neutral-700">${row.description || '-'}</td>
              <td class="p-3 font-mono">${row.userCount || 0} บัญชี</td>
              <td class="p-3 font-mono text-neutral-500 text-[11px]">${(row.permissions || []).length} สิทธิ์</td>
              <td class="p-3 text-right space-x-1 no-print">
                <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-1 border border-neutral-300 hover:bg-neutral-100 text-[11px]">
                  ✏️ แก้ไข
                </button>
                ${
                  row.name !== 'SUPER_ADMIN'
                    ? `<button onclick="deleteMasterRecord('${row.id}', '${row.name}')" class="px-2 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px]">
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
            <tr class="hover:bg-neutral-50 transition-colors">
              <td class="p-3 font-bold font-mono text-neutral-900">${row.code}</td>
              <td class="p-3 text-neutral-700">${row.description || '-'}</td>
              <td class="p-3 font-mono">
                <div class="flex gap-1 flex-wrap">
                  ${(row.attachedGroups || []).map((g) => `<span class="border border-neutral-300 px-1 py-0.2 bg-white text-[10px]">${g}</span>`).join('')}
                </div>
              </td>
              <td class="p-3 text-right space-x-1 no-print">
                <button onclick="openMasterEditModal('${row.id}')" class="px-2 py-1 border border-neutral-300 hover:bg-neutral-100 text-[11px]">
                  ✏️ แก้ไข
                </button>
                <button onclick="deleteMasterRecord('${row.id}', '${row.code}')" class="px-2 py-1 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px]">
                  ลบ
                </button>
              </td>
            </tr>
          `;
        }

        case 'AuditLog': {
          return `
            <tr class="hover:bg-neutral-50 transition-colors">
              <td class="p-3 font-bold font-mono text-neutral-900">${row.action}</td>
              <td class="p-3 font-mono text-neutral-700">${row.target}</td>
              <td class="p-3 text-neutral-800">${row.details || '-'}</td>
              <td class="p-3 font-mono font-bold text-neutral-800">${row.username}</td>
              <td class="p-3 font-mono text-neutral-500">${row.ipAddress || '127.0.0.1'}</td>
              <td class="p-3 font-mono text-neutral-500 text-[11px]">${new Date(row.createdAt).toLocaleString('th-TH')}</td>
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

  const totalPages = Math.max(1, Math.ceil(masterTotalRecords / masterPageLimit));

  if (metricsEl) {
    metricsEl.textContent = `แสดง ${masterTableRecords.length} รายการ จากทั้งหมด ${masterTotalRecords} รายการ`;
  }
  if (pageDispEl) {
    pageDispEl.textContent = `หน้า ${masterCurrentPage} / ${totalPages}`;
  }
  if (btnPrev) btnPrev.disabled = masterCurrentPage <= 1;
  if (btnNext) btnNext.disabled = masterCurrentPage >= totalPages;
}

function changeMasterPage(delta) {
  const totalPages = Math.max(1, Math.ceil(masterTotalRecords / masterPageLimit));
  const newPage = masterCurrentPage + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    masterCurrentPage = newPage;
    loadMasterTableData();
  }
}

// ----------------------------------------------------
// Confirm & Cancel Operations
// ----------------------------------------------------

async function confirmMasterDocument(id, docNumber) {
  if (!confirm(`ต้องการยืนยันและอนุมัติเอกสาร '${docNumber}' ใช่หรือไม่?`)) return;

  try {
    const res = await api.masterTable.confirmDocument(id);
    logConsole('DOCUMENT CONFIRMED', res);
    showToast(`อนุมัติเอกสาร ${docNumber} เรียบร้อยแล้ว`, 'success');
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    logConsole('CONFIRM FAILED', err.data || err.message, true);
    showToast('ไม่สามารถยืนยันเอกสารได้: ' + (err.data?.message || err.message), 'error');
  }
}

async function cancelMasterDocument(id, docNumber) {
  const reason = prompt(`กรุณาระบุเหตุผลในการยกเลิกเอกสาร '${docNumber}':`, 'ยกเลิกตามคำสั่งของผู้บริหาร');
  if (reason === null) return;

  try {
    const res = await api.masterTable.cancelDocument(id, reason);
    logConsole('DOCUMENT CANCELLED', res);
    showToast(`ยกเลิกเอกสาร ${docNumber} เรียบร้อยแล้ว`, 'success');
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    logConsole('CANCEL FAILED', err.data || err.message, true);
    showToast('ไม่สามารถยกเลิกเอกสารได้: ' + (err.data?.message || err.message), 'error');
  }
}

// ----------------------------------------------------
// Delete Record Operation
// ----------------------------------------------------

async function deleteMasterRecord(id, identifier) {
  if (!confirm(`ต้องการลบข้อมูลรายการ '${identifier}' ใช่หรือไม่?`)) return;

  try {
    const res = await api.masterTable.delete(activeMasterTable, id);
    logConsole('RECORD DELETED', res);
    showToast(`ลบข้อมูล '${identifier}' เรียบร้อยแล้ว`, 'success');
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    logConsole('DELETE FAILED', err.data || err.message, true);
    showToast('ไม่สามารถลบข้อมูลได้: ' + (err.data?.message || err.message), 'error');
  }
}

// ----------------------------------------------------
// Add & Edit Record Modal
// ----------------------------------------------------

function openMasterCreateModal() {
  const modal = document.getElementById('modalMasterForm');
  const title = document.getElementById('masterFormTitle');
  const subtitle = document.getElementById('masterFormSubtitle');
  const recordIdInput = document.getElementById('masterFormRecordId');
  const container = document.getElementById('masterFormFieldsContainer');

  if (!modal || !container) return;

  recordIdInput.value = '';
  title.textContent = `ADD NEW ${activeMasterTable.toUpperCase()} RECORD`;
  subtitle.textContent = `สร้างรายการใหม่ในตาราง ${activeMasterTable}`;

  renderMasterFormFields(container, activeMasterTable, null);
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
    title.textContent = `EDIT ${activeMasterTable.toUpperCase()} RECORD`;
    subtitle.textContent = `แก้ไขข้อมูลรหัส ID: ${id}`;

    renderMasterFormFields(container, activeMasterTable, record);
    modal.classList.remove('hidden');
  } catch (err) {
    alert('ไม่สามารถเปิดข้อมูลสำหรับแก้ไขได้: ' + err.message);
  }
}

function closeMasterFormModal() {
  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.add('hidden');
}

function renderMasterFormFields(container, table, current) {
  switch (table) {
    case 'Document': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">ชื่อเอกสาร (Title)</label>
          <input type="text" id="mField_title" required value="${current ? current.title || '' : ''}" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900">
        </div>
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">หมวดหมู่ (Category)</label>
          <select id="mField_category" class="w-full p-2 border border-neutral-300 text-xs bg-white outline-none">
            <option value="GENERAL" ${current && current.category === 'GENERAL' ? 'selected' : ''}>ทั่วไป (GENERAL)</option>
            <option value="FINANCIAL" ${current && current.category === 'FINANCIAL' ? 'selected' : ''}>การเงิน/งบประมาณ (FINANCIAL)</option>
            <option value="TECHNICAL" ${current && current.category === 'TECHNICAL' ? 'selected' : ''}>เทคนิคและวิศวกรรม (TECHNICAL)</option>
            <option value="COMPLIANCE" ${current && current.category === 'COMPLIANCE' ? 'selected' : ''}>การกำกับดูแล (COMPLIANCE)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">เนื้อหาเอกสาร (Content)</label>
          <textarea id="mField_content" rows="4" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900">${current ? current.content || '' : ''}</textarea>
        </div>
      `;
      break;
    }

    case 'User': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">ชื่อผู้ใช้ (Username)</label>
          <input type="text" id="mField_username" required ${current ? 'disabled' : ''} value="${current ? current.username || '' : ''}" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900 ${current ? 'bg-neutral-100' : ''}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">${current ? 'รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน (Password)'}</label>
          <input type="password" id="mField_password" ${current ? '' : 'required'} class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900">
        </div>
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">กลุ่มสิทธิ์ที่สังกัด (Roles)</label>
          <div class="space-y-1 max-h-32 overflow-y-auto border border-neutral-200 p-2 text-xs">
            ${['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'EXECUTIVE_APPROVER', 'COMPLIANCE_AUDITOR', 'STANDARD_OPERATOR', 'GENERAL_USER']
              .map(
                (g) => `
              <label class="flex items-center space-x-2">
                <input type="checkbox" value="${g}" class="mField_userGroups rounded-none border-neutral-400" ${current && current.groups && current.groups.some((ug) => (ug.group ? ug.group.name : ug) === g) ? 'checked' : ''}>
                <span>${g}</span>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
      `;
      break;
    }

    case 'Group': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">ชื่อกลุ่มบทบาท (Group Name)</label>
          <input type="text" id="mField_groupName" required ${current ? 'disabled' : ''} value="${current ? current.name || '' : ''}" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900 ${current ? 'bg-neutral-100' : ''}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">คำอธิบาย (Description)</label>
          <textarea id="mField_groupDesc" rows="3" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900">${current ? current.description || '' : ''}</textarea>
        </div>
      `;
      break;
    }

    case 'Permission': {
      container.innerHTML = `
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">รหัสสิทธิ์ (Code)</label>
          <input type="text" id="mField_permCode" required ${current ? 'disabled' : ''} value="${current ? current.code || '' : ''}" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900 ${current ? 'bg-neutral-100' : ''}">
        </div>
        <div>
          <label class="block text-xs font-semibold text-neutral-700 uppercase mb-1">คำอธิบายสิทธิ์ (Description)</label>
          <textarea id="mField_permDesc" rows="3" class="w-full p-2 border border-neutral-300 text-xs outline-none focus:border-neutral-900">${current ? current.description || '' : ''}</textarea>
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
      if (uEl) payload.username = uEl.value.trim();
      if (pEl && pEl.value) payload.password = pEl.value;
      const groupChks = document.querySelectorAll('.mField_userGroups:checked');
      payload.groups = Array.from(groupChks).map((c) => c.value);
      break;
    }
    case 'Group': {
      const gEl = document.getElementById('mField_groupName');
      const dEl = document.getElementById('mField_groupDesc');
      if (gEl) payload.name = gEl.value.trim();
      if (dEl) payload.description = dEl.value.trim();
      break;
    }
    case 'Permission': {
      const cEl = document.getElementById('mField_permCode');
      const dEl = document.getElementById('mField_permDesc');
      if (cEl) payload.code = cEl.value.trim();
      if (dEl) payload.description = dEl.value.trim();
      break;
    }
  }

  try {
    if (recordId) {
      const res = await api.masterTable.update(activeMasterTable, recordId, payload);
      logConsole('RECORD UPDATED', res);
      showToast('บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
    } else {
      const res = await api.masterTable.create(activeMasterTable, payload);
      logConsole('RECORD CREATED', res);
      showToast('สร้างข้อมูลรายการใหม่เรียบร้อยแล้ว', 'success');
    }

    closeMasterFormModal();
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    logConsole('FORM SUBMIT FAILED', err.data || err.message, true);
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
}

function handleImportFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('masterImportTextInput').value = e.target.result;
    parseAndPreviewImportData();
  };
  reader.readAsText(file);
}

function parseAndPreviewImportData() {
  const raw = document.getElementById('masterImportTextInput').value.trim();
  const previewContainer = document.getElementById('importPreviewContainer');
  const previewCount = document.getElementById('importPreviewCount');
  const previewTable = document.getElementById('importPreviewTable');

  if (!raw) {
    showToast('กรุณาเลือกไฟล์หรือวางข้อความข้อมูล CSV หรือ JSON', 'error');
    return;
  }

  parsedImportData = [];

  try {
    if (raw.startsWith('[') || raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      parsedImportData = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // Parse CSV
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = cells[idx] || '';
          });
          parsedImportData.push(obj);
        }
      }
    }

    if (parsedImportData.length === 0) {
      showToast('ไม่สามารถประมวลผลข้อมูลได้ กรุณาตรวจสอบรูปแบบข้อมูล', 'error');
      return;
    }

    previewCount.textContent = `พบข้อมูลที่เตรียมนำเข้า ${parsedImportData.length} แถว (Preview แสดงสูงสุด 5 แถวแรก):`;
    const previewHeaders = Object.keys(parsedImportData[0]);

    previewTable.innerHTML = `
      <thead class="bg-slate-200">
        <tr>${previewHeaders.map((h) => `<th class="p-1 border">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${parsedImportData
          .slice(0, 5)
          .map(
            (r) =>
              `<tr>${previewHeaders.map((h) => `<td class="p-1 border">${r[h] || ''}</td>`).join('')}</tr>`
          )
          .join('')}
      </tbody>
    `;

    previewContainer.classList.remove('hidden');
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการแปลงข้อมูล: ' + err.message, 'error');
  }
}

async function executeBulkImport() {
  if (parsedImportData.length === 0) {
    showToast('กรุณากดตรวจสอบข้อมูล (Preview) ก่อนเริ่มการนำเข้า', 'error');
    return;
  }

  const btn = document.getElementById('btnExecuteImport');
  if (btn) btn.disabled = true;

  try {
    const res = await api.masterTable.bulkImport(activeMasterTable, parsedImportData);
    logConsole('IMPORT COMMITTED', res);
    showToast(res.message || 'นำเข้าข้อมูลเรียบร้อยแล้ว', 'success');
    closeMasterImportModal();
    loadMasterTableData();
    loadDocumentsData();
    loadDashboardStats();
  } catch (err) {
    logConsole('IMPORT FAILED', err.data || err.message, true);
    showToast('การนำเข้าข้อมูลล้มเหลว: ' + (err.data?.message || err.message), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ----------------------------------------------------
// Export Operations (CSV / JSON)
// ----------------------------------------------------

async function exportMasterData(format) {
  try {
    const res = await api.masterTable.exportFile(activeMasterTable, format);

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${activeMasterTable}_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === 'csv') {
      const blob = new Blob([res.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', res.filename || `${activeMasterTable}_export_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    }

    logConsole(`DATA EXPORTED (${format.toUpperCase()})`, { table: activeMasterTable });
    showToast(`ส่งออกข้อมูลตาราง ${activeMasterTable} (${format.toUpperCase()}) เรียบร้อยแล้ว`, 'success');
  } catch (err) {
    logConsole('EXPORT FAILED', err.data || err.message, true);
    showToast('ไม่สามารถส่งออกข้อมูลได้: ' + (err.data?.message || err.message), 'error');
  }
}

// ----------------------------------------------------
// Print Operations
// ----------------------------------------------------

function printMasterTable() {
  const metaEl = document.getElementById('printReportMeta');
  if (metaEl) {
    metaEl.textContent = `ตาราง: ${activeMasterTable} // วันที่พิมพ์: ${new Date().toLocaleString('th-TH')} // ผู้พิมพ์: ${api.getCurrentUser()?.username || 'Authenticated Operator'}`;
  }
  window.print();
}

async function openDocPrintModal(id) {
  const modal = document.getElementById('modalDocPrint');
  if (!modal) return;

  try {
    const doc = await api.masterTable.findOne('Document', id);

    document.getElementById('printDocNumber').textContent = doc.docNumber;
    document.getElementById('printDocTitle').textContent = doc.title;
    document.getElementById('printDocCategory').textContent = doc.category;
    document.getElementById('printDocAuthor').textContent = doc.author ? doc.author.username : 'System';
    document.getElementById('printDocConfirmedBy').textContent = doc.confirmedBy ? doc.confirmedBy.username : 'ยังไม่ได้รับการอนุมัติ';
    document.getElementById('printDocConfirmedAt').textContent = doc.confirmedAt ? new Date(doc.confirmedAt).toLocaleString('th-TH') : '-';
    document.getElementById('printDocContent').textContent = doc.content || '(ไม่มีเนื้อหาเอกสาร)';

    const badge = document.getElementById('printDocStatusBadge');
    if (badge) {
      badge.textContent = doc.status;
      badge.className = doc.status === 'CONFIRMED'
        ? 'px-2 py-0.5 border border-emerald-800 bg-emerald-50 text-emerald-900 font-mono text-xs font-bold'
        : 'px-2 py-0.5 border border-neutral-400 bg-neutral-100 text-neutral-800 font-mono text-xs font-bold';
    }

    modal.classList.remove('hidden');
  } catch (err) {
    alert('ไม่สามารถเปิดเอกสารได้: ' + err.message);
  }
}

function closeDocPrintModal() {
  const modal = document.getElementById('modalDocPrint');
  if (modal) modal.classList.add('hidden');
}
