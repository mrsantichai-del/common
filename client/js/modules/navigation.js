/**
 * ULTRON Navigation & Role-Based Access Control (RBAC) Module
 * Handles Sidebar Menu Rendering, Permission Checks, and Routing (100% Dynamic from Database)
 */

let MENU_DEFINITIONS = [];

async function loadDynamicMenus() {
  try {
    const menus = await api.auth.getMenus();
    if (Array.isArray(menus) && menus.length > 0) {
      MENU_DEFINITIONS = menus;
    }
  } catch (err) {
    console.warn('[Navigation] Could not fetch menus from database:', err.message);
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
