import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ModuleEditor from "./pages/ModuleEditor";
import Analytics from "./pages/Analytics";
import Management from "./pages/Management";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import ParserData from "./pages/ParserData";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useDarkMode();
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppShell><Dashboard /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <AppShell><Projects /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/projects/:projectId" element={
              <ProtectedRoute>
                <AppShell><ProjectDetail /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/projects/:projectId/models/:modelId/builds/:buildId/modules/:moduleId/editor" element={
              <ProtectedRoute>
                <AppShell><ModuleEditor /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/editor" element={
              <ProtectedRoute>
                <AppShell><Editor /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AppShell><Analytics /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/management" element={
              <ProtectedRoute>
                <AppShell><Management /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AppShell><AdminPanel /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <AppShell><Profile /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="/parser-data" element={
              <ProtectedRoute>
                <AppShell><ParserData /></AppShell>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
