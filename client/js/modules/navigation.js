/**
 * ULTRON Navigation & Role-Based Access Control (RBAC) Module
 * Handles Sidebar Menu Rendering, Permission Checks, and Routing
 */

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
