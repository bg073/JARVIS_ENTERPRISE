import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getJob, updateCandidate, Candidate } from "@/lib/interviewer";
import { provisionFromCandidate } from "@/lib/smartAccess";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const Applicants = () => {
  const { jobId } = useParams();
  const id = Number(jobId);
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["interviewer:job", id],
    queryFn: () => getJob(id),
    enabled: Number.isFinite(id),
  });

  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "declined" | "filtered" | "consideration">("all");
  const [sortBy, setSortBy] = useState<"score" | "rank" | "name">("score");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const updateCandMut = useMutation({
    mutationFn: async ({ candidateId, approved }: { candidateId: number; approved: boolean }) =>
      updateCandidate(id, candidateId, { approved }),
    onSuccess: () => refetch(),
  });

  const provisionMut = useMutation({
    mutationFn: async ({ candidateId, role, project }: { candidateId: number; role: string; project?: string | null }) =>
      provisionFromCandidate({ candidate_id: candidateId, role, project }),
    onSuccess: (emp) => {
      try { alert(`Provisioned ${emp.name} (${emp.company_email}). Redirecting to Smart Access...`); } catch {}
      navigate('/access');
    }
  });

  const counts = useMemo(() => {
    if (!data) return { total: 0, approved: 0, declined: 0, filtered: 0, consideration: 0 };
    const total = data.candidates.length;
    const approved = data.candidates.filter(c => c.approved).length;
    const declined = data.candidates.filter(c => !c.approved).length;
    const filtered = data.candidates.filter(c => c.filtered_out).length;
    const consideration = data.candidates.filter(c => !c.filtered_out).length;
    return { total, approved, declined, filtered, consideration };
  }, [data]);

  const visibleCandidates = useMemo(() => {
    let list: Candidate[] = data?.candidates || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    if (statusFilter === "approved") list = list.filter(c => c.approved);
    if (statusFilter === "declined") list = list.filter(c => !c.approved);
    if (statusFilter === "filtered") list = list.filter(c => c.filtered_out);
    if (statusFilter === "consideration") list = list.filter(c => !c.filtered_out);
    if (sortBy === "score") list = [...list].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    if (sortBy === "rank") list = [...list].sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));
    if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data, search, statusFilter, sortBy]);

  function toggleSelect(idNum: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idNum)) next.delete(idNum); else next.add(idNum);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(visibleCandidates.map(c => c.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function bulkUpdate(approved: boolean) {
    const ids = Array.from(selectedIds);
    for (const cid of ids) {
      // use mutateAsync for sequential updates
      await updateCandMut.mutateAsync({ candidateId: cid, approved });
    }
    clearSelection();
  }

  function exportApplicantsCsv() {
    if (!data) return;
    const cols = ["id", "name", "email", "approved", "filtered_out", "match_score", "rank"];
    const rows = [cols.join(",")];
    for (const c of data.candidates) {
      rows.push([
        c.id,
        `"${(c.name || "").replace(/\"/g, '""')}"`,
        c.email,
        c.approved,
        c.filtered_out,
        c.match_score ?? "",
        c.rank ?? "",
      ].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants_job_${id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!Number.isFinite(id)) {
    return <div className="container mx-auto max-w-5xl py-8">Invalid job id.</div>;
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
        <div className="flex items-center gap-2">
          <Link to="/interviewer" className="text-primary underline">Jobs</Link>
          <Button size="sm" variant="outline" onClick={exportApplicantsCsv}>Export CSV</Button>
        </div>
      </div>
      {data && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge>All: {counts.total}</Badge>
          <Badge className="bg-success/20 text-success border-success/50">Approved: {counts.approved}</Badge>
          <Badge className="bg-destructive/20 text-destructive border-destructive/50">Declined: {counts.declined}</Badge>
          <Badge variant="outline">In Consideration: {counts.consideration}</Badge>
          <Badge variant="outline">Filtered: {counts.filtered}</Badge>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="border rounded px-3 py-2 bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="consideration">In Consideration</option>
          <option value="filtered">Filtered Out</option>
        </select>
        <select className="border rounded px-3 py-2 bg-background" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="score">Sort by Score</option>
          <option value="rank">Sort by Rank</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant="outline" onClick={selectAllVisible}>Select All (visible)</Button>
        <Button size="sm" variant="outline" onClick={clearSelection}>Clear Selection</Button>
        <Button size="sm" onClick={() => bulkUpdate(true)} disabled={selectedIds.size === 0 || updateCandMut.isPending}>Bulk Approve</Button>
        <Button size="sm" variant="destructive" onClick={() => bulkUpdate(false)} disabled={selectedIds.size === 0 || updateCandMut.isPending}>Bulk Decline</Button>
        <div className="text-xs text-muted-foreground">Selected: {selectedIds.size}</div>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading applicants...</p>}
      {isError && <p className="text-sm text-destructive">Failed to load applicants.</p>}
      {data && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Applicants for: {data.job.title}</h1>
            <p className="text-sm text-muted-foreground">Deadline: {new Date(data.job.deadline).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {visibleCandidates.length === 0 && <p className="text-sm text-muted-foreground">No applicants match filters.</p>}
              {visibleCandidates.map((c) => (
                <Card key={c.id} className={`p-4 border-border/50 ${selectedCandidateId === c.id ? 'ring-1 ring-primary' : ''}`} onClick={() => setSelectedCandidateId(c.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" checked={selectedIds.has(c.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(c.id); }} />
                      <div className="font-medium text-foreground">{c.name} <span className="text-muted-foreground">&lt;{c.email}&gt;</span></div>
                      
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={c.approved ? "default" : "outline"} onClick={(e) => { e.stopPropagation(); updateCandMut.mutate({ candidateId: c.id, approved: true }); }} disabled={updateCandMut.isPending}>Approve</Button>
                      <Button size="sm" variant={!c.approved ? "destructive" : "outline"} onClick={(e) => { e.stopPropagation(); updateCandMut.mutate({ candidateId: c.id, approved: false }); }} disabled={updateCandMut.isPending}>Decline</Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {typeof c.match_score === 'number' ? `Score: ${(c.match_score * 100).toFixed(0)}%` : 'Score: N/A'}
                    {c.rank ? ` • Rank: ${c.rank}` : ''}
                    {c.filtered_out ? ' • Filtered Out' : ''}
                  </div>
                </Card>
              ))}
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-auto pl-1">
              {!selectedCandidateId && (
                <p className="text-sm text-muted-foreground">Select a candidate to view resume details.</p>
              )}
              {selectedCandidateId && (() => {
                const c = data.candidates.find(x => x.id === selectedCandidateId);
                if (!c) return <p className="text-sm text-muted-foreground">Candidate not found.</p>;
                return (
                  <Card className="p-4 border-border/50">
                    <div className="space-y-2">
                      <div className="font-semibold text-foreground">{c.name} <span className="text-muted-foreground">&lt;{c.email}&gt;</span></div>
                      <div className="text-xs text-muted-foreground">
                        {typeof c.match_score === 'number' ? `Score: ${(c.match_score * 100).toFixed(0)}%` : 'Score: N/A'}
                        {c.rank ? ` • Rank: ${c.rank}` : ''}
                        {c.filtered_out ? ' • Filtered Out' : ''}
                      </div>
                      {c.resume_url && (
                        <div className="text-sm"><a className="text-primary underline" href={c.resume_url} target="_blank" rel="noreferrer">Open Resume URL</a></div>
                      )}
                      {/* Provisioning */}
                      <div className="mt-2 p-3 border border-border/40 rounded bg-muted/30 space-y-2">
                        <div className="text-sm font-medium">Provision Employee</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <select className="border rounded px-2 py-1 bg-background" id="prov-role" defaultValue={(c.filtered_out ? "DEV" : "DEV")}>
                            <option value="DEV">DEV</option>
                            <option value="HR">HR</option>
                            <option value="IT">IT</option>
                            <option value="PM">PM</option>
                            <option value="CEO">CEO</option>
                          </select>
                          <input className="border rounded px-2 py-1 bg-background" id="prov-project" placeholder="Project (optional)" defaultValue={data.job.title} />
                          <Button size="sm" onClick={() => {
                            const roleSel = (document.getElementById("prov-role") as HTMLSelectElement)?.value || "DEV";
                            const proj = (document.getElementById("prov-project") as HTMLInputElement)?.value || null;
                            provisionMut.mutate({ candidateId: c.id, role: roleSel, project: proj });
                          }} disabled={!c.approved || provisionMut.isPending} title={!c.approved ? "Approve candidate first" : "Provision employee"}>
                            {provisionMut.isPending ? "Provisioning..." : "Provision Employee"}
                          </Button>
                        </div>
                        {!c.approved && <div className="text-xs text-muted-foreground">Candidate must be approved to provision.</div>}
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Resume Text</div>
                        <pre className="text-sm whitespace-pre-wrap bg-muted/40 p-3 rounded border border-border/50 max-h-[50vh] overflow-auto">{c.resume_text || "(no resume text provided)"}</pre>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applicants;
