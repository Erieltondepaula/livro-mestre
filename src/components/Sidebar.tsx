import { BookOpen, LayoutDashboard, PlusCircle, BookMarked, Star, Quote, Library } from 'lucide-react';

type View = 'dashboard' | 'cadastrar' | 'leitura' | 'status' | 'avaliacao' | 'citacoes';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cadastrar' as View, label: 'Cadastrar Livro', icon: PlusCircle },
  { id: 'leitura' as View, label: 'Registar Leitura', icon: BookOpen },
  { id: 'status' as View, label: 'Status dos Livros', icon: BookMarked },
  { id: 'avaliacao' as View, label: 'Avaliações', icon: Star },
  { id: 'citacoes' as View, label: 'Citações', icon: Quote },
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-72 bg-card border-r border-border h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Library className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Minha Biblioteca</h1>
            <p className="text-sm text-muted-foreground">Planner de Leituras</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`nav-item w-full ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2023 Planner de Leituras
        </p>
      </div>
    </aside>
  );
}
