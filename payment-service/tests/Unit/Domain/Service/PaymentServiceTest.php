<?php

namespace Tests\Unit\Domain\Service;

use App\Domain\Payment\Service\PaymentService;
use App\Domain\Payment\Repository\PaymentRepositoryInterface;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;
use App\Infrastructure\Service\MockPaymentGateway;
use PHPUnit\Framework\TestCase;

class PaymentServiceTest extends TestCase{
    private PaymentService $service;
    private PaymentRepositoryInterface $repository;
    private MockPaymentGateway $gateway;

    protected function setUp(): void{
        $this->repository = $this->createMock(PaymentRepositoryInterface::class);
        $this->gateway = $this->createMock(MockPaymentGateway::class);
        $this->service = new PaymentService($this->repository, $this->gateway);
    }

    public function testProcessPaymentSuccess(){
        $this->gateway->method('charge')
            ->willReturn(['status' => 'confirmed', 'transaction_id' => 'txn_123']);

        $this->repository->expects($this->once())->method('save');

        $payment = $this->service->processPayment('order_123', new Amount(100.00), new PaymentMethod('credit_card'), []);

        $this->assertEquals('confirmed', $payment->status());
    }

    public function testProcessPaymentFailureWithRetry(){
        $this->gateway->method('charge')
            ->willReturnOnConsecutiveCalls(
                ['status' => 'failed', 'reason' => 'Timeout'],
                ['status' => 'failed', 'reason' => 'Timeout'],
                ['status' => 'confirmed', 'transaction_id' => 'txn_123']
            );

        $this->repository->expects($this->exactly(3))->method('save');

        $payment = $this->service->processPayment('order_123', new Amount(100.00), new PaymentMethod('pix'), []);

        $this->assertEquals('confirmed', $payment->status());
    }

    public function testProcessPaymentMaxRetriesExceeded(){
        $this->gateway->method('charge')
            ->willReturn(['status' => 'failed', 'reason' => 'Timeout']);

        $this->repository->expects($this->exactly(4))->method('save');

        $this->expectException(\App\Domain\Exceptions\PaymentFailedException::class);
        $this->service->processPayment('order_123', new Amount(100.00), new PaymentMethod('boleto'), []);
    }
}
