import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FolderKanban, Target, Clock, TrendingUp, Users, Activity, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import data from "@/data/projects.json";
import { projectsCreate } from "@/lib/rag";

const Projects = () => {
  const stats = [
    { title: "Active Projects", value: "48", icon: FolderKanban, trend: { value: "15%", positive: true } },
    { title: "Completed", value: "127", icon: Target, trend: { value: "22%", positive: true } },
    { title: "Avg. Duration", value: "45d", icon: Clock, trend: { value: "12%", positive: true } },
    { title: "Success Rate", value: "94%", icon: TrendingUp, trend: { value: "8%", positive: true } },
  ];

  const [customProjects, setCustomProjects] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('projects_custom') || '[]');
    } catch { return []; }
  });
  const projects = useMemo(() => [...customProjects, ...data.projects], [customProjects]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    manager: "",
    employees: 5,
    durationDays: 30,
    progress: 0,
    performance: 85,
    status: "Active",
    start: "",
    end: "",
    budget: "",
    headcount: "",
  });

  const createProject = async () => {
    if (!form.name.trim()) { setErr("Project name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const id = `proj_${Date.now()}`;
      const code = (form.code || form.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || id;
      const p = {
        id,
        name: form.name.trim(),
        description: form.description.trim(),
        manager: form.manager.trim() || "Unassigned",
        status: form.status as any,
        employees: Number(form.employees) || 0,
        durationDays: Number(form.durationDays) || 0,
        progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
        performance: Math.max(0, Math.min(100, Number(form.performance) || 0)),
        milestones: { completed: 0, total: 1 },
        start: form.start || undefined,
        end: form.end || undefined,
      } as any;
      // Persist to RAG Projects DB (best-effort)
      try {
        await projectsCreate({
          code,
          name: form.name.trim(),
          budget: form.budget ? Number(form.budget) : null,
          headcount_target: form.headcount ? Number(form.headcount) : null,
          roles: null,
          constraints: null,
          docs: null,
        });
      } catch (e) {
        // ignore to not block UI; backend may be offline
      }
      const next = [p, ...customProjects];
      setCustomProjects(next);
      localStorage.setItem('projects_custom', JSON.stringify(next));
      setOpen(false);
      setForm({ code: "", name: "", description: "", manager: "", employees: 5, durationDays: 30, progress: 0, performance: 85, status: "Active", start: "", end: "", budget: "", headcount: "" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    try {
      const fromLS = JSON.parse(localStorage.getItem('projects_custom') || '[]');
      if (Array.isArray(fromLS)) setCustomProjects(fromLS);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative z-10">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">Project</span> Dashboard
        </h1>
        <p className="text-muted-foreground">Track and manage all organizational projects</p>
        <div className="absolute right-0 top-0">
          <Button size="sm" variant="outline" className="border-primary/40" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2 text-primary" /> Create Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Projects</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((p) => {
            const perfColor = p.performance >= 90 ? "text-success" : p.performance >= 80 ? "text-primary" : p.performance >= 70 ? "text-warning" : "text-destructive";
            return (
              <Card key={p.id} className="p-6 bg-gradient-card border-border/50 hover:shadow-glow transition-all group">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <FolderKanban className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2">{p.description}</p>
                    </div>
                    <Badge className="bg-primary/15 text-primary border-primary/40">{p.status}</Badge>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                      <p className="text-xs text-muted-foreground mb-1">Team</p>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <p className="text-lg font-bold text-foreground">{p.employees}</p>
                      </div>
                    </div>
                    <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                      <p className="text-xs text-muted-foreground mb-1">Duration</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <p className="text-lg font-bold text-foreground">{p.durationDays}d</p>
                      </div>
                    </div>
                    <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                      <p className="text-xs text-muted-foreground mb-1">Progress</p>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        <p className="text-lg font-bold text-foreground">{p.progress}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Performance</span>
                      <span className={`text-sm font-semibold ${perfColor}`}>{p.performance}%</span>
                    </div>
                    <Progress value={p.performance} className="h-2" />
                  </div>

                  {/* View Details Link */}
                  <div className="flex justify-end">
                    <Link to={`/projects/${p.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                      View details <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 rounded-xl border border-border/40 bg-card/90">
            <h3 className="text-xl font-bold text-foreground mb-2">Create New Project</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground">Project Code</label>
                <input value={form.code} onChange={(e)=>setForm({ ...form, code: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" placeholder="e.g. payments-v2" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" placeholder="Project Name" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Project Manager</label>
                <input value={form.manager} onChange={(e)=>setForm({ ...form, manager: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" placeholder="PM Name" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm h-24" placeholder="High-level description" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Budget (USD)</label>
                <input type="number" min={0} value={form.budget} onChange={(e)=>setForm({ ...form, budget: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Headcount Target</label>
                <input type="number" min={0} value={form.headcount} onChange={(e)=>setForm({ ...form, headcount: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Employees</label>
                <input type="number" min={0} value={form.employees} onChange={(e)=>setForm({ ...form, employees: Number(e.target.value) })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Duration (days)</label>
                <input type="number" min={0} value={form.durationDays} onChange={(e)=>setForm({ ...form, durationDays: Number(e.target.value) })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Progress %</label>
                <input type="number" min={0} max={100} value={form.progress} onChange={(e)=>setForm({ ...form, progress: Number(e.target.value) })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Performance %</label>
                <input type="number" min={0} max={100} value={form.performance} onChange={(e)=>setForm({ ...form, performance: Number(e.target.value) })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <select value={form.status} onChange={(e)=>setForm({ ...form, status: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm">
                  <option>Active</option>
                  <option>Planned</option>
                  <option>On Hold</option>
                  <option>Completed</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Start Date</label>
                <input type="date" value={form.start} onChange={(e)=>setForm({ ...form, start: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End Date</label>
                <input type="date" value={form.end} onChange={(e)=>setForm({ ...form, end: e.target.value })} className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" />
              </div>
            </div>
            {err && <div className="mt-3 text-sm text-destructive">{err}</div>}
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="ghost" onClick={()=>{ setOpen(false); setErr(null); }}>Cancel</Button>
              <Button onClick={createProject} disabled={saving} className="bg-primary hover:bg-primary-glow">{saving ? 'Saving…' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
