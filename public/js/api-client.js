/**
 * Enterprise API Client SDK
 * Encapsulates AES-256 Symmetric Payload Encryption and JWT Authentication
 */
class ApiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || window.location.origin;
    this.sharedKey = config.sharedKey || 'aes-shared-payload-key-secret-2026-v1';
    this.encryptionEnabled = config.encryptionEnabled !== undefined ? config.encryptionEnabled : true;
    this.tokenKey = 'app_jwt_token';
    this.userKey = 'app_user_profile';
    this.onWireTelemetry = config.onWireTelemetry || null;

    // Domain API namespaces
    this.auth = this._createAuthModule();
    this.users = this._createUsersModule();
    this.admin = this._createAdminModule();
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

    if (options.body && method !== 'GET') {
      if (this.encryptionEnabled) {
        headers['X-Payload-Encrypted'] = 'true';
        const ciphertext = this.encrypt(options.body);
        outgoingWire = ciphertext;
        fetchBody = JSON.stringify({ encryptedData: ciphertext });
      } else {
        outgoingWire = JSON.stringify(options.body);
        fetchBody = outgoingWire;
      }
    } else if (this.encryptionEnabled) {
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
}

// Export for ES modules or attach to window for Vanilla JS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
} else {
  window.ApiClient = ApiClient;
}
