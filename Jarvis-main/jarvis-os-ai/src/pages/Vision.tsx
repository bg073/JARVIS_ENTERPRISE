import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mic2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Vision = () => {
  const navigate = useNavigate();
  
  return (
    <div className="relative space-y-10">
      <AnimatedBackground />

      {/* Header */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                Vision
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
            <span className="text-xs font-medium text-primary">INTERACTION</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Futuristic interface for conversational control</p>
      </div>

      {/* Big Options */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="group p-10 border-border/40 hover:border-primary/50 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-glow cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.45) 0%, hsl(var(--card) / 0.25) 100%)',
          }}
          onClick={() => navigate('/vision/chat')}
        >
          <div className="flex flex-col items-center justify-center gap-6 py-10">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-primary/15 border border-primary/30">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">CHAT</h2>
            <Button size="lg" className="bg-primary hover:bg-primary-glow" disabled>
              Chat Now
            </Button>
          </div>
        </Card>

        <Card
          className="group p-10 border-border/40 hover:border-primary/50 backdrop-blur-xl overflow-hidden transition-all duration-500 hover:shadow-glow cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.45) 0%, hsl(var(--card) / 0.25) 100%)',
          }}
          onClick={() => navigate('/vision/voice')}
        >
          <div className="flex flex-col items-center justify-center gap-6 py-10">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center bg-accent/15 border border-accent/30">
              <Mic2 className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">VOICE CHAT</h2>
            <Button size="lg" className="bg-accent hover:opacity-90" disabled>
              Voice Chat
            </Button>
          </div>
        </Card>
      </div>
      
    </div>
  );
};

export default Vision;
