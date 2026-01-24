import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Crown, BookOpen, Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentBookCount: number;
}

export function UpgradePrompt({ isOpen, onClose, currentBookCount }: UpgradePromptProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/assinatura');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Limite Atingido!</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Você já cadastrou <span className="font-bold text-foreground">{currentBookCount} livros</span> no plano gratuito.
            <br /><br />
            Para cadastrar mais livros e desbloquear todos os recursos, faça upgrade para um plano premium!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Cadastro <strong>ilimitado</strong> de livros</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Todas as funcionalidades desbloqueadas</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Crown className="h-5 w-5 text-primary" />
            <span>Garantia de 7 dias com reembolso total</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button onClick={handleUpgrade} className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Ver Planos de Assinatura
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Continuar no Plano Gratuito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
