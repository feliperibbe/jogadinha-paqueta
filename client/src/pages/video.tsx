import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Sparkles,
  LogOut,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { SiWhatsapp, SiX, SiInstagram, SiTiktok } from "react-icons/si";
import { isUnauthorizedError, redirectToLogin } from "@/lib/auth-utils";
import type { GeneratedVideo } from "@shared/schema";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";

function ShareButton({ 
  platform, 
  icon: Icon, 
  label, 
  onClick,
  color
}: { 
  platform: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <Button
      variant="outline"
      className="flex-1 gap-2"
      onClick={onClick}
      data-testid={`button-share-${platform}`}
    >
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

export default function VideoPage() {
  const [, params] = useRoute("/video/:id");
  const [, navigate] = useLocation();
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const videoId = params?.id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirectToLogin(toast);
    }
  }, [authLoading, isAuthenticated, toast]);

  const { data: video, isLoading: videoLoading, refetch } = useQuery<GeneratedVideo>({
    queryKey: ["/api/videos", videoId],
    enabled: !!videoId && !!user,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "pending" || data.status === "processing")) {
        return 5000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (video?.status === "pending" || video?.status === "processing") {
      setPollCount((prev) => prev + 1);
    }
  }, [video?.status]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleDownload = async () => {
    if (!video?.generatedVideoUrl) return;
    
    try {
      const response = await fetch(video.generatedVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jogadinha-paqueta-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Download iniciado!",
        description: "Seu vídeo está sendo baixado.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o vídeo.",
        variant: "destructive",
      });
    }
  };

  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/compartilhar/${videoId}`;
  };

  const shareText = "Olha minha jogadinha do Paquetá! Crie a sua também:";

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + getShareUrl())}`;
    window.open(url, "_blank");
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl())}`;
    window.open(url, "_blank");
  };

  const handleShareInstagram = () => {
    toast({
      title: "Compartilhar no Instagram",
      description: "Baixe o vídeo e compartilhe no seu Stories ou Reels!",
    });
    handleDownload();
  };

  const handleShareTikTok = () => {
    toast({
      title: "Compartilhar no TikTok",
      description: "Baixe o vídeo e poste no TikTok!",
    });
    handleDownload();
  };

  if (authLoading || videoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Vídeo não encontrado</h2>
          <Button onClick={() => navigate("/")} data-testid="button-back-home">
            Voltar para o Início
          </Button>
        </div>
      </div>
    );
  }

  const firstName = user?.firstName || "Usuário";
  const isProcessing = video.status === "pending" || video.status === "processing";
  const isCompleted = video.status === "completed" && video.generatedVideoUrl;
  const isFailed = video.status === "failed";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
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
              <span className="text-sm font-medium hidden sm:block">{firstName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {isProcessing && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="font-display text-2xl mb-2">CRIANDO SUA JOGADINHA</h2>
              <p className="text-muted-foreground mb-4">
                A inteligência artificial está trabalhando no seu vídeo...
              </p>
              <div className="max-w-xs mx-auto space-y-2">
                <Progress 
                  value={Math.min(pollCount * 10, 90)} 
                  className="h-2" 
                  data-testid="progress-processing"
                />
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Isso pode levar alguns minutos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isFailed && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="font-display text-2xl mb-2">ALGO DEU ERRADO</h2>
              <p className="text-muted-foreground mb-4">
                {video.errorMessage || "Não foi possível criar seu vídeo. Tente novamente."}
              </p>
              <Button onClick={() => navigate("/criar")} data-testid="button-try-again">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {isCompleted && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Vídeo Pronto!</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl tracking-wide">
                SUA JOGADINHA
              </h1>
            </div>

            <Card className="overflow-hidden mb-6">
              <div className="relative aspect-[9/16] max-h-[70vh] mx-auto bg-black">
                <video
                  ref={videoRef}
                  src={video.generatedVideoUrl!}
                  className="w-full h-full object-contain"
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  data-testid="video-player"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-black/50 text-white backdrop-blur-sm"
                    onClick={handlePlayPause}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-black/50 text-white backdrop-blur-sm"
                    onClick={handleRestart}
                    data-testid="button-restart"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleDownload}
                  data-testid="button-download"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Vídeo
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Share2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Compartilhar</span>
                </div>
                <div className="flex gap-2">
                  <ShareButton
                    platform="whatsapp"
                    icon={SiWhatsapp}
                    label="WhatsApp"
                    color="text-green-500"
                    onClick={handleShareWhatsApp}
                  />
                  <ShareButton
                    platform="twitter"
                    icon={SiX}
                    label="Twitter/X"
                    color="text-foreground"
                    onClick={handleShareTwitter}
                  />
                  <ShareButton
                    platform="instagram"
                    icon={SiInstagram}
                    label="Instagram"
                    color="text-pink-500"
                    onClick={handleShareInstagram}
                  />
                  <ShareButton
                    platform="tiktok"
                    icon={SiTiktok}
                    label="TikTok"
                    color="text-foreground"
                    onClick={handleShareTikTok}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <Button variant="outline" onClick={() => navigate("/criar")} data-testid="button-create-another">
                <Sparkles className="w-4 h-4 mr-2" />
                Criar Outro Vídeo
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
