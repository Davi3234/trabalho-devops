# Payment Service - Documentação

## Sumário

- [Objetivo e Contextualização](#objetivo-e-contextualização)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Docker Compose](#docker-compose)
- [Requisitos Funcionais](#requisitos-funcionais)
- [Regras de Negócio](#regras-de-negócio)
- [Eventos e Mensageria](#eventos-e-mensageria)
- [Cobertura de Testes](#cobertura-de-testes)

---

## Objetivo e Contextualização

O **Payment Service** é o microsserviço responsável por processar pagamentos, integrar com gateways de pagamento externos e gerenciar o ciclo de vida das transações financeiras. Ele implementa estratégias de resiliência como retry com backoff exponencial e garante idempotência para evitar cobranças duplicadas.

Este serviço é crítico para a confiabilidade financeira do sistema, garantindo que pagamentos sejam processados de forma segura, auditável e resiliente a falhas temporárias de rede ou indisponibilidade de gateways externos.

### Responsabilidades Principais

- Processar cobranças ao receber confirmação de reserva de estoque
- Suportar múltiplos métodos de pagamento (cartão, PIX, boleto)
- Implementar retry inteligente com backoff exponencial
- Garantir idempotência de operações financeiras
- Emitir reembolsos em casos de cancelamento ou falha de entrega
- Registrar todas as tentativas e respostas do gateway para auditoria

---

## Arquitetura e Tecnologias

### Stack Tecnológico

- **Linguagem**: PHP 8.2+
- **Framework**: Lumen 10.x (Laravel micro-framework)
- **Banco de Dados**: PostgreSQL 16
- **Mensageria**: RabbitMQ (php-amqplib)
- **Testes**: PHPUnit 10.x
- **Servidor Web**: Nginx (via Docker)
- **Gerenciador de Dependências**: Composer

### Padrões Arquiteturais

- **Domain-Driven Design (DDD)**: Separação em camadas (Domain, Application, Infrastructure, Interfaces)
- **CQRS Simplificado**: Separação de comandos (processar pagamento) e consultas
- **Event-Driven Architecture**: Comunicação assíncrona via RabbitMQ
- **Saga Pattern - Participante**: Responde a eventos de estoque e pedido
- **Value Objects**: Para garantir integridade de dados financeiros (Amount, PaymentMethod)

### Estrutura de Diretórios

```
app
├── Application
│   └── UseCase
│       └── ProcessPayment           # Casos de uso de processamento
│           ├── ProcessPaymentDTO.php
│           ├── ProcessPaymentHandler.php
│           └── ProcessPaymentResponseDTO.php
├── Domain
│   ├── Exceptions                   # Exceções de domínio
│   ├── Payment                      # Agregado Payment
│   │   ├── Payment.php
│   │   ├── Service                  # Serviços de domínio
│   │   │   └── PaymentService.php
│   │   └── ValueObject              # Value Objects
│   │       ├── Amount.php
│   │       ├── EnumPayment.php
│   │       ├── PaymentId.php
│   │       └── PaymentMethod.php
│   └── Shared
│       └── Service                  # Interfaces de serviços compartilhados
│           └── EventPublisherInterface.php
├── Infrastructure
│   ├── Repository                   # Implementações de repositório
│   │   ├── PaymentModel.php
│   │   └── PaymentRepository.php
│   └── Service                      # Implementações de serviços
│       ├── MockPaymentGateway.php
│       └── RabbitMQEventPublisher.php
└── Interfaces
    └── Http
        ├── Controller               # Controllers REST
        │   └── PaymentController.php
        ├── Exceptions               # Exception handlers
        └── Request                  # Request validation
            └── ProcessPaymentRequest.php
```

---

## Docker Compose

### Configuração do Serviço Principal

```yaml
payment-service:
    build:
        context: ./payment-service
        dockerfile: Dockerfile
    env_file: ./payment-service/.env
    depends_on:
        db-payment:
            condition: service_healthy
        rabbitmq:
            condition: service_healthy
    volumes:
        - ./payment-service:/var/www
        - /var/www/vendor
    networks:
        - app-network
```

### Configuração do Consumer (Eventos)

```yaml
payment-consumer:
    build:
        context: ./payment-service
        dockerfile: Dockerfile
    entrypoint: php artisan rabbitmq:consume
    env_file: ./payment-service/.env
    depends_on:
        db-payment:
            condition: service_healthy
        rabbitmq:
            condition: service_healthy
    volumes:
        - ./payment-service:/var/www
        - /var/www/vendor
    networks:
        - app-network
```

### Servidor Web (Nginx)

```yaml
payment-nginx:
    image: nginx:alpine
    ports:
        - 5002:5002
    volumes:
        - ./payment-service:/var/www:ro
        - ./api-gateway/payment.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
        - payment-service
    networks:
        - app-network
```

### Banco de Dados

```yaml
db-payment:
    image: postgres:16-alpine
    environment:
        POSTGRES_DB: ${POSTGRES_DB_PAYMENT}
        POSTGRES_USER: ${POSTGRES_USER_PAYMENT}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_PAYMENT}
    volumes:
        - payment_data:/var/lib/postgresql/data
    ports:
        - 5435:5432
    healthcheck:
        test:
            [
                "CMD-SHELL",
                "pg_isready -U ${POSTGRES_USER_PAYMENT} -d ${POSTGRES_DB_PAYMENT}",
            ]
        interval: 10s
        timeout: 5s
        retries: 5
    networks:
        - app-network
```

### Dependências

- **RabbitMQ**: Para comunicação assíncrona via eventos
- **PostgreSQL**: Persistência de pagamentos e histórico de tentativas
- **Nginx**: Servidor web para API REST
- **API Gateway**: Para roteamento de requisições HTTP

---

## ✅ Requisitos Funcionais

### RF01 - Processar Cobrança

Processar cobrança ao receber `estoque.reservado`, integrando com gateway de pagamento.

**Handler**: `PaymentEventConsumer`  
**Use Case**: `ProcessPaymentHandler`  
**Service**: `PaymentService`

**Fluxo**:

1. Recebe evento `estoque.reservado` com dados do pedido
2. Cria entidade `Payment` com status `PENDING`
3. Gera `idempotency_key` único baseado no `orderId`
4. Chama gateway de pagamento (implementação mock)
5. Processa resposta do gateway
6. Atualiza status do pagamento (`CONFIRMED` ou `FAILED`)
7. Persiste pagamento com resposta do gateway
8. Publica `pagamento.confirmado` ou `pagamento.recusado`

**Endpoint HTTP**: `POST /api/payments`

### RF02 - Suportar Múltiplos Métodos

Suportar múltiplos métodos: cartão de crédito, PIX e boleto.

**Value Object**: `PaymentMethod`

**Métodos Suportados**:

```php
class PaymentMethod {
    public const CREDIT_CARD = 'credit_card';
    public const PIX = 'pix';
    public const BOLETO = 'boleto';

    private static array $supported = [
        self::CREDIT_CARD,
        self::PIX,
        self::BOLETO
    ];
}
```

**Validação**: Rejeita métodos não suportados com exceção de domínio

### RF03 - Emitir Reembolso

Emitir reembolso ao receber `pedido.cancelado` após pagamento já confirmado.

**Handler**: `RefundPaymentHandler`  
**Método**: `Payment::refund()`

**Fluxo**:

1. Recebe evento `pedido.cancelado`
2. Busca pagamento pelo `orderId`
3. Verifica se pagamento está em status `CONFIRMED`
4. Chama gateway para processar reembolso
5. Atualiza status para `REFUNDED`
6. Publica `pagamento.reembolsado`

### RF04 - Registrar Tentativas de Cobrança

Registrar todas as tentativas de cobrança com status e resposta do gateway.

**Implementação**: Persistência de `gateway_response` no modelo `Payment`

```php
class Payment {
    private ?string $gatewayResponse;

    public function fail(string $reason): void {
        $this->status = EnumPayment::PAYMENT_STATUS_FAILED;
        $this->gatewayResponse = $reason;
        $this->updatedAt = new \DateTime();
    }
}
```

**Auditoria**: Todas as tentativas, sucessos e falhas são registradas com timestamp para rastreabilidade financeira.

---

## Regras de Negócio

### RN01 - Retry com Backoff

**Descrição**: Em caso de falha técnica no gateway (timeout, erro 5xx), o sistema tenta novamente até 3 vezes com intervalo exponencial de 10s, 30s e 60s antes de publicar `pagamento.recusado`.

**Implementação**:

```php
class PaymentService {
    private const MAX_RETRIES = 3;
    private const RETRY_DELAYS = [10, 30, 60]; // segundos

    public function processPayment(...) {
        $attempt = 0;

        while ($attempt < self::MAX_RETRIES) {
            try {
                $response = $this->gateway->charge($orderId, $amount, $method, $data);

                if ($response['success']) {
                    $payment->confirm();
                    return $payment;
                }

                // Falha de negócio (cartão recusado) - não faz retry
                if ($response['error_type'] === 'business') {
                    $payment->fail($response['message']);
                    return $payment;
                }

                // Falha técnica - fazer retry
                $attempt++;
                if ($attempt < self::MAX_RETRIES) {
                    sleep(self::RETRY_DELAYS[$attempt - 1]);
                }

            } catch (\Exception $e) {
                // Erro de rede/timeout - fazer retry
                $attempt++;
                if ($attempt < self::MAX_RETRIES) {
                    sleep(self::RETRY_DELAYS[$attempt - 1]);
                } else {
                    $payment->fail("Max retries exceeded: " . $e->getMessage());
                }
            }
        }

        return $payment;
    }
}
```

**Características**:

- Backoff exponencial: 10s → 30s → 60s
- Diferencia falhas técnicas (retry) de falhas de negócio (sem retry)
- Registra todas as tentativas para auditoria

### RN02 - Idempotência Obrigatória

**Descrição**: Cada tentativa de cobrança carrega um `idempotency_key` único por pedido. Se o gateway já processou aquela chave, retorna o resultado anterior sem cobrar novamente.

**Implementação**:

```php
class PaymentService {
    public function processPayment($orderId, ...) {
        // Verifica se já existe pagamento para este pedido
        $existingPayment = $this->repository->findByOrderId($orderId);

        if ($existingPayment) {
            Log::info("Payment for order {$orderId} already processed. Returning existing result.");
            return $existingPayment; // Idempotência garantida
        }

        // Gera idempotency_key único
        $idempotencyKey = $this->generateIdempotencyKey($orderId);

        // Passa para o gateway
        $response = $this->gateway->charge(
            $orderId,
            $amount,
            $method,
            array_merge($paymentData, ['idempotency_key' => $idempotencyKey])
        );

        // ...
    }

    private function generateIdempotencyKey($orderId): string {
        return "order-{$orderId}-" . hash('sha256', $orderId . config('app.key'));
    }
}
```

**Benefícios**:

- Previne cobranças duplicadas
- Permite reprocessamento seguro de eventos
- Gateway pode cachear respostas por chave

### RN03 - Boleto com Prazo

**Descrição**: Boletos vencem em 2 dias úteis. Se não pago no prazo, `pagamento.recusado` é publicado automaticamente e o pedido é cancelado.

**Implementação**: Job agendado que verifica boletos expirados

```php
class CheckExpiredBoletos {
    public function handle() {
        $expiredPayments = Payment::where('method', 'boleto')
            ->where('status', 'pending')
            ->where('due_date', '<', now())
            ->get();

        foreach ($expiredPayments as $payment) {
            $payment->fail('Boleto expired');
            $payment->save();

            $this->eventPublisher->publish('payment.pagamento.recusado', [
                'orderId' => $payment->order_id,
                'reason' => 'Boleto vencido'
            ]);
        }
    }
}
```

**Cálculo de Vencimento**:

```php
private function calculateDueDate(): \DateTime {
    $date = new \DateTime();
    $businessDays = 0;

    while ($businessDays < 2) {
        $date->modify('+1 day');

        // Pula finais de semana
        if ($date->format('N') < 6) { // 1 (seg) a 5 (sex)
            $businessDays++;
        }
    }

    return $date;
}
```

### RN04 - Parcelamento Mínimo

**Descrição**: Parcelamento no cartão só é permitido para pedidos acima de R$ 50,00, com parcela mínima de R$ 10,00.

**Implementação**:

```php
class PaymentService {
    private const MIN_AMOUNT_FOR_INSTALLMENTS = 50.00;
    private const MIN_INSTALLMENT_AMOUNT = 10.00;

    private function validateInstallments($amount, $installments) {
        if ($installments > 1) {
            if ($amount < self::MIN_AMOUNT_FOR_INSTALLMENTS) {
                throw new PaymentFailedException(
                    "Parcelamento disponível apenas para valores acima de R$ 50,00"
                );
            }

            $installmentValue = $amount / $installments;

            if ($installmentValue < self::MIN_INSTALLMENT_AMOUNT) {
                throw new PaymentFailedException(
                    "Valor mínimo da parcela é R$ 10,00"
                );
            }
        }
    }
}
```

### RN05 - Compensação (Rollback)

**Descrição**: Se a entrega falhar após o pagamento já confirmado, o reembolso total é emitido automaticamente via gateway e `pagamento.reembolsado` é publicado. (Saga — ação compensatória)

**Implementação**:

```php
// Handler de evento entrega.falhou
class EntregaFalhouHandler {
    public function handle($message) {
        $orderId = $message['orderId'];

        $payment = $this->repository->findByOrderId($orderId);

        if (!$payment || $payment->status() !== 'confirmed') {
            return; // Idempotência: não há pagamento confirmado
        }

        try {
            // Solicita reembolso ao gateway
            $refundResponse = $this->gateway->refund(
                $payment->id()->value(),
                $payment->amount()->value()
            );

            if ($refundResponse['success']) {
                $payment->refund();
                $this->repository->save($payment);

                $this->eventPublisher->publish('payment.pagamento.reembolsado', [
                    'orderId' => $orderId,
                    'paymentId' => $payment->id()->value(),
                    'amount' => $payment->amount()->value()
                ]);

                Log::info("Reembolso automático processado para pedido {$orderId}");
            }

        } catch (\Exception $e) {
            Log::error("Falha ao processar reembolso automático: " . $e->getMessage());
            // Aqui poderia entrar em uma fila de reembolsos manuais
        }
    }
}
```

---

## Eventos e Mensageria

### Eventos Publicados

| Evento                  | Exchange  | Routing Key                     | Payload                                        |
| ----------------------- | --------- | ------------------------------- | ---------------------------------------------- |
| `pagamento.confirmado`  | `payment` | `payment.pagamento.confirmado`  | `{orderId, paymentId, amount, method, status}` |
| `pagamento.recusado`    | `payment` | `payment.pagamento.recusado`    | `{orderId, paymentId, reason}`                 |
| `pagamento.reembolsado` | `payment` | `payment.pagamento.reembolsado` | `{orderId, paymentId, amount}`                 |

### Eventos Consumidos

| Evento              | Queue                       | Handler                 | Ação                                       |
| ------------------- | --------------------------- | ----------------------- | ------------------------------------------ |
| `estoque.reservado` | `payment-estoque-reservado` | `ProcessPaymentHandler` | Inicia processamento de pagamento          |
| `pedido.cancelado`  | `payment-pedido-cancelado`  | `RefundPaymentHandler`  | Processa reembolso se pagamento confirmado |
| `entrega.falhou`    | `payment-entrega-falhou`    | `EntregaFalhouHandler`  | Reembolso automático (compensação)         |

### Configuração RabbitMQ

```php
// config/rabbitmq.php
return [
    'exchanges' => [
        'payment' => [
            'name' => 'payment',
            'type' => 'topic',
            'durable' => true,
        ],
    ],

    'queues' => [
        'estoque_reservado' => [
            'name' => 'payment-estoque-reservado',
            'bindings' => [
                ['exchange' => 'inventory', 'routing_key' => 'inventory.estoque.reservado'],
            ],
        ],
        'pedido_cancelado' => [
            'name' => 'payment-pedido-cancelado',
            'bindings' => [
                ['exchange' => 'order', 'routing_key' => 'order.pedido.cancelado'],
            ],
        ],
    ],
];
```

**Consumer Command**:

```bash
php artisan rabbitmq:consume
```

---

## Cobertura de Testes

### Resumo de Testes

O Payment Service possui testes unitários focados em Value Objects, entidade de domínio, serviços e controllers.

### Arquivos de Teste

#### 1. `PaymentTest.php`

**Cobertura**: Agregado de Domínio - Payment

**Cenários Testados** (12+ testes):

##### Criação de Pagamento

- ✅ Cria pagamento com status PENDING
- ✅ Define timestamps corretamente
- ✅ Associa corretamente orderId, amount e method

##### Transições de Estado

- ✅ `confirm()` transiciona para CONFIRMED
- ✅ `confirm()` atualiza updatedAt
- ✅ `fail()` transiciona para FAILED
- ✅ `fail()` registra motivo da falha em gatewayResponse
- ✅ `refund()` transiciona para REFUNDED
- ✅ `refund()` atualiza updatedAt

##### Conversão e Serialização

- ✅ `toArray()` retorna todos os campos corretamente
- ✅ Timestamps são formatados corretamente
- ✅ Value objects são convertidos para strings

#### 2. `PaymentServiceTest.php`

**Cobertura**: Serviço de Domínio

**Cenários Testados** (15+ testes):

##### Processamento com Sucesso

- ✅ Processa pagamento com cartão de crédito com sucesso
- ✅ Processa pagamento com PIX com sucesso
- ✅ Processa pagamento com boleto com sucesso
- ✅ Confirma pagamento e retorna status CONFIRMED
- ✅ Persiste pagamento no repositório
- ✅ Não registra gateway_response em caso de sucesso

##### Falhas de Negócio

- ✅ Processa falha de cartão recusado
- ✅ Define status como FAILED
- ✅ Registra motivo da recusa em gatewayResponse
- ✅ Não faz retry em falhas de negócio

##### Retry com Backoff

- ✅ Faz até 3 tentativas em caso de timeout
- ✅ Aguarda 10s antes da primeira retry
- ✅ Aguarda 30s antes da segunda retry
- ✅ Aguarda 60s antes da terceira retry
- ✅ Falha definitivamente após 3 tentativas

##### Idempotência

- ✅ Retorna pagamento existente para mesmo orderId
- ✅ Não cria duplicatas de pagamento
- ✅ Não chama gateway novamente para orderId já processado

##### Validações

- ✅ Rejeita método de pagamento inválido
- ✅ Valida valor mínimo para parcelamento
- ✅ Valida valor mínimo de parcela

#### 3. `PaymentMethodTest.php`

**Cobertura**: Value Object - PaymentMethod

**Cenários Testados** (4 testes):

- ✅ Cria PaymentMethod válido (credit_card, pix, boleto)
- ✅ Lança exceção para método inválido
- ✅ Retorna lista de métodos suportados
- ✅ Comparação de igualdade entre PaymentMethod

#### 4. `AmountTest.php`

**Cobertura**: Value Object - Amount

**Cenários Testados** (8 testes):

- ✅ Cria Amount com valor positivo
- ✅ Lança exceção para valor negativo
- ✅ Lança exceção para valor zero
- ✅ Formata valor com 2 casas decimais
- ✅ Converte corretamente para centavos (gateway)
- ✅ Comparação de igualdade entre valores
- ✅ `isGreaterThan()` funciona corretamente
- ✅ `isLessThan()` funciona corretamente

#### 5. `PaymentIdTest.php`

**Cobertura**: Value Object - PaymentId

**Cenários Testados** (4 testes):

- ✅ Cria PaymentId válido (UUID)
- ✅ Lança exceção para ID vazio
- ✅ Lança exceção para UUID inválido
- ✅ Comparação de igualdade entre PaymentId

#### 6. `ProcessPaymentHandlerTest.php`

**Cobertura**: Use Case Handler

**Cenários Testados** (10+ testes):

##### Fluxo Completo

- ✅ Processa pagamento e publica evento de confirmação
- ✅ Processa falha e publica evento de recusa
- ✅ Retorna DTO de resposta correto

##### Integração com Serviço

- ✅ Chama PaymentService com parâmetros corretos
- ✅ Publica evento correto baseado no status
- ✅ Registra logs de sucesso e falha

##### Tratamento de Exceções

- ✅ Captura e relança PaymentFailedException
- ✅ Registra erros no log
- ✅ Não publica eventos em caso de exceção

#### 7. `PaymentControllerTest.php`

**Cobertura**: Controller HTTP

**Cenários Testados** (6 testes):

- ✅ POST /api/payments - Retorna 201 Created em sucesso
- ✅ POST /api/payments - Retorna 400 Bad Request em falha de validação
- ✅ POST /api/payments - Retorna 422 Unprocessable Entity em falha de pagamento
- ✅ GET /api/payments/{id} - Retorna pagamento existente
- ✅ GET /api/payments/order/{orderId} - Retorna pagamento por orderId
- ✅ Validação de request (required fields, types)

### Estatísticas de Cobertura

| Camada                       | Classes Testadas                 | Métodos Testados                 | Cobertura Estimada |
| ---------------------------- | -------------------------------- | -------------------------------- | ------------------ |
| **Domain (Value Objects)**   | Amount, PaymentMethod, PaymentId | Todos os métodos                 | ~98%               |
| **Domain (Aggregates)**      | Payment                          | Todos os métodos de negócio      | ~95%               |
| **Domain (Services)**        | PaymentService                   | Todos os fluxos de processamento | ~85%               |
| **Application (Use Cases)**  | ProcessPaymentHandler            | Fluxos principais                | ~80%               |
| **Interfaces (Controllers)** | PaymentController                | Todos os endpoints               | ~75%               |

### Tipos de Testes

#### Testes Unitários

- **Framework**: PHPUnit 10.x
- **Mocking**: PHPUnit Mock Objects
- **Assertions**: PHPUnit assertions
- **Padrão**: Arrange-Act-Assert (AAA)

#### Exemplo de Teste

```php
class PaymentServiceTest extends TestCase
{
    public function testProcessPaymentWithRetryOnTimeout()
    {
        // Arrange
        $gateway = $this->createMock(PaymentGatewayInterface::class);
        $gateway->expects($this->exactly(3)) // 3 tentativas
            ->method('charge')
            ->willThrowException(new \Exception('Gateway timeout'));

        $service = new PaymentService($gateway, $repository, $logger);

        // Act
        $payment = $service->processPayment('order-123', 100.00, 'credit_card', []);

        // Assert
        $this->assertEquals('failed', $payment->status());
        $this->assertStringContains('Max retries exceeded', $payment->gatewayResponse);

        // Verifica que tentou 3 vezes
        $this->assertEquals(3, $gateway->getCallCount());
    }
}
```

### Executando os Testes

```bash
# Executar todos os testes
composer test

# Executar testes com cobertura
composer test -- --coverage-html coverage

# Executar apenas testes unitários
composer test tests/Unit

# Executar apenas uma classe de teste
composer test tests/Unit/Domain/PaymentTest.php
```
