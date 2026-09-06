const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

function getAuthHeader() {
  const token = localStorage.getItem('axly_auth_token') || localStorage.getItem('axly_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...getAuthHeader(), ...options.headers };
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
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
  async verifyAuth() { return request('/auth/verify'); },
  async signup(data) { return request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }); },
  async verifyOtp(data) { return request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }); },
  async resendOtp(data) { return request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }); },
  async login(data) { return request('/auth/login', { method: 'POST', body: JSON.stringify(data) }); },
  async verifyEmail(data) { return request('/auth/verify-email', { method: 'POST', body: JSON.stringify(data) }); },
  async resendVerification(data) { return request('/auth/resend-verification', { method: 'POST', body: JSON.stringify(data) }); },
  async forgotPassword(data) { return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }); },
  async resetPassword(data) { return request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }); },
  async devLogin(email, role = 'user') { return request('/auth/dev-login', { method: 'POST', body: JSON.stringify({ email, role }) }); },
  async getQuestions(params = {}) { const q = new URLSearchParams(); if (params.difficulty) q.append('difficulty', params.difficulty); if (params.topic_id) q.append('topic_id', params.topic_id); if (params.assigned !== undefined) q.append('assigned', params.assigned); if (params.search) q.append('search', params.search); if (params.status) q.append('status', params.status); if (params.page) q.append('page', params.page); if (params.limit) q.append('limit', params.limit); return request(`/questions?${q}`); },
  async getQuestionById(id) { return request(`/questions/${id}`); },
  async createQuestion(data) { return request('/questions', { method: 'POST', body: JSON.stringify(data) }); },
  async updateQuestion(id, data) { return request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async validateQuestion(id) { return request(`/questions/${id}/validate`, { method: 'POST' }); },
  async deleteQuestion(id) { return request(`/questions/${id}`, { method: 'DELETE' }); },
  async getQuestionVersions(id) { return request(`/questions/${id}/versions`); },
  async getQuestionVersion(id, version) { return request(`/questions/${id}/versions/${version}`); },
  async compareQuestionVersions(id, v1, v2) { return request(`/questions/${id}/versions/compare?v1=${v1}&v2=${v2}`); },
  async restoreQuestionVersion(id, version) { return request(`/questions/${id}/versions/${version}/restore`, { method: 'POST' }); },
  async generateAIQuestion(data) { return request('/ai-questions/generate', { method: 'POST', body: JSON.stringify(data) }); },
  async getDailyQuestion() { return request('/daily-challenges/today'); },
  async getTodayDailyChallenge() { return request('/daily-challenges/today'); },
  async getDailyChallenges(params = {}) { const q = new URLSearchParams(); for (const k of ['status', 'difficulty', 'topic_id', 'search', 'date', 'page', 'limit']) { if (params[k]) q.append(k, params[k]); } return request(`/daily-challenges?${q}`); },
  async getDailyChallenge(id) { return request(`/daily-challenges/${id}`); },
  async createDailyChallenge(data) { return request('/daily-challenges', { method: 'POST', body: JSON.stringify(data) }); },
  async generateDailyChallengeAI(data) { return request('/daily-challenges/generate-ai', { method: 'POST', body: JSON.stringify(data) }); },
  async generateDailyChallengeTestCases(data) { return request('/daily-challenges/generate-ai/test-cases', { method: 'POST', body: JSON.stringify(data) }); },
  async generateDailyChallengeHints(data) { return request('/daily-challenges/generate-ai/hints', { method: 'POST', body: JSON.stringify(data) }); },
  async validateChallengeDuplicate(data) { return request('/daily-challenges/validate-duplicate', { method: 'POST', body: JSON.stringify(data) }); },
  async updateDailyChallenge(id, data) { return request(`/daily-challenges/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async scheduleDailyChallenge(id, data) { return request(`/daily-challenges/${id}/schedule`, { method: 'POST', body: JSON.stringify(data) }); },
  async publishDailyChallenge(id) { return request(`/daily-challenges/${id}/publish`, { method: 'POST' }); },
  async publishNowDailyChallenge(id) { return request(`/daily-challenges/${id}/publish-now`, { method: 'POST' }); },
  async unpublishDailyChallenge(id) { return request(`/daily-challenges/${id}/unpublish`, { method: 'POST' }); },
  async archiveDailyChallenge(id) { return request(`/daily-challenges/${id}/archive`, { method: 'POST' }); },
  async getDailyChallengeTopics() { return request('/daily-challenges/topics'); },
  async recommendDailyChallengeTopic(params = {}) { return request('/daily-challenges/recommend-topic', { method: 'POST', body: JSON.stringify(params) }); },
  async deleteDailyChallenge(id) { return request(`/daily-challenges/${id}`, { method: 'DELETE' }); },
  async getDailyChallengeAutomationStatus() { return request('/daily-challenges/automation/status'); },
  async updateDailyChallengeAutomationSettings(data) { return request('/daily-challenges/automation/settings', { method: 'PATCH', body: JSON.stringify(data) }); },
  async runDailyChallengeAutomationNow(data = {}) { return request('/daily-challenges/automation/run-now', { method: 'POST', body: JSON.stringify(data) }); },
  async getDailyChallengeAutomationLogs(limit = 20) { return request(`/daily-challenges/automation/logs?limit=${limit}`); },
  async runCode(data) { return request('/code/run', { method: 'POST', body: JSON.stringify(data) }); },
  async submitCode(data) { return request('/code/submit', { method: 'POST', body: JSON.stringify(data) }); },
  async getCodeSubmissions(questionId) { return request(`/code/submissions/${questionId}`); },
  async getCodeSubmissionsHistory(questionId) { return this.getCodeSubmissions(questionId); },
  async submitChallenge(data) { return request('/submissions', { method: 'POST', body: JSON.stringify(data) }); },
  async submitViaGithub(data) { return request('/submissions/github', { method: 'POST', body: JSON.stringify(data) }); },
  async getSubmissions(params = {}) { const q = new URLSearchParams(); for (const k of ['status', 'review_status', 'submission_type', 'user_id', 'question_id', 'page', 'limit', 'search']) { if (params[k]) q.append(k, params[k]); } return request(`/submissions?${q}`); },
  async reviewSubmission(id, data) { return request(`/submissions/${id}/review`, { method: 'POST', body: JSON.stringify(data) }); },
  async aiReviewSubmission(id) { return request(`/submissions/${id}/ai-review`, { method: 'POST' }); },
  async getAssignments(params = {}) { const q = new URLSearchParams(); for (const k of ['status', 'user_id', 'cohort_id', 'priority', 'page', 'limit']) { if (params[k]) q.append(k, params[k]); } return request(`/assignments?${q}`); },
  async createAssignment(data) { return request('/assignments', { method: 'POST', body: JSON.stringify(data) }); },
  async bulkAssign(data) { return request('/assignments/bulk', { method: 'POST', body: JSON.stringify(data) }); },
  async unassignAssignment(id) { return request(`/assignments/${id}`, { method: 'DELETE' }); },
  async updateAssignmentStatus(id, status) { return request(`/assignments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
  async getTopics() { return request('/questions/topics'); },
  async getCohorts() { return request('/cohorts'); },
  async createCohort(data) { return request('/cohorts', { method: 'POST', body: JSON.stringify(data) }); },
  async addCohortMember(cohortId, userId) { return request(`/cohorts/${cohortId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }); },
  async removeCohortMember(cohortId, userId) { return request(`/cohorts/${cohortId}/members/${userId}`, { method: 'DELETE' }); },
  async assignCohortChallenge(cohortId, data) { return request(`/cohorts/${cohortId}/assign`, { method: 'POST', body: JSON.stringify(data) }); },
  async startLiveSession(cohortId, data) { return request(`/cohorts/${cohortId}/live-session`, { method: 'POST', body: JSON.stringify(data) }); },
  async getNotifications(params = {}) { const q = new URLSearchParams(); if (params.category) q.append('category', params.category); if (params.unreadOnly) q.append('unreadOnly', params.unreadOnly); if (params.page) q.append('page', params.page); if (params.limit) q.append('limit', params.limit); const qs = q.toString(); return request(`/notifications${qs ? `?${qs}` : ''}`); },
  async markNotificationAsRead(id) { return request(`/notifications/${id}/read`, { method: 'PATCH' }); },
  async markAllNotificationsAsRead(category = null) { return request('/notifications/read-all', { method: 'POST', body: JSON.stringify(category ? { category } : {}) }); },
  async getUserAnalytics(userId) { return request(userId ? `/analytics/users/${userId}` : '/analytics/me'); },
  async getRecommendations(limit = 8) { return request(`/recommendations?limit=${limit}`); },
  async getAdminStats() { try { return await request('/analytics/admin/stats'); } catch { return request('/progress/stats'); } },
  async getAdminProgress(params = {}) { const q = new URLSearchParams(); if (params.page) q.append('page', params.page); if (params.limit) q.append('limit', params.limit); if (params.search) q.append('search', params.search); return request(`/progress/admin?${q}`); },
  async getMyProfile() { return request('/users/profile/me'); },
  async updateMyProfile(data) { return request('/users/profile/me', { method: 'PATCH', body: JSON.stringify(data) }); },
  async getLeaderboard(period = 'all') { const q = new URLSearchParams({ period }); return request(`/users/leaderboard?${q}`); },
  async getUsers(params = {}) { const q = new URLSearchParams(); for (const k of ['role', 'search', 'page', 'limit']) { if (params[k]) q.append(k, params[k]); } return request(`/users?${q}`); },
  async getUserById(id) { return request(`/users/${id}`); },
  async updateUserRole(id, role) { return request(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role })); },
  async getAdminProgressStats() { return request('/progress/stats'); },
  async getAuditLogs(params = {}) { const q = new URLSearchParams(); for (const k of ['action', 'resource_type', 'actor_id', 'from_date', 'to_date', 'page', 'limit']) { if (params[k]) q.append(k, params[k]); } return request(`/admin/audit-logs?${q}`); },
  async analyzeDsaQuestion(data) { return request('/dsa-ai/analyze', { method: 'POST', body: JSON.stringify(data) }); },
  async generateDsaGuidance(data) { return request('/dsa-ai/generate', { method: 'POST', body: JSON.stringify(data) }); },
  async getDsaAiCoach(data) { return request('/dsa-ai/coach', { method: 'POST', body: JSON.stringify(data) }); },
  async verifyDsaCode(data) { return request('/dsa-ai/verify', { method: 'POST', body: JSON.stringify(data) }); }
};
