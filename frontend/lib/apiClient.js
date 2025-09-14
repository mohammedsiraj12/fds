// Neo4j API client configuration
const API_BASE_URL = 'http://localhost:8002';

export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  get: async (endpoint) => {
    return this.request(endpoint, { method: 'GET' });
  },
  
  post: async (endpoint, data) => {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  },
  
  put: async (endpoint, data) => {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  },
  
  delete: async (endpoint) => {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // Authentication methods
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    if (response.access_token) {
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  async register(email, password, role = 'patient') {
    const response = await this.post('/auth/signup', { email, password, role });
    if (response.access_token) {
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Video Conferencing methods
  async createVideoRoom(roomData) {
    return this.post('/video/rooms/create', roomData);
  },

  async getVideoRoom(roomId, token) {
    return this.get(`/video/rooms/${roomId}?token=${token}`);
  },

  async updateRoomStatus(roomId, statusData) {
    return this.put(`/video/rooms/${roomId}/status`, statusData);
  },

  async getMyVideoRooms(status = null, limit = 20) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (status) params.append('status', status);
    return this.get(`/video/rooms/my-rooms?${params}`);
  },

  async sendVideoInvite(roomId, message = null) {
    return this.post(`/video/rooms/${roomId}/invite`, { invite_message: message });
  },

  async getRoomMessages(roomId) {
    return this.get(`/video/rooms/${roomId}/messages`);
  },

  async createEmergencyRoom() {
    return this.post('/video/emergency/create');
  },

  async getRoomRecording(roomId) {
    return this.get(`/video/rooms/${roomId}/recording`);
  },

  async getVideoStats() {
    return this.get('/video/stats/usage');
  },

  // Admin methods
  async getAdminAnalytics() {
    return this.get('/admin/dashboard/analytics');
  },

  async getAllUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    
    return this.get(`/admin/users?${params}`);
  },

  async manageUser(userId, action, reason = null) {
    return this.put(`/admin/users/${userId}/manage`, { 
      action, 
      reason 
    });
  },

  async getDailyReport(date = null) {
    const params = date ? `?date=${date}` : '';
    return this.get(`/admin/reports/daily${params}`);
  },

  async getMonthlyReport(year = null, month = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    
    return this.get(`/admin/reports/monthly?${params}`);
  },

  async getSystemHealth() {
    return this.get('/admin/system/health');
  },

  async updateSystemSettings(settingName, settingValue, category) {
    return this.post('/admin/system/settings', {
      setting_name: settingName,
      setting_value: settingValue,
      category
    });
  },

  async getSystemSettings() {
    return this.get('/admin/system/settings');
  },

  async getAuditLog(filters = {}) {
    const params = new URLSearchParams();
    if (filters.action) params.append('action', filters.action);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.limit) params.append('limit', filters.limit);
    
    return this.get(`/admin/audit-log?${params}`);
  }
};
