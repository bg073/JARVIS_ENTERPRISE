import { CHAT_API_BASE } from "./chat";

export type Product = {
  id: number;
  slug: string;
  name: string;
  purchased: boolean;
};

export type AccessGrant = {
  id: number;
  access_level: string;
  active: boolean;
  product: Product;
};

export type Employee = {
  id: number;
  name: string;
  personal_email?: string | null;
  phone_number?: string | null;
  company_email: string;
  role: string;
  project?: string | null;
  status: string;
  created_at: string;
  access_grants: AccessGrant[];
  privileges: Privilege[];
};

export type Privilege = {
  id: number;
  scope: string;
  level: string;
  notes?: string | null;
  active: boolean;
};

export type DailyMetric = {
  day: string;
  commits: number;
  pull_requests: number;
  tickets_closed: number;
  meetings: number;
  messages: number;
  hours_worked?: number | null;
  score?: number | null;
  metrics_json?: any;
};

export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${CHAT_API_BASE}/smart/products`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createProduct(input: { slug: string; name: string; purchased?: boolean }): Promise<Product> {
  const res = await fetch(`${CHAT_API_BASE}/smart/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purchased: true, ...input }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listEmployees(): Promise<Employee[]> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateEmployee(employeeId: number, input: Partial<Pick<Employee, "role" | "project" | "status">>): Promise<Employee> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addGrant(employeeId: number, input: { product_id: number; access_level?: string }): Promise<AccessGrant> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}/grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_level: "user", ...input }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateGrant(employeeId: number, grantId: number, input: { access_level?: string; active?: boolean }): Promise<AccessGrant> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}/grants/${grantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteGrant(employeeId: number, grantId: number): Promise<{ ok: boolean }> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}/grants/${grantId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function provisionFromCandidate(input: { candidate_id: number; role?: string; project?: string | null }): Promise<Employee> {
  const res = await fetch(`${CHAT_API_BASE}/smart/provision_from_candidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "DEV", ...input }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Privileges
export async function addPrivilege(employeeId: number, input: { scope: string; level: string; notes?: string }): Promise<Privilege> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}/privileges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePrivilege(employeeId: number, privilegeId: number, input: { scope?: string; level?: string; notes?: string; active?: boolean }): Promise<Privilege> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}/privileges/${privilegeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deletePrivilege(employeeId: number, privilegeId: number): Promise<{ ok: boolean }> {
  const res = await fetch(`${CHAT_API_BASE}/smart/employees/${employeeId}/privileges/${privilegeId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Daily Metrics
export async function getDailyMetrics(params: { email: string; start?: string; end?: string }): Promise<DailyMetric[]> {
  const q = new URLSearchParams();
  q.set("email", params.email);
  if (params.start) q.set("start", params.start);
  if (params.end) q.set("end", params.end);
  const res = await fetch(`${CHAT_API_BASE}/smart/metrics/daily?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function upsertDailyMetrics(input: {
  email: string;
  name_hint?: string;
  day: string;
  commits?: number;
  pull_requests?: number;
  tickets_closed?: number;
  meetings?: number;
  messages?: number;
  hours_worked?: number;
  score?: number;
  metrics_json?: any;
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${CHAT_API_BASE}/smart/metrics/daily`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
