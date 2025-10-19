import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Footer } from "@/components/Footer";
import { 
  Shield, 
  Brain, 
  Eye, 
  TrendingUp, 
  Globe, 
  Zap,
  ArrowRight,
  Lock,
  Users,
  Activity
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Landing = () => {
  const features = [
    {
      icon: Lock,
      title: "Smart Access Control",
      description: "Automatically assign and revoke role-based access the moment employees join or leave, eliminating insider security risks.",
      color: "text-primary"
    },
    {
      icon: Brain,
      title: "AI-Powered Hiring",
      description: "Analyze interviews and resumes with AI to produce unbiased match scores, ensuring you hire the perfect talent every time.",
      color: "text-accent"
    },
    {
      icon: Eye,
      title: "Cyber Risk Detection",
      description: "Monitor employee logins in real-time, detect suspicious behavior patterns, and get instant alerts on potential security threats.",
      color: "text-destructive"
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      description: "Fair, transparent productivity monitoring across hybrid teams with AI-driven insights into goal achievement.",
      color: "text-success"
    },
    {
      icon: Globe,
      title: "Global Collaboration",
      description: "Break down language barriers with real-time multilingual translation and cultural adaptation for seamless international teamwork.",
      color: "text-warning"
    },
    {
      icon: Zap,
      title: "Shadow HR Simulation",
      description: "Predict the impact of new hires or role changes on company performance before making critical decisions.",
      color: "text-primary-glow"
    }
  ];

  const [shift, setShift] = useState(0); // 0 -> 1
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const v = Math.max(0, Math.min(1, y / 280));
        setShift(v);
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Generic reveal-on-scroll (enter + leave) for all sections
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (nodes.length === 0) return;
    nodes.forEach((n) => n.classList.add('opacity-0', 'translate-y-6'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            el.classList.add('opacity-100', 'translate-y-0');
            el.classList.remove('opacity-0', 'translate-y-6');
          } else {
            el.classList.remove('opacity-100', 'translate-y-0');
            el.classList.add('opacity-0', 'translate-y-6');
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <AnimatedBackground />
      
      {/* Hero Section */}
      <div className="relative perspective-[2000px] pt-20 pb-28">
        <div className="container mx-auto px-4 relative">
          <div className="text-center space-y-10 flex flex-col items-center">
            {/* Main Title - Centered */}
            <div className="relative">
              <h1 
                className="text-8xl md:text-[12rem] font-bold tracking-tighter leading-none"
                style={{ 
                  transform: 'translateZ(60px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <span className="relative inline-block bg-gradient-to-br from-foreground via-primary to-accent bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% 200%' }}
                >
                  JARVIS
                </span>
              </h1>
              
              {/* Subtle Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary-glow/20 blur-3xl -z-10" />
            </div>
            
            <div className="space-y-6 max-w-4xl mx-auto">
              <p className="text-3xl md:text-4xl font-light bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                Your AI-Driven Enterprise Operating System
              </p>
              
              <p className="text-lg text-muted-foreground/70 max-w-2xl mx-auto leading-relaxed">
                Transform fragmented operations into a streamlined, adaptive ecosystem. 
                Work smarter, hire better, stay secure, and collaborate globally.
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="group relative px-10 py-7 text-lg font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)',
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                </Button>
              </Link>
              
              <Link to="/dashboard">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-10 py-7 text-lg font-semibold border-primary/30 hover:border-primary backdrop-blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--card) / 0.2) 0%, hsl(var(--card) / 0.1) 100%)',
                  }}
                >
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Fade at bottom of hero for nicer overlap */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32" 
             style={{
               maskImage: 'linear-gradient(to bottom, black, transparent)',
               WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)'
             }}
        />
      </div>

      {/* Features Grid */}
      <div 
        className="container mx-auto px-4 pb-20 -mt-16 relative z-10"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: `translateY(${(-shift * 40).toFixed(1)}px)`,
          transition: 'transform 120ms ease-out'
        }}
      >
        <div 
          className="rounded-2xl border border-border/40 backdrop-blur-xl mb-12"
          style={{ 
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.45) 0%, hsl(var(--card) / 0.25) 100%)',
            boxShadow: `0 20px 60px hsl(var(--primary) / ${0.06 + shift * 0.12})`
          }}
        >
          <div className="text-center py-14 space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-br from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              Enterprise Solutions
            </h2>
            <p className="text-muted-foreground/70 text-xl max-w-2xl mx-auto">
              Address five critical enterprise pain points with AI-driven intelligence
            </p>
            <div className="flex items-center justify-center gap-2 pt-4">
              <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-primary" />
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-primary" />
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              data-reveal
              className="group relative p-8 border-border/40 hover:border-primary/50 transition-all duration-700 backdrop-blur-xl overflow-hidden hover:shadow-glow will-change-transform"
              style={{ 
                background: 'linear-gradient(135deg, hsl(var(--card) / 0.4) 0%, hsl(var(--card) / 0.2) 100%)',
                transform: 'translateZ(0)',
                transformStyle: 'preserve-3d',
                transitionDelay: `${index * 80}ms`
              }}
            >
              {/* Corner Accents */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" />
              
              {/* Border Glow */}
              <div className="absolute inset-[-1px] bg-gradient-to-r from-primary via-accent to-primary-glow opacity-0 group-hover:opacity-50 transition-opacity duration-700 rounded-lg blur-sm" />

              <div 
                className="relative space-y-6 transition-all duration-300 group-hover:[transform:perspective(1000px)_translateZ(20px)]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Icon Container */}
                <div 
                  className="relative inline-block"
                  style={{ transform: 'translateZ(15px)' }}
                >
                  <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300 group-hover:scale-105">
                    <feature.icon className={`w-10 h-10 ${feature.color} transition-all duration-300`} />
                  </div>
                  
                  {/* Subtle Icon Glow */}
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                </div>
                
                <div className="space-y-3" style={{ transform: 'translateZ(10px)' }}>
                  <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-500">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground/80 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Bottom Accent */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { icon: Shield, value: "99.9%", label: "Security Uptime" },
            { icon: Users, value: "10K+", label: "Enterprises Served" },
            { icon: Activity, value: "45%", label: "Productivity Increase" },
            { icon: TrendingUp, value: "$2M+", label: "Cost Savings Avg." },
          ].map((stat, index) => (
            <div 
              key={index}
              data-reveal
              className="group text-center p-8 rounded-xl border border-border/40 hover:border-primary/30 backdrop-blur-sm transition-all duration-300"
              style={{ 
                background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 100%)',
                transform: 'translateZ(0)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="relative space-y-4 transition-transform duration-300 group-hover:[transform:translateZ(30px)]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="inline-block p-3 bg-primary/5 rounded-xl"
                  style={{ transform: 'translateZ(15px)' }}
                >
                  <stat.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-5xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground/70">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Neural Capabilities (Hologram Panel) */}
      <div className="container mx-auto px-4 py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-stretch">
          {/* Hologram */}
          <Card data-reveal className="relative p-8 overflow-hidden border-border/40 backdrop-blur-xl"
            style={{ background: 'linear-gradient(135deg, hsl(var(--card) / 0.45) 0%, hsl(var(--card) / 0.25) 100%)' }}>
            <div className="absolute -inset-24 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent rounded-[36px] blur-3xl" />
            <div className="relative aspect-[4/3] rounded-2xl border border-primary/25 bg-background/20 grid place-items-center overflow-hidden">
              {/* Grid */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                  backgroundSize: '22px 22px'
                }}
              />
              {/* Rings */}
              <div className="absolute w-[72%] h-[72%] rounded-full border border-primary/30 animate-pulse" />
              <div className="absolute w-[58%] h-[58%] rounded-full border border-primary/20 animate-[pulse_3.4s_ease-in-out_infinite]" />
              <div className="absolute w-[44%] h-[44%] rounded-full border border-primary/10 animate-[pulse_4.2s_ease-in-out_infinite]" />
              {/* Core */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl grid place-items-center bg-primary/15 border border-primary/35 shadow-[0_0_40px_hsl(var(--primary)/0.35)]">
                  <Brain className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Adaptive Neural Engine</p>
              </div>
            </div>
            <div className="relative mt-6 grid sm:grid-cols-3 gap-3 text-sm">
              {["Reasoning", "Memory", "Realtime"].map((k, i) => (
                <div key={i} className="rounded-lg border border-border/30 bg-card/40 p-3">
                  <div className="text-muted-foreground/70">{k}</div>
                  <div className="text-foreground font-bold mt-1">{["Chain-of-Thought","Vector Store","Events Stream"][i]}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Capabilities Matrix */}
          <div>
            <h3 className="text-3xl font-bold mb-4 text-foreground">Neural Capabilities</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[{
                t: 'Work Orchestration', d: 'Automate cross-app workflows with guardrails and approvals', ic: Zap
              },{
                t: 'Insight Graph', d: 'Unify signals from HR, IT, and Dev into one knowledge graph', ic: Globe
              },{
                t: 'Risk Sentinel', d: 'Detect anomalous behavior and auto-remediate securely', ic: Shield
              },{
                t: 'Talent Genius', d: 'Match people to roles by skills, context, and outcomes', ic: Users
              }].map((f, idx) => (
                <Card key={idx} data-reveal className="p-5 border-border/40 bg-gradient-to-br from-card/60 to-card/30 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <f.ic className="w-5 h-5 text-primary" />
                    <div className="font-semibold text-foreground">{f.t}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{f.d}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Timeline */}
      <div className="container mx-auto px-4 py-24">
        <h3 className="text-3xl font-bold text-foreground mb-10">High-Impact Use Cases</h3>
        <div className="relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/60 to-transparent" />
          {[{
            h: 'Zero-Day Access', p: 'Provision least-privilege access in minutes on day one.'
          },{
            h: 'Hiring Co‑Pilot', p: 'AI interview scoring and bias checks across the funnel.'
          },{
            h: 'Ops Autopilot', p: 'Detect incidents and trigger playbooks with live approvals.'
          },{
            h: 'People Analytics', p: 'Track outcomes, collaboration, and retention risks.'
          }].map((u, i) => (
            <div key={i} className="relative mb-10" data-reveal>
              <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-primary/70 ring-4 ring-primary/10" />
              <Card className="p-5 border-border/40 bg-card/60">
                <div className="text-lg font-semibold text-foreground">{u.h}</div>
                <div className="text-sm text-muted-foreground mt-1">{u.p}</div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-12" data-reveal>
        <div className="p-10 rounded-2xl border border-border/40 backdrop-blur-sm text-center space-y-4"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.8) 100%)' }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Ready to <span className="text-primary">Transform</span> Your Enterprise?
          </h2>
          <p className="text-xl text-muted-foreground/70 max-w-2xl mx-auto">
            Join thousands of companies already using JARVIS to streamline operations and boost productivity
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg mt-1 transition-all duration-200">
              <span className="flex items-center gap-2">
                Get Started Now
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Landing;
