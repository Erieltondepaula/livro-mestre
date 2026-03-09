import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Upload, Trash2, Type, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FontData {
  name: string;
  family: string;
  url: string;
  weight?: string;
  style?: string;
}

interface FontUploadProps {
  onFontAdded: (fontFamily: string) => void;
}

export function FontUpload({ onFontAdded }: FontUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customFonts, setCustomFonts] = useState<FontData[]>([]);
  const [fontName, setFontName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved fonts from localStorage
  useState(() => {
    try {
      const saved = localStorage.getItem('exegesis-custom-fonts');
      if (saved) {
        const fonts = JSON.parse(saved) as FontData[];
        setCustomFonts(fonts);
        // Apply fonts to document
        fonts.forEach(applyFontToDocument);
      }
    } catch (error) {
      console.error('Error loading custom fonts:', error);
    }
  });

  const applyFontToDocument = (font: FontData) => {
    if (document.getElementById(`font-${font.family}`)) return;
    
    const style = document.createElement('style');
    style.id = `font-${font.family}`;
    style.textContent = `
      @font-face {
        font-family: '${font.family}';
        src: url('${font.url}') format('truetype');
        font-weight: ${font.weight || 'normal'};
        font-style: ${font.style || 'normal'};
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(ttf|otf|woff|woff2)$/i)) {
      toast({ 
        title: "Formato inválido", 
        description: "Apenas arquivos .ttf, .otf, .woff, .woff2 são suportados",
        variant: "destructive" 
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ 
        title: "Arquivo muito grande", 
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive" 
      });
      return;
    }

    if (!fontName.trim()) {
      toast({ 
        title: "Nome necessário", 
        description: "Digite um nome para a fonte",
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);
    try {
      // Convert to data URL for local storage
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const fontFamily = fontName.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ');
          const newFont: FontData = {
            name: fontName.trim(),
            family: fontFamily,
            url: event.target.result as string
          };

          // Apply font immediately
          applyFontToDocument(newFont);

          // Save to localStorage
          const updatedFonts = [...customFonts, newFont];
          setCustomFonts(updatedFonts);
          localStorage.setItem('exegesis-custom-fonts', JSON.stringify(updatedFonts));

          onFontAdded(`'${fontFamily}', serif`);
          
          toast({ title: `Fonte "${fontName}" carregada com sucesso!` });
          setFontName('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ 
        title: "Erro no upload", 
        description: "Não foi possível carregar a fonte",
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFont = (fontToRemove: FontData) => {
    const updatedFonts = customFonts.filter(f => f.family !== fontToRemove.family);
    setCustomFonts(updatedFonts);
    localStorage.setItem('exegesis-custom-fonts', JSON.stringify(updatedFonts));
    
    // Remove from document
    const style = document.getElementById(`font-${fontToRemove.family}`);
    if (style) style.remove();
    
    toast({ title: `Fonte "${fontToRemove.name}" removida` });
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Upload de Fontes</TooltipContent>
          </Tooltip>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Gerenciar Fontes Personalizadas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload Section */}
            <div className="space-y-3 p-4 border rounded-lg">
              <Label htmlFor="font-name" className="text-sm font-medium">Nome da Fonte</Label>
              <Input
                id="font-name"
                placeholder="Ex: Minha Fonte Bonita"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                className="text-sm"
              />
              
              <Label htmlFor="font-file" className="text-sm font-medium">Arquivo da Fonte</Label>
              <Input
                ref={fileInputRef}
                id="font-file"
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-sm"
              />
              
              <p className="text-xs text-muted-foreground">
                Formatos suportados: TTF, OTF, WOFF, WOFF2 (máx. 5MB)
              </p>
            </div>

            {/* Fonts List */}
            {customFonts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fontes Instaladas</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {customFonts.map((font, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div>
                        <p className="font-medium" style={{ fontFamily: `'${font.family}', serif` }}>
                          {font.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Família: {font.family}</p>
                      </div>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onFontAdded(`'${font.family}', serif`)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Aplicar Fonte</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeFont(font)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover Fonte</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {customFonts.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhuma fonte personalizada instalada
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}