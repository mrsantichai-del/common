/**
 * ULTRON Formal Corporate Document Print & Export Engine
 * Sarabun 16px Typography, Isolated Portrait A4 Print Frame, and Microsoft Excel UTF-8 BOM CSV Export
 */

let currentPreviewCompany = null;

function openCompanyPrintPreview(companyId) {
  const company = masterTableRawData.find((c) => c.id === companyId);
  if (!company) {
    showToast('ไม่พบข้อมูลบริษัทที่ต้องการพิมพ์', 'error');
    return;
  }

  currentPreviewCompany = company;
  const container = document.getElementById('companyPrintDocument');
  if (container) {
    container.innerHTML = renderCompanyPrintDocumentHtml(company);
  }

  const modal = document.getElementById('modalCompanyPrintPreview');
  if (modal) modal.classList.remove('hidden');
}

function closeCompanyPrintPreview() {
  const modal = document.getElementById('modalCompanyPrintPreview');
  if (modal) modal.classList.add('hidden');
}

function printCompanyDocument(company) {
  const comp = company || currentPreviewCompany;
  if (!comp) {
    showToast('ไม่พบข้อมูลบริษัทที่ต้องการพิมพ์', 'error');
    return;
  }

  // ใช้ Isolated Iframe ที่ตัดขาดจาก Layout ของหน้าจอหลักและ Modal
  // เพื่อแก้ปัญหาเบราว์เซอร์สับสนทิศทางกระดาษ (Landscape/Portrait Bug) ได้ 100%
  let printFrame = document.getElementById('companyPrintIframe');
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'companyPrintIframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);
  }

  const htmlContent = generateCompanyPrintFullHtml(comp);
  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  // รอให้ฟอนต์และรูปภาพพร้อม แล้วเรียก Dialog การพิมพ์
  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to new window:', e);
      openCompanyPrintInNewTab(comp.id);
    }
  }, 400);
}

function openCompanyPrintInNewTab(companyId) {
  const comp = companyId ? masterTableRawData.find((c) => c.id === companyId) : currentPreviewCompany;
  if (!comp) {
    showToast('ไม่พบข้อมูลบริษัท', 'error');
    return;
  }

  const newWin = window.open('', '_blank');
  if (!newWin) {
    showToast('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัป', 'error');
    return;
  }

  newWin.document.open();
  newWin.document.write(generateCompanyPrintFullHtml(comp));
  newWin.document.close();
  newWin.focus();
}

function generateCompanyPrintFullHtml(company) {
  const innerBody = renderCompanyPrintDocumentHtml(company);
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>แบบแสดงรายการข้อมูลนิติบุคคล - ${company.nameTh}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
  <style>
    @page {
      size: A4 portrait !important;
      margin: 10mm 14mm 10mm 14mm !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
    }
    .print-sheet {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 4px 0;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .section-title {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      border-bottom: 1.5px solid #1e293b !important;
      padding-bottom: 3px !important;
      margin-bottom: 6px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: baseline !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #94a3b8;
      font-size: 14px !important;
      line-height: 1.45;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      vertical-align: middle;
      font-size: 14px !important;
    }
    .lbl {
      background-color: #f8fafc;
      font-weight: 600;
      color: #334155;
      width: 25%;
      font-size: 14px !important;
    }
    .val {
      color: #0f172a;
      font-size: 14px !important;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="print-sheet">
    ${innerBody}
  </div>
</body>
</html>`;
}

function renderCompanyPrintDocumentHtml(company) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateTimeFormatted = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const logoSrc = company.logoUrl || '/assets/logo/logo.jpg';
  const branchText =
    company.branchType === 'HEAD_OFFICE'
      ? `สำนักงานใหญ่ (รหัส ${company.branchCode || '00000'})`
      : `${company.branchName || 'สาขา'} (รหัส ${company.branchCode || '-'})`;

  return `
    <div style="font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif; font-size: 14px; line-height: 1.5; color: #0f172a;">
      
      <!-- 1. Corporate Official Letterhead Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #0f172a; padding-bottom: 10px; margin-bottom: 12px; gap: 16px;">
        <!-- Corporate Logo -->
        <div style="flex-shrink: 0; max-width: 190px; height: 52px; display: flex; align-items: center;">
          <img src="${logoSrc}" alt="Logo" style="max-height: 52px; max-width: 190px; object-fit: contain; display: block;" onerror="this.style.display='none';">
        </div>

        <!-- Corporate Header Text (Right Aligned) -->
        <div style="flex: 1; text-align: right; min-width: 0;">
          <div style="font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2;">
            ${company.nameTh}
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.25; margin-top: 1px;">
            ${company.nameEn}
          </div>
          <div style="font-size: 13px; color: #334155; margin-top: 2px;">
            เลขประจำตัวผู้เสียภาษี: <strong style="font-family: 'JetBrains Mono', monospace; font-size: 13.5px;">${company.taxId}</strong> 
            &nbsp;|&nbsp; สถานประกอบการ: <strong>${branchText}</strong>
          </div>
        </div>
      </div>

      <!-- 2. Formal Document Title Banner -->
      <div style="text-align: center; margin: 12px 0 14px 0;">
        <div style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: 0.02em;">
          แบบแสดงรายการข้อมูลนิติบุคคลและสถานประกอบการ
        </div>
        <div style="font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px;">
          Official Corporate Profile & Registered Legal Entity Details
        </div>
        <div style="font-size: 12.5px; color: #64748b; margin-top: 4px;">
          เลขที่เอกสารอ้างอิง: <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #1e293b;">COMP-DOC-${company.taxId}-${now.getFullYear()}</span>
          &nbsp;&nbsp;•&nbsp;&nbsp; วันที่ออกเอกสาร: <span style="color: #1e293b; font-weight: 500;">${dateFormatted}</span>
        </div>
      </div>

      <!-- 3. Section 1: ข้อมูลทางทะเบียนนิติบุคคล -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
          <span>1. ข้อมูลการจดทะเบียนนิติบุคคล (Corporate Registration & Legal Status)</span>
          <span style="font-size: 12.5px; font-weight: 400; color: #64748b;">หมวดที่ 1</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 14px; line-height: 1.45; margin-bottom: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ชื่อบริษัท (ภาษาไทย)</td>
              <td style="width: 75%; padding: 5px 10px; font-weight: 700; color: #0f172a; font-size: 14px;" colspan="3">${company.nameTh}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ชื่อบริษัท (ภาษาอังกฤษ)</td>
              <td style="padding: 5px 10px; font-weight: 600; color: #334155; font-size: 14px;" colspan="3">${company.nameEn}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">เลขประจำตัวผู้เสียภาษี</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 13.5px;">${company.taxId}</td>
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">เลขทะเบียนพาณิชย์/นิติบุคคล</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; font-size: 13.5px;">${company.commercialRegNo || company.taxId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ประเภทสถานประกอบการ</td>
              <td style="padding: 5px 10px; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 14px;">${company.branchType === 'HEAD_OFFICE' ? 'สำนักงานใหญ่ (Head Office)' : 'สาขา (Branch)'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">รหัสและชื่อสาขา</td>
              <td style="padding: 5px 10px; color: #0f172a; font-size: 14px;">${company.branchName} (${company.branchCode || '00000'})</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ชื่อย่อองค์กร (Short Name)</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 13.5px;">${company.shortName || '-'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">สถานะในระบบ</td>
              <td style="padding: 5px 10px; color: #0f172a; font-size: 14px;">${company.isDefault ? 'สำนักงานหลัก (Default Company)' : 'สาขา/บริษัทย่อย'} • ${company.isActive !== false ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 4. Section 2: ที่ตั้งสำนักงานและการติดต่อ -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
          <span>2. ที่ตั้งสำนักงานและการติดต่อสื่อสาร (Registered Office Address & Contacts)</span>
          <span style="font-size: 12.5px; font-weight: 400; color: #64748b;">หมวดที่ 2</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 14px; line-height: 1.45; margin-bottom: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ที่อยู่จดทะเบียน (ภาษาไทย)</td>
              <td style="width: 75%; padding: 5px 10px; color: #0f172a; font-size: 14px;" colspan="3">${company.addressTh}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ที่อยู่ (ภาษาอังกฤษ)</td>
              <td style="padding: 5px 10px; color: #334155; font-size: 14px;" colspan="3">${company.addressEn || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">รหัสไปรษณีย์</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 13.5px;">${company.postalCode || '-'}</td>
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">หมายเลขโทรศัพท์</td>
              <td style="width: 25%; padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #0f172a; font-size: 13.5px;">${company.telephone || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">หมายเลขโทรสาร (แฟกซ์)</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 13.5px;">${company.fax || '-'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">จดหมายอิเล็กทรอนิกส์ (อีเมล)</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; font-size: 13.5px;">${company.email || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">เว็บไซต์ทางการ</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; color: #0f172a; font-size: 13.5px;" colspan="3">${company.website || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 5. Section 3: ข้อมูลสถาบันการเงินสำหรับธุรกรรม -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: baseline;">
          <span>3. ข้อมูลบัญชีสถาบันการเงินสำหรับธุรกรรม (Corporate Banking Information)</span>
          <span style="font-size: 12.5px; font-weight: 400; color: #64748b;">หมวดที่ 3</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 14px; line-height: 1.45; margin-bottom: 10px;">
          <tbody>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">สถาบันการเงิน / ธนาคาร</td>
              <td style="width: 25%; padding: 5px 10px; font-weight: 600; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 14px;">${company.bankName || '-'}</td>
              <td style="width: 25%; padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">สาขาธนาคาร</td>
              <td style="width: 25%; padding: 5px 10px; color: #0f172a; font-size: 14px;">${company.bankBranch || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ประเภทบัญชี</td>
              <td style="padding: 5px 10px; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 14px;">${company.accountType || '-'}</td>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">เลขที่บัญชี</td>
              <td style="padding: 5px 10px; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; border-right: 1px solid #cbd5e1; font-size: 13.5px;">${company.accountNumber || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 10px; background-color: #f8fafc; font-weight: 600; color: #334155; border-right: 1px solid #cbd5e1; font-size: 14px;">ชื่อบัญชี</td>
              <td style="padding: 5px 10px; font-weight: 600; color: #0f172a; font-size: 14px;" colspan="3">${company.accountName || company.nameTh}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 6. Section 4: คำรับรองความถูกต้องและตรายางนิติบุคคล -->
      <div style="margin-top: 14px; page-break-inside: avoid;">
        <div style="text-align: center; font-size: 14px; font-weight: 500; font-style: italic; color: #334155; margin-bottom: 10px;">
          "ขอรับรองว่ารายการและข้อมูลตามที่ปรากฏในเอกสารฉบับนี้ ถูกต้องตรงตามทะเบียนประวัติของบริษัททุกประการ"
        </div>

        <div style="display: flex; gap: 20px; font-size: 14px;">
          <!-- Signatory Box -->
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; background-color: #f8fafc; min-height: 125px;">
            <div style="height: 38px;"></div>
            <div style="width: 200px; border-bottom: 1px solid #0f172a; margin: 0 auto 6px auto;"></div>
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">( .................................................................... )</div>
            <div style="font-size: 13px; color: #334155; margin-top: 2px;">กรรมการผู้มีอำนาจลงนาม / ผู้รับมอบอำนาจ</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">วันที่ .......... / .......... / ................</div>
          </div>

          <!-- Official Stamp Box -->
          <div style="flex: 1; border: 2px dashed #94a3b8; border-radius: 4px; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 125px; background-color: #f8fafc;">
            ${
              company.stampUrl
                ? `<img src="${company.stampUrl}" alt="Corporate Seal" style="max-height: 75px; max-width: 120px; object-fit: contain; margin-bottom: 4px;">`
                : `
                <div style="color: #64748b; font-size: 14px; line-height: 1.3;">
                  <div style="font-weight: 600; color: #475569;">( ประทับตราสำคัญของบริษัท )</div>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">Official Corporate Seal</div>
                </div>
                `
            }
          </div>
        </div>
      </div>

      <!-- 7. Official Document Footer -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b;">
        <div>${company.docFooterNotice || 'เอกสารนี้ออกโดยระบบอัตโนมัติ ULTRON Core System'}</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">พิมพ์เมื่อ: ${dateTimeFormatted} • Local Sovereignty Architecture</div>
      </div>

    </div>
  `;
}

// ----------------------------------------------------
// Excel Export Engines (Microsoft Excel UTF-8 BOM Compliant)
// ----------------------------------------------------

function downloadCsvFile(content, filename) {
  const bomContent = content.startsWith('\uFEFF') ? content : '\uFEFF' + content;
  const blob = new Blob([bomContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `company_export_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportSingleCompanyToExcel(companyId) {
  const company = masterTableRawData.find((c) => c.id === companyId);
  if (!company) {
    showToast('ไม่พบข้อมูลบริษัทที่ต้องการส่งออก', 'error');
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Escape CSV value helper
  const esc = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Text formula helper to preserve leading zeros in Excel (e.g. Tax ID, Branch Code, Postal Code, Tel)
  const escText = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `="""${s}"""`;
  };

  const rows = [
    ['แบบแสดงรายการข้อมูลนิติบุคคลและสถานประกอบการ (Official Corporate Profile)'],
    [`บริษัท: ${company.nameTh} (${company.nameEn})`],
    [`พิมพ์เมื่อ: ${dateStr}`],
    [''],
    ['ลำดับ', 'หมวดหมู่ข้อมูล', 'หัวข้อรายการ (Field Description)', 'รายละเอียดข้อมูล (Field Value)'],
    ['1', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อบริษัท (ภาษาไทย)', esc(company.nameTh)],
    ['2', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อบริษัท (ภาษาอังกฤษ)', esc(company.nameEn)],
    ['3', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อย่อองค์กร (Short Name)', esc(company.shortName || '-')],
    ['4', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'เลขประจำตัวผู้เสียภาษีอากร (13 หลัก)', escText(company.taxId)],
    ['5', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'เลขทะเบียนพาณิชย์ / เลขทะเบียนนิติบุคคล', escText(company.commercialRegNo || company.taxId)],
    ['6', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ประเภทสถานประกอบการ', esc(company.branchType === 'HEAD_OFFICE' ? 'สำนักงานใหญ่ (Head Office)' : 'สาขา (Branch)')],
    ['7', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'รหัสสาขา', escText(company.branchCode || '00000')],
    ['8', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'ชื่อสาขา', esc(company.branchName || 'สำนักงานใหญ่')],
    ['9', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'สถานะบริษัทหลักในระบบ', esc(company.isDefault ? 'ใช่ (Default Company)' : 'ไม่ใช่')],
    ['10', '1. ข้อมูลทางทะเบียนนิติบุคคล', 'สถานะการดำเนินงาน', esc(company.isActive !== false ? 'เปิดใช้งานตามปกติ (Active)' : 'ปิดใช้งาน')],
    ['11', '2. ที่ตั้งและการติดต่อ', 'ที่อยู่จดทะเบียน (ภาษาไทย)', esc(company.addressTh)],
    ['12', '2. ที่ตั้งและการติดต่อ', 'ที่อยู่ (ภาษาอังกฤษ)', esc(company.addressEn || '-')],
    ['13', '2. ที่ตั้งและการติดต่อ', 'รหัสไปรษณีย์', escText(company.postalCode || '-')],
    ['14', '2. ที่ตั้งและการติดต่อ', 'หมายเลขโทรศัพท์', escText(company.telephone || '-')],
    ['15', '2. ที่ตั้งและการติดต่อ', 'หมายเลขโทรสาร (แฟกซ์)', escText(company.fax || '-')],
    ['16', '2. ที่ตั้งและการติดต่อ', 'จดหมายอิเล็กทรอนิกส์ (อีเมล)', esc(company.email || '-')],
    ['17', '2. ที่ตั้งและการติดต่อ', 'เว็บไซต์ทางการ', esc(company.website || '-')],
    ['18', '3. บัญชีสถาบันการเงิน', 'ชื่อสถาบันการเงิน / ธนาคาร', esc(company.bankName || '-')],
    ['19', '3. บัญชีสถาบันการเงิน', 'สาขาธนาคาร', esc(company.bankBranch || '-')],
    ['20', '3. บัญชีสถาบันการเงิน', 'ประเภทบัญชี', esc(company.accountType || '-')],
    ['21', '3. บัญชีสถาบันการเงิน', 'เลขที่บัญชี', escText(company.accountNumber || '-')],
    ['22', '3. บัญชีสถาบันการเงิน', 'ชื่อบัญชี', esc(company.accountName || company.nameTh)],
    ['23', '4. ท้ายเอกสาร', 'ข้อความท้ายเอกสาร (Footer Notice)', esc(company.docFooterNotice || '-')],
  ];

  const csvContent = rows.map((r) => r.join(',')).join('\r\n');
  const filename = `Company_${company.shortName || company.taxId}_${Date.now()}.csv`;
  downloadCsvFile(csvContent, filename);
  showToast(`ส่งออกข้อมูลบริษัท ${company.nameTh} เป็นไฟล์ Excel สำเร็จ`, 'success');
}

function exportCurrentCompanyProfileToExcel() {
  if (!currentPreviewCompany) {
    showToast('ไม่พบข้อมูลบริษัทที่เปิดอยู่', 'error');
    return;
  }
  exportSingleCompanyToExcel(currentPreviewCompany.id);
}

async function exportCurrentMasterTableToExcel() {
  try {
    showToast(`กำลังส่งออกข้อมูลตาราง ${activeMasterTable.toUpperCase()} เป็น Excel...`, 'success');
    const res = await api.masterTable.exportFile(activeMasterTable, 'csv');
    if (res && res.content) {
      downloadCsvFile(res.content, res.filename || `${activeMasterTable}_export_${Date.now()}.csv`);
      showToast(`ส่งออกข้อมูลตาราง ${activeMasterTable.toUpperCase()} สำเร็จ`, 'success');
    } else {
      throw new Error('No content returned from server');
    }
  } catch (err) {
    console.error('Export error:', err);
    showToast(`ส่งออกข้อมูลไม่สำเร็จ: ${err.message}`, 'error');
  }
}
