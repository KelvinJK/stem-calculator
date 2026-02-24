/**
 * api.js — Centralised fetch wrapper for the STEM Calculator API.
 * Automatically injects the Authorization header from localStorage.
 */

const BASE = import.meta.env.VITE_API_URL || ''

function token() {
    return localStorage.getItem('stem_token') || ''
}

async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' }
    const t = token()
    if (t) headers['Authorization'] = `Bearer ${t}`

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data })
    return data
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
}

// Convenience auth helpers
export const authApi = {
    login: (body) => api.post('/api/auth/login', body),
    register: (body) => api.post('/api/auth/register', body),
    forgotPassword: (body) => api.post('/api/auth/forgot-password', body),
    resetPassword: (body) => api.post('/api/auth/reset-password', body),
    me: () => api.get('/api/auth/me'),
}

export const materialsApi = {
    list: (params = {}) => api.get('/api/materials?' + new URLSearchParams(params)),
    get: (id) => api.get(`/api/materials/${id}`),
    create: (body) => api.post('/api/materials', body),
    update: (id, body) => api.put(`/api/materials/${id}`, body),
    delete: (id) => api.delete(`/api/materials/${id}`),
}

export const activitiesApi = {
    list: (params = {}) => api.get('/api/activities?' + new URLSearchParams(params)),
    get: (id) => api.get(`/api/activities/${id}`),
    create: (body) => api.post('/api/activities', body),
    update: (id, body) => api.put(`/api/activities/${id}`, body),
    lock: (id, locked) => api.patch(`/api/activities/${id}/lock`, { locked }),
    delete: (id) => api.delete(`/api/activities/${id}`),
}

export const sessionsApi = {
    list: (params = {}) => api.get('/api/sessions?' + new URLSearchParams(params)),
    get: (id) => api.get(`/api/sessions/${id}`),
    create: (body) => api.post('/api/sessions', body),
    update: (id, body) => api.put(`/api/sessions/${id}`, body),
    submit: (id) => api.patch(`/api/sessions/${id}/submit`),
    approve: (id) => api.patch(`/api/sessions/${id}/approve`),
    reject: (id, note) => api.patch(`/api/sessions/${id}/reject`, { note }),
    delete: (id) => api.delete(`/api/sessions/${id}`),
    quote: (id, params) => api.get(`/api/sessions/${id}/quote?` + new URLSearchParams(params)),
}

export const invoicesApi = {
    generate: (sessionId) => api.post(`/api/invoices/${sessionId}`),
    get: (sessionId) => api.get(`/api/invoices/${sessionId}`),
    downloadUrl: (invoiceId) => `${BASE}/api/invoices/download/${invoiceId}`,
}

export const adminApi = {
    users: () => api.get('/api/admin/users'),
    changeRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, { role }),
    deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
    pending: () => api.get('/api/admin/sessions/pending'),
    analytics: () => api.get('/api/admin/analytics'),
}
