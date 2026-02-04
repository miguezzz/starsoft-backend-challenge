# Sistema de Venda de Ingressos de Cinema

[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Kafka-7.5-231F20?logo=apache-kafka)](https://kafka.apache.org/)

Sistema de venda de ingressos para cinema com controle de concorrência, garantindo que nenhum assento seja vendido duas vezes mesmo com múltiplas instâncias rodando simultaneamente.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias Escolhidas](#-tecnologias-escolhidas)
- [Arquitetura](#-arquitetura)
- [Como Executar](#-como-executar)
- [Endpoints da API](#-endpoints-da-api)
- [Decisões Técnicas](#-decisões-técnicas)
- [Estratégias de Concorrência](#-estratégias-de-concorrência)
- [Testes](#-testes)
- [Limitações e Melhorias Futuras](#-limitações-e-melhorias-futuras)

---

## 🎯 Visão Geral

Sistema desenvolvido para gerenciar venda de ingressos de cinema com foco em:

- ✅ **Controle de Concorrência**: Múltiplos usuários, múltiplas instâncias, zero conflitos
- ✅ **Reservas Temporárias**: 30 segundos para confirmar pagamento
- ✅ **Cancelamento Automático**: Liberação de assentos não confirmados
- ✅ **Alta Disponibilidade**: Sistema distribuído com cache e mensageria
- ✅ **Clean Architecture**: Código limpo, testável e manutenível

---

## 🚀 Tecnologias Escolhidas

### Backend Framework
- **NestJS 11**: Framework enterprise-grade com DI, modularização, TypeScript first-class
- **TypeScript 5.7**: Type safety, developer experience, refactoring seguro

### Banco de Dados
- **PostgreSQL 16**: ACID compliant, transações robustas, constraints nativas
- **Drizzle ORM**: Type-safe queries, migrations automáticas, performance superior

**Por quê PostgreSQL?**
- ✅ Constraints e foreign keys garantem integridade
- ✅ Transações ACID para operações críticas
- ✅ Índices B-tree para queries rápidas
- ✅ Suporte a SERIALIZABLE isolation level

### Cache Distribuído
- **Redis 7**: In-memory, TTL automático, locks distribuídos

**Por quê Redis?**
- ✅ Lock distribuído com `SET NX EX` (evita race conditions)
- ✅ TTL nativo para expiração de reservas (30s)
- ✅ Pub/Sub para invalidação de cache
- ✅ Performance sub-millisecond

### Sistema de Mensageria
- **Apache Kafka 7.5**: Event streaming, alta throughput, garantias de entrega
- **Zookeeper 7.5**: Coordenação de cluster Kafka

**Por quê Kafka?**
- ✅ Eventos assíncronos desacoplados
- ✅ Dead Letter Queue (DLQ) para falhas
- ✅ Retry com backoff exponencial
- ✅ Auditoria completa de eventos

### Validação e Documentação
- **class-validator**: Validação declarativa de DTOs
- **class-transformer**: Transformação automática de tipos
- **Swagger/OpenAPI**: Documentação interativa automática

---

## 🏗️ Arquitetura

### Clean Architecture + Domain-Driven Design

```
src/
├── modules/              # Feature Modules (domínios de negócio)
│   ├── sessions/         # Gestão de sessões de cinema
│   │   ├── dto/          # Data Transfer Objects
│   │   │   ├── create-session.dto.ts
│   │   │   ├── update-session.dto.ts
│   │   │   └── session-response.dto.ts
│   │   ├── sessions.controller.ts   # HTTP layer
│   │   ├── sessions.service.ts      # Business logic
│   │   └── sessions.module.ts       # Module definition
│   │
│   ├── reservations/     # Reservas temporárias (30s TTL)
│   └── sales/            # Vendas confirmadas
│
├── shared/               # Código compartilhado
│   └── database/         # Camada de dados
│       ├── repositories/ # Data access objects
│       │   ├── sessions.repository.ts
│       │   ├── seats.repository.ts
│       │   ├── reservations.repository.ts
│       │   └── sales.repository.ts
│       ├── schema.ts     # Drizzle schema
│       ├── drizzle.service.ts
│       └── database.module.ts (@Global)
│
├── app.module.ts         # Root module
└── main.ts               # Bootstrap
```

### Princípios Aplicados

#### 1. **Separation of Concerns**
```
Controller → Service → Repository → Database
   (HTTP)   (Business)  (Data)      (Storage)
```

Cada camada tem responsabilidade única:
- **Controllers**: Recebem requisições, validam DTOs, retornam respostas
- **Services**: Lógica de negócio, coordenação, transformações
- **Repositories**: Queries SQL, abstração do banco
- **Modules**: Organização, dependency injection

#### 2. **Dependency Injection**
```typescript
@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepo: SessionsRepository,  // ← Injetado
    private readonly seatsRepo: SeatsRepository         // ← Injetado
  ) {}
}
```

**Benefícios:**
- ✅ Testabilidade (mocks fáceis)
- ✅ Baixo acoplamento
- ✅ Single instance (singleton pattern)

#### 3. **SOLID Principles**

**Single Responsibility**
```typescript
// ✅ Service faz lógica, Repository faz SQL
service.create()  → sessionRepo.create() + seatsRepo.createMany()
```

**Open/Closed**
```typescript
// ✅ Adicionar novos repositories sem modificar existentes
@Global()
@Module({
  providers: [NewRepository],  // ← Apenas adiciona
})
```

**Liskov Substitution**
```typescript
// ✅ Interfaces permitem substituir implementações
interface ISessionsRepository {
  create(data): Promise<Session>;
}
```

**Interface Segregation**
```typescript
// ✅ DTOs específicos para cada operação
CreateSessionDto  // POST
UpdateSessionDto  // PATCH (campos opcionais)
SessionResponseDto  // Response
```

**Dependency Inversion**
```typescript
// ✅ Service depende de abstração (Repository), não implementação
constructor(private repo: SessionsRepository) {}  // ← Interface/abstração
```

---

## 🛠️ Como Executar

### Pré-requisitos

- Node.js 20+
- Docker & Docker Compose
- pnpm (recomendado) ou npm

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd starsoft-backend-challenge
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Variáveis principais:
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=cinema_db
DATABASE_USER=cinema_user
DATABASE_PASSWORD=cinema_pass

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Business Rules
RESERVATION_TIMEOUT_SECONDS=30
```

### 4. Subir Infraestrutura (Docker Compose)

```bash
docker compose up -d
```

Serviços disponíveis:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kafka: `localhost:9092`
- Zookeeper: `localhost:2181`
- Kafka UI: `http://localhost:8080`

### 5. Criar Tabelas no Banco

```bash
pnpm db:push
```

### 6. Iniciar Aplicação

```bash
# Desenvolvimento (hot-reload)
pnpm start:dev

# Produção
pnpm build
pnpm start:prod
```

Aplicação rodando em:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs

---

## 📚 Endpoints da API

### Sessions (Sessões de Cinema)

#### `POST /sessions` - Criar Sessão

**Request Body:**
```json
{
  "movieName": "Avatar: O Caminho da Água",
  "roomNumber": "Sala 1",
  "startTime": "2026-02-10T19:00:00.000Z",
  "endTime": "2026-02-10T21:30:00.000Z",
  "ticketPrice": 25.00,
  "totalSeats": 20
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "movieName": "Avatar: O Caminho da Água",
  "roomNumber": "Sala 1",
  "startTime": "2026-02-10T19:00:00.000Z",
  "endTime": "2026-02-10T21:30:00.000Z",
  "ticketPrice": "25.00",
  "totalSeats": 20,
  "availableSeats": 20,
  "createdAt": "2026-02-04T20:00:00.000Z"
}
```

**Regras:**
- Mínimo 16 assentos
- `startTime` < `endTime`
- Não permite sessão no passado
- Assentos gerados automaticamente (A1, A2, B1, B2...)

#### `GET /sessions` - Listar Sessões

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "movieName": "Avatar",
    "availableSeats": 15,
    ...
  }
]
```

#### `GET /sessions/:id` - Buscar Sessão

**Response:** `200 OK` ou `404 Not Found`

#### `PATCH /sessions/:id` - Atualizar Sessão

**Request Body:** (campos opcionais)
```json
{
  "ticketPrice": 30.00
}
```

#### `DELETE /sessions/:id` - Deletar Sessão

**Response:** `204 No Content`

---

## 💡 Decisões Técnicas

### 1. **PostgreSQL + Drizzle ORM**

**Por quê não TypeORM/Prisma?**
- ✅ Drizzle: Type-safe, zero overhead, SQL-like syntax
- ✅ Migrations automáticas com `drizzle-kit`
- ✅ Performance superior (queries diretas, sem abstrações pesadas)

**Schema Design:**
```typescript
// Enums nativos do Postgres
export const seatStatusEnum = pgEnum('seat_status', [
  'available', 'reserved', 'sold'
]);

// Constraints no banco
CONSTRAINT session_seat_unique UNIQUE(session_id, seat_number)

// Foreign keys com cascade
ON DELETE cascade
```

### 2. **Repository Pattern**

```typescript
// ✅ Abstração de acesso a dados
class SessionsRepository {
  async findAvailableBySessionId(sessionId) {
    return db.select()
      .from(seats)
      .where(and(
        eq(seats.sessionId, sessionId),
        eq(seats.status, 'available')
      ));
  }
}
```

**Benefícios:**
- ✅ Service não conhece SQL
- ✅ Fácil trocar ORM ou banco
- ✅ Queries reutilizáveis
- ✅ Testes com mocks simples

### 3. **DTOs com Validação Declarativa**

```typescript
export class CreateSessionDto {
  @IsString()
  @MaxLength(255)
  movieName: string;

  @IsInt()
  @Min(16)
  totalSeats: number;
}
```

**Benefícios:**
- ✅ Validação automática (ValidationPipe)
- ✅ Documentação Swagger automática
- ✅ Type safety fim-a-fim

### 4. **Global Database Module**

```typescript
@Global()  // ← Disponível em toda app
@Module({
  exports: [SessionsRepository, SeatsRepository, ...]
})
export class DatabaseModule {}
```

**Por quê?**
- ✅ Não precisa importar em cada módulo
- ✅ Single source of truth
- ✅ Connection pooling compartilhado

### 5. **Logging Estruturado**

```typescript
this.logger.log(`Creating session: ${dto.movieName}`);
this.logger.error(`Failed: ${error.message}`, error.stack);
```

**Benefícios:**
- ✅ Debugging facilitado
- ✅ Auditoria de operações
- ✅ Stack traces em erros

---

## 🔒 Estratégias de Concorrência

### Problema: Race Condition

```
User A: Reserva assento A1
User B: Reserva assento A1 (ao mesmo tempo)
Resultado: 2 reservas no mesmo assento ❌
```

### Solução Implementada

#### 1. **Redis Distributed Lock**

```typescript
// Tentativa de lock com TTL
const lockKey = `lock:seat:${seatId}`;
const locked = await redis.set(lockKey, userId, 'NX', 'EX', 30);

if (!locked) {
  throw new ConflictException('Seat already being reserved');
}

// Criar reserva no banco
// ...

// Release lock
await redis.del(lockKey);
```

**Garantias:**
- ✅ Apenas 1 usuário consegue lock por vez
- ✅ Lock expira automaticamente (30s)
- ✅ Funciona com múltiplas instâncias

#### 2. **Database Transaction com Isolation Level**

```typescript
await db.transaction(async (tx) => {
  // SELECT FOR UPDATE (row-level lock)
  const seat = await tx.select()
    .from(seats)
    .where(eq(seats.id, seatId))
    .for('update');

  if (seat.status !== 'available') {
    throw new ConflictException();
  }

  await tx.update(seats)
    .set({ status: 'reserved' })
    .where(eq(seats.id, seatId));
});
```

#### 3. **Unique Constraint no Banco**

```sql
CONSTRAINT session_seat_unique 
UNIQUE(session_id, seat_number)
```

**Última linha de defesa**: Banco recusa duplicatas

#### 4. **Idempotency Key**

```typescript
@Post('/reservations')
create(@Headers('idempotency-key') key: string) {
  // Verificar se já processou essa requisição
  const cached = await redis.get(`idempotency:${key}`);
  if (cached) return JSON.parse(cached);
  
  // Processar...
  await redis.set(`idempotency:${key}`, result, 'EX', 3600);
}
```

### Prevenir Deadlocks

**Ordenação de locks:**
```typescript
// ❌ User A: lock(seat1) → lock(seat2)
// ❌ User B: lock(seat2) → lock(seat1)  → DEADLOCK

// ✅ Sempre ordenar por ID
const sortedSeats = seatIds.sort();
for (const id of sortedSeats) {
  await acquireLock(id);
}
```

---

## 🧪 Testes

### Estrutura de Testes

```
src/
├── modules/
│   └── sessions/
│       ├── sessions.service.spec.ts       # Unit tests
│       └── sessions.controller.spec.ts    # Integration tests
test/
└── sessions.e2e-spec.ts                   # E2E tests
```

### Executar Testes

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

### Cobertura Alvo

- ✅ **70%+** de cobertura geral
- ✅ **90%+** em Services (lógica crítica)
- ✅ **60%+** em Controllers

---

## ⚠️ Limitações Conhecidas

1. **Auth/Authorization**: Não implementado (fora do escopo)
2. **Rate Limiting**: Não implementado
3. **Kafka Retry**: DLQ básico, sem retry avançado
4. **Monitoring**: Sem Prometheus/Grafana

---

## 🚀 Melhorias Futuras

### Alta Prioridade
- [ ] Implementar autenticação (JWT)
- [ ] Rate limiting por IP/usuário
- [ ] Circuit breaker para dependências externas
- [ ] Health checks avançados

### Média Prioridade
- [ ] Retry com backoff exponencial no Kafka
- [ ] Batch processing de eventos
- [ ] Caching de queries frequentes
- [ ] Metrics (Prometheus)

### Baixa Prioridade
- [ ] GraphQL API
- [ ] WebSockets para updates em tempo real
- [ ] Multi-tenancy
- [ ] Internacionalização (i18n)

---

## 📝 Licença

Este projeto foi desenvolvido como parte de um desafio técnico.

---

## 👥 Autor

Desenvolvido seguindo as melhores práticas de:
- Clean Architecture
- SOLID Principles
- Domain-Driven Design
- Test-Driven Development
