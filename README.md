# Sistema de Venda de Ingressos de Cinema

[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Kafka-7.5-231F20?logo=apache-kafka)](https://kafka.apache.org/)

Sistema de venda de ingressos para cinema com controle de concorrência, garantindo que nenhum assento seja vendido duas vezes mesmo com múltiplas instâncias rodando simultaneamente.

---

## System Design

Acesse o link a seguir para visualizar um esboço do system design proposto para este desafio: https://link.excalidraw.com/l/1c9dSAsX8aQ/11vUQtjtbTA

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
- ✅ Conexão para BullMQ (job queue baseado em Redis)
- ✅ Pub/Sub para invalidação de cache
- ✅ Performance sub-millisecond

### Filas e Jobs
- **BullMQ 5.67.3**: Job queue baseado em Redis para tarefas assíncronas
- **@nestjs/bullmq 11.0.4**: Integração oficial do BullMQ com NestJS

**Por quê BullMQ?**
- ✅ Expiração automática de reservas (30s delayed jobs)
- ✅ Retry automático com backoff exponencial
- ✅ Concorrência configurável por processor
- ✅ Job deduplication com jobId único
- ✅ Cancelamento de jobs quando pagamento confirmado

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
│   │   │   ├── session-response.dto.ts
│   │   │   ├── seat-response.dto.ts       # DTO para assentos
│   │   │   └── index.ts
│   │   ├── sessions.controller.ts         # HTTP layer + GET /sessions/:id/seats
│   │   ├── sessions.controller.spec.ts    # Controller tests
│   │   ├── sessions.service.ts            # Business logic + getSeats()
│   │   ├── sessions.service.spec.ts       # Service tests
│   │   └── sessions.module.ts             # Module definition
│   │
│   ├── reservations/     # Reservas temporárias (30s TTL)
│   │   ├── dto/          # Data Transfer Objects
│   │   │   ├── create-reservation.dto.ts
│   │   │   ├── reservation-response.dto.ts
│   │   │   └── index.ts
│   │   ├── processors/   # BullMQ Job Processors
│   │   │   └── reservation-expiration.processor.ts  # Expiração automática
│   │   ├── reservations.controller.ts     # HTTP layer
│   │   ├── reservations.controller.spec.ts # Controller tests (15 tests)
│   │   ├── reservations.service.ts        # Business logic + BullMQ producer
│   │   ├── reservations.service.spec.ts   # Service tests (27 tests)
│   │   └── reservations.module.ts         # Module + BullMQ queue registration
│   │
│   ├── sales/            # Vendas confirmadas (pagamentos)
│   │   ├── dto/          # Data Transfer Objects
│   │   │   ├── create-sale.dto.ts
│   │   │   ├── sale-response.dto.ts
│   │   │   └── index.ts
│   │   ├── sales.controller.ts            # HTTP layer
│   │   ├── sales.service.ts               # Business logic + Payment confirmation
│   │   └── sales.module.ts                # Module definition
│   │
│   └── users/            # Gestão de usuários
│       ├── dto/          # Data Transfer Objects
│       │   ├── create-user.dto.ts
│       │   ├── update-user.dto.ts
│       │   ├── user-response.dto.ts
│       │   └── index.ts
│       ├── users.controller.ts            # HTTP layer
│       ├── users.service.ts               # Business logic
│       └── users.module.ts                # Module definition
│
├── shared/               # Código compartilhado
│   ├── database/         # Camada de dados
│   │   ├── repositories/ # Data access objects
│   │   │   ├── sessions.repository.ts
│   │   │   ├── seats.repository.ts
│   │   │   ├── reservations.repository.ts
│   │   │   ├── sales.repository.ts
│   │   │   └── users.repository.ts        # Repository de usuários
│   │   ├── schema.ts     # Drizzle schema (users, sessions, seats, reservations, sales)
│   │   ├── drizzle.service.ts
│   │   ├── database.module.ts (@Global)
│   │   └── index.ts
│   │
│   ├── redis/            # Cache e locks distribuídos
│   │   ├── redis.service.ts               # Distributed locks, caching
│   │   ├── redis.service.spec.ts          # Service tests
│   │   ├── redis.module.ts                # Module definition
│   │   └── index.ts
│   │
│   ├── filters/          # Exception filters
│   ├── guards/           # Auth guards
│   └── interceptors/     # HTTP interceptors
│
├── app.module.ts         # Root module + BullMQ configuration
└── main.ts               # Bootstrap + Swagger setup

test/
├── app.e2e-spec.ts                        # E2E tests
├── complete-flow/
│   ├── test-complete-flow.js              # Script Node.js - Fluxo completo
│   └── test-complete-flow.sh              # Script Bash - Fluxo completo
├── test-race-condition.js                 # Script de teste de concorrência (20 usuários)
└── test-race-condition.sh                 # Script de teste de race condition

drizzle/
├── 0000_careful_blob.sql                  # Migração inicial
├── 0001_cheerful_shard.sql                # Adiciona campos
├── 0002_flimsy_cobalt_man.sql             # Adiciona user_email em reservations
├── 0003_black_wraith.sql                  # Adiciona user_email em sales (renomeia seat_id)
└── meta/                                   # Metadata de migrações
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

#### `GET /sessions/:id/seats` - Listar Assentos da Sessão

**Response:** `200 OK`
```json
[
  {
    "id": "seat-uuid-1",
    "sessionId": "session-uuid",
    "seatNumber": "A1",
    "status": "available",
    "reservationId": null,
    "createdAt": "2026-02-04T20:00:00.000Z",
    "updatedAt": "2026-02-04T20:00:00.000Z"
  },
  {
    "id": "seat-uuid-2",
    "sessionId": "session-uuid",
    "seatNumber": "A2",
    "status": "reserved",
    "reservationId": "reservation-uuid",
    "createdAt": "2026-02-04T20:00:00.000Z",
    "updatedAt": "2026-02-04T20:01:00.000Z"
  }
]
```

**Uso:** Buscar assentos diretamente da tabela `seats` com seus status atuais (available, reserved, sold) e FK da sessão.

---

### Reservations (Reservas Temporárias)

#### `POST /reservations` - Criar Reserva

**Request Body:**
```json
{
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "seatIds": [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6g7-8901-bcde-f12345678901"
  ],
  "userId": "user-123",
  "userEmail": "user@example.com"
}
```

**Response:** `201 Created`
```json
{
  "id": "reservation-uuid",
  "sessionId": "session-uuid",
  "seatIds": ["seat-uuid-1", "seat-uuid-2"],
  "seatNumbers": ["A1", "A2"],
  "userEmail": "user@example.com",
  "status": "pending",
  "createdAt": "2026-02-06T20:00:00.000Z",
  "expiresAt": "2026-02-06T20:00:30.000Z",
  "remainingSeconds": 30
}
```

**Regras:**
- ✅ Locks distribuídos para prevenir race conditions
- ✅ IDs ordenados para prevenir deadlock
- ✅ TTL de 30 segundos
- ✅ Cache Redis automático
- ✅ Liberação automática de locks

**Possíveis Erros:**
- `404 Not Found` - Sessão não existe
- `409 Conflict` - Assentos já reservados ou em processo de reserva
- `400 Bad Request` - Assentos de sessões diferentes

#### `GET /reservations/:id` - Buscar Reserva

**Response:** `200 OK`
```json
{
  "id": "reservation-uuid",
  "sessionId": "session-uuid",
  "seatIds": ["seat-uuid-1"],
  "seatNumbers": ["A1"],
  "status": "pending",
  "remainingSeconds": 15
}
```

**Nota:** Consulta cache Redis primeiro, fallback para banco de dados.

#### `DELETE /reservations/:id` - Cancelar Reserva

**Response:** `204 No Content`

**Regras:**
- ✅ Apenas reservas com status `pending` podem ser canceladas
- ✅ Assentos liberados automaticamente para `available`
- ✅ Cache Redis removido

**Possíveis Erros:**
- `404 Not Found` - Reserva não existe
- `400 Bad Request` - Reserva já confirmada/expirada

---

### Sales (Vendas Confirmadas)

#### `POST /sales` - Confirmar Pagamento (Criar Venda)

**Request Body:**
```json
{
  "reservationId": "reservation-uuid"
}
```

**Response:** `201 Created`
```json
{
  "id": "sale-uuid",
  "reservationId": "reservation-uuid",
  "sessionId": "session-uuid",
  "seatIds": ["seat-uuid-1", "seat-uuid-2"],
  "seatNumbers": ["A1", "A2"],
  "userEmail": "user@example.com",
  "amount": "50.00",
  "createdAt": "2026-02-06T20:00:25.000Z"
}
```

**Regras:**
- ✅ Valida que reserva existe e está como `pending`
- ✅ Valida que reserva não expirou
- ✅ Calcula preço total: `ticketPrice × quantidade de assentos`
- ✅ Atualiza status da reserva para `confirmed`
- ✅ Atualiza status dos assentos de `reserved` → `sold`
- ✅ Remove reserva do cache Redis
- ✅ **Cancela job de expiração agendado no BullMQ** (evita processar reserva confirmada)

**Fluxo de Expiração Automática:**
1. **Criação da reserva**: Job de expiração agendado com 30s de delay
2. **Pagamento confirmado**: Job cancelado automaticamente
3. **Expiração**: Se não houver pagamento, job processa após 30s e expira reserva

---

### Users (Gestão de Usuários)

#### `POST /users` - Criar Usuário

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "João Silva"
}
```

**Response:** `201 Created`
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "João Silva",
  "createdAt": "2026-02-06T10:00:00.000Z",
  "updatedAt": "2026-02-06T10:00:00.000Z"
}
```

**Regras:**
- ✅ Email deve ser único (validação no banco e no service)
- ✅ Email validado com `class-validator` (@IsEmail)
- ✅ Nome obrigatório (mínimo 3 caracteres)

**Possíveis Erros:**
- `409 Conflict` - Email já cadastrado

#### `GET /users` - Listar Usuários

**Response:** `200 OK`
```json
[
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "João Silva",
    "createdAt": "2026-02-06T10:00:00.000Z",
    "updatedAt": "2026-02-06T10:00:00.000Z"
  }
]
```

#### `GET /users/:id` - Buscar Usuário

**Response:** `200 OK` ou `404 Not Found`

#### `PATCH /users/:id` - Atualizar Usuário

**Request Body:** (campos opcionais)
```json
{
  "name": "João Silva Atualizado",
  "email": "newemail@example.com"
}
```

**Response:** `200 OK`

**Regras:**
- ✅ Se alterar email, valida unicidade
- ✅ Campos opcionais (pode atualizar apenas nome ou apenas email)

#### `DELETE /users/:id` - Deletar Usuário

**Response:** `204 No Content`

**Possíveis Erros:**
- `404 Not Found` - Reserva não existe
- `400 Bad Request` - Reserva já confirmada/expirada/cancelada ou expirou durante pagamento

#### `GET /sales/:id` - Buscar Venda

**Response:** `200 OK`
```json
{
  "id": "sale-uuid",
  "reservationId": "reservation-uuid",
  "sessionId": "session-uuid",
  "seatIds": ["seat-uuid-1"],
  "seatNumbers": ["A1"],
  "userEmail": "user@example.com",
  "amount": "25.00",
  "createdAt": "2026-02-06T20:00:25.000Z"
}
```

#### `GET /sales/user/:userId` - Buscar Compras do Usuário

**Response:** `200 OK`
```json
[
  {
    "id": "sale-uuid-1",
    "reservationId": "reservation-uuid-1",
    "sessionId": "session-uuid-1",
    "seatIds": ["seat-uuid-1"],
    "seatNumbers": ["A1"],
    "userEmail": "user@example.com",
    "amount": "25.00",
    "createdAt": "2026-02-06T20:00:25.000Z"
  }
]
```

**Nota:** Retorna histórico de compras ordenado por data (mais recente primeiro).

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

### Solução Implementada no ReservationsService

#### 1. **Redis Distributed Lock com Múltiplos Assentos**

```typescript
// 1. Ordenar IDs para prevenir deadlock
const sortedSeatIds = [...seatIds].sort();

// 2. Gerar chaves de lock
const lockKeys = sortedSeatIds.map(id => `lock:seat:${id}`);
const lockValue = randomUUID(); // Valor único para verificar ownership

// 3. Adquirir múltiplos locks atomicamente
const lockResult = await redisService.acquireMultipleLocks(
  lockKeys,
  lockValue,
  10 // TTL em segundos
);

if (!lockResult.success) {
  throw new ConflictException(
    'One or more seats are currently being reserved by another user'
  );
}

try {
  // 4. Validar assentos no banco de dados
  const seats = await seatsRepository.findByIds(sortedSeatIds);
  
  // 5. Criar reserva
  const reservation = await reservationsRepository.create(...);
  
  // 6. Atualizar status dos assentos
  await seatsRepository.updateManyStatus(sortedSeatIds, 'reserved', reservation.id);
  
  // 7. Cachear no Redis com TTL de 30s
  await redisService.set(
    `reservation:${reservation.id}`,
    reservationData,
    30
  );
  
  return reservation;
} finally {
  // 8. SEMPRE liberar locks (mesmo em caso de erro)
  await redisService.releaseMultipleLocks(lockKeys, lockValue);
}
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

### Expiração Automática de Reservas

**Estratégia BullMQ:** Delayed Jobs para processamento garantido

#### Configuração Global (AppModule)

```typescript
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        },
        defaultJobOptions: {
          attempts: 3,                    // Retry até 3x
          backoff: {
            type: 'exponential',          // 1s, 2s, 4s
            delay: 1000,
          },
          removeOnComplete: true,         // Limpa jobs completados
          removeOnFail: false,            // Mantém jobs falhados para debug
        },
      }),
    }),
  ],
})
```

#### Registro de Fila (ReservationsModule)

```typescript
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reservation-expiration',    // Nome da fila
    }),
  ],
  providers: [
    ReservationExpirationProcessor,      // Worker que processa jobs
  ],
})
```

#### Producer (ReservationsService)

```typescript
@Injectable()
export class ReservationsService {
  constructor(
    @InjectQueue('reservation-expiration')
    private expirationQueue: Queue,
  ) {}
  
  async create(dto: CreateReservationDto) {
    // ... criar reserva ...
    
    // Agendar job de expiração com 30s de delay
    await this.expirationQueue.add(
      'expire-reservation',              // Nome do job
      { reservationId: reservation.id }, // Payload
      {
        delay: 30000,                    // 30 segundos
        jobId: `reservation-${reservation.id}`, // Evita duplicação
      },
    );
    
    return reservation;
  }
  
  async cancel(id: string) {
    // ... cancelar reserva ...
    
    // Remover job agendado
    const job = await this.expirationQueue.getJob(`reservation-${id}`);
    if (job) await job.remove();
  }
}
```

#### Worker Processor (ReservationExpirationProcessor)

```typescript
@Processor('reservation-expiration', {
  concurrency: 5,                        // Processa 5 jobs simultâneos
})
export class ReservationExpirationProcessor extends WorkerHost {
  async process(job: Job<{ reservationId: string }>) {
    const { reservationId } = job.data;
    
    // 1. Buscar reserva
    const reservation = await reservationsRepo.findById(reservationId);
    if (!reservation || reservation.status !== 'pending') {
      return; // Já foi processada ou cancelada
    }
    
    // 2. Expirar reserva
    await reservationsRepo.updateStatus(reservationId, 'expired');
    
    // 3. Liberar assentos
    const seats = await seatsRepo.findByReservationId(reservationId);
    const seatIds = seats.map(s => s.id);
    await seatsRepo.updateManyStatus(seatIds, 'available', null);
    
    this.logger.log(
      `Expired reservation ${reservationId}, released ${seatIds.length} seats`
    );
  }
}
```

#### Cancelamento no Pagamento (SalesService)

```typescript
@Injectable()
export class SalesService {
  constructor(
    @InjectQueue('reservation-expiration')
    private expirationQueue: Queue,
  ) {}
  
  async create(dto: CreateSaleDto) {
    // ... validar e criar venda ...
    
    // Cancelar job de expiração (pagamento confirmado)
    const job = await this.expirationQueue.getJob(
      `reservation-${dto.reservationId}`
    );
    if (job) await job.remove();
    
    return sale;
  }
}
```

**Por quê BullMQ ao invés de cronjob manual?**
- ✅ **Garantia de execução**: Job não se perde, retry automático
- ✅ **Deduplicação**: jobId único previne duplicação
- ✅ **Cancelamento**: Remove job quando pagamento confirmado
- ✅ **Persistência**: Jobs sobrevivem a restart da aplicação
- ✅ **Concorrência**: Processa múltiplas expirações em paralelo
- ✅ **Observabilidade**: BullMQ Dashboard para monitorar jobs
  return expiredReservations.length;
}
```

**Testes implementados:**
- ✅ Processa múltiplas reservas expiradas
- ✅ Libera assentos corretamente
- ✅ Continua processando mesmo com erros individuais
- ✅ Retorna 0 quando não há reservas expiradas

### Prevenir Deadlocks

**Ordenação de locks no ReservationsService:**
```typescript
// ❌ Cenário de deadlock:
// User A tenta reservar: [seat-uuid-2, seat-uuid-1]
// User B tenta reservar: [seat-uuid-1, seat-uuid-2]
// User A adquire lock(seat-uuid-2), User B adquire lock(seat-uuid-1)
// User A espera lock(seat-uuid-1), User B espera lock(seat-uuid-2)
// → DEADLOCK

// ✅ Solução implementada: sempre ordenar por ID
const sortedSeatIds = [...seatIds].sort();
const lockKeys = sortedSeatIds.map(id => `lock:seat:${id}`);

// Agora ambos os usuários tentam adquirir locks na mesma ordem:
// lock(seat-uuid-1) → lock(seat-uuid-2)
// Quem conseguir o primeiro lock terá prioridade
```

**Testes implementados:**
- ✅ Verifica ordenação automática de IDs desordenados
- ✅ Valida que locks são sempre adquiridos em ordem crescente
- ✅ Garante que locks são liberados mesmo em caso de erro

---

## 🧪 Testes

### Estrutura de Testes

```
src/
├── modules/
│   ├── sessions/
│   │   ├── sessions.service.spec.ts       # Unit tests
│   │   └── sessions.controller.spec.ts    # Integration tests
│   ├── reservations/
│   │   ├── reservations.service.spec.ts   # Unit tests (27 testes)
│   │   └── reservations.controller.spec.ts # Integration tests (15 testes)
│   └── redis/
│       └── redis.service.spec.ts          # Unit tests para Redis
test/
├── app.e2e-spec.ts                        # E2E tests
├── complete-flow/
│   ├── test-complete-flow.js              # Script Node.js - Fluxo completo
│   └── test-complete-flow.sh              # Script Bash - Fluxo completo
├── test-race-condition.js                 # Script de teste de concorrência (20 usuários)
└── test-race-condition.sh                 # Script de teste de race condition
```

### Scripts de Teste End-to-End

**Teste de Fluxo Completo**: Valida o ciclo completo de compra de ingressos

```bash
# Versão Node.js (recomendado)
node test/complete-flow/test-complete-flow.js

# Versão Bash (alternativa)
./test/complete-flow/test-complete-flow.sh
```

**Fluxo testado:**
1. ✅ Criar sessão de cinema (20 assentos)
2. ✅ Buscar assentos disponíveis via `/sessions/:id/seats`
3. ✅ Criar reserva (3 assentos)
4. ✅ Verificar reserva criada
5. ✅ Confirmar pagamento (criar venda)
6. ✅ Validar assentos mudaram de `reserved` → `sold`
7. ✅ Verificar histórico de compras do usuário

**Teste de Concorrência**: Simula 20 usuários tentando reservar os mesmos assentos

```bash
# Versão Node.js (recomendado)
node test/test-race-condition.js

# Versão Bash (alternativa)
./test/test-race-condition.sh
```

**Objetivo:**
- Testar locks distribuídos do Redis
- Garantir que apenas 1 reserva seja criada por assento
- Validar mensagens de erro para usuários bloqueados

### Executar Testes

```bash
# Todos os testes
pnpm test

# Apenas Sessions
pnpm test:sessions-service
pnpm test:sessions-controller

# Apenas Reservations
pnpm test:reservations
pnpm test:reservations-service
pnpm test:reservations-controller

# Com watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

### Cobertura de Testes

**Módulo Reservations (42 testes):**
- ✅ Service: 27 testes cobrindo:
  - Criação de reservas com locks distribuídos
  - Prevenção de race conditions
  - Deadlock prevention (ordenação de IDs)
  - Validação de assentos e sessões
  - Cache Redis com TTL
  - Cancelamento de reservas
  - Processamento de reservas expiradas
  - Liberação automática de locks

- ✅ Controller: 15 testes cobrindo:
  - Endpoints HTTP (POST, GET, DELETE)
  - Validação de DTOs
  - Tratamento de exceções
  - Status codes corretos (201, 200, 204)
  - Edge cases e casos de concorrência

**Módulo Sessions:**
- ✅ Service: Testes completos de CRUD
- ✅ Controller: Testes de endpoints
- ✅ Novo endpoint: GET `/sessions/:id/seats` para buscar assentos com status

**Módulo Sales:**
- ✅ Service: Lógica completa de confirmação de pagamento
- ✅ Controller: Endpoints para criar venda e buscar histórico
- ✅ Integração com módulo de reservations
- ✅ Validação de expiração de reservas

### Cobertura Alvo

- ✅ **60-70%+** de cobertura geral
- ✅ **90%+** em Services (lógica crítica)
- ✅ **70%+** em Controllers
- ✅ **100%** em casos de race condition e deadlock

---

## 📝 Changelog Recente

### [2026-02-08] - BullMQ + Módulo Users

**Adicionado:**
- ✅ **BullMQ para expiração automática de reservas**
  - Delayed jobs com 30s de atraso para processar expirações
  - Processor `ReservationExpirationProcessor` com concurrency: 5
  - Cancelamento automático de jobs quando pagamento confirmado
  - Retry com backoff exponencial (3 tentativas)
  - Deduplicação com jobId único

- ✅ **Módulo Users completo**
  - POST `/users` - Criar usuário
  - GET `/users` - Listar todos os usuários
  - GET `/users/:id` - Buscar usuário por ID
  - PATCH `/users/:id` - Atualizar usuário
  - DELETE `/users/:id` - Deletar usuário
  - Validação de email único
  - Repository pattern para acesso a dados

**Estrutura do Banco Atualizada:**
```sql
-- Tabela users
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

**Dependências Adicionadas:**
```json
{
  "bullmq": "^5.67.3",
  "@nestjs/bullmq": "^11.0.4"
}
```

### [2026-02-07] - Completado Módulo Sales + Endpoint de Assentos

**Adicionado:**
- ✅ **GET `/sessions/:id/seats`** - Endpoint para buscar assentos de uma sessão
  - Retorna todos os assentos com status (available, reserved, sold)
  - Busca diretamente da tabela `seats` usando FK `sessionId`
  - DTO `SeatResponseDto` com todos os campos da tabela

- ✅ **Módulo Sales completo**
  - POST `/sales` - Confirmar pagamento e criar venda
  - GET `/sales/:id` - Buscar venda por ID
  - GET `/sales/user/:userId` - Histórico de compras do usuário
  - Validação de expiração de reservas
  - Atualização automática de status (reserva → confirmed, assentos → sold)
  - Remoção de cache Redis após confirmação

- ✅ **Scripts de teste E2E**
  - `test-complete-flow.js` - Versão Node.js com saída colorida
  - `test-complete-flow.sh` - Versão Bash com curl + jq
  - Testa fluxo completo: Session → Reservation → Sale

**Corrigido:**
- ✅ SalesModule não estava importado no AppModule (erro 404)
- ✅ Ordem dos campos no `salesRepository.create()` estava incorreta
  - Ordem correta: reservationId → userId → userEmail → sessionId → amount
  - Alinhado com schema do banco de dados
- ✅ Script de teste atualizado para usar novo endpoint `/sessions/:id/seats`
- ✅ Script de teste usando campo `amount` ao invés de `totalPrice`

**Estrutura do Banco Atualizada:**
```sql
-- Tabela sales
CREATE TABLE "sales" (
  "id" uuid PRIMARY KEY,
  "reservation_id" uuid NOT NULL REFERENCES reservations(id),
  "user_id" varchar(255) NOT NULL,
  "user_email" varchar(255) NOT NULL,  -- Campo adicionado
  "session_id" uuid NOT NULL REFERENCES sessions(id),
  "amount" numeric(10, 2) NOT NULL,
  "confirmed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

---

## ⚠️ Limitações Conhecidas

1. **Auth/Authorization**: Não implementado (fora do escopo)
2. **Rate Limiting**: Não implementado
3. **Kafka Retry**: DLQ básico, sem retry avançado
4. **Monitoring**: Sem Prometheus/Grafana

---

## 🚀 Melhorias Futuras

- [ ] Implementar autenticação
- [ ] Rate limiting por IP/usuário
- [ ] Circuit breaker para dependências externas
- [ ] Health checks avançados
- [ ] Retry com backoff exponencial no Kafka
- [ ] Batch processing de eventos
- [ ] Caching de queries frequentes
- [ ] Metrics (Prometheus)