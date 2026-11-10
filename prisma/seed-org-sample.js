const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding Sample Organization Units, Jobs, and Positions...');

  const company = await prisma.company.findFirst({ where: { isDefault: true } });
  if (!company) {
    console.error('No default company found.');
    return;
  }

  // 1. Jobs (JD)
  const jobsData = [
    {
      code: 'JOB-CEO',
      title: 'ประธานเจ้าหน้าที่บริหาร',
      titleEn: 'Chief Executive Officer (CEO)',
      level: 10,
      summary: 'กำหนดทิศทางเชิงกลยุทธ์และบริหารผลการดำเนินงานโดยรวมขององค์กร',
      responsibilities: '1. กำหนดยุทธศาสตร์ธุรกิจ\n2. อนุมัตินโยบายหลักขององค์กร\n3. กำกับดูแลการดำเนินงานของทุกฝ่าย',
      qualifications: 'วุฒิปริญญาโทขึ้นไป ประสบการณ์บริหารระดับสูงไม่น้อยกว่า 10 ปี',
    },
    {
      code: 'JOB-BR-MGR',
      title: 'ผู้จัดการสาขา',
      titleEn: 'Branch Manager',
      level: 8,
      summary: 'บริหารจัดการผลการดำเนินงาน ประสานงาน และกำกับดูแลสาขา',
      responsibilities: '1. บริหารเป้าหมายสาขา\n2. กำกับดูแลฝ่ายต่างๆ ภายในสาขา\n3. ควบคุมต้นทุนและผลกำไรสาขา',
      qualifications: 'ปริญญาตรีขึ้นไป ประสบการณ์บริหารสาขาไม่น้อยกว่า 5 ปี',
    },
    {
      code: 'JOB-DIV-MGR',
      title: 'ผู้จัดการฝ่าย',
      titleEn: 'Division Manager',
      level: 7,
      summary: 'วางแผน ควบคุม และขับเคลื่อนนโยบายของสายงานฝ่าย',
      responsibilities: '1. วางแผนกลยุทธ์ประจำฝ่าย\n2. กำกับดูแลแผนกย่อยในสังกัด\n3. ประเมินผลการปฏิบัติงานของบุคลากรในฝ่าย',
      qualifications: 'ปริญญาตรีขึ้นไปในสาขาที่เกี่ยวข้อง ประสบการณ์ไม่น้อยกว่า 5 ปี',
    },
    {
      code: 'JOB-DEP-SUP',
      title: 'หัวหน้าแผนก',
      titleEn: 'Department Supervisor',
      level: 5,
      summary: 'ควบคุมดูแลงานประจำวันของแผนก และประสานงานทีมงาน',
      responsibilities: '1. ตรวจสอบความถูกต้องของงานในแผนก\n2. จัดสรรงานและติดตามความคืบหน้า\n3. รายงานผลต่อผู้จัดการฝ่าย',
      qualifications: 'ปริญญาตรี มีประสบการณ์ในสายงานไม่น้อยกว่า 3 ปี',
    },
    {
      code: 'JOB-SR-OFF',
      title: 'เจ้าหน้าที่อาวุโส',
      titleEn: 'Senior Officer',
      level: 4,
      summary: 'ปฏิบัติงานเฉพาะทางที่มีความซับซ้อนสูง และเป็นพี่เลี้ยงให้ทีมงาน',
      responsibilities: '1. ดำเนินงานโครงการสำคัญ\n2. วิเคราะห์และแก้ไขปัญหาเชิงเทคนิค\n3. ให้คำแนะนำแก่เจ้าหน้าที่ระดับต้น',
      qualifications: 'ปริญญาตรี ประสบการณ์ 2-3 ปี',
    },
    {
      code: 'JOB-OFFICER',
      title: 'เจ้าหน้าที่ปฏิบัติการ',
      titleEn: 'Officer',
      level: 2,
      summary: 'ปฏิบัติงานตามกระบวนการและมาตรฐานที่กำหนด',
      responsibilities: '1. บันทึกและจัดทำเอกสารตามขั้นตอน\n2. ติดต่อประสานงานตามที่ได้รับมอบหมาย\n3. สนับสนุนงานทั่วไปในแผนก',
      qualifications: 'ปริญญาตรี มีความกระตือรือร้นและเรียนรู้งานได้ดี',
    },
  ];

  const jobMap = new Map();
  for (const j of jobsData) {
    const job = await prisma.job.upsert({
      where: { code: j.code },
      update: j,
      create: j,
    });
    jobMap.set(j.code, job.id);
  }

  // 2. OrgUnits (สาขา -> ฝ่าย -> แผนก)
  // Level 1: Branches (สาขา)
  const brHq = await prisma.orgUnit.upsert({
    where: { code: 'BR-HQ' },
    update: { name: 'สาขาสำนักงานใหญ่ (กรุงเทพฯ)', type: 'BRANCH', order: 1, companyId: company.id },
    create: { code: 'BR-HQ', name: 'สาขาสำนักงานใหญ่ (กรุงเทพฯ)', nameEn: 'Head Office (Bangkok)', type: 'BRANCH', order: 1, companyId: company.id },
  });

  const brCnx = await prisma.orgUnit.upsert({
    where: { code: 'BR-CNX' },
    update: { name: 'สาขาภาคเหนือ (เชียงใหม่)', type: 'BRANCH', order: 2, companyId: company.id },
    create: { code: 'BR-CNX', name: 'สาขาภาคเหนือ (เชียงใหม่)', nameEn: 'Northern Branch (Chiang Mai)', type: 'BRANCH', order: 2, companyId: company.id },
  });

  // Level 2: Divisions (ฝ่าย ใต้ BR-HQ)
  const divAcc = await prisma.orgUnit.upsert({
    where: { code: 'DIV-ACC' },
    update: { name: 'ฝ่ายบัญชีและการเงิน', type: 'DIVISION', order: 1, parentId: brHq.id, companyId: company.id },
    create: { code: 'DIV-ACC', name: 'ฝ่ายบัญชีและการเงิน', nameEn: 'Accounting & Finance Division', type: 'DIVISION', order: 1, parentId: brHq.id, companyId: company.id },
  });

  const divEng = await prisma.orgUnit.upsert({
    where: { code: 'DIV-ENG' },
    update: { name: 'ฝ่ายวิศวกรรมและโครงการ', type: 'DIVISION', order: 2, parentId: brHq.id, companyId: company.id },
    create: { code: 'DIV-ENG', name: 'ฝ่ายวิศวกรรมและโครงการ', nameEn: 'Engineering & Projects Division', type: 'DIVISION', order: 2, parentId: brHq.id, companyId: company.id },
  });

  // Level 3: Departments (แผนก ใต้ DIV-ACC)
  const depAcc = await prisma.orgUnit.upsert({
    where: { code: 'DEP-ACC' },
    update: { name: 'แผนกบัญชีทั่วไปและภาษี', type: 'DEPARTMENT', order: 1, parentId: divAcc.id, companyId: company.id },
    create: { code: 'DEP-ACC', name: 'แผนกบัญชีทั่วไปและภาษี', nameEn: 'General Accounting & Tax Dept', type: 'DEPARTMENT', order: 1, parentId: divAcc.id, companyId: company.id },
  });

  const depFin = await prisma.orgUnit.upsert({
    where: { code: 'DEP-FIN' },
    update: { name: 'แผนกการเงินและสินเชื่อ', type: 'DEPARTMENT', order: 2, parentId: divAcc.id, companyId: company.id },
    create: { code: 'DEP-FIN', name: 'แผนกการเงินและสินเชื่อ', nameEn: 'Finance & Credit Dept', type: 'DEPARTMENT', order: 2, parentId: divAcc.id, companyId: company.id },
  });

  // Level 3: Departments (แผนก ใต้ DIV-ENG)
  const depStruct = await prisma.orgUnit.upsert({
    where: { code: 'DEP-STRUCT' },
    update: { name: 'แผนกวิศวกรรมฐานราก', type: 'DEPARTMENT', order: 1, parentId: divEng.id, companyId: company.id },
    create: { code: 'DEP-STRUCT', name: 'แผนกวิศวกรรมฐานราก', nameEn: 'Foundation Engineering Dept', type: 'DEPARTMENT', order: 1, parentId: divEng.id, companyId: company.id },
  });

  // 3. Positions (ตำแหน่งงาน และสายบังคับบัญชา)
  // 3.1 CEO (Company Level)
  const posCeo = await prisma.position.upsert({
    where: { code: 'POS-CEO' },
    update: { title: 'ประธานเจ้าหน้าที่บริหาร (CEO)', isUnitHead: true, companyId: company.id, jobId: jobMap.get('JOB-CEO') },
    create: {
      code: 'POS-CEO',
      title: 'ประธานเจ้าหน้าที่บริหาร (CEO)',
      isUnitHead: true,
      companyId: company.id,
      orgUnitId: null, // ระดับบริษัท
      jobId: jobMap.get('JOB-CEO'),
    },
  });

  // 3.2 ผู้จัดการสาขา HQ -> reportsTo CEO
  const posBrMgrHq = await prisma.position.upsert({
    where: { code: 'POS-BR-MGR-HQ' },
    update: { title: 'ผู้จัดการสาขาสำนักงานใหญ่', isUnitHead: true, orgUnitId: brHq.id, reportsToId: posCeo.id },
    create: {
      code: 'POS-BR-MGR-HQ',
      title: 'ผู้จัดการสาขาสำนักงานใหญ่',
      isUnitHead: true,
      companyId: company.id,
      orgUnitId: brHq.id,
      jobId: jobMap.get('JOB-BR-MGR'),
      reportsToId: posCeo.id,
    },
  });

  // 3.3 ผู้จัดการฝ่ายบัญชี (ผูกกับ DIV-ACC) -> reportsTo ผู้จัดการสาขา หรือ CEO
  const posDivAccMgr = await prisma.position.upsert({
    where: { code: 'POS-DIV-ACC-MGR' },
    update: { title: 'ผู้จัดการฝ่ายบัญชีและการเงิน', isUnitHead: true, orgUnitId: divAcc.id, reportsToId: posBrMgrHq.id },
    create: {
      code: 'POS-DIV-ACC-MGR',
      title: 'ผู้จัดการฝ่ายบัญชีและการเงิน',
      isUnitHead: true,
      companyId: company.id,
      orgUnitId: divAcc.id,
      jobId: jobMap.get('JOB-DIV-MGR'),
      reportsToId: posBrMgrHq.id,
    },
  });

  // 3.4 หัวหน้าแผนกบัญชี (ผูกกับ DEP-ACC) -> reportsTo ผู้จัดการฝ่ายบัญชี
  const posDepAccSup = await prisma.position.upsert({
    where: { code: 'POS-DEP-ACC-SUP' },
    update: { title: 'หัวหน้าแผนกบัญชีทั่วไป', isUnitHead: true, orgUnitId: depAcc.id, reportsToId: posDivAccMgr.id },
    create: {
      code: 'POS-DEP-ACC-SUP',
      title: 'หัวหน้าแผนกบัญชีทั่วไป',
      isUnitHead: true,
      companyId: company.id,
      orgUnitId: depAcc.id,
      jobId: jobMap.get('JOB-DEP-SUP'),
      reportsToId: posDivAccMgr.id,
    },
  });

  // 3.5 เจ้าหน้าที่บัญชี (ผูกกับ DEP-ACC) -> reportsTo หัวหน้าแผนกบัญชี
  await prisma.position.upsert({
    where: { code: 'POS-ACC-OFF-01' },
    update: { title: 'เจ้าหน้าที่บัญชีเจ้าหนี้', isUnitHead: false, orgUnitId: depAcc.id, reportsToId: posDepAccSup.id },
    create: {
      code: 'POS-ACC-OFF-01',
      title: 'เจ้าหน้าที่บัญชีเจ้าหนี้',
      isUnitHead: false,
      companyId: company.id,
      orgUnitId: depAcc.id,
      jobId: jobMap.get('JOB-OFFICER'),
      reportsToId: posDepAccSup.id,
    },
  });

  // 4. Assign root_admin to CEO position
  const rootAdmin = await prisma.user.findUnique({ where: { username: 'root_admin' } });
  if (rootAdmin) {
    await prisma.user.update({
      where: { id: rootAdmin.id },
      data: { positionId: posCeo.id },
    });
  }

  console.log('[Seed] Sample Organization Units, Jobs, and Positions seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
