import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import ResponsiveLayout from "./components/responsive-layout";
import AuthPage from "./pages/auth-page";
import DashboardPage from "./pages/dashboard-page";
import CompanyResearchPage from "./pages/company-research-page";
import ActiveAccountsPage from "./pages/active-accounts-page";
import PlaybookNotesPage from "./pages/playbook-notes-page";
import NbasPage from "./pages/nbas-page";
import ArtifactsPage from "./pages/artifacts-page";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <ResponsiveLayout><DashboardPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/dashboard" component={() => <ResponsiveLayout><DashboardPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/research" component={() => <ResponsiveLayout><CompanyResearchPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/accounts" component={() => <ResponsiveLayout><ActiveAccountsPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/playbook-notes" component={() => <ResponsiveLayout><PlaybookNotesPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/playbook" component={() => <ResponsiveLayout><PlaybookNotesPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/nbas" component={() => <ResponsiveLayout><NbasPage /></ResponsiveLayout>} />
      <ProtectedRoute path="/artifacts" component={() => <ResponsiveLayout><ArtifactsPage /></ResponsiveLayout>} />
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
