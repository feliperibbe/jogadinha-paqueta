# Jogadinha do Paquetá

Uma aplicação web divertida onde usuários podem fazer upload de uma foto e gerar um vídeo personalizado de si mesmos dançando usando inteligência artificial.

## Overview

- **Propósito**: Criar vídeos virais de pessoas dançando usando IA
- **Estado Atual**: MVP funcional com autenticação própria, upload de fotos, geração de vídeo e compartilhamento
- **Tecnologias**: React, Express, PostgreSQL, Autenticação própria (email/senha com bcrypt), WaveSpeed AI (Kling 2.6)
- **Limite**: Cada usuário pode gerar apenas UM vídeo (sem sistema de pagamento)

## Arquitetura do Projeto

```
client/                      # Frontend React
├── src/
│   ├── pages/
│   │   ├── landing.tsx     # Página inicial para visitantes
│   │   ├── home.tsx        # Dashboard do usuário logado
│   │   ├── criar.tsx       # Página de upload e criação de vídeo
│   │   ├── video.tsx       # Visualização de vídeo (autenticado)
│   │   ├── video-public.tsx # Visualização pública para compartilhamento
│   │   └── admin.tsx       # Painel administrativo (estatísticas)
│   ├── components/
│   │   └── ObjectUploader.tsx # Componente de upload de arquivos
│   └── hooks/
│       ├── use-auth.ts     # Hook de autenticação
│       └── use-upload.ts   # Hook de upload de arquivos

server/                      # Backend Express
├── routes.ts               # Rotas da API
├── auth.ts                 # Sistema de autenticação próprio (bcrypt + sessions)
├── storage.ts              # Operações de banco de dados
├── wavespeed.ts            # Integração com WaveSpeed/Kling AI
├── db.ts                   # Conexão com PostgreSQL
└── replit_integrations/    # Integrações do Replit
    └── object_storage/     # Armazenamento de objetos

shared/
├── schema.ts               # Schema do banco de dados (Drizzle)
└── models/
    └── auth.ts             # Modelos de autenticação
```

## Fluxo Principal

1. **Cadastro/Login**: Usuário cria conta com email/senha no app ou faz login
2. **Upload de Foto**: Usuário faz upload de uma foto de si mesmo
3. **Geração de Vídeo**: Sistema envia para WaveSpeed AI (Kling 2.6 Motion Control)
4. **Visualização**: Usuário pode assistir, baixar e compartilhar o vídeo
5. **Limite**: Cada usuário pode gerar apenas UM vídeo - após isso, a opção de criar é desabilitada

## Limite de Um Vídeo por Usuário

- Sistema verifica se usuário já possui vídeos antes de permitir criação
- Endpoint `/api/user/can-generate` retorna se usuário pode gerar
- Se usuário já tem vídeo (qualquer status), não pode criar outro
- Página /criar mostra mensagem amigável se limite foi atingido

## APIs

### Autenticação (Sistema Próprio)
- `POST /api/auth/register` - Criar nova conta (email, senha, nome)
- `POST /api/auth/login` - Login com email/senha
- `POST /api/auth/logout` - Fazer logout
- `GET /api/auth/user` - Obter usuário atual

### Páginas de Auth
- `/login` - Página de login
- `/cadastro` - Página de cadastro

### Vídeos
- `GET /api/videos` - Listar vídeos do usuário
- `GET /api/videos/:id` - Obter vídeo específico (autenticado)
- `GET /api/videos/public/:id` - Obter vídeo para compartilhamento público
- `POST /api/videos/generate` - Iniciar geração de vídeo

### Verificação
- `GET /api/user/can-generate` - Verifica se usuário pode gerar vídeo

### Upload
- `POST /api/uploads/request-url` - Obter URL de upload

### Admin
- `GET /api/admin/videos` - Listar todos os vídeos
- `GET /api/admin/users` - Listar todos usuários

## Design

- **Tema**: Flamengo (vermelho #E30613 e preto)
- **Fonte Display**: Bebas Neue
- **Fonte Texto**: Inter
- **Idioma**: Português brasileiro

## Secrets Necessários

- `WAVESPEED_API_KEY` - Chave da API WaveSpeed para Kling AI
- `SESSION_SECRET` - Secret para sessões (gerenciado automaticamente)
- `DATABASE_URL` - URL do PostgreSQL (gerenciado automaticamente)

## Comandos

- `npm run dev` - Iniciar servidor de desenvolvimento
- `npm run db:push` - Sincronizar schema do banco de dados

## Admin

- **Usuário Admin**: felipe.vasconcellos@ab-inbev.com (isAdmin = true automático no login)
- **Painel**: /admin mostra estatísticas de vídeos e lista de usuários
