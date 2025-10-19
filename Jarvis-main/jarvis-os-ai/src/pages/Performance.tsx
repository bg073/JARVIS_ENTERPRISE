import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Activity, TrendingUp, Users, Target, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Performance = () => {
  const stats = [
    { title: "Team Performance", value: "87%", icon: Users, trend: { value: "5%", positive: true } },
    { title: "Goal Completion", value: "76%", icon: Target, trend: { value: "12%", positive: true } },
    { title: "Active Projects", value: "48", icon: Activity, trend: { value: "8%", positive: true } },
    { title: "Avg. Response Time", value: "2.4h", icon: Clock, trend: { value: "15%", positive: true } },
  ];

  const employees = [
    {
      name: "Sarah Chen",
      role: "Senior Developer",
      department: "Engineering",
      performance: 95,
      projects: 8,
      hoursLogged: "168/160",
      productivity: "Excellent",
      goals: { completed: 12, total: 14 }
    },
    {
      name: "Michael Torres",
      role: "Product Manager",
      department: "Product",
      performance: 88,
      projects: 6,
      hoursLogged: "152/160",
      productivity: "Good",
      goals: { completed: 9, total: 12 }
    },
    {
      name: "Emily Watson",
      role: "Marketing Lead",
      department: "Marketing",
      performance: 82,
      projects: 5,
      hoursLogged: "145/160",
      productivity: "Good",
      goals: { completed: 7, total: 10 }
    },
  ];

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 80) return "text-primary";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  const getProductivityBadge = (level: string) => {
    if (level === "Excellent") return <Badge className="bg-success/20 text-success border-success/50">Excellent</Badge>;
    if (level === "Good") return <Badge className="bg-primary/20 text-primary border-primary/50">Good</Badge>;
    return <Badge variant="secondary">Needs Improvement</Badge>;
  };

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">Performance</span> Monitor
        </h1>
        <p className="text-muted-foreground">Track productivity and goal achievement across your organization</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Department Overview */}
      <Card className="p-6 bg-gradient-card border-border/50">
        <h2 className="text-2xl font-bold text-foreground mb-6">Department Performance</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Engineering</span>
              <span className="text-success font-medium">92%</span>
            </div>
            <Progress value={92} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product</span>
              <span className="text-primary font-medium">88%</span>
            </div>
            <Progress value={88} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Marketing</span>
              <span className="text-warning font-medium">85%</span>
            </div>
            <Progress value={85} className="h-2" />
          </div>
        </div>
      </Card>

      {/* Employee Performance */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Employee Performance</h2>
        
        {employees.map((employee, index) => (
          <Card key={index} className="p-6 bg-gradient-card border-border/50 hover:shadow-glow transition-all">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-foreground">{employee.name}</h3>
                    {getProductivityBadge(employee.productivity)}
                  </div>
                  <p className="text-muted-foreground">{employee.role} • {employee.department}</p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getPerformanceColor(employee.performance)}`}>
                    {employee.performance}%
                  </div>
                  <p className="text-xs text-muted-foreground">Performance Score</p>
                </div>
              </div>

              {/* Performance Bar */}
              <Progress value={employee.performance} className="h-2" />

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Active Projects</p>
                  <p className="text-2xl font-bold text-foreground">{employee.projects}</p>
                </div>
                <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Hours Logged</p>
                  <p className="text-2xl font-bold text-foreground">{employee.hoursLogged.split('/')[0]}</p>
                  <p className="text-xs text-muted-foreground">of {employee.hoursLogged.split('/')[1]} expected</p>
                </div>
                <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Goals Progress</p>
                  <p className="text-2xl font-bold text-foreground">{employee.goals.completed}/{employee.goals.total}</p>
                  <p className="text-xs text-muted-foreground">{Math.round((employee.goals.completed / employee.goals.total) * 100)}% complete</p>
                </div>
                <div className="bg-card/50 p-3 rounded-lg border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <p className="text-2xl font-bold text-success">+12%</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Performance;
