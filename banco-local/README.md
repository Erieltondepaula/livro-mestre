# 📁 Banco Local - Scripts de Atualização

Esta pasta contém todos os scripts SQL e documentação necessários para sincronizar seu banco de dados Supabase local com as atualizações do projeto.

## 📋 Estrutura

```
banco-local/
├── README.md                    # Este arquivo
├── migrations/                  # Scripts de migração incrementais
│   └── v1.7_vinculo_palavras.sql
├── schema-completo.sql          # Schema completo (para instalação nova)
└── DOCUMENTACAO_PROJETO.md      # Cópia local da documentação
```

## 🚀 Como Usar

### Para Banco Novo (Instalação Limpa)
Execute o arquivo `schema-completo.sql` no SQL Editor do Supabase.

### Para Atualização Incremental
Execute apenas os scripts da pasta `migrations/` que ainda não foram aplicados, na ordem das versões.

## 📌 Versões

| Versão | Data | Descrição |
|--------|------|-----------|
| v1.5 | 23/01/2026 | Schema base + vocabulário |
| v1.6 | 25/01/2026 | Análise de contexto v2 |
| v1.7 | 25/01/2026 | Vínculo dinâmico de palavras a livros |

## ⚠️ Importante

- Sempre faça backup antes de executar migrações
- Execute scripts na ordem das versões
- Verifique se há conflitos com dados existentes
