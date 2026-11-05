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
    badge.textContent = 'AES-256 ENCRYPTED';
    badge.className = 'bg-neutral-900 text-white px-1.5 py-0.2 text-[10px] font-semibold';
  } else {
    badge.textContent = 'PLAINTEXT (NO CIPHER)';
    badge.className = 'bg-neutral-300 text-neutral-800 px-1.5 py-0.2 text-[10px]';
  }
}

function renderWireTelemetry(telemetry) {
  const wireOut = document.getElementById('wireOut');
  const wireIn = document.getElementById('wireIn');
  const wireStatus = document.getElementById('wireStatus');

  if (wireOut) wireOut.textContent = telemetry.outgoingWire || 'None';
  if (wireIn) wireIn.textContent = telemetry.incomingWire || 'None';
  if (wireStatus) {
    wireStatus.textContent = `${telemetry.method} ${telemetry.endpoint} // ${telemetry.status}`;
    wireStatus.className =
      telemetry.status >= 200 && telemetry.status < 300
        ? 'font-semibold text-neutral-900'
        : 'font-semibold text-rose-600';
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
  const authStatus = document.getElementById('authStatus');
  const grantsBanner = document.getElementById('grantsBanner');
  const navAdminTab = document.getElementById('navAdminTab');

  if (api.isAuthenticated()) {
    try {
      const user = await api.auth.getProfile();

      // Show Application Dashboard, Hide Login Portal
      if (viewLogin) viewLogin.classList.add('hidden');
      if (viewApp) viewApp.classList.remove('hidden');

      if (authStatus) {
        authStatus.innerHTML = `
          <span class="w-2 h-2 bg-neutral-900 inline-block"></span>
          <span class="font-bold text-neutral-900 uppercase">${user.username}</span>
        `;
      }

      if (grantsBanner) {
        grantsBanner.classList.remove('hidden');
        const groupsContainer = document.getElementById('activeGroupsList');
        if (groupsContainer) {
          groupsContainer.innerHTML = user.groups
            .map((g) => `<span class="border border-neutral-400 px-1.5 py-0.2 bg-white text-[10px] font-semibold">${g}</span>`)
            .join('');
        }
        const permsCount = document.getElementById('activePermsCount');
        if (permsCount) {
          permsCount.textContent = `${user.permissions.length} PERMISSION(S) ACTIVE`;
        }
      }

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
    btnSubmit.textContent = 'AUTHENTICATING...';
  }

  try {
    const res = await api.auth.login(username, password);
    logConsole('LOGIN SUCCESSFUL', res);
    await refreshAuthStatus();
  } catch (err) {
    const errMsg = err.data?.message || err.message || 'Invalid credentials or connection error';
    if (errBox) {
      errBox.textContent = `AUTHENTICATION FAILED: ${Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}`;
      errBox.classList.remove('hidden');
    }
    logConsole('AUTHENTICATION REJECTED', err.data || err.message, true);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'SIGN IN (ลงชื่อเข้าสู่ระบบ)';
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
  const tabs = ['overview', 'workflows', 'governance'];
  tabs.forEach((t) => {
    const section = document.getElementById(`tabSection_${t}`);
    const btn = document.getElementById(`tabBtn_${t}`);
    if (section) section.classList.add('hidden');
    if (btn) {
      btn.className = 'text-neutral-400 hover:text-neutral-900 pb-1 font-mono text-xs transition-colors';
    }
  });

  const activeSection = document.getElementById(`tabSection_${tab}`);
  const activeBtn = document.getElementById(`tabBtn_${tab}`);
  if (activeSection) activeSection.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.className = 'font-semibold text-neutral-900 border-b-2 border-neutral-900 pb-1 font-mono text-xs';
  }

  if (tab === 'overview' && leafletMap) {
    setTimeout(() => leafletMap.invalidateSize(), 200);
  }
  if (tab === 'governance') {
    loadGovernanceData();
  }
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
    { id: 'NODE-01', name: 'Bangkok Central Core', lat: 13.7563, lng: 100.5018, status: 'ONLINE', cluster: 'Kernel A' },
    { id: 'NODE-02', name: 'Suvarnabhumi Gateway', lat: 13.6900, lng: 100.7501, status: 'ONLINE', cluster: 'Secure Edge' },
    { id: 'NODE-03', name: 'Chonburi Logistics Node', lat: 13.3611, lng: 100.9847, status: 'STANDBY', cluster: 'Data Vault' },
    { id: 'NODE-04', name: 'Ayutthaya Backup Hub', lat: 14.3532, lng: 100.5684, status: 'ONLINE', cluster: 'Kernel B' },
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
      <div class="font-mono text-xs">
        <strong>${st.name}</strong><br>
        <span class="text-neutral-500">Node ID: ${st.id}</span><br>
        <span class="text-neutral-500">Status: ${st.status}</span><br>
        <span class="text-neutral-500">Cluster: ${st.cluster}</span>
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
          <span class="text-[10px] opacity-75">${g._count ? g._count.users : 0} users</span>
        </div>
        <div class="text-[10px] ${isSelected ? 'text-neutral-300' : 'text-neutral-400'} truncate">${g.description || ''}</div>
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
  document.getElementById('governanceGroupDesc').textContent = selectedAdminGroup.description || 'No description';

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
          <span class="text-[10px] text-neutral-400 block">${p.description || ''}</span>
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
  if (!confirm(`Delete group '${selectedAdminGroup.name}'?`)) return;

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
      <td class="p-3 font-bold text-neutral-900">${u.username}</td>
      <td class="p-3">
        <div class="flex gap-1 flex-wrap">
          ${u.groups.map((g) => `<span class="border border-neutral-300 px-1 py-0.2 bg-white text-[10px]">${g}</span>`).join('')}
        </div>
      </td>
      <td class="p-3 text-neutral-500">${u.permissions.length} actions</td>
      <td class="p-3 text-right">
        <button onclick="openUserGroupDelegationModal('${u.id}')" class="px-2 py-1 border border-neutral-900 hover:bg-neutral-900 hover:text-white uppercase text-[10px] mr-1">
          Delegate
        </button>
        ${
          u.username !== 'root_admin'
            ? `<button onclick="deleteUserAccount('${u.id}', '${u.username}')" class="px-2 py-1 text-rose-600 border border-rose-300 hover:bg-rose-600 hover:text-white uppercase text-[10px]">
                Purge
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
  if (!confirm(`Purge user account '${username}' permanently?`)) return;
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
