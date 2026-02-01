import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Share2, 
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  AlertCircle,
  UserPlus
} from "lucide-react";
import { SiWhatsapp, SiX, SiInstagram, SiTiktok } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";

interface PublicVideo {
  id: string;
  generatedVideoUrl: string;
  status: string;
  createdAt: string;
}

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

export default function VideoPublicPage() {
  const [, params] = useRoute("/compartilhar/:id");
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoId = params?.id;

  const { data: video, isLoading, error } = useQuery<PublicVideo>({
    queryKey: ["/api/videos/public", videoId],
    enabled: !!videoId,
  });

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
    return typeof window !== "undefined" ? window.location.href : "";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
          <p className="mt-4 text-muted-foreground">Carregando vídeo...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Vídeo não encontrado</h2>
          <p className="text-muted-foreground mb-6">
            Este vídeo não existe ou ainda não está disponível.
          </p>
          <Button asChild data-testid="button-create-own">
            <a href="/api/login">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Meu Próprio Vídeo
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-md object-cover" />
              <span className="font-display text-2xl tracking-wide hidden sm:block">JOGADINHA DO PAQUETÁ</span>
            </div>
          </Link>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Criar Meu Vídeo</a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl md:text-4xl tracking-wide">
            JOGADINHA DO PAQUETÁ
          </h1>
          <p className="text-muted-foreground mt-2">
            Alguém compartilhou esse vídeo com você!
          </p>
        </div>

        <Card className="overflow-hidden mb-6">
          <div className="relative aspect-[9/16] max-h-[70vh] mx-auto bg-black">
            <video
              ref={videoRef}
              src={video.generatedVideoUrl}
              className="w-full h-full object-contain"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              data-testid="video-player-public"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 text-white backdrop-blur-sm"
                onClick={handlePlayPause}
                data-testid="button-play-pause-public"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="bg-black/50 text-white backdrop-blur-sm"
                onClick={handleRestart}
                data-testid="button-restart-public"
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
              data-testid="button-download-public"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar Vídeo
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
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

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl mb-2">QUER FAZER O SEU?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Crie sua própria jogadinha do Paquetá de graça!
            </p>
            <Button asChild size="lg" data-testid="button-create-own-bottom">
              <a href="/api/login">
                <UserPlus className="w-4 h-4 mr-2" />
                Criar Minha Jogadinha
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border py-8 mt-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2024 Jogadinha do Paquetá. Feito com amor para a Nação Rubro-Negra.</p>
        </div>
      </footer>
    </div>
  );
}
