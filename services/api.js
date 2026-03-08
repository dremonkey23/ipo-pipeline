import { getToken } from './auth';

const API_BASE = __DEV__
  ? 'http://localhost:3002/api'
  : 'https://ipo-pipeline.onrender.com/api';

async function apiFetch(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── IPO Endpoints ──────────────────────────────────────────

export async function getIPOs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/ipos?${qs}`);
}

export async function getAllIPOs(params = {}) {
  // Fetch all IPOs for client-side filtering (up to 1000)
  const merged = { ...params, all: 'true', limit: '1000' };
  const qs = new URLSearchParams(merged).toString();
  return apiFetch(`/ipos?${qs}`);
}

export async function getIPODetail(id) {
  return apiFetch(`/ipos/${id}`);
}

export async function getIPOPipeline() {
  return apiFetch('/ipos/pipeline');
}

export async function getIPOStats() {
  return apiFetch('/ipos/stats');
}

export async function getIPOFilings(id) {
  return apiFetch(`/ipos/${id}/filings`);
}

export async function getIPOTimeline(id) {
  return apiFetch(`/ipos/${id}/timeline`);
}

// ─── Alerts ─────────────────────────────────────────────────

export async function getAlerts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/alerts?${qs}`);
}

export async function markAlertRead(id) {
  return apiFetch(`/alerts/${id}/read`, { method: 'PUT' });
}

export async function markAllAlertsRead() {
  return apiFetch('/alerts/read-all', { method: 'PUT' });
}

// ─── Watchlist ──────────────────────────────────────────────

export async function getWatchlist() {
  return apiFetch('/watchlist');
}

export async function addToWatchlist(companyId) {
  return apiFetch('/watchlist', {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId }),
  });
}

export async function removeFromWatchlist(companyId) {
  return apiFetch(`/watchlist/${companyId}`, { method: 'DELETE' });
}
