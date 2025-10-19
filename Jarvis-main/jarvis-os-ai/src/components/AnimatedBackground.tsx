export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Animated 3D Grid */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0 animate-grid-flow"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            transform: 'perspective(1000px) rotateX(60deg) scale(2)',
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Floating Data Particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary animate-particle-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 10}s`,
              boxShadow: `0 0 ${10 + Math.random() * 20}px hsl(var(--primary))`,
            }}
          />
        ))}
      </div>

      {/* Gradient Orbs with Pulse */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-glow/15 rounded-full blur-[100px] animate-breathe" />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/40 to-transparent h-3 animate-scan" />
      </div>

      {/* Holographic Light Rays */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse" />
        <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-transparent via-accent to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-0 left-3/4 w-1 h-full bg-gradient-to-b from-transparent via-primary-glow to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
}
