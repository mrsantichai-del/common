/**
 * Enterprise API Client SDK
 * Encapsulates AES-256 Symmetric Payload Encryption and JWT Authentication
 * Points to Backend REST API at http://localhost:3000
 */
class ApiClient {
  constructor(config = {}) {
    // Points explicitly to the Backend Server Port (3000)
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.sharedKey = config.sharedKey || 'aes-shared-payload-key-secret-2026-v1';
    this.encryptionEnabled = config.encryptionEnabled !== undefined ? config.encryptionEnabled : true;
    this.tokenKey = 'app_jwt_token';
    this.userKey = 'app_user_profile';
    this.onWireTelemetry = config.onWireTelemetry || null;

    // Domain API namespaces
    this.auth = this._createAuthModule();
    this.users = this._createUsersModule();
    this.admin = this._createAdminModule();
    this.masterTable = this._createMasterTableModule();
    this.organization = this._createOrganizationModule();
  }

  setEncryption(enabled) {
    this.encryptionEnabled = Boolean(enabled);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }

  getCurrentUser() {
    const raw = localStorage.getItem(this.userKey);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  encrypt(data) {
    if (!window.CryptoJS) {
      console.warn('CryptoJS not found. Proceeding with plaintext.');
      return data;
    }
    const rawText = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(rawText, this.sharedKey).toString();
  }

  decrypt(ciphertext) {
    if (!window.CryptoJS) return ciphertext;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.sharedKey);
      const str = bytes.toString(CryptoJS.enc.Utf8);
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    } catch (err) {
      console.error('Decryption error:', err);
      return ciphertext;
    }
  }

  async request(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let outgoingWire = 'None (GET/Empty)';
    let fetchBody = null;

    const hasCrypto = typeof window !== 'undefined' && Boolean(window.CryptoJS);
    const canEncrypt = this.encryptionEnabled && hasCrypto;

    if (options.body && method !== 'GET') {
      if (canEncrypt) {
        headers['X-Payload-Encrypted'] = 'true';
        const ciphertext = this.encrypt(options.body);
        outgoingWire = ciphertext;
        fetchBody = JSON.stringify({ encryptedData: ciphertext });
      } else {
        outgoingWire = JSON.stringify(options.body);
        fetchBody = outgoingWire;
      }
    } else if (canEncrypt) {
      headers['X-Payload-Encrypted'] = 'true';
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: fetchBody,
      });

      const rawJson = await response.json();
      let incomingWire = JSON.stringify(rawJson);
      let payload = rawJson;

      if (rawJson && rawJson.isEncrypted && rawJson.encryptedData) {
        incomingWire = rawJson.encryptedData;
        payload = this.decrypt(rawJson.encryptedData);
      }

      if (this.onWireTelemetry) {
        this.onWireTelemetry({
          endpoint,
          method,
          status: response.status,
          outgoingWire,
          incomingWire,
          isEncrypted: this.encryptionEnabled,
        });
      }

      if (!response.ok) {
        const error = new Error(payload.message || 'API request failed');
        error.status = response.status;
        error.data = payload;
        throw error;
      }

      return payload;
    } catch (err) {
      if (this.onWireTelemetry && !err.status) {
        this.onWireTelemetry({
          endpoint,
          method,
          status: 500,
          outgoingWire,
          incomingWire: 'ERR: ' + err.message,
          isEncrypted: this.encryptionEnabled,
        });
      }
      throw err;
    }
  }

  _createAuthModule() {
    return {
      login: async (username, password) => {
        const res = await this.request('/auth/login', {
          method: 'POST',
          body: { username, password },
        });
        if (res && res.accessToken) {
          this.setToken(res.accessToken);
          this.setCurrentUser(res.user);
        }
        return res;
      },
      register: async (username, password, groups = ['GENERAL_USER']) => {
        return this.request('/auth/register', {
          method: 'POST',
          body: { username, password, groups },
        });
      },
      getProfile: async () => {
        const user = await this.request('/auth/me');
        this.setCurrentUser(user);
        return user;
      },
      getAvailableGroups: async () => {
        return this.request('/auth/groups');
      },
      getPublicInfo: async () => {
        return this.request('/auth/public-info');
      },
      getDemoAccounts: async () => {
        return this.request('/auth/demo-accounts');
      },
      getMenus: async () => {
        return this.request('/auth/menus');
      },
      logout: () => {
        this.setToken(null);
      },
    };
  }

  _createUsersModule() {
    return {
      getProfile: () => this.request('/users/profile'),
      listUsers: () => this.request('/users/list'),
      readDocument: () => this.request('/users/documents/read'),
      confirmDocument: (documentId = 'DOC-88') =>
        this.request('/users/documents/confirm', { method: 'POST', body: { documentId } }),
      cancelDocument: (documentId = 'DOC-88') =>
        this.request('/users/documents/cancel', { method: 'POST', body: { documentId } }),
      uploadDocument: (data = { file: 'attachment.pdf' }) =>
        this.request('/users/documents/upload', { method: 'POST', body: data }),
      downloadDocument: () => this.request('/users/documents/download'),
      downloadReports: () => this.request('/users/reports/download'),
      getAuditLog: () => this.request('/users/audit/read'),
      downloadAuditLog: () => this.request('/users/audit/download'),
      configureSystem: (params = { kernelMode: 'AES-256' }) =>
        this.request('/users/system/config', { method: 'POST', body: params }),
    };
  }

  _createAdminModule() {
    return {
      getUsers: () => this.request('/admin/users'),
      assignUserGroups: (userId, groups) =>
        this.request(`/admin/users/${userId}/groups`, { method: 'PATCH', body: { groups } }),
      deleteUser: (userId) =>
        this.request(`/admin/users/${userId}`, { method: 'DELETE' }),
      getGroups: () => this.request('/admin/groups'),
      createGroup: (name, description = '', permissions = []) =>
        this.request('/admin/groups', { method: 'POST', body: { name, description, permissions } }),
      updateGroupPermissions: (groupId, permissions) =>
        this.request(`/admin/groups/${groupId}`, { method: 'PATCH', body: { permissions } }),
      deleteGroup: (groupId) =>
        this.request(`/admin/groups/${groupId}`, { method: 'DELETE' }),
      getPermissions: () => this.request('/admin/permissions'),
      createPermission: (code, description = '') =>
        this.request('/admin/permissions', { method: 'POST', body: { code, description } }),
    };
  }

  _createMasterTableModule() {
    return {
      findAll: (table, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        const url = `/master-table/${table}${qs ? '?' + qs : ''}`;
        return this.request(url);
      },
      findOne: (table, id) => this.request(`/master-table/${table}/${id}`),
      create: (table, data) =>
        this.request(`/master-table/${table}`, { method: 'POST', body: data }),
      update: (table, id, data) =>
        this.request(`/master-table/${table}/${id}`, { method: 'PATCH', body: data }),
      delete: (table, id) =>
        this.request(`/master-table/${table}/${id}`, { method: 'DELETE' }),
      confirmDocument: (id) =>
        this.request(`/master-table/documents/${id}/confirm`, { method: 'POST' }),
      cancelDocument: (id, reason = 'Cancelled by user') =>
        this.request(`/master-table/documents/${id}/cancel`, { method: 'POST', body: { reason } }),
      bulkImport: (table, items) =>
        this.request(`/master-table/${table}/import`, { method: 'POST', body: { items } }),
      exportFile: (table, format = 'csv') =>
        this.request(`/master-table/${table}/export/file?format=${format}`),
    };
  }

  _createOrganizationModule() {
    return {
      getChart: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/organization/chart${qs ? '?' + qs : ''}`);
      },
      getUnits: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/organization/units${qs ? '?' + qs : ''}`);
      },
      getUnit: (id) => this.request(`/organization/units/${id}`),
      createUnit: (data) =>
        this.request('/organization/units', { method: 'POST', body: data }),
      updateUnit: (id, data) =>
        this.request(`/organization/units/${id}`, { method: 'PATCH', body: data }),
      deleteUnit: (id) =>
        this.request(`/organization/units/${id}`, { method: 'DELETE' }),

      getJobs: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/organization/jobs${qs ? '?' + qs : ''}`);
      },
      createJob: (data) =>
        this.request('/organization/jobs', { method: 'POST', body: data }),
      updateJob: (id, data) =>
        this.request(`/organization/jobs/${id}`, { method: 'PATCH', body: data }),
      deleteJob: (id) =>
        this.request(`/organization/jobs/${id}`, { method: 'DELETE' }),

      getPositions: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/organization/positions${qs ? '?' + qs : ''}`);
      },
      createPosition: (data) =>
        this.request('/organization/positions', { method: 'POST', body: data }),
      updatePosition: (id, data) =>
        this.request(`/organization/positions/${id}`, { method: 'PATCH', body: data }),
      deletePosition: (id) =>
        this.request(`/organization/positions/${id}`, { method: 'DELETE' }),
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
} else {
  window.ApiClient = ApiClient;
}
