import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Video, LogOut, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { GeneratedVideo } from "@shared/schema";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";

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

  const { data: videos, isLoading: videosLoading } = useQuery<GeneratedVideo[]>({
    queryKey: ["/api/videos"],
    enabled: !!user,
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-wide">
              Olá, {firstName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Pronto para fazer mais uma jogadinha?
            </p>
          </div>
          <Link href="/criar">
            <Button size="lg" data-testid="button-create-video">
              <Plus className="w-5 h-5 mr-2" />
              Novo Vídeo
            </Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Meus Vídeos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <VideoCardSkeleton />
                <VideoCardSkeleton />
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
                  Crie seu primeiro vídeo dançando!
                </p>
                <Link href="/criar">
                  <Button data-testid="button-create-first-video">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Meu Primeiro Vídeo
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
