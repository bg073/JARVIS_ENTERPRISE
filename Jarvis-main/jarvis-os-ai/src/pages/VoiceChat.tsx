import { useEffect, useRef, useState } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic2, MicOff, AudioLines } from "lucide-react";

// Minimal SpeechRecognition typings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

const VoiceChat = () => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interim, setInterim] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const recognitionRef = useRef<AnyRec | null>(null);

  useEffect(() => {
    // Browser support check
    const SR: AnyRec = (window as AnyRec).SpeechRecognition || (window as AnyRec).webkitSpeechRecognition;
    if (!SR) {
      setIsSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: AnyRec) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setTranscript((prev) => `${prev}${finalText} `);
        setInterim("");
      }
    };

    rec.onerror = () => {
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
  }, []);

  const toggleListen = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (!isListening) {
      try {
        rec.start();
        setIsListening(true);
      } catch (_) {}
    } else {
      try {
        rec.stop();
      } catch (_) {}
      setIsListening(false);
    }
  };

  return (
    <div className="relative space-y-10">
      <AnimatedBackground />

      {/* Header */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                Voice Chat
              </span>
            </h1>
            <div className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-card/20 backdrop-blur-xl">
            <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-success' : 'bg-primary'} animate-pulse`} />
            <span className="text-xs font-medium text-primary">{isListening ? 'LISTENING' : 'READY'}</span>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-lg">Tap the sphere to start/stop listening</p>
      </div>

      {/* Sphere Controller */}
      <div className="relative z-10">
        <Card className="p-12 border-border/30 bg-transparent overflow-hidden text-center">
          <div className="mx-auto relative w-64 h-64 cursor-pointer select-none" onClick={toggleListen}>
            {/* Sphere base */}
            <div className={`absolute inset-0 rounded-full border ${isListening ? 'border-success/50' : 'border-primary/40'}`} />
            {/* Glow */}
            <div className={`absolute inset-0 rounded-full ${isListening ? 'bg-success/20' : 'bg-primary/20'} blur-3xl`} />
            {/* Inner gradient */}
            <div className="absolute inset-0 rounded-full" style={{
              background: 'radial-gradient(circle at 50% 35%, hsl(var(--primary) / 0.25), transparent 60%)'
            }} />
            {/* Waves */}
            <div className={`absolute inset-0 rounded-full ${isListening ? 'animate-ping' : ''} border ${isListening ? 'border-success/40' : 'border-primary/30'}`} />
            <div className={`absolute inset-3 rounded-full ${isListening ? 'animate-ping' : ''} border ${isListening ? 'border-success/20' : 'border-primary/20'}`} style={{ animationDelay: '200ms' }} />
            {/* Icon */}
            <div className="relative w-full h-full flex items-center justify-center">
              {isListening ? (
                <MicOff className="w-12 h-12 text-success drop-shadow-[0_0_12px_hsl(var(--success))]" />
              ) : (
                <Mic2 className="w-12 h-12 text-primary drop-shadow-[0_0_12px_hsl(var(--primary))]" />
              )}
            </div>
          </div>
          {!isSupported && (
            <p className="mt-3 text-sm text-destructive">Speech Recognition is not supported in this browser.</p>
          )}
          <div className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
            <AudioLines className="w-4 h-4" />
            <span>Click the sphere to {isListening ? 'stop' : 'start'} listening</span>
          </div>
        </Card>
      </div>

      {/* Transcript */}
      <div className="relative z-20 grid grid-rows-[auto_1fr] gap-3">
        <Card className="p-4 border-border/30 bg-transparent">
          <p className="text-sm text-muted-foreground mb-2">Live transcript</p>
          <div className="min-h-[120px] whitespace-pre-wrap text-foreground/90">
            {transcript}
            <span className="text-muted-foreground/70">{interim}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={() => { setTranscript(""); setInterim(""); }}>Clear</Button>
            <Button onClick={toggleListen}>{isListening ? 'Stop' : 'Start'} Listening</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VoiceChat;
