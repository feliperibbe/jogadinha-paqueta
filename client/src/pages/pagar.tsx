import { useEffect, useState } from "react";
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
  Copy, 
  Check, 
  Clock, 
  Loader2,
  QrCode,
  Smartphone
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { redirectToLogin } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";

interface PixInfo {
  pixKey: string;
  amount: string;
  description: string;
  pixCode: string;
}

interface PendingPayment {
  hasPending: boolean;
  pending?: {
    id: string;
    status: string;
    createdAt: string;
  };
}

export default function Pagar() {
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirectToLogin(toast);
    }
  }, [authLoading, isAuthenticated, toast]);

  const { data: pixInfo, isLoading: pixLoading } = useQuery<PixInfo>({
    queryKey: ["/api/pix-info"],
    enabled: isAuthenticated,
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery<PendingPayment>({
    queryKey: ["/api/payment-requests/pending"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const { data: creditsData } = useQuery<{ credits: number }>({
    queryKey: ["/api/user/credits"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payment-requests", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests/pending"] });
      toast({
        title: "Pagamento registrado!",
        description: "Aguarde a aprovação do seu pagamento.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (creditsData && creditsData.credits > 0) {
      toast({
        title: "Crédito liberado!",
        description: "Seu pagamento foi aprovado. Você pode criar seu vídeo agora!",
      });
      navigate("/criar");
    }
  }, [creditsData, navigate, toast]);

  const handleCopyPixKey = async () => {
    if (!pixInfo?.pixKey) return;
    
    try {
      await navigator.clipboard.writeText(pixInfo.pixKey);
      setCopied(true);
      toast({
        title: "Chave PIX copiada!",
        description: "Cole no seu app de banco para pagar.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Copie manualmente: " + pixInfo.pixKey,
        variant: "destructive",
      });
    }
  };

  const handleConfirmPayment = () => {
    createPaymentMutation.mutate();
  };

  if (authLoading || pixLoading) {
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
  const hasPendingPayment = pendingData?.hasPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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

      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl tracking-wide mb-2">
            ADQUIRIR CRÉDITO
          </h1>
          <p className="text-muted-foreground">
            Faça um PIX para gerar mais vídeos
          </p>
        </div>

        {hasPendingPayment ? (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="font-display text-xl mb-2">PAGAMENTO PENDENTE</h2>
              <p className="text-muted-foreground mb-4">
                Seu pagamento está sendo verificado. Assim que for aprovado, você receberá 1 crédito para criar seu vídeo.
              </p>
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Aguardando aprovação
              </Badge>
              <p className="text-xs text-muted-foreground mt-4">
                Isso pode levar alguns minutos
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Pagamento via PIX
                </CardTitle>
                <CardDescription>
                  Pague R$ {pixInfo?.amount} para gerar 1 vídeo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted rounded-lg p-6 text-center">
                  <p className="text-3xl font-bold text-primary mb-2">
                    R$ {pixInfo?.amount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    por vídeo
                  </p>
                </div>

                {pixInfo?.pixCode && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-medium">Escaneie o QR Code:</p>
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG 
                        value={pixInfo.pixCode} 
                        size={180}
                        level="M"
                        data-testid="pix-qrcode"
                      />
                    </div>
                  </div>
                )}

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 border-t border-border"></div>
                  <span className="text-xs text-muted-foreground">ou</span>
                  <div className="flex-1 border-t border-border"></div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Chave PIX (Telefone):</p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted rounded-md px-4 py-3 text-center font-mono text-lg">
                      {pixInfo?.pixKey}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleCopyPixKey}
                      data-testid="button-copy-pix"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Como pagar:</p>
                      <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Abra o app do seu banco</li>
                        <li>Escolha pagar com PIX</li>
                        <li>Cole a chave copiada acima</li>
                        <li>Confirme o valor de R$ {pixInfo?.amount}</li>
                        <li>Volte aqui e clique em "Já paguei"</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirmPayment}
              disabled={createPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {createPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Já Paguei
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Após clicar em "Já paguei", aguarde a aprovação para receber seu crédito
            </p>
          </>
        )}
      </main>
    </div>
  );
}
