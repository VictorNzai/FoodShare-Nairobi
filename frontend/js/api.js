/**
 * FoodShare Nairobi - Centralized API Client
 * Handles all API calls to the backend with consistent error handling
 */

class FoodShareAPI {
  constructor() {
    // Use environment-based URL
    this.baseURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : 'https://foodshare-nairobi-1.onrender.com';
  }

  /**
   * Generic request handler with error handling
   */
  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ============================================
  // AUTHENTICATION ENDPOINTS
  // ============================================

  /**
   * Login user (donor, charity, or admin)
   */
  async login(email, password, role, accessKey = null) {
    const body = { email, password, role };
    if (role === 'admin' && accessKey) {
      body.accessKey = accessKey;
    }

    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Donor signup
   */
  async signupDonor(fullname, email, phone, password, confirmPassword) {
    return this.request('/signup/donor', {
      method: 'POST',
      body: JSON.stringify({ fullname, email, phone, password, confirmPassword }),
    });
  }

  /**
   * Charity signup
   */
  async signupCharity(orgname, email, phone, reg, password, confirmPassword, institutionType) {
    return this.request('/signup/charity', {
      method: 'POST',
      body: JSON.stringify({ orgname, email, phone, reg, password, confirmPassword, institutionType }),
    });
  }

  /**
   * Forgot password
   */
  async forgotPassword(email, role) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  /**
   * Reset password
   */
  async resetPassword(token, role, password, confirmPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, role, password, confirmPassword }),
    });
  }

  // ============================================
  // DONOR ENDPOINTS
  // ============================================

  /**
   * Get donor dashboard stats
   */
  async getDonorDashboardStats(donorId) {
    return this.request(`/api/donor/dashboard-stats?donor_id=${donorId}`);
  }

  /**
   * Get donor account details
   */
  async getDonorAccount(donorId) {
    return this.request(`/api/donor/account?donor_id=${donorId}`);
  }

  /**
   * Update donor account
   */
  async updateDonorAccount(donorId, updates) {
    return this.request('/api/donor/account', {
      method: 'PUT',
      body: JSON.stringify({ donor_id: donorId, ...updates }),
    });
  }

  // ============================================
  // DONATIONS ENDPOINTS
  // ============================================

  /**
   * Create a new donation
   */
  async createDonation(donationData) {
    return this.request('/api/donations', {
      method: 'POST',
      body: JSON.stringify(donationData),
    });
  }

  /**
   * Get donations for a donor
   */
  async getDonations(donorId) {
    return this.request(`/api/donations?donor_id=${donorId}`);
  }

  /**
   * Get donation analytics
   */
  async getDonationAnalytics(donorId) {
    return this.request(`/api/donations/analytics/summary?donor_id=${donorId}`);
  }

  // ============================================
  // DONOR OFFERS ENDPOINTS
  // ============================================

  /**
   * Create a donor offer to a charity
   */
  async createDonorOffer(offerData) {
    return this.request('/api/donor-offers', {
      method: 'POST',
      body: JSON.stringify(offerData),
    });
  }

  /**
   * Get donor offers
   */
  async getDonorOffers(donorId) {
    return this.request(`/api/donor-offers?donor_id=${donorId}`);
  }

  /**
   * Get offers for a charity
   */
  async getCharityOffers(charityId) {
    return this.request(`/api/donor-offers/${charityId}`);
  }

  /**
   * Accept a donor offer
   */
  async acceptOffer(offerId) {
    return this.request(`/api/donor-offers/${offerId}/accept`, {
      method: 'POST',
    });
  }

  /**
   * Mark offer as arrived
   */
  async markOfferArrived(offerId) {
    return this.request(`/api/donor-offers/${offerId}/arrived`, {
      method: 'POST',
    });
  }

  // ============================================
  // CHARITY ENDPOINTS
  // ============================================

  /**
   * Get all charities
   */
  async getCharities() {
    return this.request('/api/charities');
  }

  /**
   * Get verified charities only
   */
  async getVerifiedCharities() {
    return this.request('/api/charities?verified=true');
  }

  /**
   * Get charity requests (food needs)
   */
  async getCharityRequests() {
    return this.request('/api/charity-requests');
  }

  /**
   * Get specific charity request
   */
  async getCharityRequest(requestId) {
    return this.request(`/api/charity-requests/${requestId}`);
  }

  /**
   * Submit charity verification
   */
  async submitCharityVerification(formData) {
    return fetch(`${this.baseURL}/api/verify-charity`, {
      method: 'POST',
      body: formData, // FormData for file upload
    }).then(res => res.json());
  }

  // ============================================
  // FOOD NEEDS ENDPOINTS
  // ============================================

  /**
   * Create a food need (charity posts request)
   */
  async createFoodNeed(foodNeedData) {
    return this.request('/api/foodneeds', {
      method: 'POST',
      body: JSON.stringify(foodNeedData),
    });
  }

  /**
   * Get food needs for an organization
   */
  async getFoodNeeds(orgName) {
    return this.request(`/api/foodneeds?org=${encodeURIComponent(orgName)}`);
  }

  /**
   * Delete a food need
   */
  async deleteFoodNeed(needId) {
    return this.request(`/api/foodneeds/${needId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Mark food need as arrived
   */
  async markFoodNeedArrived(needId) {
    return this.request(`/api/foodneeds/${needId}/arrived`, {
      method: 'POST',
    });
  }

  // ============================================
  // FEEDBACK ENDPOINTS
  // ============================================

  /**
   * Submit feedback
   */
  async submitFeedback(feedbackData) {
    return this.request('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  }

  /**
   * Get all feedback (admin)
   */
  async getAllFeedback() {
    return this.request('/api/feedback');
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard() {
    return this.request('/api/admin/dashboard-data');
  }

  /**
   * Get users (with filters)
   */
  async getUsers(type = 'donor', search = '', status = '') {
    const params = new URLSearchParams({ type, search, status });
    return this.request(`/api/admin/users?${params}`);
  }

  /**
   * Get user details
   */
  async getUserDetails(type, userId) {
    return this.request(`/api/admin/users/${type}/${userId}`);
  }

  /**
   * Ban a user
   */
  async banUser(type, userId) {
    return this.request(`/api/admin/users/${type}/${userId}/ban`, {
      method: 'POST',
    });
  }

  /**
   * Unban a user
   */
  async unbanUser(type, userId) {
    return this.request(`/api/admin/users/${type}/${userId}/unban`, {
      method: 'POST',
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(type, userId) {
    return this.request(`/api/admin/users/${type}/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get charity verifications
   */
  async getCharityVerifications(status = 'all') {
    return this.request(`/api/admin/charity-verifications?status=${status}`);
  }

  /**
   * Approve charity verification
   */
  async approveCharityVerification(verificationId) {
    return this.request(`/api/admin/charity-verifications/${verificationId}/approve`, {
      method: 'POST',
    });
  }

  /**
   * Reject charity verification
   */
  async rejectCharityVerification(verificationId) {
    return this.request(`/api/admin/charity-verifications/${verificationId}/reject`, {
      method: 'POST',
    });
  }

  /**
   * Get complaints
   */
  async getComplaints(status = 'all') {
    return this.request(`/api/admin/complaints?status=${status}`);
  }

  /**
   * Update complaint status
   */
  async updateComplaintStatus(complaintId, status) {
    return this.request(`/api/admin/complaints/${complaintId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Get appeals
   */
  async getAppeals(status = 'all') {
    return this.request(`/api/admin/appeals?status=${status}`);
  }

  /**
   * Update appeal status
   */
  async updateAppealStatus(appealId, status) {
    return this.request(`/api/admin/appeals/${appealId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Generate report
   */
  async generateReport(type, dateRange) {
    return this.request('/api/admin/reports', {
      method: 'POST',
      body: JSON.stringify({ type, dateRange }),
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Health check
   */
  async healthCheck() {
    return this.request('/api/health');
  }

  /**
   * Get user from localStorage
   */
  getStoredUser() {
    try {
      const donor = localStorage.getItem('donor');
      const charity = localStorage.getItem('charity');
      const admin = localStorage.getItem('admin');

      if (donor) return { type: 'donor', data: JSON.parse(donor) };
      if (charity) return { type: 'charity', data: JSON.parse(charity) };
      if (admin) return { type: 'admin', data: JSON.parse(admin) };

      return null;
    } catch (error) {
      console.error('Error reading user from localStorage:', error);
      return null;
    }
  }

  /**
   * Store user in localStorage
   */
  storeUser(type, userData) {
    localStorage.setItem(type, JSON.stringify(userData));
  }

  /**
   * Clear user from localStorage (logout)
   */
  clearUser() {
    localStorage.removeItem('donor');
    localStorage.removeItem('charity');
    localStorage.removeItem('admin');
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.getStoredUser() !== null;
  }
}

// Create and export a singleton instance
const api = new FoodShareAPI();

// Make it available globally for easy access
window.FoodShareAPI = api;

