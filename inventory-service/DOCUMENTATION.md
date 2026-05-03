# Inventory Service - Documentação

## 📋 Sumário

- [Objetivo e Contextualização](#objetivo-e-contextualização)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Docker Compose](#docker-compose)
- [Requisitos Funcionais](#requisitos-funcionais)
- [Regras de Negócio](#regras-de-negócio)
- [Eventos e Mensageria](#eventos-e-mensageria)
- [Cobertura de Testes](#cobertura-de-testes)

---

## 🎯 Objetivo e Contextualização

O **Inventory Service** é o microsserviço responsável por gerenciar o estoque de produtos e as reservas de itens para pedidos. Ele implementa controle de concorrência otimista com locks distribuídos via Redis para garantir que reservas simultâneas sejam processadas de forma segura e consistente.

Este serviço é crítico para a integridade do sistema, garantindo que produtos nunca sejam vendidos além da quantidade disponível e que reservas expirem automaticamente caso o pagamento não seja confirmado dentro do prazo estabelecido.

### Responsabilidades Principais

- Reservar itens ao receber eventos de criação de pedido
- Controlar disponibilidade em tempo real com cache Redis
- Confirmar baixa definitiva após confirmação de pagamento
- Estornar reservas em caso de cancelamento ou falha
- Alertar sobre níveis críticos de estoque
- Expirar reservas não confirmadas automaticamente

---

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológico

- **Linguagem**: TypeScript
- **Framework**: NestJS 10.x
- **Banco de Dados**: PostgreSQL 16
- **Cache/Lock**: Redis 7.x
- **ORM**: Prisma 5.x
- **Mensageria**: RabbitMQ (amqplib)
- **Runtime**: Node.js 20.x
- **Testes**: Vitest

### Padrões Arquiteturais

- **Clean Architecture**: Separação clara entre camadas (Domain, Application, Infrastructure, Presentation)
- **CQRS Simplificado**: Separação de comandos (reservar, confirmar) e consultas (disponibilidade)
- **Event-Driven Architecture**: Comunicação assíncrona via RabbitMQ
- **Saga Pattern - Participante**: Responde a eventos de pedido e pagamento
- **Pessimistic Locking**: Locks distribuídos via Redis para operações críticas

### Estrutura de Diretórios

```
src
├── application
│   ├── dto                    # Data Transfer Objects e schemas Zod
│   ├── handlers               # Handlers de eventos RabbitMQ
│   ├── ports                  # Interfaces de repositórios e serviços
│   └── use-cases              # Casos de uso (reservar, confirmar, estornar)
├── domain
│   ├── entities               # Entidades de domínio (Produto, Reserva, ItemReserva)
│   ├── enums                  # Enumerações (StatusReserva)
│   ├── events                 # Eventos de domínio
│   ├── repositories           # Interfaces de repositórios
│   ├── state                  # State Pattern para status de reserva
│   └── value-objects          # Value Objects (PedidoId, EstoqueProduto)
├── infrastructure
│   ├── repositories           # Implementações Prisma
│   ├── schedulers             # Jobs agendados (expiração de reservas)
│   └── support                # Serviços auxiliares (Prisma, Redis)
├── presentation
│   ├── controllers            # Controllers REST
│   ├── filters                # Exception filters
│   └── pipes                  # Pipes de validação (Zod)
└── shared
    ├── exceptions             # Exceções customizadas
    └── env.ts                 # Configuração de variáveis de ambiente
```

---

## 🐳 Docker Compose

### Configuração do Serviço

```yaml
inventory-service:
  build:
    context: ./inventory-service
  env_file:
    - ./inventory-service/.env
  depends_on:
    db-inventory:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  ports:
    - 3000:3000
  networks:
    - app-network
```

### Banco de Dados

```yaml
db-inventory:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: ${POSTGRES_DB_INVENTORY}
    POSTGRES_USER: ${POSTGRES_USER_INVENTORY}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_INVENTORY}
  volumes:
    - inventory_data:/var/lib/postgresql/data
  ports:
    - 5434:5432
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER_INVENTORY} -d ${POSTGRES_DB_INVENTORY}']
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - app-network
```

### Cache (Redis)

```yaml
cache-inventory:
  image: redis:latest
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD_INVENTORY}
  ports:
    - 6379:6379
  command: redis-server --requirepass ${REDIS_PASSWORD_INVENTORY}
  volumes:
    - redis_data:/data
  networks:
    - app-network
```

### Dependências

- **RabbitMQ**: Para comunicação assíncrona via eventos
- **PostgreSQL**: Persistência de produtos e reservas
- **Redis**: Cache de disponibilidade e locks distribuídos
- **API Gateway**: Para roteamento de requisições HTTP

---

## ✅ Requisitos Funcionais

### RF01 - Reservar Itens

Reservar itens ao receber `pedido.criado`, bloqueando quantidade no estoque.

**Handler**: `ReservarItensHandler`  
**Use Case**: `ReservarItensUseCase`

**Fluxo**:

1. Recebe evento `pedido.criado` com lista de itens
2. Verifica idempotência (reserva já existe para o pedido?)
3. Adquire lock distribuído via Redis (`reserva:pedido:{id}`)
4. Valida disponibilidade de **todos** os itens (reserva atômica)
5. Atualiza estoque bloqueando quantidades
6. Cria reserva com status `PENDENTE` e expiração em 15 minutos
7. Publica `estoque.reservado` ou `estoque.reserva_falhou`
8. Verifica níveis críticos e publica alertas se necessário

### RF02 - Confirmar Baixa Definitiva

Confirmar baixa definitiva do estoque após `pagamento.confirmado`.

**Handler**: `ConfirmarPagamentoHandler`  
**Use Case**: `ConfirmarBaixaUseCase`

**Fluxo**:

1. Recebe evento `pagamento.confirmado`
2. Localiza reserva ativa para o pedido
3. Transiciona status de reserva para `CONFIRMADA`
4. Confirma a baixa definitiva (quantidades já estavam bloqueadas)
5. Registra timestamp de confirmação

### RF03 - Estornar Reserva

Estornar reserva ao receber `pedido.cancelado` ou `pagamento.recusado`.

**Handler**: `PedidoCanceladoHandler`, `PagamentoRecusadoHandler`  
**Use Case**: `EstornarReservaUseCase`

**Fluxo**:

1. Recebe evento de cancelamento
2. Localiza reserva ativa para o pedido
3. Transiciona status para `ESTORNADA`
4. Devolve quantidades ao estoque (soma de volta)
5. Publica `estoque.reserva_estornada`

### RF04 - Alertar Nível Crítico

Alertar equipe quando estoque de um produto atingir nível crítico.

**Threshold**: < 5 unidades disponíveis

**Implementação**:

```typescript
if (produto.isNivelCritico()) {
  eventosNivelCritico.push(new NivelCriticoEstoqueEvent(produto.id, produto.quantidadeDisponivel.quantidade))
}
```

### RF05 - Consultar Disponibilidade

Consultar disponibilidade de itens em tempo real antes da reserva.

**Endpoint**: `GET /estoque/disponibilidade?produtoId={id}&quantidade={qty}`

**Use Case**: `ConsultarDisponibilidadeUseCase`

**Resposta**:

```json
{
  "produtoId": 1,
  "disponivel": true,
  "quantidadeDisponivel": 50,
  "quantidadeSolicitada": 5
}
```

---

## 📐 Regras de Negócio

### RN01 - Reserva Otimista com Lock

**Descrição**: Dois pedidos concorrentes para o último item: apenas o primeiro que gravar a reserva é aceito. O segundo recebe `estoque.reserva_falhou` imediatamente, sem espera.

**Implementação**: Lock distribuído via Redis com `SET NX` (Set if Not eXists)

```typescript
private async lock(lockKey: string, pedidoId: number) {
  const acquired = await this.lockService.acquire(lockKey, LOCK_TTL_MS)

  if (!acquired) {
    this.logger.warn(`Lock não adquirido para pedido ${pedidoId}. Concorrência detectada.`)
    throw new CriticalException('Falha ao adquirir lock para reserva')
  }
}
```

**Características**:

- TTL de 10 segundos para evitar deadlocks
- Automaticamente liberado após processamento (finally)
- Garante processamento sequencial por pedido

### RN02 - Reserva Parcial Não Permitida

**Descrição**: Se qualquer item do pedido não estiver disponível, nenhum item é reservado. A reserva é atômica — tudo ou nada.

**Implementação**:

```typescript
private async validarEstoqueItens(...) {
  const itensFaltantes: ItemFalhouData[] = []

  for (const item of itens) {
    const produto = produtoMap.get(item.produtoId)

    if (!produto || !produto.hasDisponivel(quantidade)) {
      itensFaltantes.push({
        produtoId: item.produtoId,
        quantidadeSolicitada: item.quantidade,
        quantidadeDisponivel: produto?.quantidadeDisponivel.quantidade ?? 0,
      })
    }
  }

  if (itensFaltantes.length > 0) {
    await this.eventPublisher.publish(
      new ReservaFalhouEvent(pedidoId, itensFaltantes)
    )
    throw new BusinessException('Estoque insuficiente')
  }
}
```

### RN03 - Expiração Automática de Reserva

**Descrição**: Reservas sem confirmação de pagamento expiram após 15 minutos e são estornadas automaticamente, liberando o item para outros pedidos.

**Implementação**: Job agendado executado a cada minuto

```typescript
@Cron('*/1 * * * *') // A cada 1 minuto
async expirarReservasAntigas() {
  const reservas = await this.reservaRepository.findPendentesExpiradas()

  for (const reserva of reservas) {
    await this.expirarReservaUseCase.execute({ reservaId: reserva.id })
  }
}
```

**Constante**:

```typescript
export const RESERVA_TIMEOUT_MINUTOS = 15
```

### RN04 - Nível Crítico

**Descrição**: Quando o estoque disponível de um produto ficar abaixo de 5 unidades, o evento `estoque.nivel_critico` é publicado para que o sistema de compras possa agir.

**Implementação**:

```typescript
export const NIVEL_CRITICO_ESTOQUE = 5

export class Produto {
  isNivelCritico(): boolean {
    return this.quantidadeDisponivel.quantidade < NIVEL_CRITICO_ESTOQUE
  }
}
```

### RN05 - Compensação (Rollback)

**Descrição**: Ao receber `pedido.cancelado`, estorna a reserva somando as quantidades de volta ao estoque disponível e publica `estoque.reserva_estornada`. (Saga — ação compensatória)

**Implementação**:

```typescript
async execute(input: EstornarReservaInput) {
  const reserva = await this.reservaRepository.findByPedidoId(pedidoId)

  if (!reserva || !reserva.isAtiva()) {
    return // Idempotência: já foi estornada
  }

  const produtos = await this.produtoRepository.findByIds(produtoIds)

  for (const item of reserva.itens) {
    const produto = produtoMap.get(item.produtoId)
    produto.estornarReserva(item.quantidade) // Soma de volta
  }

  reserva.estornar() // Transição de estado

  await this.produtoRepository.saveMany(produtosAlterados)
  await this.reservaRepository.save(reserva)

  await this.eventPublisher.publish(
    new EstoqueReservaEstornadaEvent(pedidoId.id)
  )
}
```

---

## 📡 Eventos e Mensageria

### Eventos Publicados

| Evento                      | Exchange    | Routing Key                   | Payload                                                                               |
| --------------------------- | ----------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `estoque.reservado`         | `inventory` | `inventory.estoque.reservado` | `{pedidoId, itens[{produtoId, quantidade}]}`                                          |
| `estoque.reserva_falhou`    | `inventory` | `inventory.reserva.falhou`    | `{pedidoId, itensFaltantes[{produtoId, quantidadeSolicitada, quantidadeDisponivel}]}` |
| `estoque.reserva_estornada` | `inventory` | `inventory.estoque.estornado` | `{pedidoId}`                                                                          |
| `estoque.nivel_critico`     | `inventory` | `inventory.estoque.critico`   | `{produtoId, quantidadeDisponivel}`                                                   |

### Eventos Consumidos

| Evento                 | Queue                            | Handler                     | Ação                      |
| ---------------------- | -------------------------------- | --------------------------- | ------------------------- |
| `pedido.criado`        | `inventory-pedido-criado`        | `ReservarItensHandler`      | Reserva itens do pedido   |
| `pedido.cancelado`     | `inventory-pedido-cancelado`     | `PedidoCanceladoHandler`    | Estorna reserva           |
| `pagamento.confirmado` | `inventory-pagamento-confirmado` | `ConfirmarPagamentoHandler` | Confirma baixa definitiva |

### Configuração RabbitMQ

```typescript
// rabbitmq.module.ts
const EXCHANGES = {
  order: 'order',
  inventory: 'inventory',
  payment: 'payment',
}

const QUEUES = {
  pedidoCriado: 'inventory-pedido-criado',
  pedidoCancelado: 'inventory-pedido-cancelado',
  pagamentoConfirmado: 'inventory-pagamento-confirmado',
}

const ROUTING_KEYS = {
  estoqueReservado: 'inventory.estoque.reservado',
  reservaFalhou: 'inventory.reserva.falhou',
  reservaEstornada: 'inventory.estoque.estornado',
  nivelCritico: 'inventory.estoque.critico',
}
```

---

## 🧪 Cobertura de Testes

### Resumo de Testes

O Inventory Service possui testes unitários focados em lógica de domínio e testes de integração para casos de uso críticos.

### Arquivos de Teste

#### 1. `reserva.entity.spec.ts`

**Cobertura**: Entidade de Domínio - Reserva

**Cenários Testados** (10+ testes):

##### Criação de Reserva

- ✅ Cria reserva no status `PENDENTE`
- ✅ Define `expiradoEm` 15 minutos à frente
- ✅ Lança erro ao criar sem itens
- ✅ Preserva os itens passados

##### Verificações de Estado

- ✅ `isAtiva()` retorna true quando pendente e não expirada
- ✅ `isExpirada()` retorna true quando passou do timestamp de expiração
- ✅ Reserva confirmada não é mais ativa
- ✅ Reserva estornada não é mais ativa

##### Transições de Estado (State Pattern)

- ✅ `confirmar()` transiciona PENDENTE → CONFIRMADA
- ✅ `estornar()` transiciona PENDENTE → ESTORNADA
- ✅ `expirar()` transiciona PENDENTE → EXPIRADA
- ✅ Lança exceção ao tentar confirmar reserva já confirmada
- ✅ Lança exceção ao tentar estornar reserva confirmada

#### 2. `produto.entity.spec.ts`

**Cobertura**: Entidade de Domínio - Produto

**Cenários Testados** (12+ testes):

##### Disponibilidade

- ✅ `hasDisponivel()` retorna true quando há estoque suficiente
- ✅ `hasDisponivel()` retorna false quando estoque insuficiente
- ✅ `isNivelCritico()` retorna true quando disponível < 5

##### Reserva de Estoque

- ✅ `reservar()` diminui quantidade disponível
- ✅ `reservar()` aumenta quantidade reservada
- ✅ Lança exceção ao tentar reservar mais do que disponível
- ✅ Não permite reservar quantidade negativa

##### Estorno de Reserva

- ✅ `estornarReserva()` aumenta quantidade disponível
- ✅ `estornarReserva()` diminui quantidade reservada
- ✅ Não permite estornar mais do que está reservado

##### Entrada de Estoque

- ✅ `adicionarEstoque()` aumenta quantidade total e disponível
- ✅ Entrada de estoque não afeta quantidade reservada

#### 3. `redis-lock.service.spec.ts`

**Cobertura**: Serviço de Lock Distribuído

**Cenários Testados** (7 testes):

##### Aquisição de Lock

- ✅ `acquire()` retorna true quando Redis confirma SET NX
- ✅ `acquire()` retorna false quando chave já existe (lock ocupado)
- ✅ Define TTL automaticamente para evitar deadlocks

##### Liberação de Lock

- ✅ `release()` deleta a chave com prefixo correto
- ✅ Não lança erro ao liberar lock inexistente

##### Lock com Callback

- ✅ `withLock()` executa função e libera o lock ao final
- ✅ Lança `CriticalException` quando não consegue adquirir lock
- ✅ Libera o lock mesmo quando função lança exceção (finally)

#### 4. `reservar-itens.use-case.spec.ts`

**Cobertura**: Use Case - Reservar Itens

**Cenários Testados** (15+ testes):

##### Fluxo de Sucesso

- ✅ Reserva itens com sucesso e publica evento
- ✅ Cria reserva com expiração de 15 minutos
- ✅ Bloqueia quantidade no estoque
- ✅ Retorna dados da reserva criada

##### Idempotência

- ✅ Retorna reserva existente quando pedido já foi reservado
- ✅ Não cria duplicatas de reserva
- ✅ Não publica eventos duplicados

##### Validações de Estoque

- ✅ Lança exceção e publica `reserva_falhou` quando produto não existe
- ✅ Lança exceção quando quantidade solicitada > disponível
- ✅ Lança exceção quando **qualquer** item não está disponível (atomicidade)
- ✅ Evento `reserva_falhou` contém detalhes de todos os itens faltantes

##### Concorrência

- ✅ Adquire lock antes de processar reserva
- ✅ Libera lock após processamento bem-sucedido
- ✅ Libera lock mesmo quando ocorre erro
- ✅ Lança exceção quando não consegue adquirir lock

##### Nível Crítico

- ✅ Publica `nivel_critico` quando produto fica com < 5 unidades
- ✅ Não publica alerta quando estoque ainda está acima do nível crítico

#### 5. `estornar-reserva.use-case.spec.ts`

**Cobertura**: Use Case - Estornar Reserva

**Cenários Testados** (10+ testes):

##### Fluxo de Estorno

- ✅ Estorna reserva com sucesso
- ✅ Devolve quantidades ao estoque disponível
- ✅ Transiciona status para ESTORNADA
- ✅ Publica evento `reserva_estornada`

##### Idempotência

- ✅ Não falha ao estornar reserva já estornada
- ✅ Não publica eventos duplicados
- ✅ Não altera estoque novamente

##### Validações

- ✅ Lança exceção quando reserva não existe
- ✅ Não permite estornar reserva já confirmada

### Estatísticas de Cobertura

| Camada                          | Classes Testadas                               | Métodos Testados            | Cobertura Estimada |
| ------------------------------- | ---------------------------------------------- | --------------------------- | ------------------ |
| **Domain (Entities)**           | Produto, Reserva, ItemReserva                  | Todos os métodos de negócio | ~95%               |
| **Application (Use Cases)**     | ReservarItens, EstornarReserva, ConfirmarBaixa | Todos os fluxos principais  | ~85%               |
| **Infrastructure (Redis Lock)** | RedisLockService                               | Todos os métodos            | ~90%               |
| **Presentation (Controllers)**  | EstoqueController                              | Parcial                     | ~70%               |

### Tipos de Testes

#### Testes Unitários

- **Framework**: Vitest
- **Mocking**: vi.fn(), vi.spyOn()
- **Assertions**: expect() do Vitest
- **Padrão**: Arrange-Act-Assert (AAA)

#### Exemplo de Teste

```typescript
describe('ReservarItensUseCase', () => {
  it('lança exceção quando qualquer item não está disponível', async () => {
    // Arrange
    const input = {
      pedidoId: 1,
      itens: [
        { produtoId: 1, quantidade: 10 }, // Disponível: 5
        { produtoId: 2, quantidade: 3 }, // Disponível: 10
      ],
    }

    produtoRepository.findByItens.mockResolvedValue([createProduto({ id: 1, disponivel: 5 }), createProduto({ id: 2, disponivel: 10 })])

    // Act & Assert
    await expect(useCase.execute(input)).rejects.toThrow(BusinessException)

    // Verifica que evento de falha foi publicado
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        pedidoId: 1,
        itensFaltantes: [{ produtoId: 1, quantidadeSolicitada: 10, quantidadeDisponivel: 5 }],
      }),
    )

    // Verifica que nada foi persistido
    expect(reservaRepository.save).not.toHaveBeenCalled()
  })
})
```

### Executando os Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:cov

# Executar apenas testes de uma suíte específica
npm test -- reserva.entity.spec
```
