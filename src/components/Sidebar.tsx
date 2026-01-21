import { useState } from 'react';
import { BookOpen, LayoutDashboard, PlusCircle, BookMarked, Star, Quote, Library, Book, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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

      <div className="p-4 border-t border-border">
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
