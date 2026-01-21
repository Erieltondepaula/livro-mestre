import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Shield, 
  ShieldOff, 
  UserX, 
  UserCheck, 
  Search,
  ArrowLeft,
  Crown,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { UserPermissionsDialog } from '@/components/UserPermissionsDialog';
import { useLibrary } from '@/hooks/useLibrary';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  is_master: boolean;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const { profile, isMaster } = useAuth();
  const navigate = useNavigate();
  const { clearAllData } = useLibrary();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'activate' | 'deactivate' | 'delete' | 'makeAdmin' | 'removeAdmin';
    user: UserProfile | null;
  }>({ open: false, action: 'activate', user: null });
  const [permissionsDialog, setPermissionsDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({ open: false, user: null });

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Load profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles = (profiles || []).map(p => ({
        ...p,
        roles: (roles || [])
          .filter(r => r.user_id === p.user_id)
          .map(r => r.role),
      }));

      setUsers(usersWithRoles as UserProfile[]);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAction = async () => {
    const { action, user } = actionDialog;
    if (!user) return;

    try {
      switch (action) {
        case 'activate':
        case 'deactivate':
          await supabase
            .from('profiles')
            .update({ is_active: action === 'activate' })
            .eq('user_id', user.user_id);
          toast({
            title: action === 'activate' ? "Usuário ativado" : "Usuário desativado",
            description: `${user.email} foi ${action === 'activate' ? 'ativado' : 'desativado'}.`,
          });
          break;

        case 'makeAdmin':
          await supabase
            .from('user_roles')
            .insert({ user_id: user.user_id, role: 'admin' });
          toast({
            title: "Admin adicionado",
            description: `${user.email} agora é administrador.`,
          });
          break;

        case 'removeAdmin':
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user.user_id)
            .eq('role', 'admin');
          toast({
            title: "Admin removido",
            description: `${user.email} não é mais administrador.`,
          });
          break;

        case 'delete':
          // Note: This only deletes the profile, not the auth user
          // Full user deletion would require admin API
          await supabase
            .from('profiles')
            .delete()
            .eq('user_id', user.user_id);
          toast({
            title: "Usuário removido",
            description: `${user.email} foi removido do sistema.`,
          });
          break;
      }

      await loadUsers();
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar a ação.",
        variant: "destructive",
      });
    }

    setActionDialog({ open: false, action: 'activate', user: null });
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionTitle = () => {
    const { action, user } = actionDialog;
    if (!user) return '';
    
    switch (action) {
      case 'activate': return `Ativar ${user.email}?`;
      case 'deactivate': return `Desativar ${user.email}?`;
      case 'delete': return `Excluir ${user.email}?`;
      case 'makeAdmin': return `Tornar ${user.email} administrador?`;
      case 'removeAdmin': return `Remover admin de ${user.email}?`;
    }
  };

  const getActionDescription = () => {
    const { action } = actionDialog;
    
    switch (action) {
      case 'activate': return 'O usuário poderá acessar o sistema novamente.';
      case 'deactivate': return 'O usuário não poderá acessar o sistema até ser reativado.';
      case 'delete': return 'Esta ação não pode ser desfeita. Os dados do usuário serão perdidos.';
      case 'makeAdmin': return 'O usuário terá acesso ao painel de administração.';
      case 'removeAdmin': return 'O usuário perderá acesso ao painel de administração.';
    }
  };

  const handleClearData = () => {
    clearAllData();
    toast({
      title: "Dados limpos",
      description: "Todos os seus dados foram removidos. Pode começar do zero!",
    });
  };

  // Helper to check if current user can edit this user
  const canEditUser = (user: UserProfile): boolean => {
    // Master can edit everyone including themselves
    if (isMaster) return true;
    // Regular admins cannot edit master users or themselves
    if (user.is_master) return false;
    if (user.user_id === profile?.user_id) return false;
    return true;
  };

  // Helper to get user type label
  const getUserTypeLabel = (user: UserProfile): string => {
    if (user.is_master) return 'Mestre';
    if (user.roles.includes('admin')) return 'Administrador';
    return 'Padrão';
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Gerenciamento de Usuários
              </h1>
              <p className="text-muted-foreground">
                Gerencie os usuários do sistema
              </p>
            </div>
          </div>
          
          {/* Clear Data Button - Only visible for master user */}
          {isMaster && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Meus Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover TODOS os seus dados: livros, leituras, avaliações e citações. 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
                    Sim, limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="w-fit">
              {filteredUsers.length} usuário{filteredUsers.length !== 1 && 's'}
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const editable = canEditUser(user);
                    return (
                      <TableRow 
                        key={user.id}
                        className={editable ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => {
                          if (editable) {
                            setPermissionsDialog({ open: true, user });
                          }
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.is_master && (
                              <Crown className="w-4 h-4 text-primary" />
                            )}
                            <div>
                              <p className="font-medium">{user.display_name || 'Sem nome'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'destructive'}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.is_master ? 'default' : user.roles.includes('admin') ? 'secondary' : 'outline'}
                            className={user.is_master ? 'bg-primary' : ''}
                          >
                            {getUserTypeLabel(user)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {editable && (
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPermissionsDialog({ open: true, user })}
                                title="Gerenciar Permissões"
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              
                              {/* Don't show activate/deactivate for master user editing themselves */}
                              {!(user.is_master && user.user_id === profile?.user_id) && (
                                <>
                                  {user.is_active ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActionDialog({ 
                                        open: true, 
                                        action: 'deactivate', 
                                        user 
                                      })}
                                      title="Desativar"
                                    >
                                      <UserX className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActionDialog({ 
                                        open: true, 
                                        action: 'activate', 
                                        user 
                                      })}
                                      title="Ativar"
                                    >
                                      <UserCheck className="w-4 h-4" />
                                    </Button>
                                  )}
                                  
                                  {user.roles.includes('admin') ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActionDialog({ 
                                        open: true, 
                                        action: 'removeAdmin', 
                                        user 
                                      })}
                                      title="Remover Admin"
                                    >
                                      <ShieldOff className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setActionDialog({ 
                                        open: true, 
                                        action: 'makeAdmin', 
                                        user 
                                      })}
                                      title="Tornar Admin"
                                    >
                                      <Shield className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          {!editable && user.is_master && !isMaster && (
                            <span className="text-xs text-muted-foreground">
                              Usuário mestre
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog 
        open={actionDialog.open} 
        onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>{getActionDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserPermissionsDialog
        open={permissionsDialog.open}
        onOpenChange={(open) => setPermissionsDialog(prev => ({ ...prev, open }))}
        user={permissionsDialog.user}
        onSave={loadUsers}
        isMasterEditing={isMaster}
      />
    </div>
  );
}
