# HealthMate — API

API REST do HealthMate: profissionais de saúde cadastram pacientes, medicamentos,
horários de administração (lembretes) e avaliações de saúde.

**Stack:** NestJS 11 · Prisma 7 · PostgreSQL (Supabase) · JWT em cookies httpOnly · Swagger

## Como rodar

### 1. Criar o banco no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano grátis basta).
   Guarde a **senha do banco** que você definir.
2. No projeto, clique em **Connect** (topo da página) → aba **ORMs** → **Prisma**.
   O Supabase mostra duas URLs:
   - `DATABASE_URL` → pooler em modo *Transaction* (porta **6543**)
   - `DIRECT_URL` → conexão direta / *Session* (porta **5432**)
3. Copie as duas para o `.env` (passo 2), trocando `[YOUR-PASSWORD]` pela senha.

> Não precisa dos parâmetros `?pgbouncer=true&connection_limit=1` — eles eram do
> engine antigo do Prisma. Com o Prisma 7 (driver `pg`) a URL pura funciona.

### 2. Configurar e subir

```bash
cp .env.example .env          # preencha DATABASE_URL, DIRECT_URL e os segredos JWT
npm install                   # também gera o Prisma Client
npm run db:deploy             # cria as tabelas no Supabase
npm run db:seed               # (opcional) dados de demonstração
npm run dev                   # http://localhost:3333/api
```

Gere os segredos JWT com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

- Swagger (fora de produção): http://localhost:3333/api/docs
- Healthcheck: http://localhost:3333/api/health
- Login do seed: `demo@healthmate.app` / `Demo12345`

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão usada pela API (pooler 6543 do Supabase) |
| `DIRECT_URL` | para migrations | Conexão direta (5432), usada por `prisma migrate` e pelo seed |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | sim | Segredos diferentes, 32+ caracteres |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | não | Padrão `15m` / `7d` |
| `FRONTEND_URL` | não | Origens liberadas no CORS (separadas por vírgula) |
| `COOKIE_SAMESITE` | não | `lax` (padrão, front faz proxy de `/api`) ou `none` (front e API em domínios diferentes) |
| `DATABASE_SSL` | não | `true` para forçar SSL na conexão com o banco |
| `GOOGLE_CLIENT_ID` | não | Habilita `POST /api/auth/google` |
| `PORT`, `NODE_ENV` | não | Padrão `3333`, `development` |

A API não sobe se alguma variável obrigatória estiver faltando ou inválida (validação em `src/config/env.validation.ts`).

## Modelo de dados

```
users ─1:1─ professionals ─N:N─ patients ─1:N─ medicaments ─1:N─ reminders
                  │                 └──1:N─ health_assessments
                  └──────────────── (autor) ───────┘
```

- **users**: conta de acesso (e-mail/senha e/ou Google). Senhas com bcrypt; o refresh token é guardado só como hash SHA-256.
- **patients**: pertencem a um ou mais profissionais (`patient_professionals`). Não precisam ter conta.
- **medicaments**: dose, estoque (`quantity`) e limite de recompra (`low_stock_at`).
- **reminders**: um horário diário `HH:mm` por linha.
- **health_assessments**: sintomas, efeitos colaterais e observações; formam os relatórios.

Todas as tabelas usam UUID, `created_at`/`updated_at` com fuso, chaves estrangeiras com `ON DELETE CASCADE`,
e **RLS ligado**. Com o RLS ligado, a Data API pública do Supabase (chave `anon`) não lê nada, e só a API acessa os dados.

## Endpoints

Todas as rotas ficam sob `/api` e exigem login, exceto as marcadas como públicas.
Um profissional só enxerga os próprios pacientes; o acesso a um paciente de outro profissional retorna `404`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` *(pública)* | Cadastro de profissional (já loga) |
| POST | `/auth/login` *(pública)* | Login; define cookies `hm_access` e `hm_refresh` |
| POST | `/auth/google` *(pública)* | Login/cadastro com ID token do Google |
| POST | `/auth/refresh` *(pública)* | Renova a sessão (rotação de refresh token) |
| POST | `/auth/logout` *(pública)* | Revoga a sessão e limpa os cookies |
| GET | `/auth/me` | Usuário logado |
| GET/PATCH | `/users/me` | Ver/editar perfil |
| PATCH | `/users/me/password` | Trocar/definir senha |
| GET/POST | `/patients` | Listar (`?q=&page=&limit=`) / cadastrar (aceita `medicaments[]` junto) |
| GET/PATCH/DELETE | `/patients/:id` | Ficha completa / editar / excluir |
| GET/POST | `/patients/:id/medicaments` | Medicamentos do paciente (`times: ["08:00"]` cria lembretes) |
| PATCH/DELETE | `/medicaments/:id` | Editar (`times` substitui os horários) / excluir |
| GET | `/reminders/today` | Agenda do dia de todos os pacientes |
| PATCH/DELETE | `/reminders/:id` | Pausar/reativar (`isActive`) / excluir |
| GET | `/assessments` | Relatórios (`?patientId=&q=&page=`) |
| POST | `/patients/:id/assessments` | Registrar avaliação |
| DELETE | `/assessments/:id` | Excluir avaliação |
| GET | `/dashboard` | Totais, próximos lembretes, estoque baixo, recentes |
| GET | `/health` *(pública)* | Healthcheck (testa o banco) |

## Segurança

- Guard global: rota nova nasce **protegida**. Para liberar uma rota, use `@Public()`.
- Tokens em cookies `httpOnly` (sem `localStorage`). Também aceita `Authorization: Bearer` (Swagger e apps).
- **Rotação de refresh token**: se um refresh antigo for reutilizado, a sessão é derrubada.
- Rate limit: 100 req/min por IP, e 10 req/min em login, cadastro e Google.
- `helmet`, CORS restrito, `ValidationPipe` com `whitelist` + `forbidNonWhitelisted`.
- Mesma mensagem para e-mail inexistente e senha errada (evita enumeração de contas).

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | API com hot reload |
| `npm run build` / `start:prod` | Build e execução de produção |
| `npm run db:migrate` | Cria uma nova migration a partir de mudanças no `schema.prisma` |
| `npm run db:deploy` | Aplica as migrations pendentes (use em produção) |
| `npm run db:seed` | Dados de demonstração (idempotente) |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes ponta a ponta. **Use um banco de teste** (cria registros) |
| `npm run lint` / `typecheck` | Qualidade de código |

## Deploy

Qualquer host Node serve (Render, Railway, Fly.io…):

1. Build: `npm ci && npm run build`. Antes do start: `npm run db:deploy`.
2. Start: `npm run start:prod`.
3. Configure as variáveis com `NODE_ENV=production` (o Swagger é desligado e os cookies ficam `Secure`).
4. No front, aponte `API_URL` para a URL pública da API.
