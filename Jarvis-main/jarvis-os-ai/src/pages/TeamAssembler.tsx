import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Users, Target, Zap, TrendingUp, Search, Sparkles, RefreshCw, X, Plus, Minus, UserPlus, ArrowRight } from "lucide-react";
import employees from "@/data/employees.json";
import { teamAssemble, teamApprove, projectsCreate, type TeamCandidate } from "@/lib/rag";

type Emp = typeof employees.employees[number];

const TeamAssembler = () => {
  const stats = [
    { title: "Active Teams", value: "24", icon: Users, trend: { value: "8%", positive: true } },
    { title: "Team Efficiency", value: "89%", icon: Zap, trend: { value: "12%", positive: true } },
    { title: "Projects", value: "48", icon: Target, trend: { value: "15%", positive: true } },
    { title: "Collaboration Score", value: "92%", icon: TrendingUp, trend: { value: "7%", positive: true } },
  ];

  // Project intake form
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [desiredSkills, setDesiredSkills] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [isSearching, setIsSearching] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);

  // Recommendations and manual team
  const [recs, setRecs] = useState<Array<Emp | TeamCandidate>>([]);
  const [recIndex, setRecIndex] = useState(0);
  const [team, setTeam] = useState<Array<Emp | TeamCandidate>>([]);

  const desired = useMemo(() => desiredSkills.split(",").map(s => s.trim().toLowerCase()).filter(Boolean), [desiredSkills]);

  const scoreEmployee = (e: Emp) => {
    if (desired.length === 0) return 0;
    const overlap = e.skills.map(s => s.toLowerCase()).filter(s => desired.includes(s)).length;
    const availabilityBoost = e.availability === "Available" ? 1 : 0;
    const success = (e.metrics?.successRate ?? 80) / 100;
    return overlap * 2 + availabilityBoost + success;
  };

  const runSearch = async (reason?: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const code = (projectName || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || `proj_${Date.now()}`;
      // Build simple requirements from desiredSkills and teamSize
      const skills = desired.map(s => ({ name: s, min_level: 3 }));
      const requirements = [{ role_label: "member", count: teamSize, skills }];
      // Ensure project meta exists (best-effort)
      try {
        await projectsCreate({ code, name: projectName || code, budget: null, headcount_target: teamSize, roles: requirements, constraints: null, docs: null });
      } catch {}
      const res = await teamAssemble({ project_code: code, title: projectName || "Team Plan", requirements, available_only: availableOnly, constraints: null });
      const list = res.candidates;
      setTeamId(res.team_id);
      setRecs(list as any);
      setRecIndex(0);
    } catch (e: any) {
      // Fallback to mock
      let list = [...employees.employees];
      list.sort((a, b) => scoreEmployee(b) - scoreEmployee(a));
      setRecs(list);
      setError("Using fallback candidates (RAG API offline)");
    } finally {
      setIsSearching(false);
      setPromptOpen(false);
    }
  };

  const current = recs[recIndex] as any;
  const nextFew = recs.slice(recIndex + 1, recIndex + 4);

  const addToTeam = (e: Emp | TeamCandidate) => {
    if (team.find(t => (t as any).id === (e as any).id)) return;
    if (team.length >= teamSize) return;
    setTeam([...team, e]);
  };
  const removeFromTeam = (id: string | number) => setTeam(team.filter(t => (t as any).id === id ? false : true));

  const finalizeTeam = async () => {
    try {
      const code = (projectName || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || `proj_${Date.now()}`;
      const members = team.map(m => ({ employee_email: (m as any).email || `${(m as any).name?.toLowerCase?.().replace(/\s+/g, '.') || 'member'}@company.local`, role_label: (m as any).role_label || 'member', allocation_percent: 100 }));
      // For simplicity, use the most recent team assemble id is unknown; backend does not require it to update chat service. We'll call with a dummy id 1 if not available.
      const id = teamId || 1;
      await teamApprove(id, { project_code: code, members });
      alert("Team approved and provisioning triggered.");
    } catch (e: any) {
      alert("Failed to approve team. Check backend.");
    }
  };

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">Team</span> Assembler
        </h1>
        <p className="text-muted-foreground">AI-powered team composition and collaboration optimization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Project Intake */}
      <Card className="p-6 border-border/40 backdrop-blur-xl" style={{
        background: 'linear-gradient(135deg, hsl(var(--card) / 0.4) 0%, hsl(var(--card) / 0.25) 100%)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Project Details</h2>
          <Button onClick={() => runSearch()} disabled={isSearching || !projectName} className="bg-primary hover:bg-primary-glow">
            {isSearching ? (
              <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Searching</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Search className="w-4 h-4" /> Find Team</span>
            )}
          </Button>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="text-sm text-muted-foreground">Project Name</label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Payments v2" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-muted-foreground">Description</label>
            <Input value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="High-level objectives" />
          </div>
          <div className="md:col-span-1">
            <label className="text-sm text-muted-foreground">Team Size</label>
            <Input type="number" min={1} max={12} value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value || "0", 10))} />
          </div>
          <div className="md:col-span-4">
            <label className="text-sm text-muted-foreground">Desired Skills (comma separated)</label>
            <Input value={desiredSkills} onChange={(e) => setDesiredSkills(e.target.value)} placeholder="React, Kubernetes, NLP" />
          </div>
        </div>
        <div className="mt-3 flex gap-2 items-center">
          <Button variant="outline" onClick={() => setPromptOpen(true)}>Refine with Prompt</Button>
          <Button variant="ghost" onClick={() => { setProjectName(""); setProjectDesc(""); setDesiredSkills(""); setTeamSize(4); }}>Reset</Button>
          <label className="text-xs text-muted-foreground inline-flex items-center gap-2"><input type="checkbox" checked={availableOnly} onChange={(e)=>setAvailableOnly(e.target.checked)} /> Available only</label>
          {error && <span className="text-xs text-warning">{error}</span>}
        </div>
      </Card>

      {/* Search Animation / Recommendations */}
      {isSearching && (
        <Card className="p-10 border-border/40 text-center">
          <div className="mx-auto relative w-48 h-48">
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
            <div className="absolute inset-6 rounded-full border border-primary/20 animate-ping" style={{ animationDelay: '200ms' }} />
            <div className="absolute inset-12 rounded-full border border-primary/10 animate-ping" style={{ animationDelay: '400ms' }} />
            <div className="relative w-full h-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">Scanning employees and matching skills…</p>
        </Card>
      )}

      {!isSearching && recs.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Primary Recommendation */}
          <Card className="p-6 border-border/40 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-foreground">{current?.name}</h3>
                  {current?.role && <Badge className="bg-primary/15 text-primary border-primary/40">{current?.role}</Badge>}
                  {current?.role_label && <Badge className="bg-primary/15 text-primary border-primary/40">{current?.role_label}</Badge>}
                  {current?.availability && <Badge variant="outline">{current?.availability}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">Top match for your requirements</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Match score</p>
                <p className="text-3xl font-bold text-primary">{Number.isFinite(current?.score) ? Math.round((current?.score || 0)) : Math.round(scoreEmployee(current) * 20)}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {Array.isArray(current?.skills) && (
                <div className="bg-card/50 p-4 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {current?.skills.map((s: string, i: number) => (
                      <Badge key={i} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {current?.metrics && (
                <div className="bg-card/50 p-4 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Metrics</p>
                  <p className="text-foreground">Success {current?.metrics?.successRate}% · Impact {current?.metrics?.impact} · Tenure {current?.metrics?.tenureMonths}m</p>
                </div>
              )}
              {Array.isArray(current?.achievements) && (
                <div className="bg-card/50 p-4 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Recent Achievements</p>
                  <ul className="list-disc pl-5 text-sm text-foreground/90">
                    {current?.achievements.slice(0,2).map((a: string, i: number) => (<li key={i}>{a}</li>))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <Button onClick={() => addToTeam(current!)} className="bg-primary hover:bg-primary-glow inline-flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add to team</Button>
              <Button variant="outline" onClick={() => setRecIndex(Math.min(recIndex + 1, recs.length - 1))} className="inline-flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Next candidate</Button>
              <Button variant="ghost" onClick={() => runSearch("try-again")}>Try again</Button>
            </div>
          </Card>

          {/* Next Suggestions */}
          <Card className="p-6 border-border/40">
            <h4 className="font-semibold text-foreground mb-3">More suggestions</h4>
            <div className="space-y-3">
              {nextFew.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border border-border/20 bg-card/40 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.role} · Match {Math.round(scoreEmployee(e) * 20)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => addToTeam(e)}>Add</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Manual Team Builder */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 border-border/40 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-foreground">Manual Team Builder</h3>
            <div className="text-sm text-muted-foreground">Team size: {team.length}/{teamSize}</div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {employees.employees.map((e) => (
              <div key={e.id} className="p-3 rounded-lg border border-border/20 bg-card/40 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{e.name} <span className="text-xs text-muted-foreground">· {e.role}</span></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {e.skills.slice(0,4).map((s,i) => (<Badge key={i} variant="outline">{s}</Badge>))}
                  </div>
                </div>
                {team.find(t => (t as any).id === e.id) ? (
                  <Button size="sm" variant="outline" onClick={() => removeFromTeam(e.id)} className="inline-flex items-center gap-1"><Minus className="w-3 h-3" /> Remove</Button>
                ) : (
                  <Button size="sm" onClick={() => addToTeam(e)} className="inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-border/40">
          <h3 className="text-xl font-bold text-foreground mb-3">Selected Team</h3>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet. Add recommendations or pick manually.</p>
          ) : (
            <div className="space-y-3">
              {team.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border border-border/20 bg-card/40 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{(m as any).name} {((m as any).role || (m as any).role_label) && (<span className="text-xs text-muted-foreground">· {(m as any).role || (m as any).role_label}</span>)}</p>
                    { (m as any).currentWork && <p className="text-xs text-muted-foreground">Working on: {(m as any).currentWork}</p> }
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeFromTeam(m.id)} className="inline-flex items-center gap-1"><X className="w-3 h-3" /> Remove</Button>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full mt-4" disabled={team.length === 0} onClick={finalizeTeam}>Finalize Team</Button>
        </Card>
      </div>

      {/* Prompt Modal (lightweight) */}
      {promptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <Card className="w-full max-w-xl p-6 border-border/40">
            <h3 className="text-xl font-bold text-foreground mb-2">Refine Recommendations</h3>
            <p className="text-sm text-muted-foreground mb-3">Tell the assistant what qualities to prioritize (e.g., leadership, fintech, go-to-market speed).</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Type your prompt..." className="w-full h-28 rounded-md bg-background border border-border/40 p-3 text-sm" />
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setPromptOpen(false)}>Cancel</Button>
              <Button onClick={() => runSearch("prompt")}>Run</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeamAssembler;
