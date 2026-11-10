/**
 * ULTRON MasterData Management Engine
 * All Tables Management, Searchable Comboboxes, and CRUD Operations
 */

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
