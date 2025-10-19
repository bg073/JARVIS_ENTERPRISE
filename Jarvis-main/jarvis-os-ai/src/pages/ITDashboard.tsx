import { StatCard } from "@/components/StatCard";
import { AlertCard } from "@/components/AlertCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  ShieldAlert,
  AlertTriangle,
  Database,
  Cloud,
  Download,
  Bug,
  Network,
  CheckCircle
} from "lucide-react";

const ITDashboard = () => {
  const stats = [
    { title: "Server Uptime", value: "99.98%", icon: Server, trend: { value: "0.02%", positive: true } },
    { title: "CPU Utilization", value: "42%", icon: Cpu, trend: { value: "3%", positive: false } },
    { title: "Memory Usage", value: "68%", icon: HardDrive, trend: { value: "2%", positive: false } },
    { title: "Active Incidents", value: "2", icon: ShieldAlert, trend: { value: "-1", positive: true } },
  ];

  const alerts = [
    {
      title: "High CPU on api-prod-2",
      description: "Sustained CPU > 85% for 10m on node api-prod-2",
      severity: "critical" as const,
      icon: AlertTriangle,
      time: "4 minutes ago",
    },
    {
      title: "DB Replication Lag",
      description: "Replica lag at 250ms for cluster db-prod-1",
      severity: "warning" as const,
      icon: Database,
      time: "27 minutes ago",
    },
    {
      title: "WAF Blocked Requests",
      description: "WAF blocked 132 anomalous requests from ASN-9823",
      severity: "info" as const,
      icon: ShieldAlert,
      time: "1 hour ago",
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
                IT Operations
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs font-medium text-primary">SYSTEM HEALTH</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Servers • Networks • Security</p>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Alerts Section */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-foreground mb-4">Recent Alerts</h2>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.title} {...alert} />
          ))}
        </div>
      </div>

      {/* IT Activity Overview */}
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
                  <Cloud className="w-5 h-5 text-primary group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Deployments Completed</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-primary/10 px-4 py-1 rounded-full">3</span>
            </div>

            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-success/20 rounded-lg group-hover/item:bg-success/30 transition-colors duration-300">
                  <Download className="w-5 h-5 text-success group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Backups Verified</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-success/10 px-4 py-1 rounded-full">7</span>
            </div>

            <div className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-card/30 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-warning/20 rounded-lg group-hover/item:bg-warning/30 transition-colors duration-300">
                  <Bug className="w-5 h-5 text-warning group-hover/item:scale-110 transition-transform duration-300" />
                </div>
                <span className="text-muted-foreground/80 group-hover/item:text-foreground transition-colors duration-300">Patches Applied</span>
              </div>
              <span className="font-bold text-xl text-foreground bg-warning/10 px-4 py-1 rounded-full">12</span>
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
            Infrastructure Health
          </h3>

          <div className="space-y-6 relative">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">API Gateway</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
                  <span className="text-success font-bold text-sm">HEALTHY</span>
                </div>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-success/20">
                <div className="absolute inset-0 bg-gradient-to-r from-success via-success to-success/80 h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "100%", backgroundSize: '200% 100%' }} />
                <div className="absolute inset-0 bg-success/20 blur-md" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Database Cluster</span>
                <span className="text-primary font-bold">97%</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-primary/20">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-primary h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "97%", backgroundSize: '200% 100%' }} />
                <div className="absolute inset-0 bg-primary/20 blur-md" style={{ width: "97%" }} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground/80 font-medium">Network Latency</span>
                <span className="text-warning font-bold">42ms</span>
              </div>
              <div className="relative w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-warning/20">
                <div className="absolute inset-0 bg-gradient-to-r from-warning via-warning to-warning/80 h-3 rounded-full transition-all duration-700 animate-shimmer" style={{ width: "72%", backgroundSize: '200% 100%' }} />
                <div className="absolute inset-0 bg-warning/20 blur-md" style={{ width: "72%" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ITDashboard;
