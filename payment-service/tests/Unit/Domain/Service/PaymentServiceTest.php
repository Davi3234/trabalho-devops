<?php

namespace Tests\Unit\Domain\Service;

use App\Domain\Payment\Service\PaymentService;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;
use App\Infrastructure\Service\MockPaymentGateway;
use PHPUnit\Framework\TestCase;

class PaymentServiceTest extends TestCase{
    private PaymentService $service;
    private MockPaymentGateway $gateway;

    protected function setUp(): void{
        $this->gateway = $this->createMock(MockPaymentGateway::class);
        $this->service = new PaymentService($this->gateway);
    }

    public function testProcessPaymentSuccess(){
        $this->gateway->method('charge')
            ->willReturn(['status' => 'confirmed', 'transaction_id' => 'txn_123']);

        $result = $this->service->processPayment(new Amount(100.00), new PaymentMethod('credit_card'), [], 'key_123');

        $this->assertEquals('confirmed', $result['status']);
        $this->assertEquals('txn_123', $result['transaction_id']);
    }

    public function testProcessPaymentFailureWithRetry(){
        $this->gateway->method('charge')
            ->willReturnOnConsecutiveCalls(
                ['status' => 'failed', 'reason' => 'Timeout'],
                ['status' => 'failed', 'reason' => 'Timeout'],
                ['status' => 'confirmed', 'transaction_id' => 'txn_123']
            );

        $result = $this->service->processPayment(new Amount(100.00), new PaymentMethod('pix'), [], 'key_123');

        $this->assertEquals('confirmed', $result['status']);
    }

    public function testProcessPaymentMaxRetriesExceeded(){
        $this->gateway->method('charge')
            ->willReturn(['status' => 'failed', 'reason' => 'Timeout']);

        $result = $this->service->processPayment(new Amount(100.00), new PaymentMethod('boleto'), [], 'key_123');

        $this->assertEquals('failed', $result['status']);
        $this->assertEquals('Timeout', $result['reason']);
    }
}
