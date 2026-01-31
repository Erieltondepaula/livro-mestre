import { forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Quote as QuoteIcon, Trash2 } from 'lucide-react';
import type { Quote } from '@/types/library';

interface QuotesListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  quotes: Quote[];
  onDelete?: (id: string) => void;
}

export const QuotesListDialog = forwardRef<HTMLDivElement, QuotesListDialogProps>(({ 
  isOpen, 
  onClose, 
  title, 
  quotes,
  onDelete 
}, ref) => {
  const formatBibleReference = (quote: Quote) => {
    if (quote.bibleBook) {
      let ref = quote.bibleBook;
      if (quote.bibleChapter) {
        ref += ` ${quote.bibleChapter}`;
        if (quote.bibleVerse) {
          ref += `:${quote.bibleVerse}`;
        }
      }
      return ref;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QuoteIcon className="w-5 h-5 text-primary" />
            Citações - {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {quotes.map((quote) => {
              const bibleRef = formatBibleReference(quote);
              
              return (
                <div key={quote.id} className="card-library p-4 relative group">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(quote.id)}
                      className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Remover citação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex gap-3">
                    <QuoteIcon className="w-6 h-6 text-primary/30 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground italic mb-3 pr-8 whitespace-pre-wrap break-words">
                        "{quote.citacao}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bibleRef ? (
                          <span className="font-medium text-primary">{bibleRef}</span>
                        ) : (
                          <span>Página {quote.pagina}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {quotes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma citação encontrada.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

QuotesListDialog.displayName = 'QuotesListDialog';
