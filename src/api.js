const API_BASE = 'http://localhost:5001/tasks';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
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
