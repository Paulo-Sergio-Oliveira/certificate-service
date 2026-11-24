# Certificate Service — Serviço Reutilizável de Certificados (SOA)

Serviço orientado a serviços (SOA) desenvolvido em **TypeScript** para emissão, listagem e validação pública de certificados de forma agnóstica ao domínio do cliente. Projetado para ser reutilizado por diferentes aplicações (plataformas de ensino, sistemas de eventos acadêmicos, palestras e treinamentos), expondo contrato **REST/OpenAPI** e políticas de resiliência (**Retry** e **Circuit Breaker**).

> Trabalho desenvolvido para a disciplina **QXD0068 - Reuso de Software** (UFC — Campus Quixadá).

---

## Arquitetura e Resiliência

O serviço mantém seu próprio banco de dados isolado e não possui acoplamento com entidades específicas de consumidores (como cursos, turmas ou eventos). A extensibilidade é garantida pelo campo livre `metadata` (JSON).

Para tolerância a falhas, a biblioteca **Cockatiel** aplica:
1. **Retry (Backoff Exponencial):** Até 3 tentativas antes de falhar uma operação.
2. **Circuit Breaker:** Abre o circuito após 3 falhas consecutivas, retornando `503 Service Unavailable` (`CIRCUIT_OPEN`) para evitar sobrecarga e entrando em estado `HalfOpen` após 15 segundos para testar a recuperação.

---

## Tecnologias Utilizadas

- **Linguagem & Runtime:** Node.js + TypeScript
- **Framework HTTP:** Fastify
- **Validação & Documentação:** Zod + Swagger / OpenAPI (`@fastify/swagger` e `@fastify/swagger-ui`)
- **Resiliência:** Cockatiel (`Retry` + `Circuit Breaker`)
- **Persistência:** PostgreSQL 16 (Docker) + Prisma ORM 7 (`@prisma/adapter-pg`)

---

## Como Executar o Projeto

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose

### 1. Instalação e configuração
```bash
git clone <URL_DO_REPOSITORIO>
cd certificate-service
npm install
cp .env.example .env

```

### 2. Subir o banco de dados e aplicar migrações

```bash
docker compose up -d
npx prisma generate
npx prisma migrate dev

```

### 3. Iniciar o serviço

```bash
npm run dev

```

* **API Base URL:** `http://localhost:3333`
* **Documentação Interativa (Swagger UI):** `http://localhost:3333/docs`
* **Health Check (Estado do Circuit Breaker):** `GET http://localhost:3333/api/v1/health`

---

## Endpoints Principais

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/v1/certificates` | Emite um novo certificado e gera um código único (`CERT-AAAA-XXXXXX`). |
| `GET` | `/api/v1/certificates` | Lista certificados com filtros opcionais (`recipientEmail`, `issuerName`, `activityType`). |
| `GET` | `/api/v1/certificates/verify/:code` | Valida publicamente a autenticidade de um certificado pelo código. |
| `GET` | `/api/v1/health` | Retorna o status do serviço e o estado atual do Circuit Breaker (`Closed`, `Open`, `HalfOpen`). |

---

## Demonstração de Reuso e Resiliência

A pasta `examples/` contém dois consumidores distintos que integram com a API por meio de um cliente resiliente (`examples/certificate-client.ts`):

1. **Sistema de Eventos Acadêmicos (WTISC):**
```bash
npm run demo:events

```

2. **Simulador de Plataforma de Ensino (EduHub):**
```bash
npm run demo:eduhub

```

### Simulação de Falha (Retry + Circuit Breaker)

Para testar o comportamento sob indisponibilidade do banco de dados:

1. Pare o container do PostgreSQL: `docker stop certificates-db`
2. Execute `npm run demo:events` ou faça requisições pelo Swagger para observar as tentativas de `Retry` e a abertura do `Circuit Breaker` (`HTTP 503`).
3. Restaure o banco com `docker start certificates-db`, aguarde 15 segundos e realize uma nova consulta para observar o fechamento automático do circuito.
