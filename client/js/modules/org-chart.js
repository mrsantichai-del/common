/**
 * ULTRON Organization Chart Module
 * Interactive Hierarchical Tree Visualization, Search, and MasterData Integration
 */

let rawOrgChartData = null;
let orgChartFilterType = 'ALL';
let orgChartSearchQuery = '';

async function loadOrgChartData() {
  const container = document.getElementById('orgChartContentContainer');
  if (container) {
    container.innerHTML = `
      <div class="p-12 text-center text-xs text-slate-400 font-sans">
        <svg class="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        กำลังโหลดข้อมูลผังโครงสร้างองค์กร...
      </div>
    `;
  }

  try {
    const res = await api.organization.getChart();
    rawOrgChartData = res;

    // Update Company Banner & Statistics
    if (res.company) {
      const logoEl = document.getElementById('orgChartCompanyLogo');
      const nameEl = document.getElementById('orgChartCompanyName');
      const subEl = document.getElementById('orgChartCompanySub');

      if (logoEl && res.company.logoUrl) logoEl.src = res.company.logoUrl;
      if (nameEl) nameEl.textContent = res.company.nameTh || 'ผังโครงสร้างองค์กร';
      if (subEl) {
        subEl.textContent = `${res.company.nameEn || ''} • เลขประจำตัวผู้เสียภาษี: ${res.company.taxId || '-'}`;
      }
    }

    // Calculate Occupants Count & Total Quota
    let totalEmployeesCount = 0;
    let totalQuotaCount = 0;
    (res.companyPositions || []).forEach((p) => {
      totalEmployeesCount += Array.isArray(p.users) ? p.users.length : 0;
      totalQuotaCount += p.minHeadcount || 1;
    });

    const countUnitPositionsAndEmployees = (nodes) => {
      nodes.forEach((u) => {
        (u.positions || []).forEach((p) => {
          totalEmployeesCount += Array.isArray(p.users) ? p.users.length : 0;
          totalQuotaCount += p.minHeadcount || 1;
        });
        if (Array.isArray(u.children)) {
          countUnitPositionsAndEmployees(u.children);
        }
      });
    };
    if (Array.isArray(res.tree)) {
      countUnitPositionsAndEmployees(res.tree);
    }

    const statUnits = document.getElementById('statTotalUnits');
    const statPositions = document.getElementById('statTotalPositions');
    const statEmployees = document.getElementById('statTotalEmployees');
    const statQuota = document.getElementById('statTotalQuota');

    if (statUnits) statUnits.textContent = res.totalUnits ?? 0;
    if (statPositions) statPositions.textContent = res.totalPositions ?? 0;
    if (statEmployees) statEmployees.textContent = totalEmployeesCount;
    if (statQuota) statQuota.textContent = totalQuotaCount;

    renderOrgChart();
  } catch (err) {
    console.error('Failed to load org chart:', err);
    if (container) {
      container.innerHTML = `
        <div class="p-8 text-center text-xs text-rose-600 font-sans">
          เกิดข้อผิดพลาดในการโหลดผังองค์กร: ${err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}
        </div>
      `;
    }
  }
}

function handleOrgChartSearch(event) {
  orgChartSearchQuery = (event.target.value || '').trim().toLowerCase();
  renderOrgChart();
}

function handleOrgChartFilter(event) {
  orgChartFilterType = event.target.value || 'ALL';
  renderOrgChart();
}

function toggleAllOrgTree(expand) {
  const allSubContainers = document.querySelectorAll('.org-children-container');
  allSubContainers.forEach((el) => {
    if (expand) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  const allChevrons = document.querySelectorAll('.org-chevron-btn svg');
  allChevrons.forEach((svg) => {
    if (expand) {
      svg.classList.add('rotate-90');
    } else {
      svg.classList.remove('rotate-90');
    }
  });
}

function toggleOrgNode(nodeId) {
  const container = document.getElementById(`org_children_${nodeId}`);
  const chevron = document.getElementById(`org_chevron_${nodeId}`);
  if (container) {
    container.classList.toggle('hidden');
    if (chevron) {
      chevron.classList.toggle('rotate-90');
    }
  }
}

function renderOrgChart() {
  const container = document.getElementById('orgChartContentContainer');
  if (!container || !rawOrgChartData) return;

  let html = '';

  // 1. Company Level Positions (Executive Tier e.g. CEO / Board)
  const execPositions = rawOrgChartData.companyPositions || [];
  if (execPositions.length > 0) {
    html += `
      <div class="flex flex-col items-center">
        <div class="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-[11px] font-bold shadow-xs uppercase tracking-wider mb-3">
          <svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>คณะผู้บริหารระดับสูง (Executive Board)</span>
        </div>

        <div class="flex flex-wrap justify-center gap-4 max-w-4xl">
          ${execPositions.map((p) => renderPositionCard(p, true)).join('')}
        </div>

        <!-- Vertical Connector Line to Branches -->
        <div class="w-0.5 h-8 bg-slate-300 mt-3"></div>
      </div>
    `;
  }

  // 2. Units Tree (Branches -> Divisions -> Departments -> Sections)
  const rootTree = rawOrgChartData.tree || [];
  if (rootTree.length === 0) {
    html += `
      <div class="p-8 text-center text-slate-400 font-sans text-xs bg-white rounded-lg border border-slate-200">
        ยังไม่มีการสร้างหน่วยงานในระบบ กรุณาเพิ่มข้อมูลในเมนู MasterData หรือคลิกปุ่มด้านบน
      </div>
    `;
  } else {
    html += `
      <div class="space-y-6">
        <div class="flex flex-wrap justify-center gap-6">
          ${rootTree.map((branch) => renderUnitCardTree(branch, 0)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderPositionCard(pos, isTopLevel = false) {
  const occupantCount = pos.actualCount ?? (Array.isArray(pos.users) ? pos.users.length : 0);
  const minH = pos.minHeadcount ?? 1;
  const maxH = pos.maxHeadcount ?? minH;
  const rangeStr = minH === maxH ? `${minH}` : `${minH}-${maxH}`;

  let hcBadge = '';
  if (occupantCount < minH) {
    const diff = minH - occupantCount;
    hcBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300">ขาด ${diff}</span>`;
  } else if (occupantCount > maxH) {
    const diff = occupantCount - maxH;
    hcBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-300">เกิน ${diff}</span>`;
  } else {
    hcBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">พอดี</span>`;
  }

  const quotaTag = `
    <div class="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-200 mt-2">
      <span class="text-slate-500 font-sans">อัตรากำลัง:</span>
      <div class="flex items-center space-x-1 font-mono">
        <span class="font-bold text-slate-800">${occupantCount}</span>
        <span class="text-slate-400">/</span>
        <span class="text-slate-600">${rangeStr} คน</span>
        ${hcBadge}
      </div>
    </div>
  `;

  const jobLevelBadge = pos.job ? `
    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
      pos.job.level === 'EXECUTIVE'
        ? 'bg-purple-100 text-purple-800 border border-purple-200'
        : pos.job.level === 'MANAGER'
        ? 'bg-blue-100 text-blue-800 border border-blue-200'
        : 'bg-slate-100 text-slate-700 border border-slate-200'
    }">
      ${pos.job.level}
    </span>
  ` : '';

  let occupantDisplay = '';
  if (occupantCount > 1) {
    occupantDisplay = `
      <div class="flex items-center space-x-2 pt-2 border-t border-slate-100 mt-2">
        <div class="flex -space-x-1.5 overflow-hidden">
          ${(pos.users || []).slice(0, 3).map((u) => `
            <div class="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[9px] ring-2 ring-white">
              ${(u.username || '?').charAt(0).toUpperCase()}
            </div>
          `).join('')}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold text-slate-800 truncate">${pos.users[0]?.username || ''} +${occupantCount - 1} คน</div>
          <div class="text-[10px] text-slate-400 font-mono truncate">มีผู้ครองตำแหน่ง ${occupantCount} คน</div>
        </div>
      </div>
    `;
  } else if (occupantCount === 1) {
    const occupant = pos.users[0];
    occupantDisplay = `
      <div class="flex items-center space-x-2 pt-2 border-t border-slate-100 mt-2">
        <div class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
          ${(occupant.username || '?').charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-bold text-slate-800 truncate">${occupant.username}</div>
          <div class="text-[10px] text-slate-400 font-mono truncate">${occupant.employeeId || 'พนักงาน'}</div>
        </div>
      </div>
    `;
  } else {
    occupantDisplay = `
      <div class="pt-2 border-t border-slate-100 mt-2 text-center">
        <span class="text-[10px] font-sans text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
          ตำแหน่งว่าง (Vacant)
        </span>
      </div>
    `;
  }

  const headBadge = pos.isUnitHead && !isTopLevel
    ? '<span class="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold">หัวหน้าหน่วย</span>'
    : '';

  const reportsToDisplay = pos.reportsTo
    ? `<div class="text-[9px] text-slate-400 mt-1 truncate" title="รายงานต่อ: ${pos.reportsTo.title}">↳ รายงานต่อ: ${pos.reportsTo.title}</div>`
    : '';

  return `
    <div class="bg-white rounded-lg border ${
      isTopLevel ? 'border-amber-300 ring-2 ring-amber-100 shadow-md' : 'border-slate-200 shadow-2xs'
    } p-3 w-64 hover:border-blue-400 hover:shadow-sm transition-all text-left">
      <div class="flex items-start justify-between gap-1 mb-1">
        <span class="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
          ${pos.code}
        </span>
        <div class="flex items-center space-x-1">
          ${jobLevelBadge}
          ${headBadge}
        </div>
      </div>

      <div class="font-bold text-slate-900 text-xs truncate mt-1" title="${pos.title}">
        ${pos.title}
      </div>

      ${pos.job ? `<div class="text-[10px] text-slate-500 truncate">${pos.job.titleTh}</div>` : ''}
      ${reportsToDisplay}
      ${quotaTag}
      ${occupantDisplay}

      <div class="mt-2 pt-1 flex justify-end">
        <button 
          type="button" 
          onclick="openEditFromOrgChart('position', '${pos.id}')"
          class="text-[10px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer inline-flex items-center space-x-0.5"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <span>แก้ไข</span>
        </button>
      </div>
    </div>
  `;
}

function renderUnitCardTree(unit, depth = 0) {
  // Check type filter
  if (orgChartFilterType !== 'ALL' && unit.type !== orgChartFilterType) {
    // If unit has matching children, still keep it, otherwise hide if no match
    const hasMatchingDescendant = (u) => {
      if (u.type === orgChartFilterType) return true;
      return Array.isArray(u.children) && u.children.some(hasMatchingDescendant);
    };
    if (!hasMatchingDescendant(unit)) return '';
  }

  // Check search query
  if (orgChartSearchQuery) {
    const matchesUnit = unit.name.toLowerCase().includes(orgChartSearchQuery) ||
                        unit.code.toLowerCase().includes(orgChartSearchQuery) ||
                        (unit.nameEn && unit.nameEn.toLowerCase().includes(orgChartSearchQuery));
    const matchesPos = Array.isArray(unit.positions) && unit.positions.some((p) =>
      p.title.toLowerCase().includes(orgChartSearchQuery) ||
      p.code.toLowerCase().includes(orgChartSearchQuery) ||
      (Array.isArray(p.users) && p.users.some((u) => u.username.toLowerCase().includes(orgChartSearchQuery)))
    );
    const hasMatchingDescendant = (u) => {
      const uMatch = u.name.toLowerCase().includes(orgChartSearchQuery) || u.code.toLowerCase().includes(orgChartSearchQuery);
      const pMatch = Array.isArray(u.positions) && u.positions.some((p) => p.title.toLowerCase().includes(orgChartSearchQuery) || p.code.toLowerCase().includes(orgChartSearchQuery));
      return uMatch || pMatch || (Array.isArray(u.children) && u.children.some(hasMatchingDescendant));
    };

    if (!matchesUnit && !matchesPos && !hasMatchingDescendant(unit)) {
      return '';
    }
  }

  let unitColor = {
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    headerBg: 'bg-purple-50/80 border-purple-200 text-purple-900',
    border: 'border-purple-300',
    labelTh: 'สาขา (BRANCH)',
  };

  if (unit.type === 'DIVISION') {
    unitColor = {
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      headerBg: 'bg-blue-50/80 border-blue-200 text-blue-900',
      border: 'border-blue-300',
      labelTh: 'ฝ่าย (DIVISION)',
    };
  } else if (unit.type === 'DEPARTMENT') {
    unitColor = {
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      headerBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
      border: 'border-emerald-300',
      labelTh: 'แผนก (DEPARTMENT)',
    };
  } else if (unit.type === 'SECTION') {
    unitColor = {
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      headerBg: 'bg-amber-50/80 border-amber-200 text-amber-900',
      border: 'border-amber-300',
      labelTh: 'ส่วนงาน (SECTION)',
    };
  }

  const positions = unit.positions || [];
  const children = unit.children || [];
  const hasChildren = children.length > 0;

  return `
    <div class="flex flex-col items-center flex-1 min-w-[300px]">
      <!-- Unit Node Card -->
      <div class="w-full max-w-md bg-white rounded-xl border ${unitColor.border} shadow-sm overflow-hidden transition-all hover:shadow-md">
        <!-- Unit Card Header -->
        <div class="px-3.5 py-2.5 border-b ${unitColor.headerBg} flex items-center justify-between">
          <div class="flex items-center space-x-2 min-w-0">
            ${
              hasChildren
                ? `<button type="button" onclick="toggleOrgNode('${unit.id}')" class="org-chevron-btn p-0.5 rounded hover:bg-black/5 text-slate-600 transition-transform cursor-pointer">
                    <svg id="org_chevron_${unit.id}" class="w-4 h-4 transform rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>`
                : '<span class="w-4"></span>'
            }
            <div class="min-w-0">
              <div class="flex items-center space-x-1.5">
                <span class="text-xs font-bold text-slate-900 truncate">${unit.name}</span>
                <span class="text-[10px] font-mono text-slate-500 font-semibold">(${unit.code})</span>
              </div>
              ${unit.nameEn ? `<div class="text-[10px] text-slate-500 font-sans truncate">${unit.nameEn}</div>` : ''}
            </div>
          </div>

          <div class="flex items-center space-x-1 flex-shrink-0">
            <span class="px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${unitColor.badgeBg}">
              ${unitColor.labelTh}
            </span>
            <button 
              type="button" 
              onclick="openEditFromOrgChart('orgunit', '${unit.id}')" 
              title="แก้ไขหน่วยงานนี้"
              class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          </div>
        </div>

        <!-- Unit Positions Section -->
        <div class="p-3 bg-slate-50/50 space-y-2">
          ${
            positions.length === 0
              ? '<div class="text-[11px] text-slate-400 italic text-center py-1">ยังไม่มีตำแหน่งงานในหน่วยงานนี้</div>'
              : `<div class="grid grid-cols-1 gap-2">${positions.map((p) => renderPositionCard(p, false)).join('')}</div>`
          }
        </div>
      </div>

      <!-- Connecting Lines & Child Units -->
      ${
        hasChildren
          ? `
            <div class="w-0.5 h-6 bg-slate-300"></div>
            <div id="org_children_${unit.id}" class="org-children-container w-full pt-2">
              <div class="flex flex-wrap justify-center gap-4 relative">
                ${children.map((child) => renderUnitCardTree(child, depth + 1)).join('')}
              </div>
            </div>
          `
          : ''
      }
    </div>
  `;
}

function openEditFromOrgChart(tableName, id) {
  // Stay inside Organization menu context seamlessly
  const subMap = {
    orgunit: 'orgUnit',
    job: 'job',
    position: 'position',
  };
  navigateToOrganization(subMap[tableName] || 'orgUnit');
  setTimeout(() => {
    openEditMasterRecordModal(id);
  }, 200);
}
