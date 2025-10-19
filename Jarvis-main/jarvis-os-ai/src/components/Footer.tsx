import { Mail, Phone, MapPin, Linkedin, Twitter, Github } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-card/30 backdrop-blur-xl mt-8">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              JARVIS
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your AI-Driven Enterprise Operating System for seamless business operations.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contact Us</h4>
            <div className="space-y-3 text-sm">
              <a href="mailto:contact@jarvis.io" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4" />
                <span>contact@jarvis.io</span>
              </a>
              <a href="tel:+1234567890" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span>+1 (234) 567-890</span>
              </a>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>123 Innovation Drive<br />San Francisco, CA 94103</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <Link to="/dashboard" className="block text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link to="/access" className="block text-muted-foreground hover:text-primary transition-colors">
                Smart Access
              </Link>
              <Link to="/interviewer" className="block text-muted-foreground hover:text-primary transition-colors">
                AI Interviewer
              </Link>
              <Link to="/performance" className="block text-muted-foreground hover:text-primary transition-colors">
                Performance
              </Link>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Follow Us</h4>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all">
                <Linkedin className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all">
                <Twitter className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 hover:bg-primary/10 transition-all">
                <Github className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 JARVIS Enterprise OS. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-primary transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
