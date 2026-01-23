# 📚 Documentação Completa do Projeto - Biblioteca de Leitura

> **Última atualização:** 23 Janeiro 2026  
> **Versão:** 1.1  
> **Autor:** Documentação gerada via Lovable

---

## 📋 Índice

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Tecnologias Utilizadas](#2-tecnologias-utilizadas)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Configuração do Ambiente Local](#4-configuração-do-ambiente-local)
5. [Banco de Dados - Implementação Completa](#5-banco-de-dados---implementação-completa)
6. [Sistema de Autenticação](#6-sistema-de-autenticação)
7. [Políticas de Segurança (RLS)](#7-políticas-de-segurança-rls)
8. [Storage - Upload de Arquivos](#8-storage---upload-de-arquivos)
9. [Edge Functions](#9-edge-functions)
10. [Guia de Manutenção](#10-guia-de-manutenção)

---

## 1. Visão Geral do Projeto

### 1.1 Descrição
Sistema de gerenciamento de biblioteca pessoal que permite aos usuários:
- Cadastrar e gerenciar livros
- Registrar leituras diárias
- Salvar citações favoritas
- Avaliar livros lidos
- Acompanhar progresso de leitura da Bíblia
- Gerenciar vocabulário aprendido

### 1.2 Arquitetura Multi-Usuário
O sistema é uma plataforma **multi-usuário** com:
- Autenticação obrigatória (email/senha)
- Isolamento estrito de dados por usuário
- Row Level Security (RLS) em todas as tabelas
- Sistema de permissões e roles

### 1.3 Tipos de Usuários
| Role | Descrição |
|------|-----------|
| `user` | Usuário padrão, acesso aos próprios dados |
| `admin` | Administrador, pode gerenciar usuários e configurações |
| `master` | Super administrador, não pode ser modificado por admins |

---

## 2. Tecnologias Utilizadas

### 2.1 Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| React | 18.3.1 | Biblioteca UI |
| TypeScript | - | Tipagem estática |
| Vite | - | Build tool |
| Tailwind CSS | - | Framework CSS |
| shadcn/ui | - | Componentes UI |
| React Router | 6.30.1 | Roteamento |
| TanStack Query | 5.83.0 | Gerenciamento de estado servidor |
| React Hook Form | 7.61.1 | Formulários |
| Zod | 4.3.5 | Validação |

### 2.2 Backend
| Tecnologia | Descrição |
|------------|-----------|
| Supabase | Backend as a Service |
| PostgreSQL | Banco de dados |
| Edge Functions | Funções serverless (Deno) |

### 2.3 Dependências Principais
```json
{
  "@supabase/supabase-js": "^2.90.1",
  "@tanstack/react-query": "^5.83.0",
  "react-hook-form": "^7.61.1",
  "lucide-react": "^0.462.0",
  "date-fns": "^3.6.0",
  "recharts": "^2.15.4",
  "sonner": "^1.7.4",
  "zod": "^4.3.5"
}
```

---

## 3. Estrutura do Projeto

### 3.1 Estrutura de Pastas
```
projeto/
├── public/                     # Arquivos públicos
│   ├── favicon.ico
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── robots.txt
├── src/
│   ├── assets/                 # Imagens e recursos
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base (shadcn)
│   │   ├── BookForm.tsx        # Formulário de livros
│   │   ├── ReadingForm.tsx     # Formulário de leituras
│   │   ├── QuotesView.tsx      # Visualização de citações
│   │   ├── Dashboard.tsx       # Dashboard principal
│   │   ├── Sidebar.tsx         # Menu lateral
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx     # Contexto de autenticação
│   ├── hooks/
│   │   ├── useLibrary.ts       # Hook principal da biblioteca
│   │   ├── use-mobile.tsx      # Detecção mobile
│   │   └── use-toast.ts        # Notificações
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Cliente Supabase (auto-gerado)
│   │       └── types.ts        # Tipos do banco (auto-gerado)
│   ├── lib/
│   │   ├── utils.ts            # Utilitários
│   │   └── validations.ts      # Validações
│   ├── pages/
│   │   ├── Index.tsx           # Página principal
│   │   ├── Auth.tsx            # Login/Registro
│   │   ├── Admin.tsx           # Painel admin
│   │   ├── Profile.tsx         # Perfil do usuário
│   │   └── ...
│   ├── types/
│   │   └── library.ts          # Tipos TypeScript
│   ├── App.tsx                 # Componente raiz
│   ├── main.tsx                # Entry point
│   └── index.css               # Estilos globais
├── supabase/
│   ├── config.toml             # Configuração Supabase
│   └── functions/
│       └── dictionary/         # Edge function dicionário
│           └── index.ts
├── .env.example                # Template de variáveis
├── capacitor.config.ts         # Config mobile (Capacitor)
├── tailwind.config.ts          # Config Tailwind
├── vite.config.ts              # Config Vite
└── package.json
```

### 3.2 Componentes Principais
| Componente | Descrição |
|------------|-----------|
| `Dashboard.tsx` | Painel principal com métricas |
| `BooksListView.tsx` | Lista de livros |
| `ReadingForm.tsx` | Registro de leituras |
| `QuotesView.tsx` | Gerenciamento de citações |
| `BibleProgressView.tsx` | Progresso da Bíblia |
| `VocabularyDialog.tsx` | Vocabulário aprendido |
| `EvaluationForm.tsx` | Avaliação de livros |

---

## 4. Configuração do Ambiente Local

### 4.1 Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn
- Conta no Supabase (para banco externo)

### 4.2 Passo a Passo

#### Passo 1: Clonar/Baixar o Projeto
```bash
# Via Git (se conectado ao GitHub)
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# Ou baixe o ZIP pelo Lovable
```

#### Passo 2: Instalar Dependências
```bash
cd nome-do-projeto
npm install
```

#### Passo 3: Configurar Variáveis de Ambiente
```bash
# Renomear o arquivo de exemplo
cp .env.example .env

# Ou no Windows:
copy .env.example .env
```

#### Passo 4: Editar o arquivo `.env`
```env
# Suas credenciais do Supabase
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key_aqui
VITE_SUPABASE_PROJECT_ID=seu_project_id_aqui
```

#### Passo 5: Executar o Projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

### 4.3 Onde Encontrar as Credenciais do Supabase
1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - O ID está na URL (ex: `abc123xyz` de `https://abc123xyz.supabase.co`)

---

## 5. Banco de Dados - Implementação Completa

### 5.1 Visão Geral do Schema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────▶│    profiles     │     │   user_roles    │
│   (Supabase)    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     books       │────▶│    statuses     │     │ user_permissions│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    readings     │ │     quotes      │ │   evaluations   │ │   vocabulary    │
│                 │ │                 │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│   book_types    │     │ book_categories │
│                 │     │                 │
└─────────────────┘     └─────────────────┘

┌─────────────────┐
│ profiles_public │  ◀── VIEW (sem email para segurança)
│     (VIEW)      │
└─────────────────┘
```

### 5.2 Scripts SQL - Execução em 3 Partes

> ⚠️ **IMPORTANTE:** Execute cada parte SEPARADAMENTE no SQL Editor do Supabase, na ordem indicada.

---

#### 📦 PARTE 1: Limpeza + Enum + Tabelas

```sql
-- =============================================
-- PARTE 1: LIMPEZA + ENUM + TABELAS
-- =============================================
-- Execute PRIMEIRO este script
-- =============================================

-- 1.1 LIMPEZA (remover objetos existentes)
-- =============================================

-- Remover trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover funções existentes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_active(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_master_user(uuid) CASCADE;

-- Remover tabelas na ordem correta (dependências primeiro)
DROP TABLE IF EXISTS public.vocabulary CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.readings CASCADE;
DROP TABLE IF EXISTS public.statuses CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.book_categories CASCADE;
DROP TABLE IF EXISTS public.book_types CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Remover enum existente
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 1.2 CRIAR ENUM
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 1.3 CRIAR TABELAS
-- =============================================

-- Tabela: profiles (dados do usuário)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_master BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela: user_roles (roles de usuário - SEPARADO de profiles por segurança)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tabela: user_permissions (permissões de módulos)
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

-- Tabela: book_types (tipos de livro: Físico, Digital, etc.)
CREATE TABLE public.book_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: book_categories (categorias: Ficção, Romance, etc.)
CREATE TABLE public.book_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: books (livros)
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  author TEXT,
  type TEXT NOT NULL DEFAULT 'Físico',
  category TEXT,
  total_pages INTEGER NOT NULL DEFAULT 0,
  year INTEGER,
  cover_url TEXT,
  paid_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: statuses (status de leitura de cada livro)
CREATE TABLE public.statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL UNIQUE,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'Não iniciado',
  pages_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: readings (registros de leitura)
CREATE TABLE public.readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL,
  user_id UUID,
  day INTEGER NOT NULL,
  month TEXT NOT NULL,
  start_page INTEGER NOT NULL DEFAULT 0,
  end_page INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  time_spent TEXT,
  bible_book TEXT,
  bible_chapter INTEGER,
  bible_verse_start INTEGER,
  bible_verse_end INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: evaluations (avaliações de livros)
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL UNIQUE,
  user_id UUID,
  creativity INTEGER,
  pleasure INTEGER,
  learnings INTEGER,
  writing INTEGER,
  impact INTEGER,
  final_grade NUMERIC,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: quotes (citações)
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL,
  user_id UUID,
  quote TEXT NOT NULL,
  page INTEGER,
  bible_book TEXT,
  bible_chapter INTEGER,
  bible_verse INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela: vocabulary (vocabulário aprendido)
CREATE TABLE public.vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  book_id UUID,
  palavra TEXT NOT NULL,
  definicoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  sinonimos JSONB DEFAULT '[]'::jsonb,
  antonimos JSONB DEFAULT '[]'::jsonb,
  exemplos JSONB DEFAULT '[]'::jsonb,
  classe TEXT,
  silabas TEXT,
  fonetica TEXT,
  etimologia TEXT,
  observacoes TEXT,
  analise_contexto JSONB,
  source_type TEXT DEFAULT 'outro',
  source_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar Foreign Keys
ALTER TABLE public.statuses 
  ADD CONSTRAINT statuses_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.readings 
  ADD CONSTRAINT readings_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.evaluations 
  ADD CONSTRAINT evaluations_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.quotes 
  ADD CONSTRAINT quotes_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.vocabulary 
  ADD CONSTRAINT vocabulary_book_id_fkey 
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
```

---

#### 📦 PARTE 2: Funções + Trigger

```sql
-- =============================================
-- PARTE 2: FUNÇÕES + TRIGGER
-- =============================================
-- Execute APÓS a Parte 1
-- =============================================

-- 2.1 FUNÇÃO: Atualizar updated_at automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2.2 FUNÇÃO: Verificar se usuário tem role específica
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2.3 FUNÇÃO: Verificar se usuário está ativo
-- =============================================
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;

-- 2.4 FUNÇÃO: Verificar se usuário é master
-- =============================================
CREATE OR REPLACE FUNCTION public.is_master_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND is_master = true
  )
$$;

-- 2.5 FUNÇÃO: Criar perfil automaticamente ao registrar
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar perfil do usuário
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  -- Atribuir role padrão 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- 2.6 TRIGGER: Executar ao criar novo usuário
-- =============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2.7 TRIGGERS: Atualizar updated_at
-- =============================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vocabulary_updated_at
  BEFORE UPDATE ON public.vocabulary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

#### 📦 PARTE 3: RLS + Políticas + Dados Iniciais

```sql
-- =============================================
-- PARTE 3: RLS + POLÍTICAS + DADOS INICIAIS
-- =============================================
-- Execute APÓS a Parte 2
-- =============================================

-- 3.1 HABILITAR RLS EM TODAS AS TABELAS
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- 3.2 POLÍTICAS: profiles
-- =============================================
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert profiles" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ATUALIZAÇÃO DE SEGURANÇA (Jan 2026): Política restritiva para admins
-- Admins e masters podem ver perfis, mas emails são protegidos via profiles_public view
CREATE POLICY "Admins can view public profile data" 
  ON public.profiles FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR is_master_user(auth.uid()) 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update non-master profiles" 
  ON public.profiles FOR UPDATE 
  USING (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id))
  WITH CHECK (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id));

-- 3.3 POLÍTICAS: user_roles
-- =============================================
CREATE POLICY "Users can view own roles" 
  ON public.user_roles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
  ON public.user_roles FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage non-master user roles" 
  ON public.user_roles FOR ALL 
  USING (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id))
  WITH CHECK (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id));

-- 3.4 POLÍTICAS: user_permissions
-- =============================================
CREATE POLICY "Users can view own permissions" 
  ON public.user_permissions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all permissions" 
  ON public.user_permissions FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage non-master user permissions" 
  ON public.user_permissions FOR ALL 
  USING (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id))
  WITH CHECK (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id));

-- 3.5 POLÍTICAS: book_types e book_categories
-- =============================================
CREATE POLICY "Authenticated users can view book_types" 
  ON public.book_types FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert book_types" 
  ON public.book_types FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update book_types" 
  ON public.book_types FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete book_types" 
  ON public.book_types FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view book_categories" 
  ON public.book_categories FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert book_categories" 
  ON public.book_categories FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update book_categories" 
  ON public.book_categories FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete book_categories" 
  ON public.book_categories FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- 3.6 POLÍTICAS: books
-- =============================================
CREATE POLICY "Users can view own books" 
  ON public.books FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own books" 
  ON public.books FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own books" 
  ON public.books FOR UPDATE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" 
  ON public.books FOR DELETE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3.7 POLÍTICAS: statuses
-- =============================================
CREATE POLICY "Users can view own statuses" 
  ON public.statuses FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own statuses" 
  ON public.statuses FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own statuses" 
  ON public.statuses FOR UPDATE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own statuses" 
  ON public.statuses FOR DELETE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3.8 POLÍTICAS: readings
-- =============================================
CREATE POLICY "Users can view own readings" 
  ON public.readings FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own readings" 
  ON public.readings FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own readings" 
  ON public.readings FOR UPDATE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own readings" 
  ON public.readings FOR DELETE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3.9 POLÍTICAS: evaluations
-- =============================================
CREATE POLICY "Users can view own evaluations" 
  ON public.evaluations FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own evaluations" 
  ON public.evaluations FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own evaluations" 
  ON public.evaluations FOR UPDATE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evaluations" 
  ON public.evaluations FOR DELETE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3.10 POLÍTICAS: quotes
-- =============================================
CREATE POLICY "Users can view own quotes" 
  ON public.quotes FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own quotes" 
  ON public.quotes FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own quotes" 
  ON public.quotes FOR UPDATE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes" 
  ON public.quotes FOR DELETE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3.11 POLÍTICAS: vocabulary
-- =============================================
CREATE POLICY "Users can view own vocabulary" 
  ON public.vocabulary FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can insert own vocabulary" 
  ON public.vocabulary FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update own vocabulary" 
  ON public.vocabulary FOR UPDATE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary" 
  ON public.vocabulary FOR DELETE 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));

-- 3.12 DADOS INICIAIS
-- =============================================

-- Tipos de livro padrão
INSERT INTO public.book_types (name) VALUES 
  ('Físico'),
  ('Digital'),
  ('Audiobook')
ON CONFLICT (name) DO NOTHING;

-- Categorias padrão
INSERT INTO public.book_categories (name) VALUES 
  ('Ficção'),
  ('Não-Ficção'),
  ('Romance'),
  ('Fantasia'),
  ('Biografia'),
  ('História'),
  ('Ciência'),
  ('Autoajuda'),
  ('Negócios'),
  ('Religião'),
  ('Filosofia'),
  ('Poesia'),
  ('Infantil'),
  ('Técnico'),
  ('Outro')
ON CONFLICT (name) DO NOTHING;

-- 3.13 STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

---

### 5.3 Descrição das Tabelas

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `profiles` | Dados do perfil do usuário | user_id, email, display_name, is_active, is_master |
| `profiles_public` | **VIEW** - Perfis sem email (segurança) | user_id, display_name, is_active, is_master |
| `user_roles` | Roles de cada usuário | user_id, role (admin/user) |
| `user_permissions` | Permissões de módulos | user_id, module_key |
| `book_types` | Tipos de livro | name (Físico, Digital, Audiobook) |
| `book_categories` | Categorias de livro | name (Ficção, Romance, etc.) |
| `books` | Livros cadastrados | name, author, type, category, total_pages |
| `statuses` | Status de leitura | book_id, status, pages_read |
| `readings` | Registros de leitura | book_id, day, start_page, end_page |
| `evaluations` | Avaliações de livros | book_id, creativity, pleasure, final_grade |
| `quotes` | Citações salvas | book_id, quote, page |
| `vocabulary` | Palavras aprendidas | palavra, definicoes, sinonimos |

### 5.4 View de Segurança: profiles_public

> ⚠️ **IMPORTANTE:** Esta view foi criada para proteger dados sensíveis (emails).

```sql
-- View que expõe apenas dados públicos dos perfis (sem email)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  is_active,
  is_master,
  created_at,
  updated_at
FROM public.profiles;

-- Comentário de segurança
COMMENT ON VIEW public.profiles_public IS 
  'View pública de perfis sem dados sensíveis (email). Use esta view para listar usuários.';
```

**Quando usar:**
- Use `profiles_public` para listar usuários de forma segura
- Use `profiles` apenas quando o usuário precisa ver seu próprio email

---

## 6. Sistema de Autenticação

### 6.1 Fluxo de Autenticação

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuário   │────▶│  Registro   │────▶│  Supabase   │
│             │     │  (signup)   │     │   Auth      │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Trigger:   │
                                        │ handle_new  │
                                        │   _user     │
                                        └──────┬──────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          ▼                    ▼                    ▼
                   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                   │  Cria       │     │  Atribui    │     │  Usuário    │
                   │  Profile    │     │  Role       │     │  Logado!    │
                   └─────────────┘     │  'user'     │     └─────────────┘
                                       └─────────────┘
```

### 6.2 AuthContext
O contexto de autenticação (`src/contexts/AuthContext.tsx`) gerencia:
- Estado do usuário logado
- Funções de login/logout/registro
- Verificação de permissões
- Loading states

### 6.3 Proteção de Rotas
O componente `ProtectedRoute` protege rotas que requerem autenticação:

```tsx
<Route 
  path="/" 
  element={
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  } 
/>
```

---

## 7. Políticas de Segurança (RLS)

### 7.1 Conceito de RLS
Row Level Security (RLS) é um recurso do PostgreSQL que restringe quais linhas um usuário pode ver/modificar.

### 7.2 Funções de Segurança

| Função | Descrição |
|--------|-----------|
| `has_role(user_id, role)` | Verifica se usuário tem role específica |
| `is_user_active(user_id)` | Verifica se usuário está ativo |
| `is_master_user(user_id)` | Verifica se é usuário master |

### 7.3 Padrões de Políticas

#### Padrão: Dados do Próprio Usuário
```sql
-- Usuário só vê seus próprios dados
CREATE POLICY "Users can view own X" 
  ON public.X FOR SELECT 
  USING (auth.uid() = user_id AND is_user_active(auth.uid()));
```

#### Padrão: Admins Gerenciam Não-Masters
```sql
-- Admins podem gerenciar, exceto usuários master
CREATE POLICY "Admins can manage non-master X" 
  ON public.X FOR ALL 
  USING (has_role(auth.uid(), 'admin') AND NOT is_master_user(user_id));
```

### 7.4 Por que Roles em Tabela Separada?
> ⚠️ **CRÍTICO DE SEGURANÇA**

Roles são armazenados em `user_roles` e **NÃO** em `profiles` porque:
1. Evita ataques de escalação de privilégios
2. Permite políticas RLS específicas para roles
3. Facilita auditoria de mudanças de permissão
4. Segue o princípio de menor privilégio

---

## 8. Storage - Upload de Arquivos

### 8.1 Buckets Configurados

| Bucket | Público | Uso |
|--------|---------|-----|
| `book-covers` | Sim | Capas de livros |
| `avatars` | Sim | Fotos de perfil |

### 8.2 Políticas de Storage (Opcional)

Se você precisar de políticas de storage mais restritivas, execute:

```sql
-- Políticas para book-covers
CREATE POLICY "Anyone can view book covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own book covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own book covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas para avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 8.3 Estrutura de Pastas no Storage
```
book-covers/
└── {user_id}/
    └── {book_id}.jpg

avatars/
└── {user_id}/
    └── avatar.jpg
```

---

## 9. Edge Functions

### 9.1 Dictionary Function
Localização: `supabase/functions/dictionary/index.ts`

Função para buscar definições de palavras em APIs externas.

### 9.2 Secrets Configurados
| Secret | Descrição |
|--------|-----------|
| `LOVABLE_API_KEY` | Chave da API Lovable |
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (backend) |

---

## 10. Guia de Manutenção

### 10.1 Criar Usuário Master Manualmente

Após criar sua conta normalmente, execute no SQL Editor:

```sql
-- Substituia 'seu-email@exemplo.com' pelo seu email
UPDATE public.profiles 
SET is_master = true, is_active = true
WHERE email = 'seu-email@exemplo.com';

-- Adicionar role admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE email = 'seu-email@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### 10.2 Desativar um Usuário

```sql
UPDATE public.profiles 
SET is_active = false 
WHERE email = 'usuario@exemplo.com';
```

### 10.3 Promover Usuário a Admin

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'
FROM public.profiles
WHERE email = 'usuario@exemplo.com';
```

### 10.4 Adicionar Nova Categoria de Livro

```sql
INSERT INTO public.book_categories (name) 
VALUES ('Nova Categoria');
```

### 10.5 Adicionar Novo Tipo de Livro

```sql
INSERT INTO public.book_types (name) 
VALUES ('Novo Tipo');
```

### 10.6 Backup de Dados
Acesse o Supabase Dashboard → Settings → Database → Backups

### 10.7 Logs e Debugging
Acesse o Supabase Dashboard → Logs para ver:
- Erros de autenticação
- Queries com problemas
- Logs de Edge Functions

---

## 📎 Anexos

### A. Credenciais do Projeto (Exemplo)

```env
# .env
VITE_SUPABASE_URL=https://txxaofusqkcqtjmpzerp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key
VITE_SUPABASE_PROJECT_ID=txxaofusqkcqtjmpzerp
```

### B. Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # Iniciar servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build

# Mobile (Capacitor)
npx cap add android  # Adicionar plataforma Android
npx cap sync         # Sincronizar código
npx cap open android # Abrir no Android Studio
```

### C. Links Úteis

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Docs](https://supabase.com/docs)
- [Lovable Docs](https://docs.lovable.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

## 📝 Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | Jan 2026 | Documentação inicial completa |
| 1.1 | 23 Jan 2026 | Correções de segurança: view `profiles_public` para proteger emails, políticas RLS atualizadas, módulo "Progresso Bíblia" adicionado às permissões |

---

## 🔒 Notas de Segurança (v1.1)

### Correções Aplicadas em 23/01/2026:

1. **Proteção de Emails**: Criada view `profiles_public` que exclui o campo email para evitar exposição de dados sensíveis.

2. **Políticas RLS Atualizadas**: 
   - Removida política "Admins can view all profiles" que expunha todos os emails
   - Adicionada política "Admins can view public profile data" mais restritiva

3. **Comentários de Segurança**: Adicionados comentários nas tabelas `book_categories` e `book_types` indicando que devem conter apenas dados não-sensíveis.

4. **Módulo de Permissões**: Adicionado módulo "Progresso Bíblia" (`biblia`) no sistema de permissões de usuários.

---

> 📌 **Mantenha este documento atualizado** sempre que fizer alterações significativas no projeto!
