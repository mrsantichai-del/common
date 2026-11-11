/**
 * ULTRON MasterData Management Engine
 * All Tables Management, Searchable Comboboxes, and CRUD Operations
 */

// ----------------------------------------------------
// MasterData Management Engine (Admin Only)
// ----------------------------------------------------

const MASTER_TABLES = ['company', 'user', 'group', 'permission', 'menu', 'orgunit', 'job', 'position', 'document', 'auditlog'];

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
                  <div class="flex items-center space-x-2.5">
                    <div class="w-8 h-8 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                      ${c.logoUrl ? `<img src="${c.logoUrl}" class="max-w-full max-h-full object-contain" alt="Logo">` : '<span class="text-[9px] text-slate-300">No logo</span>'}
                    </div>
                    <div class="min-w-0">
                      <div class="font-semibold text-slate-900 truncate">${c.nameTh}</div>
                      <div class="text-[11px] text-slate-500 font-sans truncate">${c.nameEn}</div>
                    </div>
                  </div>
                </td>
                <td class="p-3 text-blue-700 font-mono font-medium">${c.taxId}</td>
                <td class="p-3 font-sans text-xs">${branchDisplay}</td>
                <td class="p-3 font-sans text-xs text-slate-600">
                  <div>${c.telephone || '-'}</div>
                  <div class="text-[10px] text-slate-400 truncate max-w-xs" title="${c.addressTh}">${c.addressTh}</div>
                </td>
                <td class="p-3">
                  <div class="flex flex-col space-y-1">
                    <div>
                      ${defaultBadge}
                      ${statusBadge}
                    </div>
                    ${c.stampUrl ? '<span class="text-[9px] text-slate-500 font-sans flex items-center space-x-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>มีตรายาง</span></span>' : ''}
                  </div>
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
          <th class="p-3">ตำแหน่งงาน (Position)</th>
          <th class="p-3">กลุ่มสิทธิ์ (Groups)</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="7" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลผู้ใช้งาน</td></tr>`;
      } else {
        rowsHtml = records
          .map((u, i) => {
            const positionDisplay = u.position
              ? `<span class="font-semibold text-slate-800">${u.position.title}</span> <span class="text-slate-400 text-[10px] font-mono">(${u.position.code})</span>`
              : '<span class="text-slate-400 italic font-sans text-[11px]">-</span>';

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
                <td class="p-3 font-sans text-xs">${positionDisplay}</td>
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

    case 'menu': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">รหัสเมนู (Code)</th>
          <th class="p-3">ชื่อเมนู (Label)</th>
          <th class="p-3 text-center">ลำดับ</th>
          <th class="p-3">เมนูหลัก (Parent)</th>
          <th class="p-3">สิทธิ์ที่ต้องใช้ (Permission)</th>
          <th class="p-3 text-center">จำกัดสิทธิ์</th>
          <th class="p-3 text-center">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลเมนูระบบ</td></tr>`;
      } else {
        rowsHtml = records
          .map((m, i) => {
            const isSub = Boolean(m.parentId);
            const parentDisplay = m.parentLabel
              ? `<span class="inline-flex items-center space-x-1 text-slate-700 font-medium"><span>↳</span><span>${m.parentLabel}</span><span class="text-[10px] text-slate-400 font-mono">(${m.parentCode})</span></span>`
              : `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium font-sans">เมนูหลัก (Top Level)</span>`;

            const permDisplay = m.permissionCode
              ? `<span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-semibold" title="${m.permissionDesc || ''}">${m.permissionCode}</span>`
              : `<span class="text-slate-400 text-[11px] font-sans">- ไม่จำกัดสิทธิ์ -</span>`;

            const adminBadge = m.adminOnly
              ? `<span class="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-semibold">Admin Only</span>`
              : `<span class="text-slate-400 text-[11px] font-sans">ทั่วไป</span>`;

            const statusBadge = m.isActive
              ? `<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">ใช้งาน</span>`
              : `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold">ปิดใช้งาน</span>`;

            return `
              <tr class="hover:bg-slate-50/80 transition-colors ${isSub ? 'bg-slate-50/30' : ''}">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 font-semibold text-slate-900 font-mono">${m.code}</td>
                <td class="p-3 font-medium text-slate-800 font-sans flex items-center space-x-2">
                  ${m.icon ? `<span class="w-4 h-4 text-slate-500 flex-shrink-0">${m.icon}</span>` : ''}
                  <span>${m.label}</span>
                </td>
                <td class="p-3 text-center font-mono font-bold text-slate-700 text-xs">${m.order}</td>
                <td class="p-3">${parentDisplay}</td>
                <td class="p-3">${permDisplay}</td>
                <td class="p-3 text-center">${adminBadge}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-right font-sans space-x-1.5">
                  <button type="button" onclick="openEditMasterRecordModal('${m.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  ${
                    m.code !== 'home'
                      ? `<button type="button" onclick="deleteMasterRecord('${m.id}', '${m.label}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">ลบ</button>`
                      : ''
                  }
                </td>
              </tr>
            `;
          })
          .join('');
      }
      break;
    }

    case 'orgunit': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">รหัสหน่วยงาน (Code)</th>
          <th class="p-3">ชื่อหน่วยงาน (Name TH / EN)</th>
          <th class="p-3">ประเภท (Type)</th>
          <th class="p-3">สังกัดหน่วยงานหลัก (Parent Unit)</th>
          <th class="p-3 text-center">ลำดับ</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลหน่วยงานในโครงสร้างองค์กร</td></tr>`;
      } else {
        rowsHtml = records
          .map((u, i) => {
            let typeBadge = '';
            switch (u.type) {
              case 'BRANCH':
                typeBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-bold font-mono">สาขา (BRANCH)</span>';
                break;
              case 'DIVISION':
                typeBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold font-mono">ฝ่าย (DIVISION)</span>';
                break;
              case 'DEPARTMENT':
                typeBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono">แผนก (DEPARTMENT)</span>';
                break;
              case 'SECTION':
                typeBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold font-mono">ส่วนงาน (SECTION)</span>';
                break;
              default:
                typeBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-bold font-mono">${u.type}</span>`;
            }

            const parentDisplay = u.parent
              ? `<span class="text-slate-800 font-semibold">${u.parent.name}</span> <span class="text-slate-400 text-[10px] font-mono">(${u.parent.code})</span>`
              : '<span class="text-slate-400 italic font-sans text-[11px]">ระดับบนสุด (Root)</span>';

            const statusBadge = u.isActive !== false
              ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-sans font-semibold">ใช้งานได้</span>'
              : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-sans">ปิดใช้งาน</span>';

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 text-blue-700 font-mono font-bold">${u.code}</td>
                <td class="p-3">
                  <div class="font-semibold text-slate-900">${u.name}</div>
                  <div class="text-[11px] text-slate-500 font-sans">${u.nameEn || '-'}</div>
                </td>
                <td class="p-3">${typeBadge}</td>
                <td class="p-3 font-sans text-xs">${parentDisplay}</td>
                <td class="p-3 text-center font-mono text-slate-600 text-xs">${u.order ?? 0}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right font-sans space-x-1.5 whitespace-nowrap">
                  <button type="button" onclick="openEditMasterRecordModal('${u.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${u.id}', '${u.name}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
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

    case 'job': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">รหัสงาน (Job Code)</th>
          <th class="p-3">ชื่อตำแหน่งงานมาตรฐาน (Title TH / EN)</th>
          <th class="p-3">ระดับงาน (Level)</th>
          <th class="p-3">กรอบกำลังคนรวม vs คนจริง (Company Quota)</th>
          <th class="p-3">คำอธิบายหน้าที่ความรับผิดชอบ (JD)</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="8" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลลักษณะงานมาตรฐาน (Job/JD)</td></tr>`;
      } else {
        rowsHtml = records
          .map((j, i) => {
            let levelBadge = '';
            switch (j.level) {
              case 'EXECUTIVE':
                levelBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 border border-purple-300 font-bold font-mono">ผู้บริหาร (EXECUTIVE)</span>';
                break;
              case 'MANAGER':
                levelBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 border border-blue-300 font-bold font-mono">ผู้จัดการ (MANAGER)</span>';
                break;
              case 'SUPERVISOR':
                levelBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800 border border-teal-300 font-bold font-mono">หัวหน้างาน (SUPERVISOR)</span>';
                break;
              case 'SPECIALIST':
                levelBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold font-mono">ผู้เชี่ยวชาญ (SPECIALIST)</span>';
                break;
              case 'OFFICER':
                levelBadge = '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold font-mono">เจ้าหน้าที่ (OFFICER)</span>';
                break;
              default:
                levelBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-bold font-mono">${j.level || '-'}</span>`;
            }

            let quotaDisplay = '<span class="text-slate-400 italic text-[11px] font-sans">-</span>';
            if (j.totalMinHeadcount > 0 || j.totalMaxHeadcount > 0) {
              const rangeStr = j.totalMinHeadcount === j.totalMaxHeadcount
                ? `${j.totalMinHeadcount} คน`
                : `${j.totalMinHeadcount} - ${j.totalMaxHeadcount} คน`;

              let statusBadge = '';
              if (j.jobStatus === 'UNDER_STAFFED') {
                statusBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-300">ขาด ${j.jobDiff}</span>`;
              } else if (j.jobStatus === 'OVER_STAFFED') {
                statusBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-300">เกิน ${j.jobDiff}</span>`;
              } else {
                statusBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-300">ครบอัตรา</span>`;
              }

              quotaDisplay = `
                <div class="flex items-center space-x-1.5">
                  <span class="font-bold text-slate-800 font-mono text-xs">${j.actualEmployees || 0}</span>
                  <span class="text-slate-400 text-[11px] font-mono">/</span>
                  <span class="text-slate-600 font-mono text-[11px]">${rangeStr}</span>
                  ${statusBadge}
                </div>
              `;
            }

            const statusBadge = j.isActive !== false
              ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-sans font-semibold">ใช้งานได้</span>'
              : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-sans">ปิดใช้งาน</span>';

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 text-blue-700 font-mono font-bold">${j.code}</td>
                <td class="p-3">
                  <div class="font-semibold text-slate-900">${j.title || j.titleTh || '-'}</div>
                  <div class="text-[11px] text-slate-500 font-sans">${j.titleEn || '-'}</div>
                </td>
                <td class="p-3">${levelBadge}</td>
                <td class="p-3 font-sans text-xs">${quotaDisplay}</td>
                <td class="p-3 text-slate-600 font-sans text-xs max-w-xs truncate" title="${j.summary || j.responsibilities || j.description || ''}">
                  ${j.summary || j.responsibilities || j.description || '<span class="text-slate-400 italic">-</span>'}
                </td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right font-sans space-x-1.5 whitespace-nowrap">
                  <button 
                    type="button" 
                    onclick="openJobPrintPreview('${j.id}')" 
                    class="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                    title="พิมพ์เอกสารกำหนดหน้าที่ความรับผิดชอบและคุณสมบัติ (ISO 9001 Job Description)"
                  >
                    <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    <span>พิมพ์ ISO</span>
                  </button>
                  <button type="button" onclick="openEditMasterRecordModal('${j.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${j.id}', '${escapeJs(j.title || j.titleTh || j.code)}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
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

    case 'position': {
      headersHtml = `
        <tr>
          <th class="p-3 w-12 text-center">#</th>
          <th class="p-3">รหัสตำแหน่ง (Pos Code)</th>
          <th class="p-3">ชื่อตำแหน่ง (Position Title)</th>
          <th class="p-3">สังกัดหน่วยงาน (OrgUnit)</th>
          <th class="p-3">ลักษณะงาน (Job)</th>
          <th class="p-3">กรอบอัตรากำลัง vs คนจริง</th>
          <th class="p-3">ผู้บังคับบัญชา (Reports To)</th>
          <th class="p-3">ผู้ครองตำแหน่ง (Users)</th>
          <th class="p-3">สถานะ</th>
          <th class="p-3 text-right">การกระทำ</th>
        </tr>
      `;

      if (records.length === 0) {
        rowsHtml = `<tr><td colspan="10" class="p-8 text-center text-slate-400 font-sans text-xs">ไม่พบข้อมูลตำแหน่งงานในระบบ</td></tr>`;
      } else {
        rowsHtml = records
          .map((p, i) => {
            const headBadge = p.isUnitHead
              ? '<span class="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold font-mono">หัวหน้าหน่วย</span>'
              : '';

            const unitDisplay = p.orgUnit
              ? `<span class="font-semibold text-slate-800">${p.orgUnit.name}</span> <span class="text-slate-400 text-[10px] font-mono">(${p.orgUnit.code})</span>`
              : '<span class="text-purple-700 font-semibold font-mono text-[11px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">ระดับบริษัท (CEO/Board)</span>';

            const jobDisplay = p.job
              ? `<span class="text-slate-800">${p.job.titleTh}</span> <span class="text-slate-400 text-[10px] font-mono">(${p.job.code})</span>`
              : '<span class="text-slate-400 italic font-sans">-</span>';

            const minH = p.minHeadcount || 1;
            const maxH = p.maxHeadcount || minH;
            const rangeStr = minH === maxH ? `${minH} คน` : `${minH} - ${maxH} คน`;

            let headcountBadge = '';
            if (p.headcountStatus === 'UNDER_STAFFED') {
              headcountBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-300">ขาด ${p.headcountDiff}</span>`;
            } else if (p.headcountStatus === 'OVER_STAFFED') {
              headcountBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-300">เกิน ${p.headcountDiff}</span>`;
            } else {
              headcountBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-300">พอดี</span>`;
            }

            const headcountDisplay = `
              <div class="flex items-center space-x-1.5">
                <span class="font-bold text-slate-900 font-mono text-xs">${p.actualCount ?? (p.users ? p.users.length : 0)}</span>
                <span class="text-slate-400 text-[11px] font-mono">/</span>
                <span class="text-slate-600 font-mono text-[11px]">${rangeStr}</span>
                ${headcountBadge}
              </div>
            `;

            const reportsToDisplay = p.reportsTo
              ? `<span class="text-slate-800 font-medium">${p.reportsTo.title}</span> <span class="text-slate-400 text-[10px] font-mono">(${p.reportsTo.code})</span>`
              : '<span class="text-slate-400 italic font-sans">-</span>';

            const usersBadge = Array.isArray(p.users) && p.users.length > 0
              ? p.users.map((u) => `<span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-medium font-mono mr-1">${u.username}</span>`).join('')
              : '<span class="text-amber-600 font-sans italic text-[11px]">ว่าง (Vacant)</span>';

            const statusBadge = p.isActive !== false
              ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-sans font-semibold">ใช้งานได้</span>'
              : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-sans">ปิดใช้งาน</span>';

            return `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 text-center text-slate-400 text-xs">${i + 1}</td>
                <td class="p-3 text-blue-700 font-mono font-bold">${p.code}</td>
                <td class="p-3 font-semibold text-slate-900 font-sans">
                  ${p.title}
                  ${headBadge}
                </td>
                <td class="p-3 font-sans text-xs">${unitDisplay}</td>
                <td class="p-3 font-sans text-xs">${jobDisplay}</td>
                <td class="p-3 font-sans text-xs whitespace-nowrap">${headcountDisplay}</td>
                <td class="p-3 font-sans text-xs">${reportsToDisplay}</td>
                <td class="p-3">${usersBadge}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right font-sans space-x-1.5 whitespace-nowrap">
                  <button type="button" onclick="openEditMasterRecordModal('${p.id}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer">
                    แก้ไข
                  </button>
                  <button type="button" onclick="deleteMasterRecord('${p.id}', '${p.title}')" class="px-2 py-1 text-[11px] rounded bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer">
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
// Company Image Management (Logo & Stamp Processing)
// ----------------------------------------------------

function handleCompanyImageUpload(type, event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (PNG, JPG, SVG, WebP)', 'error');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast('ขนาดไฟล์รูปภาพเกิน 10MB กรุณาเลือกไฟล์ที่เล็กลง', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const rawDataUrl = e.target.result;

    if (file.type === 'image/svg+xml' || file.size < 50 * 1024) {
      applyCompanyImage(type, rawDataUrl, file.name);
      return;
    }

    // Canvas resize to optimize storage and performance (max 800px)
    const img = new Image();
    img.onload = function () {
      const maxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mime, 0.88);
      applyCompanyImage(type, compressedDataUrl, file.name);
    };
    img.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
}

function applyCompanyImage(type, dataUrl, fileName) {
  if (type === 'logo') {
    const input = document.getElementById('f_company_logoUrl');
    const preview = document.getElementById('companyLogoPreviewImg');
    const placeholder = document.getElementById('companyLogoPlaceholder');
    const info = document.getElementById('companyLogoFileInfo');

    if (input) input.value = dataUrl;
    if (preview) {
      preview.src = dataUrl;
      preview.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (info) {
      info.textContent = fileName ? `ไฟล์: ${fileName}` : 'กำหนดรูปภาพเรียบร้อย';
      info.classList.remove('hidden');
    }
    showToast('เลือกไฟล์โลโก้เรียบร้อยแล้ว', 'success');
  } else if (type === 'stamp') {
    const input = document.getElementById('f_company_stampUrl');
    const preview = document.getElementById('companyStampPreviewImg');
    const placeholder = document.getElementById('companyStampPlaceholder');
    const info = document.getElementById('companyStampFileInfo');

    if (input) input.value = dataUrl;
    if (preview) {
      preview.src = dataUrl;
      preview.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (info) {
      info.textContent = fileName ? `ไฟล์: ${fileName}` : 'กำหนดรูปภาพเรียบร้อย';
      info.classList.remove('hidden');
    }
    showToast('เลือกไฟล์ตรายางเรียบร้อยแล้ว', 'success');
  }
}

function clearCompanyImage(type) {
  if (type === 'logo') {
    const input = document.getElementById('f_company_logoUrl');
    const preview = document.getElementById('companyLogoPreviewImg');
    const placeholder = document.getElementById('companyLogoPlaceholder');
    const info = document.getElementById('companyLogoFileInfo');
    const fileInput = document.getElementById('f_company_logoFile');

    if (input) input.value = '';
    if (fileInput) fileInput.value = '';
    if (preview) {
      preview.src = '';
      preview.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (info) info.classList.add('hidden');
    showToast('ล้างไฟล์โลโก้เรียบร้อย', 'info');
  } else if (type === 'stamp') {
    const input = document.getElementById('f_company_stampUrl');
    const preview = document.getElementById('companyStampPreviewImg');
    const placeholder = document.getElementById('companyStampPlaceholder');
    const info = document.getElementById('companyStampFileInfo');
    const fileInput = document.getElementById('f_company_stampFile');

    if (input) input.value = '';
    if (fileInput) fileInput.value = '';
    if (preview) {
      preview.src = '';
      preview.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (info) info.classList.add('hidden');
    showToast('ล้างไฟล์ตรายางเรียบร้อย', 'info');
  }
}

function setCompanyPresetLogo(path, label) {
  applyCompanyImage('logo', path, label);
}

function onCompanyUrlManualInput(type, value) {
  const v = (value || '').trim();
  if (type === 'logo') {
    const preview = document.getElementById('companyLogoPreviewImg');
    const placeholder = document.getElementById('companyLogoPlaceholder');
    if (v) {
      if (preview) {
        preview.src = v;
        preview.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');
    }
  } else if (type === 'stamp') {
    const preview = document.getElementById('companyStampPreviewImg');
    const placeholder = document.getElementById('companyStampPlaceholder');
    if (v) {
      if (preview) {
        preview.src = v;
        preview.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');
    }
  }
}

// ----------------------------------------------------
// Master Modal: Add / Edit Record Handling
// ----------------------------------------------------

function closeMasterModal() {
  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.add('hidden');
}

async function openCreateMasterRecordModal(prefillData = null) {
  const recordIdInput = document.getElementById('masterFormRecordId');
  const title = document.getElementById('masterModalTitle');
  const subtitle = document.getElementById('masterModalSubtitle');
  const container = document.getElementById('masterFormFieldsContainer');

  if (recordIdInput) recordIdInput.value = '';
  if (title) {
    if (activeMasterTable === 'orgunit') {
      title.textContent = 'เพิ่มหน่วยงานใหม่ (Organization Unit)';
    } else if (activeMasterTable === 'position') {
      title.textContent = 'เพิ่มตำแหน่งงานใหม่ (Position)';
    } else if (activeMasterTable === 'job') {
      title.textContent = 'เพิ่มลักษณะงานใหม่ (Job)';
    } else {
      title.textContent = `เพิ่มข้อมูลใหม่: ตาราง ${activeMasterTable.toUpperCase()}`;
    }
  }
  if (subtitle) {
    subtitle.textContent = prefillData && prefillData._contextTitle
      ? prefillData._contextTitle
      : `กรอกข้อมูลเพื่อบันทึกลงในฐานข้อมูลระบบ`;
  }

  if (container) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">กำลังเตรียมฟอร์มและดึงข้อมูลตารางที่สัมพันธ์...</div>`;
  }

  const modal = document.getElementById('modalMasterForm');
  if (modal) modal.classList.remove('hidden');

  await renderMasterFormFields(container, activeMasterTable, prefillData);
}

async function openEditMasterRecordModal(id, directRecord = null) {
  let record = directRecord || (masterTableRawData ? masterTableRawData.find((r) => r.id === id) : null);
  if (!record && id) {
    try {
      const res = await api.masterTable.findOne(activeMasterTable, id);
      if (res) {
        record = res.data ? res.data : (res.id ? res : null);
      }
    } catch (err) {
      console.warn('Could not fetch single record by id:', err);
    }
  }

  if (!record) {
    showToast('ไม่พบข้อมูลรายการที่ต้องการแก้ไข', 'error');
    return;
  }

  const recordIdInput = document.getElementById('masterFormRecordId');
  const title = document.getElementById('masterModalTitle');
  const subtitle = document.getElementById('masterModalSubtitle');
  const container = document.getElementById('masterFormFieldsContainer');

  if (recordIdInput) recordIdInput.value = id;
  if (title) {
    if (activeMasterTable === 'orgunit') {
      title.textContent = `แก้ไขหน่วยงาน: ${record.name || record.code}`;
    } else if (activeMasterTable === 'position') {
      title.textContent = `แก้ไขตำแหน่งงาน: ${record.title || record.code}`;
    } else if (activeMasterTable === 'job') {
      title.textContent = `แก้ไขลักษณะงาน: ${record.titleTh || record.code}`;
    } else {
      title.textContent = `แก้ไขข้อมูล: ตาราง ${activeMasterTable.toUpperCase()}`;
    }
  }
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
      const currentLogo = existing && existing.logoUrl ? existing.logoUrl : '/assets/logo/logo.jpg';
      const currentStamp = existing && existing.stampUrl ? existing.stampUrl : '';

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

        <!-- ส่วนที่ 5: อัตลักษณ์องค์กรและตรายาง -->
        <div class="border-b border-slate-200 pb-3">
          <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>5. อัตลักษณ์องค์กรและตรายาง (Corporate Identity & Stamp)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
            <!-- 5.1 โลโก้บริษัท (Company Logo) -->
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-800">
                  ไฟล์โลโก้บริษัท (Company Logo)
                </label>
                <span id="companyLogoFileInfo" class="text-[10px] text-blue-600 font-medium truncate max-w-[140px] hidden"></span>
              </div>

              <!-- Preview Area -->
              <div class="flex items-center space-x-3 bg-white p-2.5 rounded border border-slate-200">
                <div class="w-20 h-16 bg-slate-50 border border-slate-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                  <img id="companyLogoPreviewImg" src="${currentLogo}" alt="Logo Preview" class="${currentLogo ? '' : 'hidden'} max-w-full max-h-full object-contain p-1">
                  <div id="companyLogoPlaceholder" class="${currentLogo ? 'hidden' : ''} text-center text-slate-300">
                    <svg class="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span class="text-[9px] block">ไม่มีโลโก้</span>
                  </div>
                </div>

                <div class="flex-1 space-y-1.5 min-w-0">
                  <div class="flex flex-wrap gap-1.5">
                    <input type="file" id="f_company_logoFile" accept="image/*" class="hidden" onchange="handleCompanyImageUpload('logo', event)">
                    <button type="button" onclick="document.getElementById('f_company_logoFile').click()" class="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                      <span>${isEdit ? 'เปลี่ยนไฟล์รูปภาพ' : 'เลือกไฟล์รูปภาพ'}</span>
                    </button>
                    <button type="button" onclick="clearCompanyImage('logo')" class="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 cursor-pointer">
                      ล้างรูป
                    </button>
                  </div>
                  <div class="flex items-center space-x-1.5 text-[10px] text-slate-500">
                    <span>หรือเลือกพรีเซ็ต:</span>
                    <button type="button" onclick="setCompanyPresetLogo('/assets/logo/logo.jpg', 'logo.jpg')" class="text-blue-600 hover:underline cursor-pointer">ทั่วไป</button>
                    <span>|</span>
                    <button type="button" onclick="setCompanyPresetLogo('/assets/logo/pylon-logo.jpg', 'pylon-logo.jpg')" class="text-blue-600 hover:underline cursor-pointer">PYLON</button>
                  </div>
                </div>
              </div>

              <!-- Manual URL or Path -->
              <div>
                <label class="block text-[10px] text-slate-500 mb-0.5">URL หรือที่อยู่ไฟล์โลโก้:</label>
                <input 
                  type="text" 
                  id="f_company_logoUrl" 
                  value="${currentLogo}" 
                  placeholder="/assets/logo/logo.jpg หรือ Data URL" 
                  oninput="onCompanyUrlManualInput('logo', this.value)"
                  class="w-full px-2.5 py-1 rounded border border-slate-300 text-[11px] font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                >
              </div>
            </div>

            <!-- 5.2 ตรายางบริษัท (Company Stamp) -->
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-800">
                  ไฟล์ตรายางประทับ (Corporate Stamp)
                </label>
                <span id="companyStampFileInfo" class="text-[10px] text-blue-600 font-medium truncate max-w-[140px] hidden"></span>
              </div>

              <!-- Preview Area -->
              <div class="flex items-center space-x-3 bg-white p-2.5 rounded border border-slate-200">
                <div class="w-20 h-16 bg-slate-50 border border-slate-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                  <img id="companyStampPreviewImg" src="${currentStamp}" alt="Stamp Preview" class="${currentStamp ? '' : 'hidden'} max-w-full max-h-full object-contain p-1">
                  <div id="companyStampPlaceholder" class="${currentStamp ? 'hidden' : ''} text-center text-slate-300">
                    <svg class="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    <span class="text-[9px] block">ไม่มีตรายาง</span>
                  </div>
                </div>

                <div class="flex-1 space-y-1.5 min-w-0">
                  <div class="flex flex-wrap gap-1.5">
                    <input type="file" id="f_company_stampFile" accept="image/*" class="hidden" onchange="handleCompanyImageUpload('stamp', event)">
                    <button type="button" onclick="document.getElementById('f_company_stampFile').click()" class="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                      <span>${isEdit ? 'เปลี่ยนไฟล์ตรายาง' : 'เลือกไฟล์ตรายาง'}</span>
                    </button>
                    <button type="button" onclick="clearCompanyImage('stamp')" class="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 cursor-pointer">
                      ล้างรูป
                    </button>
                  </div>
                  <p class="text-[10px] text-slate-500">แนะนำไฟล์ PNG พื้นหลังโปร่งใส</p>
                </div>
              </div>

              <!-- Manual URL or Path -->
              <div>
                <label class="block text-[10px] text-slate-500 mb-0.5">URL หรือที่อยู่ไฟล์ตรายาง:</label>
                <input 
                  type="text" 
                  id="f_company_stampUrl" 
                  value="${currentStamp}" 
                  placeholder="เช่น /assets/stamp/stamp.png หรือ Data URL" 
                  oninput="onCompanyUrlManualInput('stamp', this.value)"
                  class="w-full px-2.5 py-1 rounded border border-slate-300 text-[11px] font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                >
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ข้อความท้ายเอกสาร (Document Footer Notice)</label>
            <input type="text" id="f_company_docFooterNotice" value="${existing && existing.docFooterNotice ? existing.docFooterNotice : ''}" placeholder="เช่น เอกสารนี้ออกโดยระบบอัตโนมัติ ULTRON Core System" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none">
          </div>
          <div class="flex items-center space-x-6 pt-2">
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

      // ดึงข้อมูลตำแหน่งงานจากตาราง Position ที่สัมพันธ์กัน
      let positionOptions = [{ value: '', label: '-- ไม่ระบุตำแหน่งงาน (Unassigned) --' }];
      try {
        const posRes = await api.masterTable.findAll('position', { limit: 200 });
        (posRes && posRes.data ? posRes.data : []).forEach((p) => {
          positionOptions.push({
            value: p.id,
            label: `${p.title} (${p.code})`,
            sublabel: p.orgUnit ? `หน่วยงาน: ${p.orgUnit.name}` : 'ระดับบริษัท (CEO/Board)',
          });
        });
      } catch (e) {
        console.warn('Could not fetch positions lookup:', e);
      }

      const currentGroups = existing && existing.groups ? existing.groups : ['GENERAL_USER'];
      const currentPosId = existing && existing.positionId ? existing.positionId : '';

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

        <!-- ความสัมพันธ์: ตาราง Position (ตำแหน่งงาน) -->
        <div class="searchable-combobox relative" id="combo_user_position">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            ตำแหน่งงาน (Position) <span class="text-blue-700 font-mono font-normal">(ดึงจากตาราง Position)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_user_positionId" value="${currentPosId}">
            <input 
              type="text" 
              id="f_user_positionId_search" 
              autocomplete="off"
              placeholder="เลือกตำแหน่งงานในโครงสร้างองค์กร..."
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_user_position')"
              oninput="filterCombobox('combo_user_position', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_user_position')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_user_position_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
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

      initCombobox('combo_user_position', {
        hiddenInputId: 'f_user_positionId',
        searchInputId: 'f_user_positionId_search',
        dropdownId: 'combo_user_position_dropdown',
        items: positionOptions,
        selectedValue: currentPosId,
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

    case 'menu': {
      let parentOptions = [{ value: '', label: '(ไม่มี - กำหนดเป็นเมนูหลัก Top Level)', sublabel: '' }];
      let permOptions = [{ value: '', label: '(ไม่มีสิทธิ์เฉพาะ - ผู้ใช้งานทุกคนเข้าถึงได้)', sublabel: '' }];

      try {
        const [menusRes, permsRes] = await Promise.all([
          api.masterTable.findAll('menu', { limit: 100 }),
          api.masterTable.findAll('permission', { limit: 100 }),
        ]);

        if (menusRes && menusRes.data) {
          menusRes.data
            .filter((m) => !existing || m.id !== existing.id)
            .filter((m) => !m.parentId)
            .forEach((m) => {
              parentOptions.push({
                value: m.id,
                label: m.label,
                sublabel: `Code: ${m.code}`,
              });
            });
        }

        if (permsRes && permsRes.data) {
          permsRes.data.forEach((p) => {
            permOptions.push({
              value: p.id,
              label: p.code,
              sublabel: p.description || '',
            });
          });
        }
      } catch (e) {
        console.warn('Could not fetch menu lookup relations:', e);
      }

      const defaultParentId = existing && existing.parentId ? existing.parentId : '';
      const defaultPermId = existing && existing.permissionId ? existing.permissionId : '';
      const isEdit = Boolean(existing);

      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสเมนู (Menu Code) *</label>
            <input 
              type="text" 
              id="f_menu_code" 
              required 
              ${isEdit ? 'readonly disabled' : ''} 
              value="${existing ? existing.code : ''}" 
              placeholder="เช่น reports, inventory, settings" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อเมนูแสดงผล (Label) *</label>
            <input 
              type="text" 
              id="f_menu_label" 
              required 
              value="${existing ? existing.label : ''}" 
              placeholder="เช่น รายงานสรุป (Reports)" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ลำดับการแสดงผล (Order)</label>
            <input 
              type="number" 
              id="f_menu_order" 
              value="${existing ? existing.order : 10}" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">SVG Icon (Markup หรือชื่อไอคอน)</label>
            <input 
              type="text" 
              id="f_menu_icon" 
              value="${existing && existing.icon ? existing.icon.replace(/"/g, '&quot;') : ''}" 
              placeholder="เว้นว่างได้ หรือใส่ SVG Markup" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
        </div>

        <!-- ความสัมพันธ์: เมนูหลัก (Parent Menu) -->
        <div class="searchable-combobox relative" id="combo_menu_parent">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            เมนูหลัก (Parent Menu) <span class="text-blue-700 font-mono font-normal">(เลือกเมื่อเป็นเมนูย่อย)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_menu_parentId" value="${defaultParentId}">
            <input 
              type="text" 
              id="f_menu_parentId_search" 
              autocomplete="off"
              placeholder="เลือกเมนูหลัก หรือเว้นว่างให้เป็นเมนูระดับบนสุด..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_menu_parent')"
              oninput="filterCombobox('combo_menu_parent', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_menu_parent')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_menu_parent_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- ความสัมพันธ์: สิทธิ์การใช้งาน (Permission Binding) -->
        <div class="searchable-combobox relative" id="combo_menu_perm">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            สิทธิ์การใช้งานที่จำเป็น (Required Permission) <span class="text-blue-700 font-mono font-normal">(ผูกกับตาราง Permission)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_menu_permissionId" value="${defaultPermId}">
            <input 
              type="text" 
              id="f_menu_permissionId_search" 
              autocomplete="off"
              placeholder="ค้นหารหัสสิทธิ์จากฐานข้อมูล..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_menu_perm')"
              oninput="filterCombobox('combo_menu_perm', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_menu_perm')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_menu_perm_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- สถานะและการจำกัดสิทธิ์ -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" id="f_menu_isActive" ${!existing || existing.isActive !== false ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-slate-900 border-slate-300">
            <span class="text-xs font-semibold text-slate-800">เปิดใช้งานเมนูนี้ในระบบ (Active)</span>
          </label>
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" id="f_menu_adminOnly" ${existing && existing.adminOnly ? 'checked' : ''} class="w-4 h-4 rounded text-purple-600 focus:ring-slate-900 border-slate-300">
            <span class="text-xs font-medium text-slate-700">จำกัดให้เฉพาะกลุ่ม SUPER_ADMIN เท่านั้น (Admin Only)</span>
          </label>
        </div>
      `;

      initCombobox('combo_menu_parent', {
        hiddenInputId: 'f_menu_parentId',
        searchInputId: 'f_menu_parentId_search',
        dropdownId: 'combo_menu_parent_dropdown',
        items: parentOptions,
        selectedValue: defaultParentId,
      });

      initCombobox('combo_menu_perm', {
        hiddenInputId: 'f_menu_permissionId',
        searchInputId: 'f_menu_permissionId_search',
        dropdownId: 'combo_menu_perm_dropdown',
        items: permOptions,
        selectedValue: defaultPermId,
      });
      break;
    }

    case 'orgunit': {
      let companyOptions = [];
      try {
        const compRes = await api.masterTable.findAll('company', { limit: 100 });
        companyOptions = (compRes && compRes.data ? compRes.data : []).map((c) => ({
          value: c.id,
          label: `${c.nameTh} (${c.branchName || 'สำนักงานใหญ่'})`,
          sublabel: `Tax ID: ${c.taxId}`,
        }));
      } catch (e) {
        console.warn('Could not fetch company options:', e);
      }
      const defaultCompanyId = existing && existing.companyId ? existing.companyId : (companyOptions[0] ? companyOptions[0].value : '');

      let parentUnitOptions = [{ value: '', label: '-- ระดับบนสุด (ไม่มีหน่วยงานหลัก / Root Unit) --' }];
      try {
        const unitsRes = await api.masterTable.findAll('orgunit', { limit: 200 });
        const allUnits = unitsRes && unitsRes.data ? unitsRes.data : [];
        window._cachedOrgUnits = allUnits;
        allUnits
          .filter((u) => !existing || !existing.id || u.id !== existing.id)
          .forEach((u) => {
            parentUnitOptions.push({
              value: u.id,
              label: `${u.name} (${u.code})`,
              sublabel: `ประเภท: ${u.type}`,
            });
          });
      } catch (e) {
        console.warn('Could not fetch parent org unit options:', e);
      }
      const defaultParentUnitId = existing && existing.parentId ? existing.parentId : '';
      const unitType = existing && existing.type ? existing.type : 'DEPARTMENT';
      const isCreateMode = !existing || !existing.id;
      const initialCode = isCreateMode
        ? (existing && existing.code ? existing.code : generateSmartOrgUnitCode(unitType, window._cachedOrgUnits || []))
        : existing.code;

      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-slate-700">รหัสหน่วยงาน (Code) <span class="text-rose-500">*</span></label>
              ${isCreateMode ? `
                <button 
                  type="button" 
                  onclick="triggerSmartCodeGeneration('orgunit')" 
                  class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center space-x-1"
                  title="คำนวณรหัสถัดไปอัตโนมัติตามประเภทหน่วยงาน"
                >
                  <svg class="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span>สร้างรหัสอัตโนมัติ</span>
                </button>
              ` : ''}
            </div>
            <input 
              type="text" 
              id="f_orgunit_code" 
              value="${initialCode}" 
              ${!isCreateMode ? 'readonly' : 'required'}
              placeholder="เช่น BR-03, DIV-HR, DEP-IT" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 outline-none ${!isCreateMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white font-bold text-slate-900'}"
            >
            <!-- Suggestions & Helper Pills -->
            ${isCreateMode ? `
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span class="text-slate-400">แนะนำ:</span>
                <div id="orgunit_code_pills" class="flex flex-wrap gap-1"></div>
              </div>
            ` : ''}
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ประเภทหน่วยงาน (Type) <span class="text-rose-500">*</span></label>
            <select 
              id="f_orgunit_type" 
              onchange="handleOrgUnitTypeChange(event)"
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
            >
              <option value="BRANCH" ${unitType === 'BRANCH' ? 'selected' : ''}>สาขา (BRANCH)</option>
              <option value="DIVISION" ${unitType === 'DIVISION' ? 'selected' : ''}>ฝ่าย (DIVISION)</option>
              <option value="DEPARTMENT" ${unitType === 'DEPARTMENT' ? 'selected' : ''}>แผนก (DEPARTMENT)</option>
              <option value="SECTION" ${unitType === 'SECTION' ? 'selected' : ''}>ส่วนงาน (SECTION)</option>
              <option value="TEAM" ${unitType === 'TEAM' ? 'selected' : ''}>ทีมงาน (TEAM)</option>
            </select>
          </div>
        </div>

        <!-- Code Guidance Banner -->
        ${isCreateMode ? `
          <div id="orgunit_code_guidance_card" class="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200/80 text-[11px] text-blue-950 space-y-1">
            <div class="flex items-center space-x-1.5 font-bold">
              <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>
              <span id="orgunit_guidance_title">หลักการตั้งรหัส: [คำนำหน้า]-[ตัวย่อภาษาอังกฤษ 2-4 ตัว หรือลำดับเลข]</span>
            </div>
            <div id="orgunit_guidance_desc" class="text-slate-600 pl-5 text-[10px] leading-relaxed">
              • สาขา (BRANCH): ใช้รหัสขึ้นต้น <b>BR-</b> เช่น BR-HQ, BR-CNX, BR-03<br>
              • ฝ่าย (DIVISION): ใช้รหัสขึ้นต้น <b>DIV-</b> เช่น DIV-ACC, DIV-ENG, DIV-HR<br>
              • แผนก (DEPARTMENT): ใช้รหัสขึ้นต้น <b>DEP-</b> เช่น DEP-ACC, DEP-FIN, DEP-IT
            </div>
          </div>
        ` : ''}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อภาษาไทย (Name TH) <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              id="f_orgunit_name" 
              value="${existing && existing.id ? existing.name : ''}" 
              required
              placeholder="เช่น ฝ่ายบัญชีและการเงิน, แผนกบัญชี" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อภาษาอังกฤษ (Name EN)</label>
            <input 
              type="text" 
              id="f_orgunit_nameEn" 
              value="${existing && existing.nameEn ? existing.nameEn : ''}" 
              placeholder="เช่น Accounting & Finance Division" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
        </div>

        <!-- บริษัทที่สังกัด -->
        <div class="searchable-combobox relative" id="combo_orgunit_company">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            บริษัทที่สังกัด (Company) <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_orgunit_companyId" value="${defaultCompanyId}">
            <input 
              type="text" 
              id="f_orgunit_companyId_search" 
              autocomplete="off"
              placeholder="ค้นหาบริษัท..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_orgunit_company')"
              oninput="filterCombobox('combo_orgunit_company', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_orgunit_company')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_orgunit_company_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- สังกัดหน่วยงานหลัก (Parent Unit) -->
        <div class="searchable-combobox relative" id="combo_orgunit_parent">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            สังกัดหน่วยงานหลัก (Parent Unit) <span class="text-blue-700 font-mono font-normal">(เว้นว่างหากเป็นหน่วยงานระดับบนสุด)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_orgunit_parentId" value="${defaultParentUnitId}">
            <input 
              type="text" 
              id="f_orgunit_parentId_search" 
              autocomplete="off"
              placeholder="เลือกหน่วยงานหลัก เช่น ฝ่ายบัญชี หรือเว้นว่างให้เป็น Root..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_orgunit_parent')"
              oninput="filterCombobox('combo_orgunit_parent', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_orgunit_parent')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_orgunit_parent_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ลำดับการแสดงผล (Order)</label>
            <input 
              type="number" 
              id="f_orgunit_order" 
              value="${existing ? existing.order : 1}" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายเพิ่มเติม</label>
            <input 
              type="text" 
              id="f_orgunit_description" 
              value="${existing && existing.description ? existing.description : ''}" 
              placeholder="หน้าที่ความรับผิดชอบหลักของหน่วยงาน" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
        </div>

        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" id="f_orgunit_isActive" ${!existing || existing.isActive !== false ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-slate-900 border-slate-300">
            <span class="text-xs font-semibold text-slate-800">เปิดใช้งานหน่วยงานนี้ในระบบ (Active)</span>
          </label>
        </div>
      `;

      initCombobox('combo_orgunit_company', {
        hiddenInputId: 'f_orgunit_companyId',
        searchInputId: 'f_orgunit_companyId_search',
        dropdownId: 'combo_orgunit_company_dropdown',
        items: companyOptions,
        selectedValue: defaultCompanyId,
      });

      initCombobox('combo_orgunit_parent', {
        hiddenInputId: 'f_orgunit_parentId',
        searchInputId: 'f_orgunit_parentId_search',
        dropdownId: 'combo_orgunit_parent_dropdown',
        items: parentUnitOptions,
        selectedValue: defaultParentUnitId,
      });

      if (isCreateMode) {
        updateOrgUnitCodePills(unitType, allUnits);
      }
      break;
    }

    case 'job': {
      const jobLevel = existing ? existing.level : 'OFFICER';
      const existingTitle = existing ? (existing.title || existing.titleTh || '') : '';
      const existingSummary = existing ? (existing.summary || existing.description || '') : '';
      const existingResp = existing ? (existing.responsibilities || existing.description || '') : '';
      const existingQual = existing && existing.qualifications ? existing.qualifications : '';

      container.innerHTML = `
        <!-- ISO 9001 Quality Notice Banner -->
        <div class="bg-indigo-50/70 p-3 rounded-lg border border-indigo-200/80 text-xs text-indigo-950 flex items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <div>
              <span class="font-bold">ข้อมูลกำหนดลักษณะงานมาตรฐาน (ISO 9001:2015 Clause 7.2 Competence)</span>
              <p class="text-[11px] text-slate-600 mt-0.5">ข้อมูลในฟอร์มนี้จะถูกแปลงเป็นแบบฟอร์มเอกสารควบคุมคุณภาพ พร้อมพิมพ์/ส่งออกรองรับการตรวจสอบโดยผู้ตรวจประเมินภายนอก (External Audit)</p>
            </div>
          </div>
          ${existing && existing.id ? `
            <button 
              type="button" 
              onclick="openJobPrintPreview('${existing.id}')" 
              class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1 flex-shrink-0 cursor-pointer shadow-xs"
              title="ดูตัวอย่างแบบฟอร์มเอกสาร ISO และสั่งพิมพ์"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              <span>ดูเอกสาร ISO</span>
            </button>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสลักษณะงาน (Job Code) <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              id="f_job_code" 
              value="${existing && existing.id ? existing.code : (existing && existing.code ? existing.code : '')}" 
              ${existing && existing.id ? 'readonly' : 'required'}
              placeholder="เช่น JOB-CEO, JOB-DIV-MGR, JOB-OFFICER" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 outline-none ${existing && existing.id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white font-bold text-slate-900'}"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ระดับตำแหน่งงาน (Job Level) <span class="text-rose-500">*</span></label>
            <select id="f_job_level" class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer">
              <option value="EXECUTIVE" ${jobLevel === 'EXECUTIVE' || jobLevel === 10 || jobLevel === '10' ? 'selected' : ''}>ผู้บริหารระดับสูง (EXECUTIVE)</option>
              <option value="MANAGER" ${jobLevel === 'MANAGER' || jobLevel === 8 || jobLevel === 7 || jobLevel === '8' || jobLevel === '7' ? 'selected' : ''}>ผู้จัดการ (MANAGER)</option>
              <option value="SUPERVISOR" ${jobLevel === 'SUPERVISOR' || jobLevel === 5 || jobLevel === '5' ? 'selected' : ''}>หัวหน้างาน (SUPERVISOR)</option>
              <option value="SPECIALIST" ${jobLevel === 'SPECIALIST' || jobLevel === 4 || jobLevel === '4' ? 'selected' : ''}>ผู้เชี่ยวชาญ (SPECIALIST)</option>
              <option value="OFFICER" ${jobLevel === 'OFFICER' || jobLevel === 2 || jobLevel === '2' ? 'selected' : ''}>เจ้าหน้าที่ (OFFICER)</option>
              <option value="OPERATIONAL" ${jobLevel === 'OPERATIONAL' || jobLevel === 1 || jobLevel === '1' ? 'selected' : ''}>ปฏิบัติการ (OPERATIONAL)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อลักษณะงานภาษาไทย (Job Title TH) <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              id="f_job_titleTh" 
              value="${existingTitle}" 
              required
              placeholder="เช่น ผู้จัดการฝ่าย, เจ้าหน้าที่บัญชี" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อลักษณะงานภาษาอังกฤษ (Job Title EN)</label>
            <input 
              type="text" 
              id="f_job_titleEn" 
              value="${existing && existing.titleEn ? existing.titleEn : ''}" 
              placeholder="เช่น Division Manager, Accountant" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            วัตถุประสงค์หลักของตำแหน่งงาน (Job Purpose / Objective)
            <span class="text-[10px] text-slate-400 font-normal">บทบาทความสำคัญในระบบคุณภาพ</span>
          </label>
          <textarea 
            id="f_job_summary" 
            rows="2" 
            placeholder="สรุปวัตถุประสงค์และเป้าหมายหลักของการมีตำแหน่งนี้ในระบบบริหารคุณภาพ..." 
            class="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white leading-relaxed"
          >${existingSummary}</textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            หน้าที่และความรับผิดชอบหลักตามระบบ ISO (Key Responsibilities & Scope of Work) <span class="text-rose-500">*</span>
            <span class="text-[10px] text-slate-400 font-normal">แยกเป็นข้อๆ เช่น 1. 2. 3.</span>
          </label>
          <textarea 
            id="f_job_responsibilities" 
            rows="4" 
            placeholder="1. ปฏิบัติงานตามขั้นตอนการปฏิบัติงาน (SOP/WI) ที่กำหนด&#10;2. ตรวจสอบความถูกต้องและจัดทำเอกสารคุณภาพตามมาตรฐาน ISO 9001&#10;3. รายงานผลการดำเนินงานและข้อบกพร่องต่อผู้บังคับบัญชา..." 
            class="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white font-sans leading-relaxed"
          >${existingResp}</textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            คุณสมบัติและความสามารถประจำตำแหน่ง (Job Specification & Competencies - ISO 7.2)
            <span class="text-[10px] text-slate-400 font-normal">วุฒิการศึกษา, ประสบการณ์, ทักษะ, และการฝึกอบรม</span>
          </label>
          <textarea 
            id="f_job_qualifications" 
            rows="3" 
            placeholder="• วุฒิการศึกษา: ปริญญาตรีขึ้นไปในสาขาที่เกี่ยวข้อง&#10;• ประสบการณ์: มีประสบการณ์ในสายงานอย่างน้อย 1-3 ปี&#10;• การฝึกอบรมตามมาตรฐาน ISO: ผ่านการฝึกอบรมข้อกำหนด ISO 9001:2015" 
            class="w-full px-3 py-2 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white font-sans leading-relaxed"
          >${existingQual}</textarea>
        </div>

        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" id="f_job_isActive" ${!existing || existing.isActive !== false ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-slate-900 border-slate-300">
            <span class="text-xs font-semibold text-slate-800">เปิดใช้งานลักษณะงานนี้ในระบบ (Active)</span>
          </label>
        </div>
      `;
      break;
    }

    case 'position': {
      let companyOptions = [];
      try {
        const compRes = await api.masterTable.findAll('company', { limit: 100 });
        companyOptions = (compRes && compRes.data ? compRes.data : []).map((c) => ({
          value: c.id,
          label: `${c.nameTh} (${c.branchName || 'สำนักงานใหญ่'})`,
          sublabel: `Tax ID: ${c.taxId}`,
        }));
      } catch (e) {
        console.warn('Could not fetch company options for position:', e);
      }
      const defaultCompanyId = existing && existing.companyId ? existing.companyId : (companyOptions[0] ? companyOptions[0].value : '');

      let unitOptions = [{ value: '', label: '-- ระดับองค์กร / บริษัท (Company Level เช่น CEO / บอร์ด) --' }];
      try {
        const unitsRes = await api.masterTable.findAll('orgunit', { limit: 200 });
        (unitsRes && unitsRes.data ? unitsRes.data : []).forEach((u) => {
          unitOptions.push({
            value: u.id,
            label: `${u.name} (${u.code})`,
            sublabel: `ประเภท: ${u.type}`,
          });
        });
      } catch (e) {
        console.warn('Could not fetch orgunit options for position:', e);
      }
      const defaultUnitId = existing && existing.orgUnitId ? existing.orgUnitId : '';

      let jobOptions = [];
      try {
        const jobsRes = await api.masterTable.findAll('job', { limit: 200 });
        jobOptions = (jobsRes && jobsRes.data ? jobsRes.data : []).map((j) => ({
          value: j.id,
          label: `${j.titleTh} (${j.code})`,
          sublabel: `ระดับ: ${j.level}`,
        }));
      } catch (e) {
        console.warn('Could not fetch job options for position:', e);
      }
      const defaultJobId = existing && existing.jobId ? existing.jobId : (jobOptions[0] ? jobOptions[0].value : '');

      let reportsToOptions = [{ value: '', label: '-- ไม่รายงานต่อตำแหน่งใด (Top Level / Board) --' }];
      try {
        const posRes = await api.masterTable.findAll('position', { limit: 200 });
        (posRes && posRes.data ? posRes.data : [])
          .filter((p) => !existing || !existing.id || p.id !== existing.id)
          .forEach((p) => {
            reportsToOptions.push({
              value: p.id,
              label: `${p.title} (${p.code})`,
              sublabel: p.orgUnit ? `หน่วยงาน: ${p.orgUnit.name}` : 'ระดับบริษัท',
            });
          });
      } catch (e) {
        console.warn('Could not fetch reports to options for position:', e);
      }
      const defaultReportsToId = existing && existing.reportsToId ? existing.reportsToId : '';

      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">รหัสตำแหน่ง (Position Code) <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              id="f_position_code" 
              value="${existing && existing.id ? existing.code : (existing && existing.code ? existing.code : '')}" 
              ${existing && existing.id ? 'readonly' : 'required'}
              placeholder="เช่น POS-CEO, POS-DIV-ACC-MGR" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono uppercase focus:ring-1 focus:ring-slate-900 outline-none ${existing && existing.id ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ชื่อตำแหน่งงานเฉพาะตัว (Position Title) <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              id="f_position_title" 
              value="${existing && existing.id ? existing.title : ''}" 
              required
              placeholder="เช่น ประธานเจ้าหน้าที่บริหาร, ผู้จัดการฝ่ายบัญชี" 
              class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-slate-900 outline-none bg-white"
            >
          </div>
        </div>

        <!-- ความสัมพันธ์: บริษัท -->
        <div class="searchable-combobox relative" id="combo_pos_company">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            บริษัท (Company) <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_position_companyId" value="${defaultCompanyId}">
            <input 
              type="text" 
              id="f_position_companyId_search" 
              autocomplete="off"
              placeholder="เลือกบริษัท..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_pos_company')"
              oninput="filterCombobox('combo_pos_company', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_pos_company')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_pos_company_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- ความสัมพันธ์: สังกัดหน่วยงาน (OrgUnit) -->
        <div class="searchable-combobox relative" id="combo_pos_orgUnit">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            สังกัดหน่วยงาน (OrgUnit) <span class="text-blue-700 font-mono font-normal">(เว้นว่างหากเป็นระดับบริษัท เช่น CEO/บอร์ด)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_position_orgUnitId" value="${defaultUnitId}">
            <input 
              type="text" 
              id="f_position_orgUnitId_search" 
              autocomplete="off"
              placeholder="เลือกหน่วยงานที่สังกัด หรือเว้นว่างให้เป็นระดับบริษัท..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_pos_orgUnit')"
              oninput="filterCombobox('combo_pos_orgUnit', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_pos_orgUnit')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_pos_orgUnit_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- ความสัมพันธ์: ลักษณะงาน (Job / JD) -->
        <div class="searchable-combobox relative" id="combo_pos_job">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            ลักษณะงานมาตรฐาน (Job Role / JD) <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_position_jobId" value="${defaultJobId}">
            <input 
              type="text" 
              id="f_position_jobId_search" 
              autocomplete="off"
              placeholder="ค้นหาลักษณะงานมาตรฐาน..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_pos_job')"
              oninput="filterCombobox('combo_pos_job', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_pos_job')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_pos_job_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- ความสัมพันธ์: รายงานตรงต่อ (Reports To) -->
        <div class="searchable-combobox relative" id="combo_pos_reportsTo">
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            ผู้บังคับบัญชา / รายงานตรงต่อ (Reports To) <span class="text-blue-700 font-mono font-normal">(ผูกกับตำแหน่งหัวหน้า)</span>
          </label>
          <div class="relative">
            <input type="hidden" id="f_position_reportsToId" value="${defaultReportsToId}">
            <input 
              type="text" 
              id="f_position_reportsToId_search" 
              autocomplete="off"
              placeholder="ค้นหาตำแหน่งผู้บังคับบัญชา หรือเว้นว่างหากเป็นผู้บริหารสูงสุด..." 
              class="w-full px-3 py-1.5 pr-8 rounded border border-slate-300 text-xs font-sans focus:ring-1 focus:ring-slate-900 outline-none bg-white cursor-pointer"
              onfocus="openCombobox('combo_pos_reportsTo')"
              oninput="filterCombobox('combo_pos_reportsTo', event)"
            />
            <button type="button" onclick="toggleCombobox('combo_pos_reportsTo')" class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div id="combo_pos_reportsTo_dropdown" class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border-2 border-slate-300 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-[100] divide-y divide-slate-100 text-xs ring-4 ring-slate-900/10"></div>
        </div>

        <!-- กรอบอัตรากำลัง (Manpower Headcount Quota) -->
        <div class="bg-blue-50/60 p-3 rounded-lg border border-blue-200">
          <div class="text-[11px] font-bold text-blue-900 mb-2 flex items-center space-x-1.5">
            <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <span>กรอบอัตรากำลังคน (Manpower Quota Planning)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">กรอบขั้นต่ำ / เป้าหมาย (Min Quota) <span class="text-rose-500">*</span></label>
              <input 
                type="number" 
                id="f_position_minHeadcount" 
                min="1" 
                value="${existing ? (existing.minHeadcount || 1) : 1}" 
                class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900 outline-none bg-white"
              >
              <p class="text-[10px] text-slate-500 mt-0.5">เช่น 1 คน หรือ 3 คน</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">กรอบสูงสุด (Max Quota) <span class="text-rose-500">*</span></label>
              <input 
                type="number" 
                id="f_position_maxHeadcount" 
                min="1" 
                value="${existing ? (existing.maxHeadcount || existing.minHeadcount || 1) : 1}" 
                class="w-full px-3 py-1.5 rounded border border-slate-300 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900 outline-none bg-white"
              >
              <p class="text-[10px] text-slate-500 mt-0.5">เช่น ใส่เท่ากัน (1-1) หรือใส่ช่วง (3-7)</p>
            </div>
          </div>
        </div>

        <!-- สถานะและสิทธิ -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" id="f_position_isUnitHead" ${existing && existing.isUnitHead ? 'checked' : ''} class="w-4 h-4 rounded text-amber-600 focus:ring-slate-900 border-slate-300">
            <span class="text-xs font-semibold text-slate-800">เป็นหัวหน้าหน่วยงานนี้ (Unit Head / ผู้มีอำนาจอนุมัติ)</span>
          </label>
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" id="f_position_isActive" ${!existing || existing.isActive !== false ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-slate-900 border-slate-300">
            <span class="text-xs font-medium text-slate-700">เปิดใช้งานตำแหน่งนี้ในระบบ (Active)</span>
          </label>
        </div>
      `;

      initCombobox('combo_pos_company', {
        hiddenInputId: 'f_position_companyId',
        searchInputId: 'f_position_companyId_search',
        dropdownId: 'combo_pos_company_dropdown',
        items: companyOptions,
        selectedValue: defaultCompanyId,
      });

      initCombobox('combo_pos_orgUnit', {
        hiddenInputId: 'f_position_orgUnitId',
        searchInputId: 'f_position_orgUnitId_search',
        dropdownId: 'combo_pos_orgUnit_dropdown',
        items: unitOptions,
        selectedValue: defaultUnitId,
      });

      initCombobox('combo_pos_job', {
        hiddenInputId: 'f_position_jobId',
        searchInputId: 'f_position_jobId_search',
        dropdownId: 'combo_pos_job_dropdown',
        items: jobOptions,
        selectedValue: defaultJobId,
      });

      initCombobox('combo_pos_reportsTo', {
        hiddenInputId: 'f_position_reportsToId',
        searchInputId: 'f_position_reportsToId_search',
        dropdownId: 'combo_pos_reportsTo_dropdown',
        items: reportsToOptions,
        selectedValue: defaultReportsToId,
      });
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
      const posId = document.getElementById('f_user_positionId')?.value;

      payload.username = u;
      if (p) payload.password = p;
      payload.employeeId = emp || null;
      payload.positionId = posId || null;
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

    case 'menu': {
      if (!recordId) {
        payload.code = document.getElementById('f_menu_code').value.trim();
      }
      payload.label = document.getElementById('f_menu_label').value.trim();
      payload.order = parseInt(document.getElementById('f_menu_order').value, 10) || 0;
      payload.icon = document.getElementById('f_menu_icon')?.value.trim() || null;
      payload.parentId = document.getElementById('f_menu_parentId')?.value || null;
      payload.permissionId = document.getElementById('f_menu_permissionId')?.value || null;
      payload.adminOnly = Boolean(document.getElementById('f_menu_adminOnly')?.checked);
      payload.isActive = Boolean(document.getElementById('f_menu_isActive')?.checked);
      break;
    }

    case 'orgunit': {
      if (!recordId) {
        payload.code = document.getElementById('f_orgunit_code').value.trim().toUpperCase();
      }
      payload.name = document.getElementById('f_orgunit_name').value.trim();
      payload.nameEn = document.getElementById('f_orgunit_nameEn')?.value.trim() || null;
      payload.type = document.getElementById('f_orgunit_type')?.value || 'DEPARTMENT';
      payload.companyId = document.getElementById('f_orgunit_companyId')?.value || null;
      payload.parentId = document.getElementById('f_orgunit_parentId')?.value || null;
      payload.order = parseInt(document.getElementById('f_orgunit_order')?.value, 10) || 0;
      payload.description = document.getElementById('f_orgunit_description')?.value.trim() || null;
      payload.isActive = Boolean(document.getElementById('f_orgunit_isActive')?.checked);
      break;
    }

    case 'job': {
      if (!recordId) {
        payload.code = document.getElementById('f_job_code').value.trim().toUpperCase();
      }
      payload.title = document.getElementById('f_job_titleTh').value.trim();
      payload.titleTh = payload.title;
      payload.titleEn = document.getElementById('f_job_titleEn')?.value.trim() || null;
      payload.level = document.getElementById('f_job_level')?.value || 'OFFICER';
      payload.summary = document.getElementById('f_job_summary')?.value.trim() || null;
      payload.responsibilities = document.getElementById('f_job_responsibilities')?.value.trim() || null;
      payload.qualifications = document.getElementById('f_job_qualifications')?.value.trim() || null;
      payload.isActive = Boolean(document.getElementById('f_job_isActive')?.checked);
      break;
    }

    case 'position': {
      if (!recordId) {
        payload.code = document.getElementById('f_position_code').value.trim().toUpperCase();
      }
      payload.title = document.getElementById('f_position_title').value.trim();
      payload.companyId = document.getElementById('f_position_companyId')?.value;
      payload.orgUnitId = document.getElementById('f_position_orgUnitId')?.value || null;
      payload.jobId = document.getElementById('f_position_jobId')?.value;
      payload.reportsToId = document.getElementById('f_position_reportsToId')?.value || null;
      payload.minHeadcount = parseInt(document.getElementById('f_position_minHeadcount')?.value, 10) || 1;
      payload.maxHeadcount = parseInt(document.getElementById('f_position_maxHeadcount')?.value, 10) || payload.minHeadcount;
      payload.isUnitHead = Boolean(document.getElementById('f_position_isUnitHead')?.checked);
      payload.isActive = Boolean(document.getElementById('f_position_isActive')?.checked);
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

    if (activeMasterTable === 'menu' && typeof loadDynamicMenus === 'function' && typeof renderSidebarMenu === 'function' && currentUser) {
      await loadDynamicMenus();
      renderSidebarMenu(currentUser);
    }

    if (activeMasterTable === 'company' && typeof initCorporateBranding === 'function') {
      await initCorporateBranding();
    }

    if (['orgunit', 'job', 'position'].includes(activeMasterTable) && typeof loadOrgChartData === 'function') {
      loadOrgChartData();
    }
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

    if (activeMasterTable === 'menu' && typeof loadDynamicMenus === 'function' && typeof renderSidebarMenu === 'function' && currentUser) {
      await loadDynamicMenus();
      renderSidebarMenu(currentUser);
    }

    if (activeMasterTable === 'company' && typeof initCorporateBranding === 'function') {
      await initCorporateBranding();
    }

    if (['orgunit', 'job', 'position'].includes(activeMasterTable) && typeof loadOrgChartData === 'function') {
      loadOrgChartData();
    }
  } catch (err) {
    console.error('Delete master record failed:', err);
    showToast(err.message || 'ลบข้อมูลไม่สำเร็จ อาจมีข้อมูลอื่นอ้างอิงอยู่', 'error');
  }
}

// --------------------------------------------------------------------------
// Smart Code Generator & Guidance Helpers (OrgUnit & Position)
// --------------------------------------------------------------------------
function generateSmartOrgUnitCode(type, existingUnits = []) {
  const prefixMap = {
    BRANCH: 'BR',
    DIVISION: 'DIV',
    DEPARTMENT: 'DEP',
    SECTION: 'SEC',
    TEAM: 'TEAM',
  };
  const prefix = prefixMap[type] || 'ORG';

  const matchingCodes = (existingUnits || [])
    .map((u) => (u.code || '').toUpperCase().trim())
    .filter((c) => c.startsWith(prefix + '-'));

  let seq = 1;
  while (matchingCodes.includes(`${prefix}-${String(seq).padStart(2, '0')}`)) {
    seq++;
  }
  return `${prefix}-${String(seq).padStart(2, '0')}`;
}

function getOrgUnitCodeSuggestions(type, existingUnits = []) {
  const nextSeq = generateSmartOrgUnitCode(type, existingUnits);
  const presets = {
    BRANCH: [nextSeq, 'BR-BKK', 'BR-RAYONG', 'BR-EAST', 'BR-SOUTH', 'BR-HQ2'],
    DIVISION: [nextSeq, 'DIV-HR', 'DIV-MKT', 'DIV-OPS', 'DIV-IT', 'DIV-LEGAL'],
    DEPARTMENT: [nextSeq, 'DEP-IT', 'DEP-QA', 'DEP-HRD', 'DEP-SALES', 'DEP-LOGIS'],
    SECTION: [nextSeq, 'SEC-TAX', 'SEC-PAYROLL', 'SEC-MAINT', 'SEC-SUPPORT'],
    TEAM: [nextSeq, 'TEAM-QA', 'TEAM-DEV', 'TEAM-FRONT', 'TEAM-BACK'],
  };
  const list = presets[type] || [nextSeq];
  const existingCodes = (existingUnits || []).map((u) => (u.code || '').toUpperCase().trim());
  return list.filter((c) => !existingCodes.includes(c)).slice(0, 4);
}

function updateOrgUnitCodePills(type, allUnits) {
  const container = document.getElementById('orgunit_code_pills');
  const titleEl = document.getElementById('orgunit_guidance_title');
  const descEl = document.getElementById('orgunit_guidance_desc');
  if (!container) return;

  const suggestions = getOrgUnitCodeSuggestions(type, allUnits);
  container.innerHTML = suggestions
    .map(
      (code) => `
      <button 
        type="button" 
        onclick="selectSuggestedCode('${code}')" 
        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer shadow-2xs hover:border-blue-400 transition-colors"
        title="คลิกเพื่อใช้รหัส ${code}"
      >
        ${code}
      </button>
    `,
    )
    .join('');

  if (titleEl && descEl) {
    const rules = {
      BRANCH: {
        title: 'หลักการตั้งรหัสสาขา: นำหน้าด้วย BR- ตามด้วยตัวย่อพื้นที่หรือเลขลำดับ',
        desc: 'ตัวอย่าง: <b>BR-HQ</b> (สำนักงานใหญ่), <b>BR-CNX</b> (เชียงใหม่), <b>BR-03</b>, <b>BR-RAYONG</b>',
      },
      DIVISION: {
        title: 'หลักการตั้งรหัสฝ่าย: นำหน้าด้วย DIV- ตามด้วยตัวย่อสายงาน',
        desc: 'ตัวอย่าง: <b>DIV-ACC</b> (บัญชีการเงิน), <b>DIV-ENG</b> (วิศวกรรม), <b>DIV-HR</b> (บุคคล), <b>DIV-MKT</b> (การตลาด)',
      },
      DEPARTMENT: {
        title: 'หลักการตั้งรหัสแผนก: นำหน้าด้วย DEP- ตามด้วยตัวย่อแผนก',
        desc: 'ตัวอย่าง: <b>DEP-ACC</b> (บัญชี), <b>DEP-FIN</b> (การเงิน), <b>DEP-STRUCT</b> (ฐานราก), <b>DEP-IT</b> (สารสนเทศ)',
      },
      SECTION: {
        title: 'หลักการตั้งรหัสส่วนงาน: นำหน้าด้วย SEC- ตามด้วยตัวย่องาน',
        desc: 'ตัวอย่าง: <b>SEC-TAX</b> (ภาษี), <b>SEC-PAYROLL</b> (เงินเดือน), <b>SEC-SAFETY</b> (ความปลอดภัย)',
      },
      TEAM: {
        title: 'หลักการตั้งรหัสทีมงาน: นำหน้าด้วย TEAM- ตามด้วยชื่องาน',
        desc: 'ตัวอย่าง: <b>TEAM-QA</b> (ทดสอบระบบ), <b>TEAM-DEV</b> (พัฒนาโปรแกรม), <b>TEAM-01</b>',
      },
    };
    const r = rules[type] || rules.DEPARTMENT;
    titleEl.innerHTML = r.title;
    descEl.innerHTML = r.desc;
  }
}

function selectSuggestedCode(code) {
  const codeInput = document.getElementById('f_orgunit_code');
  if (codeInput) {
    codeInput.value = code;
    codeInput.classList.add('ring-2', 'ring-blue-400');
    setTimeout(() => codeInput.classList.remove('ring-2', 'ring-blue-400'), 500);
  }
}

function handleOrgUnitTypeChange(event) {
  const newType = event.target.value;
  const allUnits = window._cachedOrgUnits || [];
  updateOrgUnitCodePills(newType, allUnits);

  const codeInput = document.getElementById('f_orgunit_code');
  if (codeInput && !codeInput.readOnly) {
    const smartCode = generateSmartOrgUnitCode(newType, allUnits);
    codeInput.value = smartCode;
  }
}

function triggerSmartCodeGeneration(target) {
  if (target === 'orgunit') {
    const type = document.getElementById('f_orgunit_type')?.value || 'DEPARTMENT';
    const allUnits = window._cachedOrgUnits || [];
    const smartCode = generateSmartOrgUnitCode(type, allUnits);
    selectSuggestedCode(smartCode);
  }
}
