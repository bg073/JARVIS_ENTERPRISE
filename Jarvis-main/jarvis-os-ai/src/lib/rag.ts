export const RAG_API_BASE = import.meta.env.VITE_RAG_API_URL || "http://localhost:8000";
const CHAT_API_BASE = (import.meta as any).env?.VITE_CHAT_API_URL || "http://localhost:8002";

export type UploadSyncResponse = {
  document_id: string;
  qdrant_points_for_file: number;
  opensearch_docs_for_file: number;
};

export type UploadParams = {
  tenant_id?: string;
  uploader_id?: string;
  space?: "documents" | "employees" | "decisions" | "memory" | "projects";
  tags?: string; // comma-separated
  project_id?: string | null;
  project_subdb?: "documents" | "main_progress" | "employees" | "key_decisions" | "memory" | "" | null;
};

export async function ragUploadSync(file: File, params: UploadParams = {}): Promise<UploadSyncResponse> {
  const fd = new FormData();
  fd.append("file", file);
  if (params.tenant_id) fd.append("tenant_id", params.tenant_id);
  if (params.uploader_id) fd.append("uploader_id", params.uploader_id);
  if (params.space) fd.append("space", params.space);
  if (params.tags) fd.append("tags", params.tags);
  if (params.project_id) fd.append("project_id", params.project_id);
  if (params.project_subdb) fd.append("project_subdb", params.project_subdb);

  // First try direct to RAG. If the browser blocks due to CORS (TypeError: Failed to fetch),
  // fall back to the chat_service proxy which has CORS allowed.
  try {
    const res = await fetch(`${RAG_API_BASE}/upload_sync`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `RAG upload failed (${res.status})`);
    }
    return res.json();
  } catch (err) {
    // Fallback via proxy
    const proxyRes = await fetch(`${CHAT_API_BASE}/rag_upload`, {
      method: "POST",
      body: fd,
    });
    if (!proxyRes.ok) {
      const text = await proxyRes.text();
      throw new Error(text || `RAG upload (proxy) failed (${proxyRes.status})`);
    }
    return proxyRes.json();
  }
}

// Projects
export async function projectsCreate(input: {
  code: string;
  name: string;
  budget?: number | null;
  headcount_target?: number | null;
  roles?: any[] | null;
  constraints?: Record<string, any> | null;
  docs?: string[] | null;
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${RAG_API_BASE}/projects/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Team Assembler
export type TeamCandidate = {
  id: number;
  employee_id: number;
  name: string;
  email: string;
  role_label: string;
  score: number;
  conflicts?: any;
  selected?: boolean;
};

export async function teamAssemble(input: {
  project_code: string;
  title?: string;
  requirements: any[];
  available_only?: boolean;
  constraints?: Record<string, any> | null;
}): Promise<{ team_id: number; candidates: TeamCandidate[] }> {
  const res = await fetch(`${RAG_API_BASE}/team/assemble`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Team Plan", available_only: true, ...input }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function teamApprove(team_id: number, input: { project_code: string; members: Array<{ employee_email: string; role_label?: string; allocation_percent?: number; start_date?: string | null; end_date?: string | null }> }): Promise<{ ok: boolean }>{
  const res = await fetch(`${RAG_API_BASE}/team/${team_id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Skills
export async function skillsOverride(input: { employee_email: string; skill_name: string; proficiency: number; confidence?: number; note?: string }): Promise<{ ok: boolean }>{
  const res = await fetch(`${RAG_API_BASE}/skills/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function skillsTimeseries(email: string): Promise<{ series: Array<{ overall_score: number; roles: any; skills: any; notes: string; created_at: string }> }>{
  const q = new URLSearchParams({ email });
  const res = await fetch(`${RAG_API_BASE}/skills/timeseries?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Memory Mesh
export async function memoryCreate(input: { project_code?: string | null; type: string; title?: string | null; text: string; tags?: string[] | null; created_by?: string | null; visibility?: string }): Promise<{ ok: boolean; id: number }>{
  const res = await fetch(`${RAG_API_BASE}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function memorySearch(project_code: string, query: string): Promise<{ results: Array<{ _id?: string; text: string }> }>{
  const q = new URLSearchParams({ project_code, query });
  const res = await fetch(`${RAG_API_BASE}/memory/search?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function memoryGraph(project_code: string): Promise<{ nodes: Array<{ id: number; type: string; title: string | null }>; edges: Array<{ src: number; dst: number; relation: string }> }>{
  const q = new URLSearchParams({ project_code });
  const res = await fetch(`${RAG_API_BASE}/memory/graph?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
