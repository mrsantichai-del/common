/**
 * ULTRON Formal ISO 9001 Job Description Document Print & Export Engine
 * ISO 9001:2015 Clause 7.2 Competence & Job Specification Standard
 * Provides Isolated Portrait A4 Print Frame, Document Control Box, and Microsoft Excel UTF-8 BOM Export
 */

let currentPreviewJob = null;
let currentPreviewJobCompany = null;

async function openJobPrintPreview(jobId) {
  let job = masterTableRawData.find((j) => j.id === jobId);
  if (!job) {
    try {
      const res = await api.masterTable.findOne('job', jobId);
      if (res) job = res.data ? res.data : (res.id ? res : null);
    } catch (err) {
      console.warn('Could not fetch job for print preview:', err);
    }
  }

  if (!job) {
    showToast('ไม่พบข้อมูลลักษณะงานที่ต้องการพิมพ์', 'error');
    return;
  }

  // ดึงข้อมูลบริษัทหลักสำหรับหัวเอกสาร
  let company = null;
  try {
    const compRes = await api.masterTable.findAll('company', { limit: 1 });
    if (compRes && compRes.data && compRes.data.length > 0) {
      company = compRes.data[0];
    }
  } catch (e) {
    console.warn('Could not load company for job print:', e);
  }

  currentPreviewJob = job;
  currentPreviewJobCompany = company;

  const container = document.getElementById('jobPrintDocument');
  if (container) {
    container.innerHTML = renderJobPrintDocumentHtml(job, company);
  }

  const modal = document.getElementById('modalJobPrintPreview');
  if (modal) modal.classList.remove('hidden');
}

function closeJobPrintPreview() {
  const modal = document.getElementById('modalJobPrintPreview');
  if (modal) modal.classList.add('hidden');
}

function renderJobPrintDocumentHtml(job, company) {
  const compNameTh = company?.nameTh || 'บริษัท ไพลอน จำกัด (มหาชน)';
  const compNameEn = company?.nameEn || 'PYLON PUBLIC COMPANY LIMITED';
  const compLogo = company?.logoUrl || '/assets/logo/logo.jpg';
  const taxId = company?.taxId || '0107548000451';

  const jobCode = job.code || 'JOB-001';
  const titleTh = job.title || job.titleTh || '-';
  const titleEn = job.titleEn || '-';
  const levelText = formatJobLevelLabel(job.level);

  const summaryText = job.summary || job.description || 'ปฏิบัติหน้าที่ตามที่ได้รับมอบหมายเพื่อสนับสนุนระบบการบริหารคุณภาพขององค์กร';
  const responsibilitiesText = job.responsibilities || '1. ปฏิบัติงานตามมาตรฐานและขั้นตอนการปฏิบัติงาน (SOP/WI) ที่กำหนด\n2. บันทึกและจัดเก็บเอกสารคุณภาพให้เป็นไปตามข้อกำหนด ISO 9001\n3. รายงานปัญหาและข้อบกพร่องต่อผู้บังคับบัญชาเพื่อดำเนินการแก้ไขและป้องกัน (CAR/PAR)';
  const qualificationsText = job.qualifications || '• วุฒิการศึกษา: ปริญญาตรีขึ้นไปในสาขาที่เกี่ยวข้อง\n• ประสบการณ์: ไม่น้อยกว่า 1-3 ปีในสายงาน\n• ความรู้ความสามารถ: ความรู้ในระบบบริหารคุณภาพ ISO 9001:2015, ทักษะการสื่อสารและการแก้ปัญหา';

  // คำนวณตำแหน่งและหน่วยงานที่ผูกกับลักษณะงานนี้
  const positions = Array.isArray(job.positions) ? job.positions : [];
  let linkedPositionsHtml = '';
  if (positions.length > 0) {
    linkedPositionsHtml = positions
      .map((p) => {
        const unitName = p.orgUnit ? p.orgUnit.name : 'ระดับองค์กร / บริษัท';
        const occupants = Array.isArray(p.users) && p.users.length > 0
          ? p.users.map((u) => u.username).join(', ')
          : 'ยังไม่มีผู้ครองตำแหน่ง';
        return `• <b>${p.title}</b> (${p.code}) — สังกัด: ${unitName} [ผู้ครองตำแหน่ง: ${occupants}]`;
      })
      .join('<br>');
  } else {
    linkedPositionsHtml = '<span class="text-slate-400 italic">ยังไม่มีตำแหน่งงานที่ผูกกับลักษณะงานนี้</span>';
  }

  // วันที่พิมพ์เอกสาร
  const now = new Date();
  const printDateStr = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="job-iso-document text-slate-900 font-sans">
      <!-- 1. Header Control Box (กล่องหัวเอกสารควบคุมคุณภาพ ISO 9001) -->
      <table class="w-full border-collapse border-2 border-slate-900 text-xs mb-4">
        <tbody>
          <tr>
            <!-- Logo & Company Name -->
            <td class="w-1/4 p-2.5 border-r border-b border-slate-900 text-center align-middle">
              <img src="${compLogo}" alt="Logo" class="max-h-12 max-w-[130px] mx-auto mb-1 object-contain" />
              <div class="font-bold text-[11px] leading-tight">${compNameTh}</div>
              <div class="text-[9px] text-slate-600 font-mono tracking-tighter leading-tight">${compNameEn}</div>
            </td>
            <!-- Document Title -->
            <td class="w-2/4 p-2.5 border-r border-b border-slate-900 text-center align-middle">
              <div class="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">ระบบบริหารคุณภาพมาตรฐานสากล (ISO 9001:2015)</div>
              <div class="text-sm md:text-base font-bold text-slate-950 mt-0.5">ใบกำหนดหน้าที่ความรับผิดชอบและคุณสมบัติประจำตำแหน่ง</div>
              <div class="text-xs font-bold text-slate-800 tracking-wide font-mono mt-0.5">JOB DESCRIPTION & SPECIFICATION (JD)</div>
            </td>
            <!-- ISO Document Control Grid -->
            <td class="w-1/4 p-2 border-b border-slate-900 text-[11px] align-middle font-mono">
              <div class="space-y-1">
                <div><span class="text-slate-600 font-sans">รหัสเอกสาร:</span> <b class="text-slate-900">JD-${jobCode}</b></div>
                <div><span class="text-slate-600 font-sans">แก้ไขครั้งที่:</span> <b>00</b></div>
                <div><span class="text-slate-600 font-sans">วันที่มีผล:</span> <b>01/01/2569</b></div>
                <div><span class="text-slate-600 font-sans">หน้า:</span> <b>1 / 1</b></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 2. Section: ข้อมูลทั่วไปของลักษณะงาน (General Information) -->
      <div class="border border-slate-900 mb-3">
        <div class="bg-slate-200 px-3 py-1 font-bold text-xs border-b border-slate-900 flex items-center justify-between">
          <span>หมวดที่ 1: ข้อมูลทั่วไปของลักษณะงาน (Job Identification)</span>
          <span class="font-mono text-[10px] text-slate-600">ISO 9001:2015 Clause 7.2 Competence</span>
        </div>
        <div class="p-3 text-xs leading-relaxed space-y-2">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span class="text-slate-600">รหัสลักษณะงาน (Job Code):</span>
              <span class="font-mono font-bold text-blue-900 text-sm ml-1">${jobCode}</span>
            </div>
            <div>
              <span class="text-slate-600">ระดับตำแหน่งงาน (Job Level):</span>
              <span class="font-bold text-slate-900 ml-1">${levelText}</span>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span class="text-slate-600">ชื่อลักษณะงาน (ภาษาไทย):</span>
              <span class="font-bold text-slate-900 text-sm ml-1">${titleTh}</span>
            </div>
            <div>
              <span class="text-slate-600">ชื่อลักษณะงาน (ภาษาอังกฤษ):</span>
              <span class="font-bold text-slate-800 font-mono ml-1">${titleEn}</span>
            </div>
          </div>
          <div class="pt-1 border-t border-slate-200">
            <span class="text-slate-600 font-semibold block mb-0.5">ตำแหน่งงานและหน่วยงานที่ใช้ลักษณะงานนี้ในองค์กร (Linked Positions):</span>
            <div class="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] leading-relaxed">
              ${linkedPositionsHtml}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Section: วัตถุประสงค์หลักของงาน (Job Purpose / Objective) -->
      <div class="border border-slate-900 mb-3">
        <div class="bg-slate-200 px-3 py-1 font-bold text-xs border-b border-slate-900">
          หมวดที่ 2: วัตถุประสงค์หลักของตำแหน่งงาน (Job Purpose & Objective)
        </div>
        <div class="p-3 text-xs leading-relaxed whitespace-pre-line text-slate-800">
${summaryText}
        </div>
      </div>

      <!-- 4. Section: หน้าที่และความรับผิดชอบหลัก (Key Responsibilities & Scope of Work) -->
      <div class="border border-slate-900 mb-3">
        <div class="bg-slate-200 px-3 py-1 font-bold text-xs border-b border-slate-900 flex items-center justify-between">
          <span>หมวดที่ 3: หน้าที่และความรับผิดชอบหลัก (Key Responsibilities & Authorities)</span>
          <span class="text-[10px] text-slate-600">ข้อกำหนดการควบคุมกระบวนการปฏิบัติงาน</span>
        </div>
        <div class="p-3 text-xs leading-relaxed whitespace-pre-line text-slate-800 space-y-1">
${responsibilitiesText}
        </div>
      </div>

      <!-- 5. Section: คุณสมบัติและความสามารถประจำตำแหน่ง (Competency & Qualifications) -->
      <div class="border border-slate-900 mb-4">
        <div class="bg-slate-200 px-3 py-1 font-bold text-xs border-b border-slate-900 flex items-center justify-between">
          <span>หมวดที่ 4: คุณสมบัติและความสามารถประจำตำแหน่ง (Job Specification & Competencies)</span>
          <span class="font-mono text-[10px] text-slate-600">ISO 9001:2015 Clause 7.2 (a, b, c)</span>
        </div>
        <div class="p-3 text-xs leading-relaxed whitespace-pre-line text-slate-800">
${qualificationsText}
        </div>
      </div>

      <!-- 6. Section: กล่องลงนามอนุมัติเอกสารควบคุม (Document Approval & Review Grid) -->
      <div class="border-2 border-slate-900">
        <div class="bg-slate-200 px-3 py-1 font-bold text-xs border-b border-slate-900 text-center">
          หมวดที่ 5: การอนุมัติเอกสารระบบบริหารคุณภาพ (Document Sign-off & Audit Approvals)
        </div>
        <table class="w-full border-collapse text-xs text-center">
          <thead>
            <tr class="bg-slate-100 border-b border-slate-900 text-[11px] font-semibold text-slate-700">
              <th class="p-2 border-r border-slate-900 w-1/3">ผู้จัดทำ (Prepared By)</th>
              <th class="p-2 border-r border-slate-900 w-1/3">ผู้ทบทวน (Reviewed By)</th>
              <th class="p-2 w-1/3">ผู้อนุมัติ (Approved By)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-4 border-r border-slate-900 text-[11px] align-bottom">
                <div class="h-12 border-b border-dotted border-slate-400 mx-4 mb-2"></div>
                <div class="font-bold text-slate-900">เจ้าหน้าที่บริหารทรัพยากรบุคคล (HR)</div>
                <div class="text-slate-500 mt-0.5">วันที่: ....../....../......</div>
              </td>
              <td class="p-4 border-r border-slate-900 text-[11px] align-bottom">
                <div class="h-12 border-b border-dotted border-slate-400 mx-4 mb-2"></div>
                <div class="font-bold text-slate-900">หัวหน้าฝ่าย / ตัวแทนฝ่ายบริหาร (QMR)</div>
                <div class="text-slate-500 mt-0.5">วันที่: ....../....../......</div>
              </td>
              <td class="p-4 text-[11px] align-bottom">
                <div class="h-12 border-b border-dotted border-slate-400 mx-4 mb-2"></div>
                <div class="font-bold text-slate-900">กรรมการผู้จัดการ (Managing Director)</div>
                <div class="text-slate-500 mt-0.5">วันที่: ....../....../......</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Print Metadata -->
      <div class="mt-3 text-[10px] text-slate-500 flex items-center justify-between font-mono">
        <div>เอกสารควบคุมระบบบริหารคุณภาพ (Controlled Quality Document) • ห้ามทำซ้ำโดยไม่ได้รับอนุญาต</div>
        <div>พิมพ์เมื่อ: ${printDateStr}</div>
      </div>
    </div>
  `;
}

function formatJobLevelLabel(level) {
  switch (level) {
    case 'EXECUTIVE':
    case 10:
    case '10':
      return 'ผู้บริหารระดับสูง (EXECUTIVE)';
    case 'MANAGER':
    case 7:
    case 8:
    case '7':
    case '8':
      return 'ผู้จัดการ (MANAGER)';
    case 'SUPERVISOR':
    case 5:
    case '5':
      return 'หัวหน้างาน (SUPERVISOR)';
    case 'SPECIALIST':
    case 4:
    case '4':
      return 'ผู้เชี่ยวชาญ (SPECIALIST)';
    case 'OFFICER':
    case 2:
    case '2':
      return 'เจ้าหน้าที่ (OFFICER)';
    case 'OPERATIONAL':
    case 1:
    case '1':
      return 'ปฏิบัติการ (OPERATIONAL)';
    default:
      return String(level || 'เจ้าหน้าที่ (OFFICER)');
  }
}

function printJobDocument(job) {
  const targetJob = job || currentPreviewJob;
  if (!targetJob) {
    showToast('ไม่พบข้อมูลลักษณะงานที่ต้องการพิมพ์', 'error');
    return;
  }

  let printFrame = document.getElementById('jobPrintIframe');
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'jobPrintIframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const htmlContent = generateJobPrintFullHtml(targetJob, currentPreviewJobCompany);
  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.error('Print iframe error:', e);
      window.print();
    }
  }, 400);
}

function openJobPrintInNewTab(jobId) {
  const targetJob = (jobId && masterTableRawData.find((j) => j.id === jobId)) || currentPreviewJob;
  if (!targetJob) {
    showToast('ไม่พบข้อมูลลักษณะงาน', 'error');
    return;
  }

  const htmlContent = generateJobPrintFullHtml(targetJob, currentPreviewJobCompany);
  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.open();
    newTab.document.write(htmlContent);
    newTab.document.close();
  } else {
    showToast('เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้', 'warning');
  }
}

function generateJobPrintFullHtml(job, company) {
  const innerDocHtml = renderJobPrintDocumentHtml(job, company);
  const jobTitle = job.title || job.titleTh || job.code || 'Job-Description';

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ISO-JD-${job.code || 'DOC'} - ${jobTitle}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #0f172a;
      font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', 'Segoe UI', Tahoma, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .job-iso-document {
      width: 100%;
      max-width: 100%;
    }
    .border-2 { border-width: 2px; }
    .border { border-width: 1px; }
    .border-slate-900 { border-color: #0f172a; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-b { border-bottom-width: 1px; }
    .border-r { border-right-width: 1px; }
    .border-t { border-top-width: 1px; }
    .bg-slate-200 { background-color: #e2e8f0 !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .p-2 { padding: 6px; }
    .p-2\\.5 { padding: 8px; }
    .p-3 { padding: 10px; }
    .p-4 { padding: 12px; }
    .px-3 { padding-left: 10px; padding-right: 10px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 10px; }
    .mb-4 { margin-bottom: 14px; }
    .mt-0\\.5 { margin-top: 2px; }
    .mt-1 { margin-top: 4px; }
    .mt-3 { margin-top: 10px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-semibold { font-weight: 600; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-xs { font-size: 13px; }
    .text-sm { font-size: 14px; }
    .text-base { font-size: 16px; }
    .text-\\[11px\\] { font-size: 12px; }
    .text-\\[10px\\] { font-size: 11px; }
    .text-\\[9px\\] { font-size: 10px; }
    .text-blue-900 { color: #1e3a8a; }
    .text-slate-900 { color: #0f172a; }
    .text-slate-800 { color: #1e293b; }
    .text-slate-600 { color: #475569; }
    .text-slate-500 { color: #64748b; }
    .text-slate-400 { color: #94a3b8; }
    .w-1\\/4 { width: 25%; }
    .w-2\\/4 { width: 50%; }
    .w-1\\/3 { width: 33.333%; }
    .w-full { width: 100%; }
    .max-h-12 { max-height: 48px; }
    .max-w-\\[130px\\] { max-width: 130px; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .mx-4 { margin-left: 16px; margin-right: 16px; }
    .align-middle { vertical-align: middle; }
    .align-bottom { vertical-align: bottom; }
    .whitespace-pre-line { white-space: pre-line; }
    .leading-relaxed { line-height: 1.5; }
    .leading-tight { line-height: 1.25; }
    .h-12 { height: 44px; }
    .border-dotted { border-style: dotted; }
    .object-contain { object-fit: contain; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .gap-2 { gap: 8px; }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${innerDocHtml}
</body>
</html>`;
}

function exportJobDescriptionToExcel(job) {
  const targetJob = job || currentPreviewJob;
  if (!targetJob) {
    showToast('ไม่พบข้อมูลลักษณะงานที่ต้องการส่งออก', 'error');
    return;
  }

  const code = targetJob.code || 'JOB-001';
  const titleTh = targetJob.title || targetJob.titleTh || '-';
  const titleEn = targetJob.titleEn || '-';
  const level = formatJobLevelLabel(targetJob.level);
  const summary = (targetJob.summary || targetJob.description || '-').replace(/"/g, '""');
  const responsibilities = (targetJob.responsibilities || '-').replace(/"/g, '""');
  const qualifications = (targetJob.qualifications || '-').replace(/"/g, '""');

  const rows = [
    ['หัวข้อ (ISO 9001 Clause 7.2)', 'รายละเอียดลักษณะงานและคุณสมบัติ (Job Specification)'],
    ['รหัสลักษณะงาน (Job Code)', code],
    ['ชื่อตำแหน่งงานภาษาไทย (Title TH)', titleTh],
    ['ชื่อตำแหน่งงานภาษาอังกฤษ (Title EN)', titleEn],
    ['ระดับงาน (Job Level)', level],
    ['วัตถุประสงค์ของตำแหน่งงาน (Job Purpose)', `"${summary}"`],
    ['หน้าที่และความรับผิดชอบหลัก (Key Responsibilities)', `"${responsibilities}"`],
    ['คุณสมบัติและความสามารถประจำตำแหน่ง (Competency & Qualifications)', `"${qualifications}"`],
    ['สถานะการใช้งาน (Status)', targetJob.isActive !== false ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'],
  ];

  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ISO_JD_${code}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('ส่งออกข้อมูลเอกสาร ISO ในรูปแบบ Excel เรียบร้อยแล้ว', 'success');
}
