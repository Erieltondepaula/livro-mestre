import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Camera, User, Save, Lock, Loader2, Bell, BookOpen, LayoutDashboard, PlusCircle, Library, BookMarked, Star, Quote, Book, BarChart3, ScrollText, Brain, GraduationCap, StickyNote, Activity, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageCropDialog } from '@/components/ImageCropDialog';

const ALL_MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'cadastrar', label: 'Cadastrar Livro', icon: PlusCircle },
  { key: 'livros', label: 'Livros Cadastrados', icon: Library },
  { key: 'leitura', label: 'Registrar Leitura', icon: BookOpen },
  { key: 'status', label: 'Status dos Livros', icon: BookMarked },
  { key: 'avaliacao', label: 'Avaliações', icon: Star },
  { key: 'citacoes', label: 'Citações', icon: Quote },
  { key: 'notas', label: 'Notas', icon: StickyNote },
  { key: 'biblia', label: 'Progresso Bíblia', icon: Book },
  { key: 'exegese', label: 'Exegese Bíblica', icon: ScrollText },
  { key: 'exegese.analisar', label: '  → Analisar Passagem', icon: ScrollText },
  { key: 'exegese.ref_cruzadas', label: '  → Referências Cruzadas', icon: ScrollText },
  { key: 'exegese.historico', label: '  → Histórico de Análises', icon: ScrollText },
  { key: 'exegese.esbocos', label: '  → Esboços de Sermões', icon: ScrollText },
  { key: 'exegese.materiais', label: '  → Materiais de Referência', icon: ScrollText },
  
  { key: 'dicionario', label: 'Dicionário', icon: Book },
  { key: 'flashcards', label: 'Flashcards', icon: Brain },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'diagnostico', label: 'Diagnóstico', icon: Activity },
  { key: 'ajuda', label: 'Ajuda', icon: HelpCircle },
];

export default function Profile() {
  const { user, profile, updateProfile, updatePassword, isMaster, isAdmin, refreshProfile, hasModuleAccess, permissions } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  
  // Notification preferences (stored in localStorage)
  const [notifGoals, setNotifGoals] = useState(() => localStorage.getItem('notif_goals') !== 'false');
  const [notifReminders, setNotifReminders] = useState(() => localStorage.getItem('notif_reminders') !== 'false');
  
  // Image crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  const handleNotifGoalsChange = (checked: boolean) => {
    setNotifGoals(checked);
    localStorage.setItem('notif_goals', String(checked));
    toast({ title: checked ? '🔔 Notificações de metas ativadas' : '🔕 Notificações de metas desativadas' });
  };

  const handleNotifRemindersChange = (checked: boolean) => {
    setNotifReminders(checked);
    localStorage.setItem('notif_reminders', String(checked));
    toast({ title: checked ? '🔔 Lembretes de leitura ativados' : '🔕 Lembretes de leitura desativados' });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 10MB.", variant: "destructive" });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);

      const { error: avatarUpdateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      if (avatarUpdateError) throw avatarUpdateError;

      await refreshProfile();
      toast({ title: "Foto atualizada!", description: "Sua foto de perfil foi atualizada com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (selectedImageSrc) { URL.revokeObjectURL(selectedImageSrc); setSelectedImageSrc(''); }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await updateProfile({ display_name: displayName });
      if (error) throw error;
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMaster) { toast({ title: "Erro", description: "O usuário mestre não pode alterar a senha por aqui.", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" }); return; }

    setIsSaving(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: "Senha alterada!", description: "Sua senha foi atualizada com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>

        {/* Avatar Section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Foto de Perfil</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>
            <div>
              <p className="font-medium">{profile?.display_name || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Clique no ícone para alterar (máx. 10MB)</p>
            </div>
          </div>
        </div>

        {/* Profile Info Section */}
        <form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome" />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        </form>

        {/* Notifications Section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Notificações de Metas</p>
                <p className="text-xs text-muted-foreground">Receba alertas sobre progresso e metas de leitura</p>
              </div>
              <Switch checked={notifGoals} onCheckedChange={handleNotifGoalsChange} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Lembretes de Leitura</p>
                <p className="text-xs text-muted-foreground">Lembretes diários para manter sua sequência de leitura</p>
              </div>
              <Switch checked={notifReminders} onCheckedChange={handleNotifRemindersChange} />
            </div>
          </div>
        </div>

        {/* Modules Access Section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Módulos Disponíveis
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            {(isMaster || isAdmin) ? 'Você tem acesso total a todos os módulos.' : 'Módulos liberados para sua conta:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_MODULES.map(mod => {
              const Icon = mod.icon;
              const hasAccess = hasModuleAccess(mod.key);
              const isSubModule = mod.key.includes('.');
              return (
                <div
                  key={mod.key}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    hasAccess 
                      ? 'border-primary/20 bg-primary/5' 
                      : 'border-border bg-muted/30 opacity-60'
                  } ${isSubModule ? 'ml-4' : ''}`}
                >
                  {hasAccess ? (
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-xs ${hasAccess ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {mod.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Password Section */}
        {!isMaster && (
          <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
              <Button type="submit" variant="secondary" disabled={isSaving || !newPassword}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Alterar Senha
              </Button>
            </div>
          </form>
        )}
      </div>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        title="Ajustar foto de perfil"
      />
    </div>
  );
}
