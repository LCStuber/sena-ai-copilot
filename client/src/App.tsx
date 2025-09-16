import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "./pages/auth-page";
import DashboardPage from "./pages/dashboard-page";
import CompanyResearchPage from "./pages/company-research-page";
import PlaybookNotesPage from "./pages/playbook-notes-page";
import NbasPage from "./pages/nbas-page";
import ArtifactsPage from "./pages/artifacts-page";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/research" component={CompanyResearchPage} />
      <Route path="/playbook" component={PlaybookNotesPage} />
      <Route path="/nbas" component={NbasPage} />
      <Route path="/artifacts" component={ArtifactsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/auth/oidc" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
