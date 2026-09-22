export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:8005/api/v1`;
    }
    return `${window.location.origin}/api/v1`;
  }
  return 'https://cs2.hfl-nodes.pro/api/v1';
};

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const API_BASE = getApiBase();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `HTTP error ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}
