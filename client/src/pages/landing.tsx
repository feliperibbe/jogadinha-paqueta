import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Share2, Sparkles } from "lucide-react";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-md object-cover" />
            <span className="font-display text-2xl tracking-wide">JOGADINHA DO PAQUETÁ</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Entrar</a>
          </Button>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden min-h-[80vh] flex items-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="video-background"
          >
            <source src="/api/reference-video" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
          
          <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wide mb-6 leading-tight text-white drop-shadow-lg">
                FAÇA SUA<br />
                <span className="text-gradient-flamengo">JOGADINHA</span>
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl mx-auto drop-shadow">
                Envie sua foto, espere alguns minutos e dance igual ao Paquetá!
              </p>
              <Button size="lg" asChild className="text-lg px-8" data-testid="button-start-hero">
                <a href="/api/login">Começar Agora</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 bg-card/50">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-3xl md:text-4xl text-center mb-12 tracking-wide">
              COMO FUNCIONA
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="p-6 text-center hover-elevate">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">1. Envie sua Foto</h3>
                <p className="text-muted-foreground text-sm">
                  Escolha uma foto sua bem iluminada e de frente
                </p>
              </Card>

              <Card className="p-6 text-center hover-elevate">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">2. IA faz a Mágica</h3>
                <p className="text-muted-foreground text-sm">
                  Nossa inteligência artificial cria seu vídeo dançando
                </p>
              </Card>

              <Card className="p-6 text-center hover-elevate">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">3. Compartilhe</h3>
                <p className="text-muted-foreground text-sm">
                  Baixe e compartilhe com seus amigos nas redes sociais
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl mb-6 tracking-wide">
              PRONTO PARA DANÇAR?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Crie sua conta grátis e comece a fazer seus vídeos agora mesmo!
            </p>
            <Button size="lg" asChild className="text-lg px-8" data-testid="button-start-bottom">
              <a href="/api/login">Criar Minha Conta</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4">
          <img src={logoImage} alt="Logo" className="w-12 h-12 rounded-md object-cover" />
          <p className="text-muted-foreground text-sm">© 2026 Jogadinha do Paquetá. Feito com amor para a Nação Rubro-Negra.</p>
        </div>
      </footer>
    </div>
  );
}
