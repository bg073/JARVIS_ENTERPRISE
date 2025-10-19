import { apiPost, apiGet } from "@/lib/api";

export type Role = "CEO" | "IT" | "DEV" | "HR" | "PM";
export type User = { id: number; email: string; role: Role };

const STORAGE_USER = "jarvis.currentUser";
const STORAGE_TOKEN = "jarvis.authToken";

export async function loginAsync(email: string, password: string): Promise<User> {
  const res = await apiPost<{ access_token: string; token_type: string; user: User }>(
    "//auth/login".replace("//", "/"),
    { email, password }
  );
  localStorage.setItem(STORAGE_TOKEN, res.access_token);
  localStorage.setItem(STORAGE_USER, JSON.stringify(res.user));
  return res.user;
}

export async function signupAsync(email: string, password: string, role: Role = "DEV"): Promise<User> {
  // Create user
  await apiPost<User>("//auth/signup".replace("//", "/"), { email, password, role });
  // Then login to obtain token
  return loginAsync(email, password);
}

export function logout() {
  localStorage.removeItem(STORAGE_USER);
  localStorage.removeItem(STORAGE_TOKEN);
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_TOKEN);
}

export function getHomePathForRole(role: Role): string {
  switch (role) {
    case "CEO":
      return "/dashboard";
    case "IT":
      return "/dashboard-it";
    case "DEV":
      return "/dashboard-dev";
    case "HR":
      return "/dashboard-hr";
    case "PM":
      return "/dashboard-pm";
    default:
      return "/dashboard";
  }
}

export function canAccess(path: string, role: Role): boolean {
  // Paths restrictions per requirements
  const restrictedForIT = ["/access", "/interviewer", "/employees", "/team"]; // hide smart access, ai interviewer, employee db, team assembler
  const restrictedForDEV = ["/access", "/interviewer", "/employees", "/team"]; // same as programmer restrictions
  const restrictedForPM = ["/access", "/interviewer", "/employees"]; // PM can access team assembler
  switch (role) {
    case "CEO":
    case "HR":
      return true;
    case "IT":
      return !restrictedForIT.some((p) => path.startsWith(p));
    case "DEV":
      return !restrictedForDEV.some((p) => path.startsWith(p));
    case "PM":
      return !restrictedForPM.some((p) => path.startsWith(p));
    default:
      return false;
  }
}
