const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/tasks';

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

export async function fetchTasks() {
  return request(API_BASE);
}

export async function fetchTrashed() {
  return request(`${API_BASE}/trashed`);
}

export async function createTask(body) {
  return request(API_BASE, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateTask(id, body) {
  return request(`${API_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function moveToTrash(id) {
  return request(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export async function restoreTask(id) {
  return request(`${API_BASE}/${id}/restore`, { method: 'POST' });
}

export async function deletePermanent(id) {
  return request(`${API_BASE}/${id}/permanent`, { method: 'DELETE' });
}

const API_BASE_USERS = API_BASE.replace(/\/tasks\/?$/, '') + '/users';

export async function createUser(body) {
  return request(API_BASE_USERS, { method: 'POST', body: JSON.stringify(body) });
}

export async function loginUser(email, password) {
  return request(`${API_BASE_USERS}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCurrentUser(token) {
  return request(`${API_BASE_USERS}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function slackLogin(code) {
  return request(`${API_BASE_USERS}/slack-login`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
