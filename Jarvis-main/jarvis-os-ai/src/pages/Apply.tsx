import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getJob, applyToJob } from "@/lib/interviewer";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Apply = () => {
  const { jobId } = useParams();
  const id = Number(jobId);
  const { data, isLoading, error } = useQuery({
    queryKey: ["interviewer:job", id],
    queryFn: () => getJob(id),
    enabled: Number.isFinite(id),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [phone, setPhone] = useState("");

  const applyMut = useMutation({
    mutationFn: async () =>
      applyToJob(id, {
        name,
        email,
        phone_number: phone || undefined,
        resume_text: resumeText || undefined,
        resume_url: resumeUrl || undefined,
      }),
  });

  if (!Number.isFinite(id)) {
    return <div className="container mx-auto max-w-3xl py-10">Invalid job link.</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <div className="mb-6">
        <Link to="/" className="text-primary">← Back to Home</Link>
      </div>
      {isLoading && <p className="text-muted-foreground">Loading job...</p>}
      {error && <p className="text-destructive">Failed to load job.</p>}
      {data && (
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Apply for: {data.job.title}</h1>
            <p className="text-sm text-muted-foreground">Deadline: {new Date(data.job.deadline).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-foreground whitespace-pre-wrap">{data.job.description}</p>
            {data.job.qualifications && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">Qualifications</p>
                <p className="text-foreground whitespace-pre-wrap">{data.job.qualifications}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resumeText">Resume (paste text)</Label>
              <Textarea id="resumeText" rows={6} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste resume or summary here" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resumeUrl">Resume URL (optional)</Label>
              <Input id="resumeUrl" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => applyMut.mutate()} disabled={applyMut.isPending || !name || !email}>
                {applyMut.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
            {applyMut.isSuccess && <p className="text-success">Application submitted successfully!</p>}
            {applyMut.isError && <p className="text-destructive">Failed to submit application</p>}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Apply;
