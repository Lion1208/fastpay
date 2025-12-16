# Sistema PIX com Indicações - FastPay

## Problema Original
Sistema de gestão de pagamentos PIX com sistema de indicações. Features:
- Login com código do indicador + senha
- Cadastro apenas por link de indicação
- Sistema de indicações liberado após movimentar R$1.000
- Taxa por transação: 2% + R$0.99 (configurável por usuário)
- Comissão de 1% sobre transações dos indicados
- Saques manuais com aprovação do admin
- Integração API FastDePix
- Painel Admin completo

## Arquitetura Implementada

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - API completa
- Autenticação JWT
- Modelos: Users, Transactions, Referrals, Commissions, Withdrawals, Tickets, Config
- Webhook FastDePix para confirmação de pagamentos
- API externa `/api/v1/*` compatível com FastDePix

### Frontend (React + TailwindCSS)
- Tema dark tecnológico
- Páginas: Login, Register, Dashboard, Transactions, Referrals, Commissions, Withdrawals, Personalization, API, Tickets
- Admin: Dashboard, Users, Withdrawals, Tickets, Config
- Página pública: `/p/{codigo}` para pagamentos

## Tarefas Concluídas
- [x] Login/Registro com código de indicador
- [x] Dashboard com estatísticas
- [x] Sistema de indicações com progresso
- [x] Criação de transações PIX
- [x] Sistema de comissões 1%
- [x] Saques com aprovação
- [x] Tickets de suporte
- [x] Painel Admin completo
- [x] API externa para integrações
- [x] Nome/Logo customizável
- [x] Página pública de pagamento

## Próximas Tarefas
- [ ] Integrar chave FastDePix real
- [ ] Adicionar notificações em tempo real
- [ ] Relatórios exportáveis (CSV/PDF)
- [ ] Multi-idioma
- [ ] Dashboard de analytics avançado
