const API_BASE = '/api/v1';

function getAuthHeader() {
  const token = localStorage.getItem('axly_auth_token') || localStorage.getItem('axly_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'An unexpected error occurred');
    error.status = response.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth methods
  async verifyAuth() {
    return request('/auth/verify');
  },

  async devLogin(email, role = 'user') {
    return request('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, role })
    });
  },

  // Questions / Challenges
  async getQuestions(params = {}) {
    const query = new URLSearchParams();
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.topic_id) query.append('topic_id', params.topic_id);
    if (params.assigned !== undefined) query.append('assigned', params.assigned);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return request(`/questions?${query.toString()}`);
  },

  async getQuestionById(id) {
    return request(`/questions/${id}`);
  },

  async createQuestion(data) {
    return request('/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateQuestion(id, data) {
    return request(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteQuestion(id) {
    return request(`/questions/${id}`, {
      method: 'DELETE'
    });
  },

  // Daily Spotlight
  async getDailyQuestion() {
    return request('/daily');
  },

  async setDailyQuestion(data) {
    return request('/daily', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // In-Platform Code Runner
  async runCode(data) {
    return request('/code/run', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async submitCode(data) {
    return request('/code/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getCodeSubmissions(questionId) {
    return request(`/code/submissions/${questionId}`);
  },

  // Backward-compatible alias used by the problem workspace.
  async getCodeSubmissionsHistory(questionId) {
    return this.getCodeSubmissions(questionId);
  },

  // Dual Submissions & Mentor Review
  async submitChallenge(data) {
    return request('/submissions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // GitHub submission endpoint: POST /submissions/github
  async submitViaGithub(data) {
    return request('/submissions/github', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getSubmissions(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.review_status) query.append('review_status', params.review_status);
    if (params.submission_type) query.append('submission_type', params.submission_type);
    if (params.user_id) query.append('user_id', params.user_id);
    if (params.question_id) query.append('question_id', params.question_id);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return request(`/submissions?${query.toString()}`);
  },

  // Backend review route is POST /submissions/:id/review.
  async reviewSubmission(id, data) {
    return request(`/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Assignments
  async getAssignments(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.user_id) query.append('user_id', params.user_id);
    if (params.cohort_id) query.append('cohort_id', params.cohort_id);
    if (params.priority) query.append('priority', params.priority);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return request(`/assignments?${query.toString()}`);
  },

  async createAssignment(data) {
    return request('/assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async bulkAssign(data) {
    return request('/assignments/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateAssignmentStatus(id, status) {
    return request(`/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Topics
  async getTopics() {
    return request('/topics');
  },

  async createTopic(name) {
    return request('/topics', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  // Cohorts
  async getCohorts() {
    return request('/cohorts');
  },

  async getCohortById(id) {
    return request(`/cohorts/${id}`);
  },

  async createCohort(data) {
    return request('/cohorts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async addCohortMember(cohortId, userId) {
    return request(`/cohorts/${cohortId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    });
  },

  async removeCohortMember(cohortId, userId) {
    return request(`/cohorts/${cohortId}/members/${userId}`, {
      method: 'DELETE'
    });
  },

  async assignCohortChallenge(cohortId, data) {
    return request(`/cohorts/${cohortId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async startLiveSession(cohortId, data) {
    return request(`/cohorts/${cohortId}/live-session`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Notifications
  async getNotifications() {
    return request('/notifications');
  },

  async markNotificationAsRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  async markAllNotificationsAsRead() {
    return request('/notifications/read-all', {
      method: 'POST'
    });
  },

  // User Profile & Leaderboard
  async getMyProfile() {
    return request('/users/profile/me');
  },

  async updateMyProfile(data) {
    return request('/users/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async getLeaderboard() {
    return request('/users/leaderboard');
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return request(`/users?${query.toString()}`);
  },

  async getUserById(id) {
    return request(`/users/${id}`);
  },

  async updateUserRole(id, role) {
    return request(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }
};
