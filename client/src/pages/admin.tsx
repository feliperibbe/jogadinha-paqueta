import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  LogOut, 
  Loader2,
  Users,
  Video,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  RotateCcw
} from "lucide-react";
import { redirectToLogin } from "@/lib/auth-utils";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";
import type { User, GeneratedVideo } from "@shared/schema";

function VideoStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-500/50">
          <CheckCircle2 className="w-3 h-3" />
          Pronto
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className="gap-1 text-blue-600 border-blue-500/50">
          <Clock className="w-3 h-3" />
          Processando
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-500/50">
          <AlertCircle className="w-3 h-3" />
          Erro
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          Pendente
        </Badge>
      );
  }
}

export default function Admin() {
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirectToLogin(toast);
    }
  }, [authLoading, isAuthenticated, toast]);

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: allVideos, isLoading: videosLoading } = useQuery<GeneratedVideo[]>({
    queryKey: ["/api/admin/videos"],
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const queryClient = useQueryClient();

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const res = await fetch(`/api/admin/videos/${videoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar vídeo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      toast({ title: "Vídeo deletado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao deletar vídeo", variant: "destructive" });
    },
  });

  const resetUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/reset-user/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao resetar usuário");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      toast({ title: data.message || "Usuário resetado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao resetar usuário", variant: "destructive" });
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

  const firstName = user?.firstName || "Admin";

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const completedVideos = allVideos?.filter(v => v.status === "completed").length || 0;
  const processingVideos = allVideos?.filter(v => v.status === "processing" || v.status === "pending").length || 0;
  const failedVideos = allVideos?.filter(v => v.status === "failed").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-md object-cover" />
            <span className="font-display text-2xl tracking-wide hidden sm:block">ADMIN</span>
            <Badge variant="secondary" className="gap-1">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={firstName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">{firstName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{allUsers?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Usuários</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedVideos}</p>
              <p className="text-sm text-muted-foreground">Vídeos Prontos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{processingVideos}</p>
              <p className="text-sm text-muted-foreground">Processando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{failedVideos}</p>
              <p className="text-sm text-muted-foreground">Erros</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Vídeos Recentes
            </CardTitle>
            <CardDescription>
              Últimos vídeos gerados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {videosLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : allVideos?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum vídeo gerado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allVideos?.slice(0, 20).map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Video className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-xs">
                          {video.id.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(video.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <VideoStatusBadge status={video.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
                        disabled={deleteVideoMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Usuários ({allUsers?.length || 0})
            </CardTitle>
            <CardDescription>
              Lista de todos os usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {allUsers?.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-muted text-xs">
                          {u.firstName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {u.firstName || "Usuário"} {u.lastName || ""}
                          {u.isAdmin && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Admin
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => resetUserMutation.mutate(u.id)}
                      disabled={resetUserMutation.isPending}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Resetar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
