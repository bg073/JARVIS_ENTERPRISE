import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Users, UserPlus, Search, Database } from "lucide-react";

const Employees = () => {
  const stats = [
    { title: "Total Employees", value: "1,284", icon: Users, trend: { value: "12%", positive: true } },
    { title: "New This Month", value: "28", icon: UserPlus, trend: { value: "18%", positive: true } },
    { title: "Active Records", value: "1,284", icon: Database, trend: { value: "12%", positive: true } },
  ];

  return (
    <div className="relative space-y-8">
      <AnimatedBackground />
      <div className="relative">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          <span className="text-primary">Employee</span> Database
        </h1>
        <p className="text-muted-foreground">Centralized employee information and records management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <Card className="p-6 bg-gradient-card border-border/50">
        <div className="flex gap-2 mb-6">
          <Input placeholder="Search employees..." className="flex-1" />
          <Button variant="outline" size="icon">
            <Search className="w-4 h-4" />
          </Button>
          <Button className="bg-primary hover:bg-primary-glow">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        <div className="text-center py-12">
          <Database className="w-16 h-16 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-foreground mb-2">Employee Database Module</h3>
          <p className="text-muted-foreground">Comprehensive employee management system coming soon</p>
        </div>
      </Card>
    </div>
  );
};

export default Employees;
