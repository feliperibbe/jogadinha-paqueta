import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Upload, Share2, Video } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md gradient-flamengo flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl tracking-wide">JOGADINHA DO PAQUETÁ</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Entrar</a>
          </Button>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-flamengo opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          
          <div className="container mx-auto px-4 py-24 md:py-32 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wide mb-6 leading-tight">
                FAÇA SUA<br />
                <span className="text-gradient-flamengo">JOGADINHA</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Envie sua foto e veja a mágica acontecer! A inteligência artificial vai criar um vídeo incrível de você dançando.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-lg px-8" data-testid="button-start-hero">
                  <a href="/api/login">Começar Agora</a>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-demo">
                  <Video className="w-5 h-5 mr-2" />
                  Ver Exemplo
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-card/50">
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

        <section className="py-20">
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
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2024 Jogadinha do Paquetá. Feito com amor para a Nação Rubro-Negra.</p>
        </div>
      </footer>
    </div>
  );
}
