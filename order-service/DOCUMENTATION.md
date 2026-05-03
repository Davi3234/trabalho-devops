# Order Service - Documentação

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

O **Order Service** é o microsserviço central do sistema de e-commerce, responsável por gerenciar todo o ciclo de vida dos pedidos. Ele atua como orquestrador da saga distribuída, coordenando as interações entre os serviços de estoque (Inventory), pagamento (Payment) e entrega (Delivery).

Este serviço implementa o padrão **Saga** para garantir a consistência eventual entre os microsserviços, publicando eventos e consumindo respostas de outros serviços para transicionar o estado do pedido através de seu ciclo de vida completo.

### Responsabilidades Principais

- Criação e validação de pedidos
- Gerenciamento de estado do pedido (máquina de estados)
- Aplicação de cupons de desconto
- Controle de cancelamento dentro da janela permitida
- Timeout automático de reservas não confirmadas
- Histórico de pedidos por cliente com filtros

---

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológico

- **Linguagem**: Java 17
- **Framework**: Spring Boot 3.x
- **Banco de Dados**: PostgreSQL 16
- **Mensageria**: RabbitMQ
- **Build**: Maven
- **Testes**: JUnit 5, Mockito, AssertJ

### Padrões Arquiteturais

- **Domain-Driven Design (DDD)**: Separação em camadas (Domain, Application, Infrastructure, API)
- **Saga Pattern**: Orquestração de transações distribuídas com eventos
- **Event-Driven Architecture**: Comunicação assíncrona via RabbitMQ
- **Repository Pattern**: Abstração de acesso a dados

### Estrutura de Pacotes

```
com.devops.order_service
├── api.controller          # Controllers REST
├── application
│   ├── dto                # Data Transfer Objects
│   ├── exception          # Exceções de negócio
│   └── service            # Serviços de aplicação
├── domain
│   ├── entity             # Entidades de domínio (Order, OrderItem, Coupon)
│   └── repository         # Interfaces de repositório
└── infrastructure
    ├── config             # Configurações (RabbitMQ, Scheduling)
    ├── messaging          # Publishers e Listeners de eventos
    └── scheduler          # Jobs agendados (timeout de reserva)
```

---

## 🐳 Docker Compose

### Configuração do Serviço

```yaml
order-service:
  build:
    context: ./order-service
  env_file:
    - ./order-service/.env
  ports:
    - 8080:8080
  depends_on:
    db-order:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  networks:
    - app-network
```

### Banco de Dados

```yaml
db-order:
  image: postgres:16-alpine
  restart: always
  environment:
    POSTGRES_DB: ${POSTGRES_DB_ORDER}
    POSTGRES_USER: ${POSTGRES_USER_ORDER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_ORDER}
  ports:
    - 5433:5432
  volumes:
    - order_data:/var/lib/postgresql/data
  healthcheck:
    test:
      [
        "CMD-SHELL",
        "pg_isready -U ${POSTGRES_USER_ORDER} -d ${POSTGRES_DB_ORDER}",
      ]
    interval: 10s
    timeout: 5s
    retries: 5
  networks:
    - app-network
```

### Dependências

- **RabbitMQ**: Para comunicação assíncrona via eventos
- **PostgreSQL**: Persistência de pedidos, cupons e uso de cupons
- **API Gateway**: Para roteamento de requisições HTTP

---

## ✅ Requisitos Funcionais

### RF01 - Criar Pedido

Criar pedido a partir do carrinho do cliente, validando itens e quantidades.

**Endpoint**: `POST /api/orders`

**Implementação**:

- Validação de valor mínimo (R$ 10,00 excluindo frete)
- Aplicação opcional de cupom de desconto
- Cálculo de valor total (itens - desconto + frete)
- Publicação do evento `pedido.criado`

### RF02 - Gerenciar Estado do Pedido

Gerenciar transições de estado: `PENDENTE → RESERVADO → PAGO → DESPACHADO → ENTREGUE → CANCELADO`

**Serviço**: `OrderStateService`

**Fluxo de Transições**:

1. **PENDENTE**: Estado inicial após criação
2. **RESERVADO**: Após receber `estoque.reservado`
3. **PAGO**: Após receber `pagamento.confirmado`
4. **DESPACHADO**: Após receber `entrega.despachada`
5. **CANCELADO**: Por ação do cliente ou timeout/falha

### RF03 - Aplicar Cupons de Desconto

Aplicar cupons de desconto e calcular valor final com frete.

**Validações**:

- Cupom existe e não está expirado
- Cupom de uso único não foi utilizado
- Cliente não utilizou o cupom anteriormente
- Desconto aplicado sobre valor dos itens (não inclui frete)

### RF04 - Cancelamento pelo Cliente

Permitir cancelamento pelo cliente enquanto pedido não foi despachado.

**Endpoint**: `DELETE /api/orders/{id}`

**Validações**:

- Status deve ser `PENDENTE` ou `RESERVADO`
- Dentro da janela de 30 minutos após criação
- Publica evento `pedido.cancelado` para compensação

### RF05 - Histórico de Pedidos

Expor histórico de pedidos por cliente com filtros por status e período.

**Endpoint**: `GET /api/orders/history?customerId={id}&status={status}&startDate={date}&endDate={date}`

**Filtros Disponíveis**:

- `customerId`: Obrigatório
- `status`: Opcional (PENDENTE, RESERVADO, PAGO, DESPACHADO, ENTREGUE, CANCELADO)
- `startDate` e `endDate`: Opcional (período de criação)

---

## 📐 Regras de Negócio

### RN01 - Pedido Mínimo

**Descrição**: Valor total dos itens deve ser de no mínimo R$ 10,00, excluindo frete, para o pedido ser aceito.

**Implementação**:

```java
private static final BigDecimal MINIMUM_ORDER_VALUE = new BigDecimal("10.00");

if (itemsTotal.compareTo(MINIMUM_ORDER_VALUE) < 0) {
    throw new MinimumOrderValueException();
}
```

### RN02 - Janela de Cancelamento

**Descrição**: Cliente pode cancelar o pedido em até 30 minutos após a criação ou enquanto o status for "pendente" ou "reservado". Após o despacho, cancelamento não é permitido.

**Implementação**:

```java
public boolean isCancellable() {
    return status == OrderStatus.PENDENTE || status == OrderStatus.RESERVADO;
}

public boolean isWithinCancellationWindow() {
    return createdAt != null && createdAt.plusMinutes(30).isAfter(LocalDateTime.now());
}
```

### RN03 - Timeout de Reserva

**Descrição**: Se o pagamento não for confirmado em 15 minutos após a reserva do estoque, o pedido é automaticamente cancelado e a compensação é disparada.

**Implementação**: `ReservationTimeoutScheduler` executa a cada 1 minuto, verificando pedidos com status `RESERVADO` que ultrapassaram 15 minutos desde a atualização.

```java
@Scheduled(fixedDelay = 60000) // 1 minuto
public void checkExpiredReservations() {
    LocalDateTime threshold = LocalDateTime.now().minusMinutes(TIMEOUT_MINUTES);
    List<Order> expiredOrders = orderRepository.findExpiredReservations(threshold);

    for (Order order : expiredOrders) {
        orderStateService.handleReservationTimeout(order.getId());
    }
}
```

### RN04 - Cupom por Cliente

**Descrição**: O mesmo cupom não pode ser aplicado mais de uma vez por cliente. Cupons com uso único são invalidados imediatamente após o pedido ser pago.

**Validações**:

```java
// Verifica se cupom de uso único já foi usado
if (coupon.isSingleUse() && coupon.isUsed()) {
    throw new InvalidCouponException("Cupom de uso único já foi utilizado.");
}

// Verifica se cliente já usou este cupom
boolean alreadyUsedByCustomer = couponUsageRepository
    .existsByCouponIdAndCustomerId(coupon.getId(), customerId);
if (alreadyUsedByCustomer) {
    throw new InvalidCouponException("Este cupom já foi utilizado por este cliente.");
}
```

### RN05 - Compensação (Rollback)

**Descrição**: Ao receber evento de falha de pagamento ou estoque, o pedido volta para "cancelado" e publica `pedido.cancelado` para que outros serviços compensem. (Saga — ação compensatória)

**Implementação**:

```java
@Transactional
public void handleStockReservationFailed(Long orderId) {
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new OrderNotFoundException(orderId));

    order.setStatus(OrderStatus.CANCELADO);
    orderRepository.save(order);

    eventPublisher.publishOrderCancelled(order);
    log.info("Pedido {} cancelado devido a falha na reserva de estoque", orderId);
}
```

---

## 📡 Eventos e Mensageria

### Eventos Publicados

| Evento             | Exchange | Routing Key              | Payload                                                |
| ------------------ | -------- | ------------------------ | ------------------------------------------------------ |
| `pedido.criado`    | `order`  | `order.pedido.criado`    | `{id, customerId, items[], totalAmount, shippingCost}` |
| `pedido.cancelado` | `order`  | `order.pedido.cancelado` | `{id, customerId, reason}`                             |

### Eventos Consumidos

| Evento                   | Queue                        | Handler                       | Ação                                   |
| ------------------------ | ---------------------------- | ----------------------------- | -------------------------------------- |
| `estoque.reservado`      | `order-estoque-aprovou`      | `handleEstoqueReservaAprovou` | Transição PENDENTE → RESERVADO         |
| `estoque.reserva_falhou` | `order-estoque-falhou`       | `handleEstoqueReservaFalhou`  | Transição para CANCELADO + compensação |
| `pagamento.confirmado`   | `order-pagamento-confirmado` | `handlePagamentoConfirmado`   | Transição RESERVADO → PAGO             |
| `pagamento.recusado`     | `order-pagamento-recusado`   | `handlePagamentoRecusado`     | Transição para CANCELADO + compensação |
| `entrega.despachada`     | `order-entrega-despachada`   | `handleEntregaDespachada`     | Transição PAGO → DESPACHADO            |

### Configuração RabbitMQ

```properties
# application.properties
rabbitmq.exchange.order=order
rabbitmq.exchange.inventory=inventory
rabbitmq.exchange.payment=payment
rabbitmq.exchange.delivery=delivery

rabbitmq.queues.estoque-reserva-aprovou=order-estoque-aprovou
rabbitmq.queues.estoque-reserva-falhou=order-estoque-falhou
rabbitmq.queues.pagamento-confirmado=order-pagamento-confirmado
rabbitmq.queues.pagamento-recusado=order-pagamento-recusado
rabbitmq.queues.entrega-despachada=order-entrega-despachada
```

---

## 🧪 Cobertura de Testes

### Resumo de Testes

O Order Service possui uma suíte abrangente de testes unitários cobrindo todas as camadas da aplicação.

### Arquivos de Teste

#### 1. `OrderServiceTest.java`

**Cobertura**: Service Layer (lógica de negócio)

**Cenários Testados** (20+ testes):

##### Criação de Pedidos

- ✅ Cria pedido com sucesso e publica evento
- ✅ Lança `MinimumOrderValueException` quando total dos itens < R$10
- ✅ Aplica desconto de cupom válido corretamente
- ✅ Lança `InvalidCouponException` quando cupom não encontrado
- ✅ Lança `InvalidCouponException` quando cupom expirado
- ✅ Lança `InvalidCouponException` quando cupom de uso único já foi usado
- ✅ Lança `InvalidCouponException` quando cliente já usou o cupom

##### Cancelamento de Pedidos

- ✅ Cancela pedido PENDENTE dentro da janela de 30 minutos
- ✅ Lança `OrderNotFoundException` quando pedido não existe
- ✅ Lança `CancellationNotAllowedException` quando status não é cancelável (ex: PAGO)
- ✅ Lança `CancellationNotAllowedException` quando janela de 30 min expirou

##### Consultas

- ✅ Retorna pedido quando encontrado por ID
- ✅ Retorna vazio quando pedido não encontrado
- ✅ Retorna todos os pedidos
- ✅ Deleta pedido existente
- ✅ Lança exceção ao deletar pedido inexistente

##### Histórico de Pedidos

- ✅ Retorna pedidos por cliente sem filtros
- ✅ Retorna pedidos por cliente e status
- ✅ Retorna pedidos por cliente e período
- ✅ Retorna pedidos com todos os filtros combinados

#### 2. `OrderTest.java`

**Cobertura**: Entidade de Domínio

**Cenários Testados** (14 testes):

##### Cálculos

- ✅ Calcula total de itens corretamente (soma de quantidade × preço unitário)
- ✅ Calcula valor final com desconto e frete
- ✅ Calcula valor final sem desconto
- ✅ Calcula valor final sem frete

##### Regras de Cancelamento

- ✅ Pedido PENDENTE é cancelável
- ✅ Pedido RESERVADO é cancelável
- ✅ Pedido PAGO não é cancelável
- ✅ Pedido DESPACHADO não é cancelável
- ✅ Pedido dentro da janela de 30 minutos é cancelável
- ✅ Pedido fora da janela de 30 minutos não é cancelável

##### Gerenciamento de Itens

- ✅ Adiciona item ao pedido corretamente
- ✅ Adiciona múltiplos itens ao pedido
- ✅ Remove item do pedido
- ✅ Atualiza quantidade de item existente

#### 3. `OrderControllerTest.java`

**Cobertura**: Controller Layer (API REST)

**Cenários Testados** (6 testes):

- ✅ POST /api/orders - Cria pedido com sucesso (201 Created)
- ✅ POST /api/orders - Retorna 400 Bad Request quando valor mínimo não atingido
- ✅ GET /api/orders/{id} - Retorna pedido existente (200 OK)
- ✅ GET /api/orders/{id} - Retorna 404 Not Found quando pedido não existe
- ✅ DELETE /api/orders/{id} - Cancela pedido com sucesso (204 No Content)
- ✅ GET /api/orders/history - Retorna histórico de pedidos do cliente

### Estatísticas de Cobertura

| Camada                     | Classes Testadas                | Métodos Testados             | Cobertura Estimada |
| -------------------------- | ------------------------------- | ---------------------------- | ------------------ |
| **Domain (Entities)**      | Order, OrderItem, Coupon        | Todos os métodos de negócio  | ~95%               |
| **Application (Services)** | OrderService, OrderStateService | Todos os casos de uso        | ~90%               |
| **API (Controllers)**      | OrderController                 | Todos os endpoints           | ~85%               |
| **Infrastructure**         | EventPublisher, EventListener   | Parcial (foco em integração) | ~60%               |

### Tipos de Testes

#### Testes Unitários

- **Framework**: JUnit 5
- **Mocking**: Mockito
- **Assertions**: AssertJ
- **Padrão**: Arrange-Act-Assert (AAA)

#### Exemplo de Teste

```java
@Test
@DisplayName("lança MinimumOrderValueException quando total dos itens < R$10")
void throwsWhenBelowMinimum() {
    CreateOrderRequest req = buildRequest(3.0, 1); // Total: R$ 3,00

    assertThatThrownBy(() -> orderService.createOrder(req))
            .isInstanceOf(MinimumOrderValueException.class);

    verifyNoInteractions(orderRepository, eventPublisher);
}
```

### Executando os Testes

```bash
# Executar todos os testes
mvn test

# Executar testes com relatório de cobertura
mvn test jacoco:report

# Executar apenas testes de uma classe específica
mvn test -Dtest=OrderServiceTest
```
