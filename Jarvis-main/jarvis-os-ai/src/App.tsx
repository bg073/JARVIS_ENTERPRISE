import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import SmartAccess from "./pages/SmartAccess";
import AIInterviewer from "./pages/AIInterviewer";
import Performance from "./pages/Performance";
import TeamAssembler from "./pages/TeamAssembler";
import Employees from "./pages/Employees";
import SmartMemory from "./pages/SmartMemory";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ITDashboard from "./pages/ITDashboard";
import DevDashboard from "./pages/DevDashboard";
import HRDashboard from "./pages/HRDashboard";
import PMDashboard from "./pages/PMDashboard";
import Vision from "./pages/Vision";
import Chat from "./pages/Chat";
import VoiceChat from "./pages/VoiceChat";
import NotFound from "./pages/NotFound";
import Apply from "./pages/Apply";
import Applicants from "./pages/Applicants";
import { canAccess, getCurrentUser } from "@/lib/auth";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  if (!canAccess(location.pathname, user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/apply/:jobId" element={<Apply />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/dashboard-it" element={<RequireAuth><ITDashboard /></RequireAuth>} />
            <Route path="/dashboard-dev" element={<RequireAuth><DevDashboard /></RequireAuth>} />
            <Route path="/dashboard-hr" element={<RequireAuth><HRDashboard /></RequireAuth>} />
            <Route path="/dashboard-pm" element={<RequireAuth><PMDashboard /></RequireAuth>} />

            <Route path="/access" element={<RequireAuth><SmartAccess /></RequireAuth>} />
            <Route path="/interviewer" element={<RequireAuth><AIInterviewer /></RequireAuth>} />
            <Route path="/interviewer/jobs/:jobId" element={<RequireAuth><Applicants /></RequireAuth>} />
            <Route path="/performance" element={<RequireAuth><Performance /></RequireAuth>} />
            <Route path="/team" element={<RequireAuth><TeamAssembler /></RequireAuth>} />
            <Route path="/employees" element={<RequireAuth><Employees /></RequireAuth>} />
            <Route path="/memory" element={<RequireAuth><SmartMemory /></RequireAuth>} />
            <Route path="/vision" element={<RequireAuth><Vision /></RequireAuth>} />
            <Route path="/vision/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/vision/voice" element={<RequireAuth><VoiceChat /></RequireAuth>} />
            <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
            <Route path="/projects/:id" element={<RequireAuth><ProjectDetail /></RequireAuth>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
