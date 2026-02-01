import { forwardRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Quote as QuoteIcon, Trash2, ArrowLeft } from 'lucide-react';
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
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

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

  // Sort quotes by created_at descending (newest first)
  const sortedQuotes = [...quotes].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const handleQuoteClick = (quote: Quote) => {
    setSelectedQuote(quote);
  };

  const handleBack = () => {
    setSelectedQuote(null);
  };

  const handleClose = () => {
    setSelectedQuote(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedQuote && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-muted rounded transition-colors mr-1"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <QuoteIcon className="w-5 h-5 text-primary" />
            {selectedQuote ? 'Detalhes da Citação' : `Citações - ${title}`}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {selectedQuote ? (
            // Detailed view of selected quote
            <div className="space-y-4">
              <div className="card-library p-6">
                <div className="flex gap-4">
                  <QuoteIcon className="w-10 h-10 text-primary/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-foreground italic whitespace-pre-wrap break-words leading-relaxed">
                      "{selectedQuote.citacao}"
                    </p>
                    
                    <div className="mt-6 pt-4 border-t border-border space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Livro:</span>
                        <span className="font-medium">{selectedQuote.livro}</span>
                      </div>
                      
                      {formatBibleReference(selectedQuote) && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Referência:</span>
                          <span className="font-medium text-primary">{formatBibleReference(selectedQuote)}</span>
                        </div>
                      )}
                      
                      {selectedQuote.pagina > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Página:</span>
                          <span className="font-medium">{selectedQuote.pagina}</span>
                        </div>
                      )}
                    </div>
                    
                    {onDelete && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => {
                            onDelete(selectedQuote.id);
                            handleBack();
                          }}
                          className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover citação
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // List view of all quotes
            <div className="space-y-3">
              {sortedQuotes.map((quote) => {
                const bibleRef = formatBibleReference(quote);
                // Truncate long quotes for preview
                const previewText = quote.citacao.length > 100 
                  ? quote.citacao.substring(0, 100) + '...' 
                  : quote.citacao;
                
                return (
                  <button
                    key={quote.id}
                    onClick={() => handleQuoteClick(quote)}
                    className="w-full text-left card-library p-4 relative group hover:bg-primary/5 hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <div className="flex gap-3">
                      <QuoteIcon className="w-6 h-6 text-primary/30 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground italic mb-2 pr-2 line-clamp-3">
                          "{previewText}"
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
                  </button>
                );
              })}
              
              {sortedQuotes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma citação encontrada.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

QuotesListDialog.displayName = 'QuotesListDialog';
