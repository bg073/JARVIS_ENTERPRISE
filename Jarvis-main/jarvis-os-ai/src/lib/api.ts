export const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_URL || "http://localhost:8001";

export async function apiPost<T>(path: string, body: any, opts: { token?: string } = {}): Promise<T> {
  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function apiGet<T>(path: string, opts: { token?: string } = {}): Promise<T> {
  const res = await fetch(`${AUTH_API_BASE}${path}`, {
    method: "GET",
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}
