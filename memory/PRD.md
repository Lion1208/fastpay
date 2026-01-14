# BravePix - Sistema de Pagamentos e Indicações

## Problema Original
Sistema de pagamentos PIX com comissões por indicação, multi-admin, 2FA, saques (PIX/Depix), transferências entre usuários, notificações push e PWA.

## Arquitetura
- **Backend:** FastAPI + Motor (MongoDB async)
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Banco:** MongoDB (DB_NAME: test_database em dev, bravepix em prod)
- **Deploy:** VPS com Nginx + systemd + Certbot

## O que foi implementado

### Janeiro 2025
- **Correção Crítica de Saldo (14/01):**
  - Corrigido bug onde transações de transferência (`transfer_out`) com `valor_liquido` negativo eram incluídas no cálculo do saldo
  - Query de `recalculate_user_balance` agora exclui tipos `transfer_out` e `transfer_in`
  - Adicionado arredondamento `round(..., 2)` em todos os cálculos de saldo
  - Criado endpoint `/api/admin/diagnostico-saldo/{user_id}` para debug detalhado

### Funcionalidades Existentes
- Autenticação com JWT + 2FA (pyotp)
- Sistema de indicações com comissões configuráveis
- Saques PIX e Depix (via SideSwap)
- Saque automático de comissões (R$30+)
- Transferências entre usuários
- Notificações Push (VAPID)
- PWA (Service Worker)
- Painel Admin com gestão de usuários, taxas e saques

## Issues Conhecidos

### P1 - Erro 403 nas Notificações Push
- **Status:** PENDENTE
- **Descrição:** Frontend retorna 403 ao ativar push após migração para bravepix.com
- **Provável causa:** Header Authorization não está sendo enviado em `push.js`

### P2 - Layout Mobile
- **Status:** PENDENTE  
- **Descrição:** Endereço SideSwap quebra layout em telas pequenas
- **Arquivos:** `Withdrawals.js`, `Dashboard.js`

## Backlog

### P3 - Polling API Externa
- Estender verificação de status PIX para API externa

### Refatoração
- Quebrar `server.py` (~2500 linhas) em módulos: `routes/`, `models/`, `services/`

## Arquivos Principais
- `backend/server.py` - API monolítica
- `frontend/src/pages/Dashboard.js`
- `frontend/src/pages/Withdrawals.js`
- `frontend/src/utils/push.js`
- `frontend/src/utils/api.js`

## Credenciais de Teste
- Admin: `ADMIN001` / `admin123`
