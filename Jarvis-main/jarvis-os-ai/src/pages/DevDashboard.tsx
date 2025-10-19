import { StatCard } from "@/components/StatCard";
import { AlertCard } from "@/components/AlertCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import {
  GitCommit,
  GitPullRequest,
  ShieldAlert,
  ShieldCheck,
  Bug,
  Lock,
  FileCode,
  BarChart3,
  CheckCircle,
  Terminal,
  FlaskConical,
  Activity,
} from "lucide-react";

const DevDashboard = () => {
  const stats = [
    { title: "Lines of Code", value: "152,340", icon: FileCode, trend: { value: "+2,130", positive: true } },
    { title: "Open PRs", value: "4", icon: GitPullRequest, trend: { value: "-1", positive: true } },
    { title: "Merged PRs (30d)", value: "28", icon: GitCommit, trend: { value: "+3", positive: true } },
    { title: "Test Coverage", value: "87%", icon: BarChart3, trend: { value: "+2%", positive: true } },
  ];

  const alerts = [
    {
      title: "Critical dependency vulnerability",
      description: "High severity (CVSS 9.8) in axios <1.6.0 detected in PR #482",
      severity: "critical" as const,
      icon: ShieldAlert,
      time: "12 minutes ago",
    },
    {
      title: "Possible token exposure",
      description: "Commit 7f3a9c may contain leaked token strings",
      severity: "warning" as const,
      icon: Lock,
      time: "1 hour ago",
    },
    {
      title: "Pipeline failed",
      description: "Integration tests failing on branch feature/risk-scoring",
      severity: "info" as const,
      icon: Bug,
      time: "3 hours ago",
    },
  ];

  return (
    <div className="relative space-y-10">
      <AnimatedBackground />

      {/* Header */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                Developer Dashboard
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs font-medium text-primary">CODE HEALTH</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Commits • Pull Requests • CI/CD</p>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Alerts Section */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-foreground mb-4">Developer Alerts</h2>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.title} {...alert} />
          ))}
        </div>
      </div>

      {/* Dev Activity Overview */}
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
                <div className="p-2 bg-primary/20 rounded-lg group-hover/item:bg-primary/30 transition-colors duration-300">
                  <GitCommit className="w-5 h-5 text-primary group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Commits Pushed</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-primary/10 px-4 py-1 rounded-full">14</span>
            </div>

            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-success/20 rounded-lg group-hover/item:bg-success/30 transition-colors duration-300">
                  <ShieldCheck className="w-5 h-5 text-success group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">PRs Approved</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-success/10 px-4 py-1 rounded-full">5</span>
            </div>

            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-warning/20 rounded-lg group-hover/item:bg-warning/30 transition-colors duration-300">
                  <FlaskConical className="w-5 h-5 text-warning group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Tests Passed</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-warning/10 px-4 py-1 rounded-full">642</span>
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
            CI / Code Quality
          </h3>

          <div className="space-y-6 relative">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Build Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success font-bold text-sm">PASSING</span>
                </div>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-success/20">
                <div className="absolute inset-0 bg-gradient-to-r from-success via-success to-success/80 h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "100%", backgroundSize: '200% 100%' }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Lint Issues</span>
                <span className="text-warning font-bold">12</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-warning/20">
                <div className="absolute inset-0 bg-gradient-to-r from-warning via-warning to-warning/80 h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "24%", backgroundSize: '200% 100%' }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Coverage</span>
                <span className="text-primary font-bold">87%</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-primary/20">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-primary h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "87%", backgroundSize: '200% 100%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DevDashboard;
