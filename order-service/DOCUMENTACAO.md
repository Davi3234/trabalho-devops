# Order Service — Documentação Técnica

## Sumário

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Domínio e Entidades](#domínio-e-entidades)
4. [Regras de Negócio](#regras-de-negócio)
5. [API REST](#api-rest)
6. [Mensageria (RabbitMQ)](#mensageria-rabbitmq)
7. [Banco de Dados](#banco-de-dados)
8. [Testes Automatizados](#testes-automatizados)
9. [Configuração e Execução](#configuração-e-execução)
10. [Stack Tecnológica](#stack-tecnológica)

---

## Visão Geral

O **order-service** é o microsserviço central de gerenciamento de pedidos de uma plataforma de e-commerce. Ele é responsável por:

- Receber e validar a criação de novos pedidos
- Aplicar cupons de desconto sobre o valor dos itens
- Gerenciar o ciclo de vida completo de um pedido (PENDENTE → RESERVADO → PAGO → DESPACHADO → ENTREGUE ou CANCELADO)
- Expor uma API REST para operações CRUD e consulta de histórico
- Publicar e consumir eventos assíncronos via RabbitMQ para integração com os microsserviços de estoque, pagamento e entrega

O serviço faz parte de uma arquitetura de microsserviços composta também por `auth-service`, `inventory-service`, `payment-service`, além de um `api-gateway` baseado em Nginx e um broker de mensagens RabbitMQ compartilhado.

---

## Arquitetura

O projeto segue o padrão de **arquitetura em camadas** com separação clara de responsabilidades:

```
order-service/
├── api/
│   ├── controller/        → Camada de apresentação (REST)
│   └── handler/           → Tratamento global de exceções
├── application/
│   ├── dto/               → Objetos de transferência de dados (Request/Response)
│   ├── exception/         → Exceções de domínio da aplicação
│   └── service/           → Lógica de negócio (OrderService, OrderStateService)
├── domain/
│   ├── entity/            → Entidades JPA e enumerações
│   └── repository/        → Interfaces de repositório Spring Data JPA
└── infrastructure/
    ├── config/            → Configuração de RabbitMQ e Scheduling
    ├── messaging/         → Publisher e Listener de eventos
    └── scheduler/         → Jobs agendados
```

### Fluxo principal de criação de pedido

```
Cliente → POST /api/orders
         → OrderController
         → OrderService.createOrder()
             → valida valor mínimo (R$ 10,00)
             → aplica cupom (se informado)
             → persiste Order + OrderItems no PostgreSQL
             → publica evento "pedido.criado" no RabbitMQ (exchange: order.events)
         ← 201 Created + OrderResponse
```

---

## Domínio e Entidades

### `OrderStatus` — Ciclo de vida do pedido

| Status       | Descrição                                                 |
| ------------ | --------------------------------------------------------- |
| `PENDENTE`   | Estado inicial após criação                               |
| `RESERVADO`  | Estoque reservado pelo inventory-service                  |
| `PAGO`       | Pagamento confirmado pelo payment-service                 |
| `DESPACHADO` | Entrega iniciada pelo serviço de entrega                  |
| `ENTREGUE`   | Pedido entregue ao cliente                                |
| `CANCELADO`  | Pedido cancelado (cliente, falha de pagamento ou timeout) |

### `Order`

Entidade principal. Campos:

| Campo          | Tipo              | Descrição                                    |
| -------------- | ----------------- | -------------------------------------------- |
| `id`           | `Long`            | Identificador único (auto-incremental)       |
| `customerId`   | `Long`            | Identificador do cliente                     |
| `status`       | `OrderStatus`     | Status atual do pedido                       |
| `totalAmount`  | `BigDecimal`      | Valor total (itens − desconto + frete)       |
| `shippingCost` | `BigDecimal`      | Custo de frete                               |
| `discount`     | `BigDecimal`      | Valor absoluto do desconto aplicado          |
| `couponCode`   | `String`          | Código do cupom utilizado (opcional)         |
| `createdAt`    | `LocalDateTime`   | Preenchido automaticamente via `@PrePersist` |
| `updatedAt`    | `LocalDateTime`   | Atualizado automaticamente via `@PreUpdate`  |
| `items`        | `List<OrderItem>` | Itens do pedido (cascade ALL, orphanRemoval) |

Métodos de domínio relevantes:

- `calculateItemsTotal()` — soma `unitPrice × quantity` de todos os itens
- `calculateFinalAmount()` — `itemsTotal − discount + shippingCost`
- `isCancellable()` — retorna `true` somente se status for `PENDENTE` ou `RESERVADO`
- `isWithinCancellationWindow()` — retorna `true` se `createdAt + 30 minutos > agora`

### `OrderItem`

Itens de linha do pedido. Campos: `productId`, `productName`, `quantity`, `unitPrice`. Relacionamento `@ManyToOne` com `Order`.

### `Coupon`

Cupom de desconto. Campos: `code`, `discountPercentage`, `singleUse`, `used`, `expiresAt`.

### `CouponUsage`

Rastreia quais clientes já utilizaram cada cupom. Unicidade garantida pela constraint `(coupon_id, customer_id)`.

---

## Regras de Negócio

### 1. Valor mínimo de pedido

O valor total dos itens (antes do frete e desconto) deve ser **no mínimo R$ 10,00**. Caso contrário, é lançada `MinimumOrderValueException` → HTTP 400.

### 2. Aplicação de cupom

Ao informar `couponCode` na criação do pedido, as seguintes validações são executadas em sequência:

| Condição                                  | Exceção                  | HTTP |
| ----------------------------------------- | ------------------------ | ---- |
| Cupom não encontrado no banco             | `InvalidCouponException` | 400  |
| `expiresAt` não nulo e já passou          | `InvalidCouponException` | 400  |
| `singleUse = true` e `used = true`        | `InvalidCouponException` | 400  |
| Cliente já utilizou o cupom anteriormente | `InvalidCouponException` | 400  |

O desconto é calculado como:

$$\text{discount} = \text{itemsTotal} \times \frac{\text{discountPercentage}}{100}$$

O valor final do pedido é então:

$$\text{totalAmount} = \text{itemsTotal} - \text{discount} + \text{shippingCost}$$

### 3. Cancelamento pelo cliente

Para cancelar um pedido via `POST /api/orders/{id}/cancel`, duas condições devem ser satisfeitas simultaneamente:

1. **Status cancelável**: o pedido deve estar com status `PENDENTE` ou `RESERVADO`. Qualquer outro status (`PAGO`, `DESPACHADO`, `ENTREGUE`, `CANCELADO`) gera `CancellationNotAllowedException` → HTTP 422.
2. **Janela de 30 minutos**: o pedido deve ter sido criado há no máximo 30 minutos. Se a janela expirou, `CancellationNotAllowedException` → HTTP 422.

### 4. Cancelamento automático por timeout de reserva

Um `@Scheduled` job (`ReservationTimeoutScheduler`) executa **a cada 60 segundos** e cancela automaticamente pedidos com status `RESERVADO` cujo `updatedAt` é anterior a **15 minutos atrás**. Ao cancelar, publica o evento `pedido.cancelado`.

### 5. Transição de estado via eventos

O `OrderStateService` processa eventos recebidos do RabbitMQ e aplica as seguintes transições:

| Evento recebido          | Ação                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `estoque.reserva_falhou` | Status → `CANCELADO`, publica `pedido.cancelado`                  |
| `pagamento.recusado`     | Status → `CANCELADO`, publica `pedido.cancelado`                  |
| `pagamento.confirmado`   | Status → `PAGO`, invalida cupom single-use, publica `pedido.pago` |
| `entrega.despachada`     | Status → `DESPACHADO`, publica `pedido.despachado`                |

### 6. Invalidação de cupom de uso único

Quando o pagamento é confirmado (`handlePaymentConfirmed`), se o pedido utilizou um cupom com `singleUse = true`, o campo `used` do cupom é marcado como `true`. Independentemente do tipo, um registro de `CouponUsage` é sempre persistido para impedir reutilização pelo mesmo cliente.

---

## API REST

Base URL: `http://localhost:8080/api/orders`

### Endpoints

#### `POST /api/orders` — Criar pedido

**Body:**

```json
{
    "customerId": 456,
    "shippingCost": 10.0,
    "couponCode": "DESCONTO10",
    "items": [
        {
            "productId": 123,
            "productName": "Produto A",
            "unitPrice": 50.0,
            "quantity": 2
        }
    ]
}
```

**Validações obrigatórias:**

- `customerId`: não nulo
- `items`: lista não vazia; cada item requer `productId`, `productName`, `unitPrice` (positivo) e `quantity` (positivo)
- `shippingCost`: não nulo e positivo

**Respostas:**

| Código | Situação                             |
| ------ | ------------------------------------ |
| 201    | Pedido criado com sucesso            |
| 400    | Falha de validação ou cupom inválido |
| 400    | Valor de itens abaixo de R$ 10,00    |

---

#### `GET /api/orders` — Listar todos os pedidos

**Resposta:** `200 OK` com array de `OrderResponse`.

---

#### `GET /api/orders/{id}` — Buscar pedido por ID

**Respostas:**

| Código | Situação              |
| ------ | --------------------- |
| 200    | Pedido encontrado     |
| 404    | Pedido não encontrado |

---

#### `DELETE /api/orders/{id}` — Excluir pedido

**Respostas:**

| Código | Situação              |
| ------ | --------------------- |
| 204    | Excluído com sucesso  |
| 404    | Pedido não encontrado |

---

#### `POST /api/orders/{orderId}/cancel` — Cancelar pedido

**Respostas:**

| Código | Situação                                           |
| ------ | -------------------------------------------------- |
| 204    | Cancelado com sucesso                              |
| 404    | Pedido não encontrado                              |
| 422    | Status não cancelável ou janela de 30 min expirada |

---

#### `GET /api/orders/history/{customerId}` — Histórico de pedidos do cliente

**Query params (todos opcionais):**

| Parâmetro   | Tipo           | Descrição                                      |
| ----------- | -------------- | ---------------------------------------------- |
| `status`    | `OrderStatus`  | Filtra por status específico                   |
| `startDate` | `ISO DateTime` | Data/hora de início (`createdAt >= startDate`) |
| `endDate`   | `ISO DateTime` | Data/hora de fim (`createdAt <= endDate`)      |

**Respostas:** `200 OK` com array de `OrderResponse` ordenado por `createdAt DESC`.

**Lógica de roteamento no repositório** (contorna limitação do Hibernate 6 com enum nulo em JPQL):

| `status` | Filtro de data | Método do repositório                           |
| -------- | -------------- | ----------------------------------------------- |
| nulo     | sem filtro     | `findByCustomerIdOrderByCreatedAtDesc`          |
| nulo     | com filtro     | `findByCustomerIdAndDateRange`                  |
| definido | sem filtro     | `findByCustomerIdAndStatusOrderByCreatedAtDesc` |
| definido | com filtro     | `findByFilters`                                 |

---

### Formato de resposta de erro

```json
{
    "timestamp": "2026-04-19T10:30:00",
    "status": 404,
    "error": "Pedido não encontrado: 99"
}
```

Para erros de validação (`400`), o campo `details` contém um mapa com os campos inválidos:

```json
{
    "timestamp": "2026-04-19T10:30:00",
    "status": 400,
    "error": "Erro de validação",
    "details": {
        "customerId": "customerId é obrigatório",
        "shippingCost": "shippingCost é obrigatório"
    }
}
```

---

## Mensageria (RabbitMQ)

### Exchanges

| Exchange           | Tipo  | Finalidade                                       |
| ------------------ | ----- | ------------------------------------------------ |
| `order.events`     | Topic | Publicação de eventos gerados pelo order-service |
| `estoque.events`   | Topic | Recebimento de eventos do inventory-service      |
| `pagamento.events` | Topic | Recebimento de eventos do payment-service        |
| `entrega.events`   | Topic | Recebimento de eventos do serviço de entrega     |

### Eventos publicados (`order.events`)

| Routing Key         | Gatilho                                      |
| ------------------- | -------------------------------------------- |
| `pedido.criado`     | Pedido criado com sucesso                    |
| `pedido.cancelado`  | Pedido cancelado (cliente, timeout ou falha) |
| `pedido.pago`       | Pagamento confirmado                         |
| `pedido.despachado` | Entrega despachada                           |

**Payload publicado:**

```json
{
    "orderId": 1,
    "customerId": 456,
    "status": "PENDENTE",
    "totalAmount": 110.0,
    "shippingCost": 10.0,
    "discount": 0.0,
    "couponCode": null,
    "items": [
        {
            "productId": 123,
            "productName": "Produto A",
            "quantity": 2,
            "unitPrice": 50.0
        }
    ]
}
```

### Filas consumidas

| Fila                           | Binding                                     | Handler                      |
| ------------------------------ | ------------------------------------------- | ---------------------------- |
| `order.estoque.reserva_falhou` | `estoque.events` / `estoque.reserva_falhou` | `handleEstoqueReservaFalhou` |
| `order.pagamento.recusado`     | `pagamento.events` / `pagamento.recusado`   | `handlePagamentoRecusado`    |
| `order.pagamento.confirmado`   | `pagamento.events` / `pagamento.confirmado` | `handlePagamentoConfirmado`  |
| `order.entrega.despachada`     | `entrega.events` / `entrega.despachada`     | `handleEntregaDespachada`    |

Todas as filas são **durable** (sobrevivem a reinicializações do broker).

---

## Banco de Dados

O banco de dados é **PostgreSQL 16**. As migrations são gerenciadas pelo **Flyway**.

### Schema (V1\_\_create_order_tables.sql)

```
orders
├── id             BIGSERIAL PK
├── customer_id    BIGINT NOT NULL
├── status         VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
├── total_amount   NUMERIC(12,2) NOT NULL
├── shipping_cost  NUMERIC(12,2) NOT NULL DEFAULT 0
├── discount       NUMERIC(12,2) DEFAULT 0
├── coupon_code    VARCHAR(50)
├── created_at     TIMESTAMP NOT NULL DEFAULT NOW()
└── updated_at     TIMESTAMP NOT NULL DEFAULT NOW()

order_items
├── id             BIGSERIAL PK
├── order_id       BIGINT FK → orders(id) ON DELETE CASCADE
├── product_id     BIGINT NOT NULL
├── product_name   VARCHAR(255) NOT NULL
├── quantity       INTEGER NOT NULL
└── unit_price     NUMERIC(12,2) NOT NULL

coupons
├── id                  BIGSERIAL PK
├── code                VARCHAR(50) UNIQUE NOT NULL
├── discount_percentage DOUBLE PRECISION
├── single_use          BOOLEAN NOT NULL DEFAULT FALSE
├── used                BOOLEAN NOT NULL DEFAULT FALSE
└── expires_at          TIMESTAMP

coupon_usages
├── id          BIGSERIAL PK
├── coupon_id   BIGINT NOT NULL
├── customer_id BIGINT NOT NULL
├── order_id    BIGINT NOT NULL
└── UNIQUE(coupon_id, customer_id)
```

### Índices

| Índice                     | Coluna(s)              | Finalidade                         |
| -------------------------- | ---------------------- | ---------------------------------- |
| `idx_orders_customer_id`   | `orders.customer_id`   | Consultas de histórico por cliente |
| `idx_orders_status`        | `orders.status`        | Filtros por status e scheduler     |
| `idx_orders_created_at`    | `orders.created_at`    | Filtros por data e ordenação       |
| `idx_order_items_order_id` | `order_items.order_id` | Joins de itens por pedido          |

---

## Testes Automatizados

O projeto possui **50 testes automatizados** com cobertura de todas as camadas. Execute com:

```bash
mvn test
```

### Distribuição dos testes

| Classe de teste                | Tipo          | Quantidade | Cobertura                                  |
| ------------------------------ | ------------- | ---------- | ------------------------------------------ |
| `OrderServiceApplicationTests` | Integração    | 1          | Inicialização do contexto Spring completo  |
| `OrderServiceTest`             | Unitário      | 19         | Toda a lógica de negócio de `OrderService` |
| `OrderControllerTest`          | Web (MockMvc) | 14         | Todos os endpoints REST e seus status HTTP |
| `OrderTest`                    | Unitário      | 16         | Métodos de domínio da entidade `Order`     |
| **Total**                      |               | **50**     |                                            |

---

### `OrderServiceTest` (19 testes)

Utiliza `@ExtendWith(MockitoExtension.class)` com mocks de `OrderRepository`, `CouponRepository`, `CouponUsageRepository` e `OrderEventPublisher`.

| Cenário                                      | Resultado esperado                                  |
| -------------------------------------------- | --------------------------------------------------- |
| Criar pedido válido                          | Pedido salvo, evento publicado                      |
| Criar pedido com valor abaixo de R$ 10,00    | `MinimumOrderValueException`                        |
| Criar pedido com cupom válido                | Desconto aplicado corretamente                      |
| Criar pedido com cupom não encontrado        | `InvalidCouponException`                            |
| Criar pedido com cupom expirado              | `InvalidCouponException`                            |
| Criar pedido com cupom single-use já usado   | `InvalidCouponException`                            |
| Criar pedido com cupom já usado pelo cliente | `InvalidCouponException`                            |
| Cancelar pedido PENDENTE dentro da janela    | Status → CANCELADO, evento publicado                |
| Cancelar pedido inexistente                  | `OrderNotFoundException`                            |
| Cancelar pedido com status não cancelável    | `CancellationNotAllowedException`                   |
| Cancelar pedido fora da janela de 30 minutos | `CancellationNotAllowedException`                   |
| Buscar pedido por ID existente               | `Optional` com o pedido                             |
| Buscar pedido por ID inexistente             | `Optional.empty()`                                  |
| Listar todos os pedidos                      | Lista completa do repositório                       |
| Excluir pedido existente                     | `orderRepository.delete()` chamado                  |
| Excluir pedido inexistente                   | `OrderNotFoundException`                            |
| Histórico sem filtros                        | Roteado para `findByCustomerIdOrderByCreatedAtDesc` |
| Histórico com status                         | Roteado para `findByCustomerIdAndStatus...`         |
| Histórico com status e datas                 | Roteado para `findByFilters`                        |
| Histórico com datas sem status               | Roteado para `findByCustomerIdAndDateRange`         |

---

### `OrderControllerTest` (14 testes)

Utiliza `@WebMvcTest(OrderController.class)` com `MockMvc` e `@MockitoBean` para `OrderService`.

| Endpoint                               | Cenário                    | HTTP esperado |
| -------------------------------------- | -------------------------- | ------------- |
| `POST /api/orders`                     | Body válido                | 201           |
| `POST /api/orders`                     | `customerId` ausente       | 400           |
| `POST /api/orders`                     | `items` vazio              | 400           |
| `POST /api/orders`                     | `shippingCost` ausente     | 400           |
| `GET /api/orders`                      | Lista com pedidos          | 200           |
| `GET /api/orders`                      | Lista vazia                | 200           |
| `GET /api/orders/{id}`                 | ID existente               | 200           |
| `GET /api/orders/{id}`                 | ID inexistente             | 404           |
| `DELETE /api/orders/{id}`              | ID existente               | 204           |
| `DELETE /api/orders/{id}`              | ID inexistente             | 404           |
| `POST /api/orders/{id}/cancel`         | Cancelamento válido        | 204           |
| `POST /api/orders/{id}/cancel`         | Pedido não encontrado      | 404           |
| `POST /api/orders/{id}/cancel`         | Cancelamento não permitido | 422           |
| `GET /api/orders/history/{customerId}` | Com e sem filtros          | 200           |

---

### `OrderTest` (16 testes)

Testes puramente unitários da entidade `Order`, sem Spring Context.

| Grupo                        | Cenário                                               |
| ---------------------------- | ----------------------------------------------------- |
| `isCancellable`              | PENDENTE → true                                       |
|                              | RESERVADO → true                                      |
|                              | PAGO → false                                          |
|                              | DESPACHADO → false                                    |
|                              | ENTREGUE → false                                      |
|                              | CANCELADO → false                                     |
| `isWithinCancellationWindow` | createdAt há 10 min → true                            |
|                              | createdAt há 31 min → false                           |
|                              | createdAt nulo → false                                |
| `calculateItemsTotal`        | Múltiplos itens com quantidades diferentes            |
|                              | Lista de itens vazia → BigDecimal.ZERO                |
| `calculateFinalAmount`       | `itemsTotal − discount + shippingCost`                |
| `addItem`                    | Item adicionado à lista e referência `order` definida |

---

### Configuração de testes

Em ambiente de teste (`@ActiveProfiles("test")`):

- **Banco de dados**: H2 em memória (`jdbc:h2:mem:testdb`) com `ddl-auto=create-drop`
- **Flyway**: desabilitado (`spring.flyway.enabled=false`)
- **RabbitMQ**: `RabbitTemplate` substituído por `@MockitoBean` nos testes de integração, evitando conexão real com o broker

---

## Configuração e Execução

### Variáveis de ambiente (`.env.order-service`)

| Variável            | Descrição                      |
| ------------------- | ------------------------------ |
| `POSTGRES_URL`      | Nome do banco PostgreSQL       |
| `POSTGRES_USER`     | Usuário do banco               |
| `POSTGRES_PASSWORD` | Senha do banco                 |
| `RABBITMQ_HOST`     | Host do broker RabbitMQ        |
| `RABBITMQ_PORT`     | Porta do broker (padrão: 5672) |
| `RABBITMQ_USERNAME` | Usuário do RabbitMQ            |
| `RABBITMQ_PASSWORD` | Senha do RabbitMQ              |

### Executar com Docker Compose

```bash
docker compose --env-file .env.order-service up order-service db-order rabbitmq --build
```

O serviço aguarda `db-order` e `rabbitmq` passarem nos healthchecks antes de iniciar (`depends_on` com `condition: service_healthy`).

### Executar localmente (desenvolvimento)

```bash
cd order-service
mvn spring-boot:run
```

### Executar testes

```bash
cd order-service
mvn test
```

### Build da imagem Docker

O `Dockerfile` utiliza **multi-stage build**:

1. **Stage `builder`** (`maven:3.9-eclipse-temurin-17-alpine`): baixa dependências offline e empacota o JAR com `-DskipTests`
2. **Stage `runtime`** (`eclipse-temurin:17-jre-alpine`): imagem mínima que executa apenas o JAR gerado

A porta exposta é `8080`.

---

## Stack Tecnológica

| Tecnologia              | Versão     | Finalidade                                 |
| ----------------------- | ---------- | ------------------------------------------ |
| Java                    | 17         | Linguagem principal                        |
| Spring Boot             | 3.5.0      | Framework de aplicação                     |
| Spring Data JPA         | (Boot 3.5) | Persistência e repositórios                |
| Spring AMQP             | (Boot 3.5) | Integração com RabbitMQ                    |
| Spring Validation       | (Boot 3.5) | Validação de DTOs com Bean Validation      |
| Spring Actuator         | (Boot 3.5) | Endpoints de health/métricas               |
| Hibernate               | 6.6.x      | ORM (incluso via Spring Data JPA)          |
| Flyway                  | (Boot 3.5) | Migrations de banco de dados               |
| PostgreSQL              | 16         | Banco de dados de produção                 |
| H2                      | (Boot 3.5) | Banco em memória para testes               |
| RabbitMQ                | 3          | Broker de mensagens assíncronas            |
| Lombok                  | (Boot 3.5) | Redução de boilerplate (getters, builders) |
| JUnit 5                 | (Boot 3.5) | Framework de testes                        |
| Mockito                 | (Boot 3.5) | Mocks em testes unitários                  |
| AssertJ                 | (Boot 3.5) | Asserções fluentes nos testes              |
| Maven                   | 3.9        | Gerenciamento de build e dependências      |
| Docker / Docker Compose | —          | Containerização e orquestração local       |
| Nginx                   | alpine     | API Gateway reverso                        |
