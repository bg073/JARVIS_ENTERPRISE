import { 
  LayoutDashboard, 
  Shield, 
  Brain, 
  Database, 
  Users, 
  Activity,
  FolderKanban,
  HardDrive,
  Home,
  Eye
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { getCurrentUser, canAccess } from "@/lib/auth";

const menuItems = [
  { title: "Vision", url: "/vision", icon: Eye },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Smart Access", url: "/access", icon: Shield },
  { title: "AI Interviewer", url: "/interviewer", icon: Brain },
  { title: "Performance Monitor", url: "/performance", icon: Activity },
  { title: "Team Assembler", url: "/team", icon: Users },
  { title: "Employee Database", url: "/employees", icon: Database },
  { title: "Smart Memory", url: "/memory", icon: HardDrive },
  { title: "Projects", url: "/projects", icon: FolderKanban },
];

export function AppSidebar() {
  const user = getCurrentUser();
  const visibleItems = user
    ? menuItems.filter((item) => canAccess(item.url, user.role))
    : menuItems;
  return (
    <Sidebar className="border-r border-border/50" style={{ fontFamily: 'Inter, Roboto, Poppins, system-ui, -apple-system, sans-serif' }}>
      <SidebarHeader className="border-b border-border/50 p-6">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)',
          }}>
            <Home className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">JARVIS</h2>
            <p className="text-xs text-muted-foreground">Enterprise OS</p>
          </div>
        </NavLink>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs uppercase tracking-wider text-muted-foreground/70 mb-2">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? "text-white font-semibold shadow-lg" 
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`
                      }
                      style={({ isActive }) => 
                        isActive 
                          ? { background: 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)' }
                          : {}
                      }
                    >
                      <item.icon className="w-5.5 h-5.5 flex-shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
