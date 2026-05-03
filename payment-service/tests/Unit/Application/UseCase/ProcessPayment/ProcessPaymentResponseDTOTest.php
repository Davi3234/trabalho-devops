<?php

namespace Tests\Unit\Application\UseCase\ProcessPayment;

use App\Application\UseCase\ProcessPayment\ProcessPaymentResponseDTO;
use PHPUnit\Framework\TestCase;

class ProcessPaymentResponseDTOTest extends TestCase{
    public function testCreateProcessPaymentResponseDTO(): void{
        $paymentId = 'pay_123';
        $orderId = 'order_456';
        $amount = 100.50;
        $method = 'credit_card';
        $status = 'confirmed';

        $dto = new ProcessPaymentResponseDTO($paymentId, $orderId, $amount, $method, $status);

        $this->assertEquals($paymentId, $dto->toArray()['payment_id']);
        $this->assertEquals($orderId, $dto->toArray()['order_id']);
        $this->assertEquals($amount, $dto->toArray()['amount']);
        $this->assertEquals($method, $dto->toArray()['method']);
        $this->assertEquals($status, $dto->toArray()['status']);
    }

    public function testProcessPaymentResponseDTOToArray(): void{
        $dto = new ProcessPaymentResponseDTO('pay_789', 'order_111', 250.00, 'pix', 'pending');

        $array = $dto->toArray();

        $this->assertIsArray($array);
        $this->assertArrayHasKey('payment_id', $array);
        $this->assertArrayHasKey('order_id', $array);
        $this->assertArrayHasKey('amount', $array);
        $this->assertArrayHasKey('method', $array);
        $this->assertArrayHasKey('status', $array);
        $this->assertCount(5, $array);
    }

    public function testProcessPaymentResponseDTOWithFailedStatus(): void{
        $dto = new ProcessPaymentResponseDTO('pay_failed', 'order_999', 50.00, 'boleto', 'failed');

        $array = $dto->toArray();
        $this->assertEquals('failed', $array['status']);
    }

    public function testProcessPaymentResponseDTOWithRefundedStatus(): void{
        $dto = new ProcessPaymentResponseDTO('pay_refund', 'order_222', 150.00, 'credit_card', 'refunded');

        $array = $dto->toArray();
        $this->assertEquals('refunded', $array['status']);
    }

    public function testProcessPaymentResponseDTOConstructorParameters(): void{
        $params = [
            'pay_test1',
            'order_test1',
             99.99,
            'pix',
            'confirmed'
        ];

        $dto = new ProcessPaymentResponseDTO(...$params);
        $array = $dto->toArray();

        $this->assertEquals('pay_test1', $array['payment_id']);
        $this->assertEquals('order_test1', $array['order_id']);
        $this->assertEquals(99.99, $array['amount']);
        $this->assertEquals('pix', $array['method']);
        $this->assertEquals('confirmed', $array['status']);
    }
}

