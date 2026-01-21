import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Camera, User, Save, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImageCropDialog } from '@/components/ImageCropDialog';

export default function Profile() {
  const { user, profile, updateProfile, updatePassword, isMaster, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  
  // Image crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');

  // Sync avatarUrl with profile when it changes
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  // Sync displayName with profile when it changes
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for cropping)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setIsUploading(true);
    try {
      const filePath = `${user.id}/avatar-${Date.now()}.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update local state immediately for UI feedback
      const newAvatarUrl = publicUrl;
      setAvatarUrl(newAvatarUrl);

      // Update avatar_url in profile
      const { error: avatarUpdateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('user_id', user.id);

      if (avatarUpdateError) throw avatarUpdateError;

      // Refresh profile in context to sync the change across the app
      await refreshProfile();

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar foto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clean up object URL
      if (selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc('');
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await updateProfile({ display_name: displayName });
      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMaster) {
      toast({
        title: "Erro",
        description: "O usuário mestre não pode alterar a senha por aqui.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
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
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium">{profile?.display_name || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no ícone para alterar a foto (máx. 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info Section */}
        <form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Informações Pessoais</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </form>

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
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
              <Button type="submit" variant="secondary" disabled={isSaving || !newPassword}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Alterar Senha
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Image Crop Dialog */}
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
