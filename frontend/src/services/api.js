const API_BASE = '/api/v1';

function getAuthHeader() {
  const token = localStorage.getItem('axly_token');
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

  async getTopics() {
    return request('/questions/topics');
  },

  // Daily Question
  async getDailyQuestion() {
    return request('/daily-question');
  },

  async setDailyQuestion(data) {
    return request('/daily-question', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Assignments
  async getAssignments(params = {}) {
    const query = new URLSearchParams();
    if (params.user_id) query.append('user_id', params.user_id);
    if (params.status) query.append('status', params.status);
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

  async unassign(id) {
    return request(`/assignments/${id}`, {
      method: 'DELETE'
    });
  },

  // Code Execution & Sandboxed Runner
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

  async getCodeSubmissionsHistory(questionId) {
    return request(`/code/submissions/${questionId}`);
  },

  // Submissions & Mentor Review
  async getSubmissions(params = {}) {
    const query = new URLSearchParams();
    if (params.question_id) query.append('question_id', params.question_id);
    if (params.status) query.append('status', params.status);
    if (params.review_status) query.append('review_status', params.review_status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return request(`/submissions?${query.toString()}`);
  },

  async submitViaGithub(data) {
    return request('/submissions/github', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async reviewSubmission(id, data) {
    return request(`/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async toggleSubmission(data) {
    return request('/submissions/toggle', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Progress
  async getMyProgress() {
    return request('/progress/me');
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
