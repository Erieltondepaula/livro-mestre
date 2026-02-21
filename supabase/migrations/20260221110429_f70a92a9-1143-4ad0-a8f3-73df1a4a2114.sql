-- Add material_category column to organize materials into Livros, Comentários, Dicionários
ALTER TABLE public.exegesis_materials 
ADD COLUMN material_category text NOT NULL DEFAULT 'comentario';

-- Add comment for clarity
COMMENT ON COLUMN public.exegesis_materials.material_category IS 'Category: livro, comentario, dicionario';
