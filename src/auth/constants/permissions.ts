export enum AppPermission {
  // 1. User Management Lifecycle
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  USERS_CONFIRM = 'users:confirm',
  USERS_CANCEL = 'users:cancel',

  // 2. Documents & File I/O
  DOCUMENTS_READ = 'documents:read',
  DOCUMENTS_UPLOAD = 'documents:upload',
  DOCUMENTS_DOWNLOAD = 'documents:download',
  DOCUMENTS_CONFIRM = 'documents:confirm',
  DOCUMENTS_CANCEL = 'documents:cancel',
  DOCUMENTS_DELETE = 'documents:delete',

  // 3. Reports & Analytics
  REPORTS_VIEW = 'reports:view',
  REPORTS_DOWNLOAD = 'reports:download',
  DATA_IMPORT = 'data:import',

  // 4. Governance & System Kernel
  AUDIT_READ = 'audit:read',
  AUDIT_DOWNLOAD = 'audit:download',
  SYSTEM_CONFIGURE = 'system:configure',

  // 5. Organization Structure & Positions
  ORG_READ = 'org:read',
  ORG_MANAGE = 'org:manage',
}
