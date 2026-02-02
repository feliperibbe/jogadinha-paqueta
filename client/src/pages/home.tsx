import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Sparkles, Video, LogOut, Clock, CheckCircle2, AlertCircle, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedVideo } from "@shared/schema";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";
import { useEffect } from "react";

function VideoStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          Pronto
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
          <Clock className="w-3 h-3 animate-spin" />
          Processando
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="w-3 h-3" />
          Erro
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
          <Clock className="w-3 h-3" />
          Pendente
        </span>
      );
  }
}

function VideoCard({ video }: { video: GeneratedVideo }) {
  const createdAt = video.createdAt ? new Date(video.createdAt).toLocaleDateString("pt-BR") : "";
  
  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-video-${video.id}`}>
      <div className="aspect-video bg-muted relative">
        {video.status === "completed" && video.generatedVideoUrl ? (
          <video
            src={video.generatedVideoUrl}
            className="w-full h-full object-cover"
            muted
            loop
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Video className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{createdAt}</span>
          <VideoStatusBadge status={video.status} />
        </div>
        {video.status === "completed" && video.generatedVideoUrl && (
          <Link href={`/video/${video.id}`}>
            <Button variant="outline" size="sm" className="w-full mt-3" data-testid={`button-view-video-${video.id}`}>
              Ver Vídeo
            </Button>
          </Link>
        )}
        {(video.status === "processing" || video.status === "pending") && (
          <Link href={`/video/${video.id}`}>
            <Button variant="outline" size="sm" className="w-full mt-3" data-testid={`button-check-status-${video.id}`}>
              Acompanhar Status
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video" />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full mt-3" />
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  // Check for URL params (email verification success/error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast({
        title: "Email verificado!",
        description: "Seu email foi verificado com sucesso. Agora você pode criar seu vídeo!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.history.replaceState({}, "", "/");
    } else if (params.get("error")) {
      const error = params.get("error");
      let message = "Erro ao verificar email";
      if (error === "token_expired") message = "Link de verificação expirado. Solicite um novo.";
      if (error === "invalid_token") message = "Link de verificação inválido.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [location, toast, queryClient]);

  const { data: videos, isLoading: videosLoading } = useQuery<GeneratedVideo[]>({
    queryKey: ["/api/videos"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o email.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={logoImage} alt="Logo" className="w-16 h-16 mx-auto animate-pulse rounded-md" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.firstName || "Usuário";
  const hasVideo = videos && videos.length > 0;
  const emailVerified = user?.emailVerified;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-md object-cover" />
            <span className="font-display text-2xl tracking-wide hidden sm:block">JOGADINHA DO PAQUETÁ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={firstName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block" data-testid="text-username">
                {firstName}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!emailVerified && (
          <Alert className="mb-6 border-primary/50 bg-primary/5" data-testid="alert-email-verification">
            <Mail className="h-5 w-5 text-primary" />
            <AlertTitle>Verifique seu email</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
              <span>
                Enviamos um link de confirmação para <strong>{user?.email}</strong>. 
                Verifique para poder criar seu vídeo.
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                data-testid="button-resend-verification"
              >
                {resendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Reenviar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide">
              Olá, {firstName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {hasVideo 
                ? "Confira seu vídeo abaixo" 
                : emailVerified 
                  ? "Pronto para fazer sua jogadinha?"
                  : "Verifique seu email para continuar"}
            </p>
          </div>
          {!hasVideo && emailVerified && (
            <Link href="/criar">
              <Button size="lg" data-testid="button-create-video">
                <Sparkles className="w-5 h-5 mr-2" />
                Criar Meu Vídeo
              </Button>
            </Link>
          )}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              {hasVideo ? "Meu Vídeo" : "Meus Vídeos"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <VideoCardSkeleton />
              </div>
            ) : videos && videos.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum vídeo ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie seu vídeo dançando agora mesmo!
                </p>
                <Link href="/criar">
                  <Button data-testid="button-create-first-video">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Criar Meu Vídeo
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
