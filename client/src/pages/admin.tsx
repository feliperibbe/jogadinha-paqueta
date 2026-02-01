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
  Check, 
  Clock, 
  Loader2,
  Users,
  CreditCard,
  Shield
} from "lucide-react";
import { redirectToLogin } from "@/lib/auth-utils";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@assets/Gemini_Generated_Image_xrvv7yxrvv7yxrvv_1769958024585.png";
import type { User } from "@shared/schema";

interface PaymentRequestWithUser {
  id: string;
  userId: string;
  amount: string;
  status: string;
  createdAt: string;
  user: User | null;
}

export default function Admin() {
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirectToLogin(toast);
    }
  }, [authLoading, isAuthenticated, toast]);

  const { data: pendingPayments, isLoading: paymentsLoading } = useQuery<PaymentRequestWithUser[]>({
    queryKey: ["/api/admin/payment-requests"],
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/payment-requests/${id}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Pagamento aprovado!",
        description: "O usuário recebeu 1 crédito.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Tente novamente.",
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

  const firstName = user?.firstName || "Admin";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Pagamentos Pendentes
            </CardTitle>
            <CardDescription>
              Aprove os pagamentos para liberar créditos aos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : pendingPayments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum pagamento pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments?.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={payment.user?.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-muted">
                          {payment.user?.firstName?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {payment.user?.firstName || "Usuário"} {payment.user?.lastName || ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.user?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">R$ {payment.amount}</Badge>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(payment.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${payment.id}`}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </>
                        )}
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
                    <Badge variant="outline">
                      {u.credits} crédito{u.credits !== 1 ? "s" : ""}
                    </Badge>
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
