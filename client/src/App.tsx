import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Criar from "@/pages/criar";
import Admin from "@/pages/admin";
import VideoPage from "@/pages/video";
import VideoPublicPage from "@/pages/video-public";
import Login from "@/pages/login";
import Cadastro from "@/pages/cadastro";
import NotFound from "@/pages/not-found";
import { Sparkles } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-lg gradient-flamengo flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/criar" component={Criar} />
      <Route path="/admin" component={Admin} />
      <Route path="/video/:id" component={VideoPage} />
      <Route path="/compartilhar/:id" component={VideoPublicPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/compartilhar/:id" component={VideoPublicPage} />
      <Route component={Landing} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AuthenticatedRouter /> : <UnauthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
