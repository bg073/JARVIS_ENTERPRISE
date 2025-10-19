import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card 
      className={`group relative p-6 border-border/40 hover:border-primary/30 transition-all duration-300 backdrop-blur-xl overflow-hidden hover:shadow-glow ${className}`}
      style={{
        background: 'linear-gradient(135deg, hsl(var(--card) / 0.6) 0%, hsl(var(--card) / 0.4) 100%)',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Subtle Corner Accents */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />

      {/* 3D Card Content */}
      <div 
        className="relative flex items-start justify-between transition-all duration-300 group-hover:[transform:perspective(800px)_translateZ(15px)]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="space-y-3" style={{ transform: 'translateZ(10px)' }}>
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
          <p className="text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {value}
          </p>
          {trend && (
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
              trend.positive 
                ? "bg-success/10 text-success border border-success/20" 
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              <span className="text-base">{trend.positive ? "↑" : "↓"}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        
        {/* Icon with Subtle 3D Effect */}
        <div 
          className="relative p-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300"
          style={{ transform: 'translateZ(20px)' }}
        >
          <Icon className="w-7 h-7 text-primary transition-all duration-300 group-hover:scale-105" />
          
          {/* Subtle Icon Glow */}
          <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}
