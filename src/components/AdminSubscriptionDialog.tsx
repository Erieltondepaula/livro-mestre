import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AdminSubscriptionDialogProps {
  userId: string | null;
  userEmail: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSubscriptionDialog({ userId, userEmail, isOpen, onClose }: AdminSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState('pro');
  const [days, setDays] = useState('30');

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Calcula a data de expiração baseada nos dias escolhidos
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(days));
      const isoDate = expirationDate.toISOString();

      // 1. Atualiza ou Cria a Assinatura
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          status: 'active',
          plan_type: plan,
          current_period_end: isoDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (subError) throw subError;

      // 2. Garante que o Perfil está Ativo
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success(`Assinatura de ${userEmail} atualizada! Vence em ${days} dias.`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Assinatura</DialogTitle>
          <DialogDescription>
            Editando acesso para: <span className="font-bold text-primary">{userEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pro">Pro (Completo)</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duração (Dias)</Label>
            <div className="flex gap-2">
               {/* Botões rápidos */}
              <Button variant="outline" size="sm" onClick={() => setDays('10')}>10 Dias</Button>
              <Button variant="outline" size="sm" onClick={() => setDays('30')}>30 Dias</Button>
              <Button variant="outline" size="sm" onClick={() => setDays('365')}>1 Ano</Button>
              <Button variant="outline" size="sm" onClick={() => setDays('36500')}>Vitalício</Button>
            </div>
            <Input 
              type="number" 
              value={days} 
              onChange={(e) => setDays(e.target.value)} 
              placeholder="Ex: 10"
            />
            <p className="text-xs text-muted-foreground">
              O acesso expirará automaticamente após esse período.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Confirmar e Liberar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}