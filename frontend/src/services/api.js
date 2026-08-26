const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('axly_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || 'An error occurred during request';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code;
    error.field = data?.error?.field;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  verifyAuth: () => request('/auth/verify', { method: 'POST' }),
  devLogin: (email, role) => request('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ email, role })
  }),

  // Questions
  getQuestions: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return request(`/questions?${query.toString()}`);
  },
  getQuestion: (id) => request(`/questions/${id}`),
  createQuestion: (data) => request('/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),
  getTopics: () => request('/questions/topics'),

  // Daily Question
  getDailyQuestion: (date) => request(`/daily-question${date ? `?date=${date}` : ''}`),
  setDailyQuestion: (data) => request('/daily-question', { method: 'POST', body: JSON.stringify(data) }),

  // Assignments
  getAssignments: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return request(`/assignments?${query.toString()}`);
  },
  createAssignment: (data) => request('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  bulkAssign: (data) => request('/assignments/bulk', { method: 'POST', body: JSON.stringify(data) }),
  unassign: (id) => request(`/assignments/${id}`, { method: 'DELETE' }),

  // Submissions
  updateSubmission: (id, status) => request(`/submissions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  toggleSubmission: (question_id, status) => request('/submissions/toggle', { method: 'POST', body: JSON.stringify({ question_id, status }) }),

  // Progress
  getMyProgress: () => request('/progress/me'),
  getAdminProgress: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return request(`/progress/admin?${query.toString()}`);
  },
  getAdminStats: () => request('/progress/stats'),

  // Users
  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return request(`/users?${query.toString()}`);
  },
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
};
