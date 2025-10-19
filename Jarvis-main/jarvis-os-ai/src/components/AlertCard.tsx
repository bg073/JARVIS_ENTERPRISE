import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface AlertCardProps {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  icon: LucideIcon;
  time: string;
}

export function AlertCard({ title, description, severity, icon: Icon, time }: AlertCardProps) {
  const severityStyles = {
    critical: "border-destructive/50 bg-destructive/5",
    warning: "border-warning/50 bg-warning/5",
    info: "border-primary/50 bg-primary/5"
  };

  const badgeVariants = {
    critical: "destructive",
    warning: "default",
    info: "secondary"
  };

  return (
    <Card 
      className={`group relative p-5 ${severityStyles[severity]} border transition-all duration-300 backdrop-blur-xl overflow-hidden hover:shadow-glow`}
      style={{ 
        transformStyle: 'preserve-3d',
        background: 'linear-gradient(135deg, hsl(var(--card) / 0.4) 0%, hsl(var(--card) / 0.2) 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >

      {/* Holographic Top Border */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
        severity === "critical" ? "bg-gradient-to-r from-transparent via-destructive to-transparent" :
        severity === "warning" ? "bg-gradient-to-r from-transparent via-warning to-transparent" :
        "bg-gradient-to-r from-transparent via-primary to-transparent"
      } opacity-70`} />

      <div className="relative flex items-start gap-4 transition-all duration-300 group-hover:[transform:perspective(800px)_translateZ(8px)]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Icon Container - Subtle Hover */}
        <div 
          className={`relative p-3 rounded-xl transition-all duration-300 ${
            severity === "critical" ? "bg-destructive/20 group-hover:bg-destructive/30" :
            severity === "warning" ? "bg-warning/20 group-hover:bg-warning/30" :
            "bg-primary/20 group-hover:bg-primary/30"
          }`}
          style={{ transform: 'translateZ(15px)' }}
        >
          <Icon className={`w-6 h-6 transition-all duration-300 ${
            severity === "critical" ? "text-destructive" :
            severity === "warning" ? "text-warning" :
            "text-primary"
          } group-hover:scale-110`} />
          
          {/* Subtle Icon Glow */}
          <div className={`absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300 ${
            severity === "critical" ? "bg-destructive/40" :
            severity === "warning" ? "bg-warning/40" :
            "bg-primary/40"
          }`} />
        </div>

        <div className="flex-1 space-y-2" style={{ transform: 'translateZ(5px)' }}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-foreground text-base">{title}</h4>
            <Badge 
              variant={badgeVariants[severity] as any} 
              className="text-xs font-bold px-3 py-1 animate-reveal shadow-lg"
            >
              {severity.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground/80 leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* Left Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 ${
        severity === "critical" ? "bg-destructive" :
        severity === "warning" ? "bg-warning" :
        "bg-primary"
      }`} />
    </Card>
  );
}
