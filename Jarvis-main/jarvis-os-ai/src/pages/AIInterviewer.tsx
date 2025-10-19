import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Brain, Users, TrendingUp, FileText, Video, ThumbsUp, ThumbsDown, Plus, Link as LinkIcon, CalendarCheck, Filter } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { createJob, listJobs, autoFilter, autoSchedule } from "@/lib/interviewer";
import { CHAT_API_BASE } from "@/lib/chat";

const AIInterviewer = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["interviewer:jobs"],
    queryFn: listJobs,
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [deadline, setDeadline] = useState("");
  const [interviewerEmails, setInterviewerEmails] = useState("");

  const createMut = useMutation({
    mutationFn: async () =>
      createJob({
        title,
        description,
        qualifications: qualifications || undefined,
        deadline, // ISO from input type="datetime-local"
        interviewer_emails: interviewerEmails
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setQualifications("");
      setDeadline("");
      setInterviewerEmails("");
      qc.invalidateQueries({ queryKey: ["interviewer:jobs"] });
    },
  });

  const autoFilterMut = useMutation({
    mutationFn: async (jobId: number) => autoFilter(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interviewer:jobs"] }),
  });
  const autoScheduleMut = useMutation({
    mutationFn: async (jobId: number) => autoSchedule(jobId),
  });

  // Navigate to dedicated Applicants page when user wants to view applicants

  const stats = [
    { title: "Interviews Analyzed", value: "1,847", icon: Video, trend: { value: "18%", positive: true } },
    { title: "Avg. Match Score", value: "84%", icon: TrendingUp, trend: { value: "7%", positive: true } },
    { title: "Active Candidates", value: "142", icon: Users, trend: { value: "23%", positive: true } },
    { title: "Hires This Month", value: "28", icon: ThumbsUp, trend: { value: "12%", positive: true } },
  ];

  // derive simple stats
  const statsDerived = useMemo(() => {
    const total = jobs.length;
    return { totalJobs: total };
  }, [jobs]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 80) return "text-primary";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const getStatusBadge = (status: string) => {
    if (status === "recommended") return <Badge className="bg-success/20 text-success border-success/50">Recommended</Badge>;
    if (status === "pending") return <Badge variant="secondary">Pending Review</Badge>;
    return <Badge variant="outline">Not Recommended</Badge>;
  };

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">AI Interviewer</span>
        </h1>
        <p className="text-muted-foreground">Unbiased candidate analysis powered by advanced AI algorithms</p>
      </div>

      {/* Actions + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* New Listing */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Job Listings</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-glow"><Plus className="w-4 h-4 mr-2"/>New Listing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Job Listing</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Full Stack Developer" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea id="qualifications" value={qualifications} onChange={(e) => setQualifications(e.target.value)} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emails">Interviewer Emails (comma separated)</Label>
                <Input id="emails" value={interviewerEmails} onChange={(e) => setInterviewerEmails(e.target.value)} placeholder="alice@org.com, bob@org.com" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !title || !description || !deadline}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Jobs list */}
      <div className="space-y-4">
        {jobsLoading && <p className="text-sm text-muted-foreground">Loading jobs...</p>}
        {!jobsLoading && jobs.length === 0 && (
          <p className="text-sm text-muted-foreground">No job listings yet. Create one to get a public apply link.</p>
        )}
        {jobs.map((job) => (
          <Card
            key={job.id}
            className="p-6 bg-gradient-card border-border/50 hover:shadow-glow transition-all cursor-pointer"
            onClick={() => { navigate(`/interviewer/jobs/${job.id}`); }}
            role="button"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-foreground">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">Deadline: {format(new Date(job.deadline), "PPpp")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation();
                    const link = `${window.location.origin}/apply/${job.id}`;
                    navigator.clipboard.writeText(link);
                  }} title="Copy Apply Link">
                    <LinkIcon className="w-4 h-4 mr-2" /> Copy Apply Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/interviewer/jobs/${job.id}`); }} title="View Applicants">
                    <Users className="w-4 h-4 mr-2" /> View Applicants
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); autoFilterMut.mutate(job.id); }} disabled={autoFilterMut.isPending || new Date() < new Date(job.deadline)} title="Auto Remove + Rank">
                    <Filter className="w-4 h-4 mr-2" /> Auto Remove
                  </Button>
                  <Button size="sm" className="bg-primary" onClick={(e) => { e.stopPropagation(); autoScheduleMut.mutate(job.id); }} disabled={autoScheduleMut.isPending || new Date() < new Date(job.deadline)} title="Auto Schedule Interviews">
                    <CalendarCheck className="w-4 h-4 mr-2" /> Auto Schedule
                  </Button>
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{job.description}</p>
              {job.qualifications && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Qualifications</p>
                  <p className="text-foreground whitespace-pre-wrap">{job.qualifications}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">API: {CHAT_API_BASE}/interviewer/jobs/{job.id}</div>
            </div>
          </Card>
        ))}
      </div>
      {/* Applicants now has a dedicated page at /interviewer/jobs/:jobId */}
    </div>
  );
};

export default AIInterviewer;
