import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { AlertCard } from "@/components/AlertCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Shield, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  Lock,
  Eye,
  CheckCircle,
  Upload
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    { title: "Active Employees", value: "1,284", icon: Users, trend: { value: "12%", positive: true } },
    { title: "Security Score", value: "98%", icon: Shield, trend: { value: "2%", positive: true } },
    { title: "Avg. Performance", value: "87%", icon: Activity, trend: { value: "5%", positive: true } },
    { title: "System Efficiency", value: "94%", icon: TrendingUp, trend: { value: "8%", positive: true } },
  ];

  const alerts = [
    {
      title: "Unusual Login Detected",
      description: "Employee #4521 logged in from Singapore at 3:42 AM (unusual timezone)",
      severity: "critical" as const,
      icon: AlertTriangle,
      time: "5 minutes ago"
    },
    {
      title: "Access Rights Expiring",
      description: "15 contractors have access rights expiring in the next 48 hours",
      severity: "warning" as const,
      icon: Lock,
      time: "2 hours ago"
    },
    {
      title: "Performance Review Due",
      description: "23 employees are due for quarterly performance reviews",
      severity: "info" as const,
      icon: Eye,
      time: "1 day ago"
    },
  ];

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("default");
  const [uploaderId, setUploaderId] = useState("dashboard");
  const [space, setSpace] = useState<"documents"|"employees"|"decisions"|"memory"|"projects">("documents");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectSubdb, setProjectSubdb] = useState<""|"documents"|"main_progress"|"employees"|"key_decisions"|"memory">("");

  const handleSaveUploads = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { ragUploadSync } = await import("@/lib/rag");
      const files = Array.from(selectedFiles);
      for (const f of files) {
        await ragUploadSync(f, {
          tenant_id: tenantId || "default",
          uploader_id: uploaderId || "dashboard",
          space,
          tags,
          project_id: space === "projects" ? (projectId || null) : null,
          project_subdb: space === "projects" ? (projectSubdb || null) : null,
        });
      }
      setSelectedFiles(null);
      setUploadOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || 'RAG upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative space-y-10">
      <AnimatedBackground />
      
      {/* Header Section */}
      <div className="relative z-10 space-y-4">
        <div className="absolute right-0 -top-2">
          <Button size="sm" variant="outline" className="border-primary/40" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2 text-primary" /> Upload
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                JARVIS
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs font-medium text-primary">ONLINE</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Command Center • Real-time Intelligence</p>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ transformStyle: 'preserve-3d' }}>
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Alerts Section */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Recent Alerts
        </h2>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.title} {...alert} />
          ))}
        </div>
      </div>

      {/* Activity Overview */}
      <div className="relative z-10 grid md:grid-cols-2 gap-6">
        <Card 
          className="group p-8 border-border/40 hover:border-primary/50 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-glow"
          style={{ 
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.4) 0%, hsl(var(--card) / 0.2) 100%)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl" />
          
          <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
            Today's Activity
          </h3>
          
          <div className="space-y-5 relative">
            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-success/20 rounded-lg group-hover/item:bg-success/30 transition-colors duration-300">
                  <CheckCircle className="w-5 h-5 text-success group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">New Hires Onboarded</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-success/10 px-4 py-1 rounded-full">8</span>
            </div>
            
            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/20 rounded-lg group-hover/item:bg-primary/30 transition-colors duration-300">
                  <Shield className="w-5 h-5 text-primary group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Access Reviews Completed</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-primary/10 px-4 py-1 rounded-full">42</span>
            </div>
            
            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-warning/20 rounded-lg group-hover/item:bg-warning/30 transition-colors duration-300">
                  <Activity className="w-5 h-5 text-warning group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Performance Evaluations</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-warning/10 px-4 py-1 rounded-full">15</span>
            </div>
          </div>
        </Card>

        <Card 
          className="group p-8 border-border/40 hover:border-primary/50 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-glow"
          style={{ 
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.4) 0%, hsl(var(--card) / 0.2) 100%)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl" />
          
          <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full" />
            System Health
          </h3>
          
          <div className="space-y-6 relative">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Security Monitoring</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
                  <span className="text-success font-bold text-sm">ACTIVE</span>
                </div>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-success/20">
                <div className="absolute inset-0 bg-gradient-to-r from-success via-success to-success/80 h-3 rounded-full transition-all duration-700 animate-shimmer" 
                  style={{ width: "100%", backgroundSize: '200% 100%' }} 
                />
                <div className="absolute inset-0 bg-success/20 blur-md" style={{ width: "100%" }} />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">AI Processing</span>
                <span className="text-primary font-bold">98%</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-primary/20">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-primary h-3 rounded-full transition-all duration-700 animate-shimmer" 
                  style={{ width: "98%", backgroundSize: '200% 100%' }} 
                />
                <div className="absolute inset-0 bg-primary/20 blur-md" style={{ width: "98%" }} />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Database Load</span>
                <span className="text-warning font-bold">72%</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-warning/20">
                <div className="absolute inset-0 bg-gradient-to-r from-warning via-warning to-warning/80 h-3 rounded-full transition-all duration-700 animate-shimmer" 
                  style={{ width: "72%", backgroundSize: '200% 100%' }} 
                />
                <div className="absolute inset-0 bg-warning/20 blur-md" style={{ width: "72%" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl p-6 rounded-xl border border-border/40 bg-card/90">
            <h3 className="text-xl font-bold text-foreground mb-2">Upload to RAG</h3>
            <p className="text-sm text-muted-foreground mb-4">Choose document(s) and metadata. Files will be sent to the RAG server (port 8000) for parsing, chunking, and indexing.</p>
            <input
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border file:border-border/40 file:bg-background file:text-foreground"
              accept=".pdf,.doc,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.csv,.json"
            />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedFiles ? `${selectedFiles.length} file(s) selected` : "No files selected"}</span>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input id="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="default" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uploaderId">Uploader ID</Label>
                <Input id="uploaderId" value={uploaderId} onChange={(e) => setUploaderId(e.target.value)} placeholder="dashboard" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="space">Space</Label>
                <select
                  id="space"
                  className="w-full h-9 rounded-md border border-border/40 bg-background text-foreground px-3 text-sm"
                  value={space}
                  onChange={(e) => setSpace(e.target.value as any)}
                >
                  <option value="documents">documents</option>
                  <option value="employees">employees</option>
                  <option value="decisions">decisions</option>
                  <option value="memory">memory</option>
                  <option value="projects">projects</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="confidential,2024" />
              </div>

              {space === "projects" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project ID</Label>
                    <Input id="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="proj-alpha" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectSubdb">Project Sub-DB</Label>
                    <select
                      id="projectSubdb"
                      className="w-full h-9 rounded-md border border-border/40 bg-background text-foreground px-3 text-sm"
                      value={projectSubdb}
                      onChange={(e) => setProjectSubdb(e.target.value as any)}
                    >
                      <option value="">-- optional --</option>
                      <option value="documents">documents</option>
                      <option value="main_progress">main_progress</option>
                      <option value="employees">employees</option>
                      <option value="key_decisions">key_decisions</option>
                      <option value="memory">memory</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            {uploadError && <div className="mt-3 text-sm text-destructive">{uploadError}</div>}
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setSelectedFiles(null); setUploadOpen(false); }}>Cancel</Button>
              <Button onClick={handleSaveUploads} disabled={uploading} className="bg-primary hover:bg-primary-glow">
                {uploading ? 'Uploading…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
