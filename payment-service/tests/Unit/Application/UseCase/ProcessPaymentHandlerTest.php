<?php

namespace Tests\Unit\Application\UseCase;

use App\Application\UseCase\ProcessPayment\ProcessPaymentDTO;
use App\Application\UseCase\ProcessPayment\ProcessPaymentHandler;
use App\Application\UseCase\ProcessPayment\ProcessPaymentResponseDTO;
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

    public function testHandleSuccess(){
        $dto = new ProcessPaymentDTO('order_123', 100.00, 'credit_card', []);

        $paymentMock = $this->createMock(\App\Domain\Payment\Payment::class);
        $paymentMock->method('status')->willReturn('confirmed');
        $paymentMock->method('id')->willReturn($this->createMock(\App\Domain\Payment\ValueObject\PaymentId::class));
        $paymentMock->method('orderId')->willReturn('order_123');
        $paymentMock->method('amount')->willReturn($this->createMock(\App\Domain\Payment\ValueObject\Amount::class));
        $paymentMock->method('method')->willReturn($this->createMock(\App\Domain\Payment\ValueObject\PaymentMethod::class));

        $this->service->method('processPayment')
            ->willReturn($paymentMock);

        $this->eventPublisher->expects($this->once())->method('publish');

        $response = $this->handler->handle($dto);

        $this->assertInstanceOf(ProcessPaymentResponseDTO::class, $response);
        $this->assertEquals('confirmed', $response->getStatus());
    }

    public function testHandleFailure(){
        $dto = new ProcessPaymentDTO('order_123', 100.00, 'pix', []);

        $this->service->method('processPayment')
            ->willThrowException(new \App\Domain\Exceptions\PaymentFailedException('Failed'));

        $this->eventPublisher->expects($this->once())->method('publish');

        $this->expectException(\App\Domain\Exceptions\PaymentFailedException::class);
        $this->handler->handle($dto);
    }
}
