import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Instalado!</CardTitle>
            <CardDescription>
              O Plano de Leitura já está instalado no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Abrir App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 mb-4">
            <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full rounded-2xl" />
          </div>
          <CardTitle className="text-2xl">Instalar Plano de Leitura</CardTitle>
          <CardDescription>
            Instale o app no seu celular para acesso rápido e funcionamento offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <span>Acesso rápido pela tela inicial</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <span>Funciona offline</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <span>Atualizações automáticas</span>
            </div>
          </div>

          {/* Install Instructions */}
          {isIOS ? (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="font-medium text-sm">Como instalar no iPhone/iPad:</p>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                  Toque no ícone <Share className="w-4 h-4 inline mx-1" /> Compartilhar
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                  Role e toque em "Adicionar à Tela de Início"
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
                  Toque em "Adicionar"
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Instalar Agora
            </Button>
          ) : (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="font-medium text-sm">Como instalar no Android:</p>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                  Toque no menu <MoreVertical className="w-4 h-4 inline mx-1" /> do navegador
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                  Toque em "Instalar app" ou "Adicionar à tela inicial"
                </li>
              </ol>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Continuar no navegador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
