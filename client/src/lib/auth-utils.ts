export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant?: "default" | "destructive" | null }) => void) {
  if (toast) {
    toast({
      title: "Sessão expirada",
      description: "Fazendo login novamente...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/api/login";
  }, 500);
}
