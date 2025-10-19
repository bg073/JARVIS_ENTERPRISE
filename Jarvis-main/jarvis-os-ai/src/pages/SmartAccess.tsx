import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Shield, Lock, Unlock, Search, UserCheck, AlertTriangle, Clock, Plus, Trash2 } from "lucide-react";
import { addGrant, createProduct, deleteGrant, listEmployees, listProducts, updateEmployee, updateGrant, addPrivilege, updatePrivilege, deletePrivilege, getDailyMetrics, upsertDailyMetrics, type Employee, type Product, type Privilege, type DailyMetric } from "@/lib/smartAccess";

const SmartAccess = () => {
  const stats = [
    { title: "Active Access Rights", value: "2,847", icon: UserCheck, trend: { value: "3%", positive: true } },
    { title: "Pending Approvals", value: "24", icon: Clock, trend: { value: "12%", positive: false } },
    { title: "Security Incidents", value: "3", icon: AlertTriangle, trend: { value: "50%", positive: true } },
    { title: "Auto-Revocations", value: "18", icon: Lock, trend: { value: "5%", positive: true } },
  ];

  const qc = useQueryClient();
  const { data: products = [], isLoading: loadingProducts } = useQuery({ queryKey: ["smart:products"], queryFn: listProducts });
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({ queryKey: ["smart:employees"], queryFn: listEmployees });
  const [prodSlug, setProdSlug] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodPurchased, setProdPurchased] = useState(true);
  const [empSearch, setEmpSearch] = useState("");
  const [empRecentOnly, setEmpRecentOnly] = useState(true);
  const [showOffboarded, setShowOffboarded] = useState(false);

  const seedMut = useMutation({
    mutationFn: async () => {
      const defaults: Array<{ slug: string; name: string }> = [
        { slug: "github", name: "GitHub Enterprise" },
        { slug: "jira", name: "Jira" },
        { slug: "slack", name: "Slack" },
        { slug: "vpn", name: "Corporate VPN" },
      ];
      for (const p of defaults) {
        try { await createProduct(p); } catch {}
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:products"] }),
  });

  const addProductMut = useMutation({
    mutationFn: async () => createProduct({ slug: prodSlug.trim(), name: prodName.trim(), purchased: prodPurchased }),
    onSuccess: () => {
      setProdSlug(""); setProdName("");
      qc.invalidateQueries({ queryKey: ["smart:products"] });
    },
  });

  const updEmpMut = useMutation({
    mutationFn: async ({ id, role, project, status }: { id: number; role?: string; project?: string | null; status?: string }) =>
      updateEmployee(id, { role, project: project ?? undefined, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const addGrantMut = useMutation({
    mutationFn: async ({ employeeId, productId, access_level }: { employeeId: number; productId: number; access_level: string }) =>
      addGrant(employeeId, { product_id: productId, access_level }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const updGrantMut = useMutation({
    mutationFn: async ({ employeeId, grantId, access_level, active }: { employeeId: number; grantId: number; access_level?: string; active?: boolean }) =>
      updateGrant(employeeId, grantId, { access_level, active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const delGrantMut = useMutation({
    mutationFn: async ({ employeeId, grantId }: { employeeId: number; grantId: number }) => deleteGrant(employeeId, grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const addPrivMut = useMutation({
    mutationFn: async ({ employeeId, scope, level, notes }: { employeeId: number; scope: string; level: string; notes?: string }) =>
      addPrivilege(employeeId, { scope, level, notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const updPrivMut = useMutation({
    mutationFn: async ({ employeeId, privId, scope, level, notes, active }: { employeeId: number; privId: number; scope?: string; level?: string; notes?: string; active?: boolean }) =>
      updatePrivilege(employeeId, privId, { scope, level, notes, active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const delPrivMut = useMutation({
    mutationFn: async ({ employeeId, privId }: { employeeId: number; privId: number }) => deletePrivilege(employeeId, privId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart:employees"] }),
  });

  const upsertMetricsMut = useMutation({
    mutationFn: async (payload: { email: string; name: string; day: string; commits?: number; pull_requests?: number; tickets_closed?: number; meetings?: number; messages?: number; hours_worked?: number; score?: number }) =>
      upsertDailyMetrics({ email: payload.email, name_hint: payload.name, day: payload.day, commits: payload.commits, pull_requests: payload.pull_requests, tickets_closed: payload.tickets_closed, meetings: payload.meetings, messages: payload.messages, hours_worked: payload.hours_worked, score: payload.score }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["smart:metrics", variables.email] });
    },
  });

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">Smart Access</span> Control
        </h1>
        <p className="text-muted-foreground">Automated role-based access management with instant provisioning and revocation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Products */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Products</h2>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-2 items-center">
              <Input placeholder="slug (e.g., github)" className="w-40" value={prodSlug} onChange={(e) => setProdSlug(e.target.value)} />
              <Input placeholder="Product name" className="w-56" value={prodName} onChange={(e) => setProdName(e.target.value)} />
              <label className="text-sm flex items-center gap-1">
                <input type="checkbox" checked={prodPurchased} onChange={(e) => setProdPurchased(e.target.checked)} /> purchased
              </label>
              <Button size="sm" onClick={() => addProductMut.mutate()} disabled={addProductMut.isPending || !prodSlug.trim() || !prodName.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
                <Plus className="w-4 h-4 mr-2" /> Seed Default
              </Button>
            </div>
          </div>
        </div>
        {loadingProducts && <p className="text-sm text-muted-foreground">Loading products...</p>}
        {!loadingProducts && products.length === 0 && (
          <p className="text-sm text-muted-foreground">No products yet. Click "Seed Default" to create common tools.</p>
        )}
        {products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p: Product) => (
              <Card key={p.id} className="p-4 bg-card/50 border-border/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.slug} • {p.purchased ? "purchased" : "not purchased"}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Employees */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-foreground">Employees</h2>
          <div className="flex items-center gap-2">
            <Input placeholder="Search name/email" className="w-56" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
            <label className="text-sm flex items-center gap-1">
              <input type="checkbox" checked={empRecentOnly} onChange={(e) => setEmpRecentOnly(e.target.checked)} /> recent only
            </label>
            <label className="text-sm flex items-center gap-1">
              <input type="checkbox" checked={showOffboarded} onChange={(e) => setShowOffboarded(e.target.checked)} /> include offboarded
            </label>
          </div>
        </div>
        {loadingEmployees && <p className="text-sm text-muted-foreground">Loading employees...</p>}
        {!loadingEmployees && employees.length === 0 && (
          <p className="text-sm text-muted-foreground">No employees yet. Provision approved candidates from the Applicants page.</p>
        )}
        <div className="space-y-4">
          {employees
            .filter((e: Employee) => {
              const q = empSearch.trim().toLowerCase();
              if (q) {
                if (!(e.name.toLowerCase().includes(q) || e.company_email.toLowerCase().includes(q) || (e.personal_email || "").toLowerCase().includes(q))) return false;
              }
              if (!showOffboarded && e.status === 'offboarded') return false;
              if (empRecentOnly) {
                try {
                  const created = new Date(e.created_at).getTime();
                  const now = Date.now();
                  if (now - created > 14 * 24 * 3600 * 1000) return false;
                } catch {}
              }
              return true;
            })
            .map((e: Employee) => (
            <Card key={e.id} className="p-4 bg-card/50 border-border/30">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">{e.name} <span className="text-muted-foreground">&lt;{e.company_email}&gt;</span></div>
                  <div className="text-xs text-muted-foreground">Personal: {e.personal_email || "-"}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status === 'offboarded' ? 'outline' : 'secondary'} className={e.status === 'offboarded' ? 'border-destructive text-destructive' : ''}>Status: {e.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <label>Role</label>
                    <select defaultValue={e.role} className="border rounded px-2 py-1 bg-background" id={`role-${e.id}`}>
                      <option value="DEV">DEV</option>
                      <option value="HR">HR</option>
                      <option value="IT">IT</option>
                      <option value="PM">PM</option>
                      <option value="CEO">CEO</option>
                    </select>
                    <label>Project</label>
                    <input defaultValue={e.project || ""} className="border rounded px-2 py-1 bg-background" id={`project-${e.id}`} placeholder="Project" />
                    <label>Status</label>
                    <select defaultValue={e.status} className="border rounded px-2 py-1 bg-background" id={`status-${e.id}`}>
                      <option value="active">active</option>
                      <option value="pending">pending</option>
                      <option value="offboarded">offboarded</option>
                    </select>
                    <Button size="sm" onClick={() => {
                      const role = (document.getElementById(`role-${e.id}`) as HTMLSelectElement)?.value;
                      const project = (document.getElementById(`project-${e.id}`) as HTMLInputElement)?.value || null;
                      const status = (document.getElementById(`status-${e.id}`) as HTMLSelectElement)?.value;
                      updEmpMut.mutate({ id: e.id, role, project, status });
                    }} disabled={updEmpMut.isPending}>Save</Button>
                  </div>
                </div>
              </div>
              {/* Grants */}
              <div className="mt-4">
                <div className="font-medium mb-2">Access Grants</div>
                {e.access_grants.length === 0 && <p className="text-sm text-muted-foreground">No access yet.</p>}
                <div className="space-y-2">
                  {e.access_grants.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-2 rounded border border-border/30">
                      <div className="flex items-center gap-3">
                        <Badge>{g.product.name}</Badge>
                        <select defaultValue={g.access_level} className="border rounded px-2 py-1 bg-background" onChange={(ev) => updGrantMut.mutate({ employeeId: e.id, grantId: g.id, access_level: ev.target.value })}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="readonly">readonly</option>
                        </select>
                        <label className="flex items-center gap-1 text-sm">
                          <input type="checkbox" defaultChecked={g.active} onChange={(ev) => updGrantMut.mutate({ employeeId: e.id, grantId: g.id, active: ev.target.checked })} />
                          Active
                        </label>
                      </div>
                      <Button size="icon" variant="outline" onClick={() => delGrantMut.mutate({ employeeId: e.id, grantId: g.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Add grant */}
                <div className="flex items-center gap-2 mt-3">
                  <select className="border rounded px-2 py-1 bg-background" id={`grant-prod-${e.id}`}>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select className="border rounded px-2 py-1 bg-background" id={`grant-level-${e.id}`} defaultValue="user">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="readonly">readonly</option>
                  </select>
                  <Button size="sm" onClick={() => {
                    const prod = Number((document.getElementById(`grant-prod-${e.id}`) as HTMLSelectElement)?.value);
                    const lvl = (document.getElementById(`grant-level-${e.id}`) as HTMLSelectElement)?.value || "user";
                    addGrantMut.mutate({ employeeId: e.id, productId: prod, access_level: lvl });
                  }} disabled={addGrantMut.isPending || products.length === 0}>
                    <Plus className="w-4 h-4 mr-2" /> Add Access
                  </Button>
                </div>
              </div>

              {/* Privileges */}
              <div className="mt-6">
                <div className="font-medium mb-2">Privileges (textual)</div>
                {(!e.privileges || e.privileges.length === 0) && <p className="text-sm text-muted-foreground">No privileges yet.</p>}
                <div className="space-y-2">
                  {e.privileges?.map((p: Privilege) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border border-border/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{p.scope}</span>
                        <select defaultValue={p.level} className="border rounded px-2 py-1 bg-background" onChange={(ev) => updPrivMut.mutate({ employeeId: e.id, privId: p.id, level: ev.target.value })}>
                          <option value="read">read</option>
                          <option value="edit">edit</option>
                          <option value="super">super</option>
                        </select>
                        <label className="text-sm flex items-center gap-1">
                          <input type="checkbox" defaultChecked={p.active} onChange={(ev) => updPrivMut.mutate({ employeeId: e.id, privId: p.id, active: ev.target.checked })} /> active
                        </label>
                      </div>
                      <Button size="icon" variant="outline" onClick={() => delPrivMut.mutate({ employeeId: e.id, privId: p.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Add privilege */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Input id={`priv-scope-${e.id}`} placeholder="Scope (e.g., DATABASE@)" className="w-48" />
                  <select id={`priv-level-${e.id}`} className="border rounded px-2 py-1 bg-background" defaultValue="read">
                    <option value="read">read</option>
                    <option value="edit">edit</option>
                    <option value="super">super</option>
                  </select>
                  <Input id={`priv-notes-${e.id}`} placeholder="Notes (optional)" className="w-56" />
                  <Button size="sm" onClick={() => {
                    const scope = (document.getElementById(`priv-scope-${e.id}`) as HTMLInputElement)?.value.trim();
                    const level = (document.getElementById(`priv-level-${e.id}`) as HTMLSelectElement)?.value || "read";
                    const notes = (document.getElementById(`priv-notes-${e.id}`) as HTMLInputElement)?.value.trim();
                    if (!scope) return;
                    addPrivMut.mutate({ employeeId: e.id, scope, level, notes });
                  }} disabled={addPrivMut.isPending}>
                    <Plus className="w-4 h-4 mr-2" /> Add Privilege
                  </Button>
                </div>
              </div>

              {/* Daily Metrics */}
              <div className="mt-6">
                <div className="font-medium mb-2">Daily Metrics</div>
                <EmployeeMetrics email={e.company_email} name={e.name} upsert={(vars) => upsertMetricsMut.mutate(vars)} />
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Recent Activity (placeholder) */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <h2 className="text-2xl font-bold text-foreground mb-6">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">Live activity feed can be integrated later.</p>
      </Card>
    </div>
  );
};

function EmployeeMetrics({ email, name, upsert }: { email: string; name: string; upsert: (vars: { email: string; name: string; day: string; commits?: number; pull_requests?: number; tickets_closed?: number; meetings?: number; messages?: number; hours_worked?: number; score?: number }) => void }) {
  const today = new Date();
  const defaultDay = today.toISOString().slice(0, 10);
  const [day, setDay] = useState<string>(defaultDay);
  const [commits, setCommits] = useState<number>(0);
  const [prs, setPRs] = useState<number>(0);
  const [tickets, setTickets] = useState<number>(0);
  const [meetings, setMeetings] = useState<number>(0);
  const [messages, setMessages] = useState<number>(0);
  const [hours, setHours] = useState<number>(8);
  const [score, setScore] = useState<number>(80);

  const { data: metrics = [], isLoading, refetch } = useQuery({ queryKey: ["smart:metrics", email], queryFn: () => getDailyMetrics({ email }), staleTime: 60_000 });

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-sm text-muted-foreground">Loading metrics...</p>}
      {!isLoading && metrics.length === 0 && <p className="text-sm text-muted-foreground">No metrics yet.</p>}
      {!isLoading && metrics.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left p-1">Day</th>
                <th className="text-left p-1">Commits</th>
                <th className="text-left p-1">PRs</th>
                <th className="text-left p-1">Tickets</th>
                <th className="text-left p-1">Meetings</th>
                <th className="text-left p-1">Messages</th>
                <th className="text-left p-1">Hours</th>
                <th className="text-left p-1">Score</th>
              </tr>
            </thead>
            <tbody>
              {metrics.slice(-7).map((m: DailyMetric) => (
                <tr key={m.day} className="border-t border-border/30">
                  <td className="p-1">{m.day}</td>
                  <td className="p-1">{m.commits}</td>
                  <td className="p-1">{m.pull_requests}</td>
                  <td className="p-1">{m.tickets_closed}</td>
                  <td className="p-1">{m.meetings}</td>
                  <td className="p-1">{m.messages}</td>
                  <td className="p-1">{m.hours_worked ?? "-"}</td>
                  <td className="p-1">{m.score ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2"><Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button></div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="w-40" value={day} onChange={(e) => setDay(e.target.value)} />
        <Input type="number" className="w-28" placeholder="Commits" value={commits} onChange={(e) => setCommits(Number(e.target.value))} />
        <Input type="number" className="w-28" placeholder="PRs" value={prs} onChange={(e) => setPRs(Number(e.target.value))} />
        <Input type="number" className="w-28" placeholder="Tickets" value={tickets} onChange={(e) => setTickets(Number(e.target.value))} />
        <Input type="number" className="w-28" placeholder="Meetings" value={meetings} onChange={(e) => setMeetings(Number(e.target.value))} />
        <Input type="number" className="w-28" placeholder="Messages" value={messages} onChange={(e) => setMessages(Number(e.target.value))} />
        <Input type="number" className="w-28" placeholder="Hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
        <Input type="number" className="w-28" placeholder="Score" value={score} onChange={(e) => setScore(Number(e.target.value))} />
        <Button size="sm" onClick={() => upsert({ email, name, day, commits, pull_requests: prs, tickets_closed: tickets, meetings, messages, hours_worked: hours, score })}>
          <Plus className="w-4 h-4 mr-2" /> Save Day
        </Button>
      </div>
    </div>
  );
}

export default SmartAccess;
