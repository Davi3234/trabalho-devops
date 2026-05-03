<?php

namespace Tests\Unit\Application\UseCase;

use App\Application\UseCase\ProcessPayment\ProcessPaymentDTO;
use App\Application\UseCase\ProcessPayment\ProcessPaymentHandler;
use App\Application\UseCase\ProcessPayment\ProcessPaymentResponseDTO;
use App\Domain\Exceptions\PaymentFailedException;
use App\Domain\Payment\Payment;
use App\Domain\Payment\Service\PaymentService;
use App\Domain\Shared\Service\EventPublisherInterface;
use PHPUnit\Framework\TestCase;

class ProcessPaymentHandlerTest extends TestCase{
    private ProcessPaymentHandler $handler;
    private PaymentService $service;
    private EventPublisherInterface $eventPublisher;

    protected function setUp(): void{
        $this->service = $this->createMock(PaymentService::class);
        $this->eventPublisher = $this->createMock(EventPublisherInterface::class);
        $this->handler = new ProcessPaymentHandler($this->service, $this->eventPublisher);
    }

    private function makePaymentMock(string $id, string $orderId, float $amount, string $method, string $status): Payment{
        $paymentId = $this->getMockBuilder(\App\Domain\Payment\ValueObject\PaymentId::class)
            ->disableOriginalConstructor()->getMock();
        $paymentId->method('value')->willReturn($id);

        $amountVO = $this->getMockBuilder(\App\Domain\Payment\ValueObject\Amount::class)
            ->disableOriginalConstructor()->getMock();
        $amountVO->method('value')->willReturn($amount);

        $methodVO = $this->getMockBuilder(\App\Domain\Payment\ValueObject\PaymentMethod::class)
            ->disableOriginalConstructor()->getMock();
        $methodVO->method('value')->willReturn($method);

        $payment = $this->createMock(Payment::class);
        $payment->method('id')->willReturn($paymentId);
        $payment->method('orderId')->willReturn($orderId);
        $payment->method('amount')->willReturn($amountVO);
        $payment->method('method')->willReturn($methodVO);
        $payment->method('status')->willReturn($status);

        return $payment;
    }

    public function testHandlerIsInstantiable(): void{
        $this->assertNotNull($this->handler);
        $this->assertInstanceOf(ProcessPaymentHandler::class, $this->handler);
    }

    public function testHandlerHasRequiredDependencies(): void{
        $this->assertTrue(method_exists($this->handler, 'handle'));
    }

    public function testHandleReturnsResponseDTOOnSuccess(): void{
        $payment = $this->makePaymentMock('pay_1', 'order_1', 100.00, 'credit_card', 'confirmed');

        $this->service->expects($this->once())
            ->method('processPayment')
            ->with('order_1', 100.00, 'credit_card', [])
            ->willReturn($payment);

        $this->eventPublisher->expects($this->once())
            ->method('publish')
            ->with('pagamento.confirmado', $this->arrayHasKey('order_id'));

        $dto = new ProcessPaymentDTO('order_1', 100.00, 'credit_card', []);
        $result = $this->handler->handle($dto);

        $this->assertInstanceOf(ProcessPaymentResponseDTO::class, $result);
        $this->assertEquals('pay_1', $result->toArray()['payment_id']);
        $this->assertEquals('order_1', $result->toArray()['order_id']);
        $this->assertEquals('confirmed', $result->toArray()['status']);
        $this->assertEquals(100.00, $result->toArray()['amount']);
        $this->assertEquals('credit_card', $result->toArray()['method']);
    }

    public function testHandlePublishesRecusadoEventWhenNotConfirmed(): void{
        $payment = $this->makePaymentMock('pay_2', 'order_2', 50.00, 'pix', 'refused');

        $this->service->method('processPayment')->willReturn($payment);

        $this->eventPublisher->expects($this->once())
            ->method('publish')
            ->with('pagamento.recusado', $this->arrayHasKey('payment_id'));

        $dto = new ProcessPaymentDTO('order_2', 50.00, 'pix', []);
        $result = $this->handler->handle($dto);

        $this->assertEquals('refused', $result->toArray()['status']);
    }
    public function testHandleRethrowsPaymentFailedException(): void{
        $this->expectException(PaymentFailedException::class);
        $this->expectExceptionMessage('Insufficient funds');

        $this->service->method('processPayment')
            ->willThrowException(new PaymentFailedException('Insufficient funds'));

        $this->eventPublisher->expects($this->never())->method('publish');

        $dto = new ProcessPaymentDTO('order_3', 100.00, 'credit_card', []);
        $this->handler->handle($dto);
    }
}
