import { StatCard } from "@/components/StatCard";
import { AlertCard } from "@/components/AlertCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, UserMinus, ClipboardList, Briefcase, GraduationCap, Shield, Calendar, CheckCircle, AlertTriangle } from "lucide-react";

const HRDashboard = () => {
  const stats = [
    { title: "Total Employees", value: "1,284", icon: Users, trend: { value: "+12", positive: true } },
    { title: "Open Roles", value: "27", icon: Briefcase, trend: { value: "+3", positive: true } },
    { title: "New Hires (30d)", value: "36", icon: UserPlus, trend: { value: "+8", positive: true } },
    { title: "Attrition (12m)", value: "6.2%", icon: UserMinus, trend: { value: "-0.4%", positive: true } },
  ];

  const alerts = [
    {
      title: "Policy acknowledgement pending",
      description: "42 employees haven't signed the updated Remote Work Policy",
      severity: "warning" as const,
      icon: Shield,
      time: "20 minutes ago",
    },
    {
      title: "Interview pipeline bottleneck",
      description: "Senior Backend role has 18 candidates waiting for panel interview",
      severity: "info" as const,
      icon: ClipboardList,
      time: "1 hour ago",
    },
    {
      title: "Expiring contracts",
      description: "7 contractor agreements expiring in the next 10 days",
      severity: "critical" as const,
      icon: AlertTriangle,
      time: "2 hours ago",
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
                HR Command Center
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs font-medium text-primary">PEOPLE OPS</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Hiring • Onboarding • Training • Compliance</p>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Alerts Section */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-foreground mb-4">HR Alerts</h2>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.title} {...alert} />
          ))}
        </div>
      </div>

      {/* HR Activity Overview */}
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
                  <Calendar className="w-5 h-5 text-primary group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Interviews Scheduled</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-primary/10 px-4 py-1 rounded-full">12</span>
            </div>

            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-success/20 rounded-lg group-hover/item:bg-success/30 transition-colors duration-300">
                  <CheckCircle className="w-5 h-5 text-success group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Offers Extended</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-success/10 px-4 py-1 rounded-full">5</span>
            </div>

            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-warning/20 rounded-lg group-hover/item:bg-warning/30 transition-colors duration-300">
                  <GraduationCap className="w-5 h-5 text-warning group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Onboardings Completed</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-warning/10 px-4 py-1 rounded-full">9</span>
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
            People Snapshot
          </h3>

          <div className="space-y-6 relative">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Training Enrollments</span>
                <span className="text-primary font-bold">124</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-primary/20">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-primary h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "62%", backgroundSize: '200% 100%' }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Compliance Completed</span>
                <span className="text-success font-bold">93%</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-success/20">
                <div className="absolute inset-0 bg-gradient-to-r from-success via-success to-success/80 h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "93%", backgroundSize: '200% 100%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HRDashboard;
