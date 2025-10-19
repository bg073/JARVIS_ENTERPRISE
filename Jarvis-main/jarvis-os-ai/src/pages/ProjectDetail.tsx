import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { StatCard } from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Activity, Clock, Target, Upload, Trash2 } from "lucide-react";
import data from "@/data/projects.json";

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const custom = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('projects_custom') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);
  const allProjects = useMemo(() => [...custom, ...data.projects], [custom]);
  const project = allProjects.find((p) => p.id === id);
  const isCustom = useMemo(() => !!custom.find((p: any) => p.id === id), [custom, id]);

  const handleDelete = () => {
    if (!isCustom || !id) return;
    const ok = window.confirm('Delete this project? This cannot be undone.');
    if (!ok) return;
    try {
      const current = JSON.parse(localStorage.getItem('projects_custom') || '[]');
      const next = Array.isArray(current) ? current.filter((p: any) => p.id !== id) : [];
      localStorage.setItem('projects_custom', JSON.stringify(next));
    } catch { /* ignore */ }
    navigate('/projects');
  };

  if (!project) {
    return (
      <div className="relative space-y-6">
        <AnimatedBackground />
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <Card className="p-8 bg-gradient-card border-border/50">
          <h2 className="text-2xl font-bold text-foreground">Project not found</h2>
          <p className="text-muted-foreground">The project you are looking for does not exist.</p>
        </Card>
      </div>
    );
  }

  const stats = [
    { title: "Performance", value: `${project.performance}%`, icon: Activity, trend: { value: "", positive: true } },
    { title: "Team Size", value: `${project.employees}`, icon: Users, trend: { value: "", positive: true } },
    { title: "Duration", value: `${project.durationDays}d`, icon: Clock, trend: { value: "", positive: true } },
    { title: "Progress", value: `${project.progress}%`, icon: Target, trend: { value: "", positive: true } },
  ];

  const perfColor = project.performance >= 90 ? "text-success" : project.performance >= 80 ? "text-primary" : project.performance >= 70 ? "text-warning" : "text-destructive";

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSaveUploads = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      // Optionally include project id for backend organizing later
      if (id) fd.append('projectId', id);
      Array.from(selectedFiles).forEach((f) => fd.append('files', f));
      const res = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      await res.json();
      setSelectedFiles(null);
      setUploadOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            <span className="text-primary">{project.name}</span>
          </h1>
          <p className="text-muted-foreground">{project.description}</p>
          <p className="text-sm text-muted-foreground mt-1">Project Manager: <span className="text-foreground font-medium">{project.manager}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {isCustom && (
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={handleDelete} title="Delete project">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="border-primary/40" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2 text-primary" /> Upload
          </Button>
          <Badge className="bg-primary/15 text-primary border-primary/40">{project.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      <Card className="p-6 bg-gradient-card border-border/50">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-4">
            {/* Milestones Summary (avoid repeating performance) */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Milestones</span>
              <span className="text-3xl font-bold text-foreground">
                {project.milestones.completed}/{project.milestones.total}
              </span>
              <span className="text-sm text-muted-foreground">
                ({Math.round((project.milestones.completed / Math.max(1, project.milestones.total)) * 100)}% complete)
              </span>
            </div>
            <Progress value={Math.round((project.milestones.completed / Math.max(1, project.milestones.total)) * 100)} className="h-2" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-card/50 p-4 rounded-lg border border-border/20">
                <p className="text-xs text-muted-foreground mb-1">Team Members</p>
                <p className="text-2xl font-bold text-foreground">{project.employees}</p>
              </div>
              <div className="bg-card/50 p-4 rounded-lg border border-border/20">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="text-2xl font-bold text-foreground">{project.durationDays} days</p>
              </div>
              <div className="bg-card/50 p-4 rounded-lg border border-border/20">
                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{project.progress}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <Link to="/projects" className="text-sm text-muted-foreground hover:text-primary">Back to Projects</Link>
      </div>

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="w-full max-w-xl p-6 rounded-xl border border-border/40 bg-card/90">
            <h3 className="text-xl font-bold text-foreground mb-2">Upload Project Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">Attach files related to this project. Files are saved to the server uploads folder.</p>
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

export default ProjectDetail;
