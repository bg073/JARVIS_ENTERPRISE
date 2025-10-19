import { CHAT_API_BASE } from "./chat";

export type Job = {
  id: number;
  title: string;
  description: string;
  qualifications?: string | null;
  deadline: string; // ISO
  created_at: string;
};

export type Candidate = {
  id: number;
  name: string;
  email: string;
  phone_number?: string | null;
  approved: boolean;
  filtered_out: boolean;
  match_score?: number | null;
  rank?: number | null;
  resume_text?: string | null;
  resume_url?: string | null;
};

export type JobDetail = {
  job: Job;
  candidates: Candidate[];
};

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${CHAT_API_BASE}/interviewer/jobs`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createJob(input: {
  title: string;
  description: string;
  qualifications?: string;
  deadline: string; // ISO
  interviewer_emails: string[];
}): Promise<Job> {
  const res = await fetch(`${CHAT_API_BASE}/interviewer/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function autoFilter(jobId: number, minScore?: number): Promise<any> {
  const url = new URL(`${CHAT_API_BASE}/interviewer/jobs/${jobId}/autofilter`);
  if (minScore !== undefined) url.searchParams.set("min_score", String(minScore));
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function autoSchedule(jobId: number): Promise<any> {
  const res = await fetch(`${CHAT_API_BASE}/interviewer/jobs/${jobId}/autoschedule`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function applyToJob(jobId: number, input: {
  name: string;
  email: string;
  phone_number?: string;
  resume_text?: string;
  resume_url?: string;
}): Promise<Candidate> {
  const res = await fetch(`${CHAT_API_BASE}/interviewer/jobs/${jobId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getJob(jobId: number): Promise<JobDetail> {
  const res = await fetch(`${CHAT_API_BASE}/interviewer/jobs/${jobId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateCandidate(jobId: number, candidateId: number, input: { approved?: boolean }): Promise<Candidate> {
  const res = await fetch(`${CHAT_API_BASE}/interviewer/jobs/${jobId}/candidates/${candidateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
