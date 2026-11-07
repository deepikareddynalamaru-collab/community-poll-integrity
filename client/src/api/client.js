const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
};

const API_BASE_URL = resolveBaseUrl();

let memoryToken = localStorage.getItem('poll_token') || null;

export const setAuthToken = (token) => {
  memoryToken = token;
  if (token) {
    localStorage.setItem('poll_token', token);
  } else {
    localStorage.removeItem('poll_token');
  }
};

export const getAuthToken = () => {
  return memoryToken || localStorage.getItem('poll_token');
};

export const apiRequest = async (endpoint, options = {}) => {
  // Ensure endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Ensure /api is present in the final path without duplication
  let finalPath = cleanEndpoint;
  if (API_BASE_URL.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    finalPath = cleanEndpoint.slice(4); // Avoid duplicate /api/api/...
  } else if (!API_BASE_URL.endsWith('/api') && !cleanEndpoint.startsWith('/api/')) {
    finalPath = `/api${cleanEndpoint}`; // Guarantee /api prefix is present
  }

  const url = `${API_BASE_URL}${finalPath}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const error = new Error(`Network error connecting to ${url}: ${netErr.message}`);
    error.status = 0;
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || response.statusText || 'Request failed');
    error.status = response.status;
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.data = data;
    throw error;
  }

  return data;
};
