import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, PlusCircle, BookMarked, Star, Quote, Library, Book, Menu, LogOut, Settings, Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

type View = 'dashboard' | 'cadastrar' | 'livros' | 'leitura' | 'status' | 'avaliacao' | 'citacoes' | 'dicionario';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cadastrar' as View, label: 'Cadastrar Livro', icon: PlusCircle },
  { id: 'livros' as View, label: 'Livros Cadastrados', icon: Library },
  { id: 'leitura' as View, label: 'Registar Leitura', icon: BookOpen },
  { id: 'status' as View, label: 'Status dos Livros', icon: BookMarked },
  { id: 'avaliacao' as View, label: 'Avaliações', icon: Star },
  { id: 'citacoes' as View, label: 'Citações', icon: Quote },
  { id: 'dicionario' as View, label: 'Dicionário', icon: Book },
];

function UserMenu() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Até logo!",
      description: "Você saiu da sua conta.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {profile?.display_name || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="w-4 h-4 mr-2" />
          Meu Perfil
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin')}>
              <Shield className="w-4 h-4 mr-2" />
              Gerenciar Usuários
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ currentView, onViewChange, onItemClick }: SidebarProps & { onItemClick?: () => void }) {
  return (
    <>
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Library className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg md:text-xl font-semibold text-foreground truncate">Minha Biblioteca</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Planner de Leituras</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 md:p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onViewChange(item.id);
                    onItemClick?.();
                  }}
                  className={`nav-item w-full ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 md:p-4 border-t border-border">
        <UserMenu />
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-muted-foreground text-center">
          © Planner de Leituras
        </p>
      </div>
    </>
  );
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Header - visible below 720px */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-72 p-0 flex flex-col">
            <SidebarContent 
              currentView={currentView} 
              onViewChange={onViewChange} 
              onItemClick={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Library className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground truncate text-sm sm:text-base">Minha Biblioteca</span>
        </div>
      </div>

      {/* Desktop Sidebar - visible from 1024px */}
      <aside className="hidden lg:flex w-60 xl:w-72 bg-card border-r border-border h-screen sticky top-0 flex-col flex-shrink-0">
        <SidebarContent currentView={currentView} onViewChange={onViewChange} />
      </aside>
    </>
  );
}
