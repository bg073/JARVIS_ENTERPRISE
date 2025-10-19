import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { HardDrive, Database, Zap, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import memory from "@/data/memory.json";
import { memorySearch, memoryCreate } from "@/lib/rag";

const SmartMemory = () => {
  const stats = [
    { title: "Data Points", value: "2.4M", icon: Database, trend: { value: "23%", positive: true } },
    { title: "Query Speed", value: "0.3s", icon: Zap, trend: { value: "45%", positive: true } },
    { title: "Accuracy", value: "98%", icon: TrendingUp, trend: { value: "3%", positive: true } },
  ];

  const [projectCode, setProjectCode] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ _id?: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);

  const [newType, setNewType] = useState("decision");
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [newTags, setNewTags] = useState("");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const doSearch = async () => {
    setLoading(true);
    setCreateMsg(null);
    try {
      const res = await memorySearch(projectCode, query);
      setResults(res.results || []);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const doCreate = async () => {
    setLoading(true);
    setCreateMsg(null);
    try {
      await memoryCreate({ project_code: projectCode || undefined, type: newType, title: newTitle || undefined, text: newText, tags: newTags ? newTags.split(",").map(s=>s.trim()).filter(Boolean) : null, created_by: "web" });
      setNewTitle(""); setNewText(""); setNewTags("");
      setCreateMsg("Saved.");
      if (projectCode && query) await doSearch();
    } catch (e) {
      setCreateMsg("Failed. Check RAG API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">Smart</span> Memory
        </h1>
        <p className="text-muted-foreground">Intelligent data storage and retrieval system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Memory Search */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <h2 className="text-2xl font-bold text-foreground mb-4">Project Memory</h2>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input placeholder="Project code (e.g. payments-v2)" className="w-64" value={projectCode} onChange={(e)=>setProjectCode(e.target.value)} />
          <Input placeholder="Search query" className="flex-1" value={query} onChange={(e)=>setQuery(e.target.value)} />
          <Button onClick={doSearch} disabled={loading || !projectCode || !query}>Search</Button>
        </div>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && results.length > 0 && (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Doc ID</TableHead>
                  <TableHead>Snippet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">{r._id || "-"}</TableCell>
                    <TableCell className="text-foreground">{r.text?.slice(0, 200)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create Memory */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <h2 className="text-2xl font-bold text-foreground mb-4">Add Memory</h2>
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select className="w-full mt-1 rounded-md bg-background border border-border/40 p-2 text-sm" value={newType} onChange={(e)=>setNewType(e.target.value)}>
              <option value="decision">decision</option>
              <option value="milestone">milestone</option>
              <option value="note">note</option>
              <option value="summary">summary</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} placeholder="Short title" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tags (comma separated)</label>
            <Input value={newTags} onChange={(e)=>setNewTags(e.target.value)} placeholder="e.g. decision,architecture" />
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs text-muted-foreground">Text</label>
          <textarea value={newText} onChange={(e)=>setNewText(e.target.value)} placeholder="Paste summary, decision, notes..." className="w-full h-24 rounded-md bg-background border border-border/40 p-3 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={doCreate} disabled={loading || !newText}>Save</Button>
          {createMsg && <span className="text-sm text-muted-foreground">{createMsg}</span>}
        </div>
      </Card>

      {/* Processes Table (static demo) */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Company Processes</h2>
          <span className="text-sm text-muted-foreground">Total: {memory.processes.length}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Date</TableHead>
              <TableHead className="w-[140px]">Type</TableHead>
              <TableHead className="min-w-[220px]">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="min-w-[200px]">Related</TableHead>
              <TableHead className="w-[160px]">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memory.processes.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{row.date}</TableCell>
                <TableCell className="font-medium">{row.type}</TableCell>
                <TableCell className="text-foreground">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.description}</TableCell>
                <TableCell className="text-muted-foreground">{row.related}</TableCell>
                <TableCell className="text-foreground">{row.owner}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-8 bg-gradient-card border-border/50 text-center">
        <HardDrive className="w-16 h-16 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Smart Memory Module</h3>
        <p className="text-muted-foreground">Advanced memory management system in development</p>
      </Card>
    </div>
  );
};

export default SmartMemory;
