# Supabase Setup (Projeto React Cyber Call)

## 1) Criar projeto no Supabase
1. Acesse https://supabase.com
2. Crie um projeto novo.
3. Copie:
- `Project URL`
- `anon public key`

## 2) Criar tabela do app
1. Abra `SQL Editor` no Supabase.
2. Execute o SQL de [schema.sql](./supabase/schema.sql).

## 3) Configurar variaveis no React
1. Copie `.env.example` para `.env`.
2. Preencha:
```env
VITE_SUPABASE_URL=https://ugruwrhutzsdejjxhgcp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncnV3cmh1dHpzZGVqanhoZ2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzI1ODAsImV4cCI6MjA4ODYwODU4MH0.0xdcnhygtqaKNqUYku68aA-iA1Z5cCeYXRt1-Lcmg3c
```

## 4) Rodar projeto
```bash
npm run dev
```

Na tela de login do terminal, o indicador vai mostrar:
- `SUPABASE CONECTADO` quando a configuracao estiver ativa.
- `LOCAL (sem Supabase)` quando nao estiver.

## 5) O que ja esta integrado com banco
- Tracking de missoes.
- Entradas de paineis (contatos, locais, documentos).
- Inventario grid RE4.
- Biblioteca de imagens do mestre.

Tudo continua com fallback local (localStorage) caso o Supabase falhe.
