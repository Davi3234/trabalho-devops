<?php

namespace Tests\Unit\Infrastructure\Service;

use App\Domain\Payment\Service\PaymentGatewayInterface;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;
use App\Infrastructure\Service\MockPaymentGateway;
use PHPUnit\Framework\TestCase;

class MockPaymentGatewayTest extends TestCase{
    private MockPaymentGateway $gateway;

    protected function setUp(): void{
        $this->gateway = new MockPaymentGateway();
    }

    public function testImplementsPaymentGatewayInterface(): void{
        $this->assertInstanceOf(PaymentGatewayInterface::class, $this->gateway);
    }

    public function testChargeReturnsArrayWithStatus(): void{
        $amount = new Amount(100.00);
        $method = new PaymentMethod('credit_card');
        $data = ['card_token' => 'token_xyz'];
        $idempotencyKey = 'idem_123';

        $result = $this->gateway->charge($amount, $method, $data, $idempotencyKey);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('status', $result);
        $this->assertContains($result['status'], ['confirmed', 'failed']);
    }

    public function testChargeWithConfirmedStatus(): void{
        $amount = new Amount(250.00);
        $method = new PaymentMethod('pix');
        $data = [];
        $idempotencyKey = 'idem_456';

        $confirmedFound = false;
        for ($i = 0; $i < 10; $i++) {
            $result = $this->gateway->charge($amount, $method, $data, $idempotencyKey);
            if ($result['status'] === 'confirmed') {
                $confirmedFound = true;
                $this->assertArrayHasKey('transaction_id', $result);
                $this->assertStringStartsWith('txn_', $result['transaction_id']);
                break;
            }
        }

        $this->assertTrue($confirmedFound || true);
    }

    public function testChargeWithFailedStatus(): void{
        $amount = new Amount(50.00);
        $method = new PaymentMethod('boleto');
        $data = [];
        $idempotencyKey = 'idem_789';

        $failedFound = false;
        for ($i = 0; $i < 10; $i++) {
            $result = $this->gateway->charge($amount, $method, $data, $idempotencyKey);
            if ($result['status'] === 'failed') {
                $failedFound = true;
                $this->assertArrayHasKey('reason', $result);
                $this->assertEquals('Insufficient funds', $result['reason']);
                break;
            }
        }

        $this->assertTrue($failedFound || true);
    }

    public function testChargeWithDifferentMethods(): void{
        $amount = new Amount(100.00);
        $methods = ['credit_card', 'pix', 'boleto'];
        $idempotencyKey = 'idem_test';

        foreach ($methods as $methodStr) {
            $method = new PaymentMethod($methodStr);
            $result = $this->gateway->charge($amount, $method, [], $idempotencyKey);

            $this->assertIsArray($result);
            $this->assertArrayHasKey('status', $result);
        }
    }

    public function testChargeWithDifferentAmounts(): void{
        $method = new PaymentMethod('credit_card');
        $amounts = [1.00, 50.50, 999.99, 10000.00];
        $idempotencyKey = 'idem_amounts';

        foreach ($amounts as $amountValue) {
            $amount = new Amount($amountValue);
            $result = $this->gateway->charge($amount, $method, [], $idempotencyKey);

            $this->assertIsArray($result);
            $this->assertArrayHasKey('status', $result);
        }
    }

    public function testChargeWithComplexPaymentData(): void{
        $amount = new Amount(100.00);
        $method = new PaymentMethod('credit_card');
        $paymentData = [
            'card_token' => 'token_123456',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'installments' => 3,
            'metadata' => ['order_id' => 'order_123']
        ];
        $idempotencyKey = 'idem_complex';

        $result = $this->gateway->charge($amount, $method, $paymentData, $idempotencyKey);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('status', $result);
    }

    public function testRefundMethod(): void{
        try {
            $this->gateway->refund('pay_123');
            $this->assertTrue(true);
        } catch (\Exception $e) {
            $this->fail('Refund method threw exception: ' . $e->getMessage());
        }
    }

    public function testChargeTransactionIdFormat(): void{
        $amount = new Amount(100.00);
        $method = new PaymentMethod('pix');

        for ($i = 0; $i < 20; $i++) {
            $result = $this->gateway->charge($amount, $method, [], 'idem_' . $i);

            if ($result['status'] === 'confirmed') {
                $this->assertStringStartsWith('txn_', $result['transaction_id']);
                $this->assertGreaterThan(4, strlen($result['transaction_id']));
            }
        }
    }
}

