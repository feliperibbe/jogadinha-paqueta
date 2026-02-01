# Jogadinha do Paquetá

Uma aplicação web divertida onde usuários podem fazer upload de uma foto e gerar um vídeo personalizado de si mesmos dançando usando inteligência artificial.

## Overview

- **Propósito**: Criar vídeos virais de pessoas dançando usando IA
- **Estado Atual**: MVP funcional com autenticação, upload de fotos, geração de vídeo e compartilhamento
- **Tecnologias**: React, Express, PostgreSQL, Replit Auth, WaveSpeed AI (Kling 2.6)

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
│   │   ├── pagar.tsx       # Página de pagamento PIX
│   │   └── admin.tsx       # Painel administrativo
│   ├── components/
│   │   └── ObjectUploader.tsx # Componente de upload de arquivos
│   └── hooks/
│       ├── use-auth.ts     # Hook de autenticação
│       └── use-upload.ts   # Hook de upload de arquivos

server/                      # Backend Express
├── routes.ts               # Rotas da API
├── storage.ts              # Operações de banco de dados
├── wavespeed.ts            # Integração com WaveSpeed/Kling AI
├── db.ts                   # Conexão com PostgreSQL
└── replit_integrations/    # Integrações do Replit
    ├── auth/               # Autenticação Replit
    └── object_storage/     # Armazenamento de objetos

shared/
├── schema.ts               # Schema do banco de dados (Drizzle)
└── models/
    └── auth.ts             # Modelos de autenticação
```

## Fluxo Principal

1. **Cadastro/Login**: Usuário entra via Replit Auth
2. **Primeiro Vídeo Grátis**: Novo usuário recebe 1 crédito automaticamente
3. **Upload de Foto**: Usuário faz upload de uma foto de si mesmo
4. **Geração de Vídeo**: Sistema consome 1 crédito e envia para WaveSpeed AI (Kling 2.6 Motion Control)
5. **Visualização**: Usuário pode assistir, baixar e compartilhar o vídeo
6. **Pagamento**: Para mais vídeos, usuário paga R$5,00 via PIX

## Sistema de Pagamentos

- **Modelo Freemium**: Primeiro vídeo grátis, R$5,00 por vídeo adicional
- **Chave PIX**: 21995571985 (telefone)
- **Fluxo de Pagamento**:
  1. Usuário sem créditos é redirecionado para `/pagar`
  2. Usuário faz PIX usando QR Code ou chave
  3. Usuário clica "Já paguei" para registrar solicitação
  4. Admin recebe email com botão de aprovação rápida
  5. Admin clica no link do email ou aprova em `/admin`
  6. Usuário recebe 1 crédito automaticamente
- **Admin**: felipe.vasconcellos@ab-inbev.com (isAdmin = true automático no login)
- **Notificações**: Email via Resend com link de aprovação rápida
- **Reembolso Automático**: Se geração falhar, crédito é devolvido

## APIs

### Autenticação
- `GET /api/login` - Iniciar fluxo de login
- `GET /api/logout` - Fazer logout
- `GET /api/auth/user` - Obter usuário atual

### Vídeos
- `GET /api/videos` - Listar vídeos do usuário
- `GET /api/videos/:id` - Obter vídeo específico (autenticado)
- `GET /api/videos/public/:id` - Obter vídeo para compartilhamento público
- `POST /api/videos/generate` - Iniciar geração de vídeo (consome 1 crédito)

### Upload
- `POST /api/uploads/request-url` - Obter URL de upload

### Pagamentos
- `GET /api/user/credits` - Obter créditos do usuário
- `GET /api/pix-info` - Obter informações do PIX (chave, valor, QR code)
- `POST /api/payment-requests` - Registrar solicitação de pagamento
- `GET /api/payment-requests/pending` - Verificar se há pagamento pendente

### Admin
- `GET /api/admin/payment-requests` - Listar pagamentos pendentes
- `POST /api/admin/payment-requests/:id/approve` - Aprovar pagamento
- `GET /api/admin/quick-approve/:token` - Aprovação rápida via email (sem auth)
- `GET /api/admin/users` - Listar todos usuários

## Design

- **Tema**: Flamengo (vermelho #E30613 e preto)
- **Fonte Display**: Bebas Neue
- **Fonte Texto**: Inter
- **Idioma**: Português brasileiro

## Secrets Necessários

- `WAVESPEED_API_KEY` - Chave da API WaveSpeed para Kling AI
- `RESEND_API_KEY` - Chave da API Resend para notificações por email
- `SESSION_SECRET` - Secret para sessões (gerenciado automaticamente)
- `DATABASE_URL` - URL do PostgreSQL (gerenciado automaticamente)

## Comandos

- `npm run dev` - Iniciar servidor de desenvolvimento
- `npm run db:push` - Sincronizar schema do banco de dados
