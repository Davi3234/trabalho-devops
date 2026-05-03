<?php

namespace Tests\Unit\Application\UseCase\ProcessPayment;

use App\Application\UseCase\ProcessPayment\ProcessPaymentDTO;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;
use PHPUnit\Framework\TestCase;

class ProcessPaymentDTOTest extends TestCase{
    public function testCreateProcessPaymentDTO(): void{
        $orderId = 'order_123';
        $amount = 100.50;
        $method = 'credit_card';
        $paymentData = ['card_token' => 'token_xyz'];

        $dto = new ProcessPaymentDTO($orderId, $amount, $method, $paymentData);

        $this->assertEquals($orderId, $dto->getOrderId());
        $this->assertInstanceOf(Amount::class, $dto->getAmount());
        $this->assertEquals($amount, $dto->getAmount()->value());
        $this->assertInstanceOf(PaymentMethod::class, $dto->getMethod());
        $this->assertEquals($method, $dto->getMethod()->value());
        $this->assertEquals($paymentData, $dto->getPaymentData());
    }

    public function testProcessPaymentDTOWithEmptyPaymentData(): void{
        $dto = new ProcessPaymentDTO('order_456', 50.00, 'pix', []);

        $this->assertEquals('order_456', $dto->getOrderId());
        $this->assertEquals(50.00, $dto->getAmount()->value());
        $this->assertEquals('pix', $dto->getMethod()->value());
        $this->assertEmpty($dto->getPaymentData());
        $this->assertIsArray($dto->getPaymentData());
    }

    public function testProcessPaymentDTOWithDifferentPaymentMethods(): void{
        $methods = ['credit_card', 'pix', 'boleto'];

        foreach ($methods as $method) {
            $dto = new ProcessPaymentDTO('order_123', 100.00, $method, []);
            $this->assertEquals($method, $dto->getMethod()->value());
        }
    }

    public function testProcessPaymentDTOAmountConversion(): void{
        $dto = new ProcessPaymentDTO('order_789', 999.99, 'credit_card', []);

        $amount = $dto->getAmount();
        $this->assertInstanceOf(Amount::class, $amount);
        $this->assertEquals(999.99, $amount->value());
    }

    public function testProcessPaymentDTOMethodConversion(): void{
        $dto = new ProcessPaymentDTO('order_111', 10.00, 'boleto', []);

        $method = $dto->getMethod();
        $this->assertInstanceOf(PaymentMethod::class, $method);
        $this->assertEquals('boleto', $method->value());
    }

    public function testProcessPaymentDTOWithComplexPaymentData(): void{
        $paymentData = [
            'card_token' => 'token_123',
            'card_last_four' => '4242',
            'card_brand' => 'visa',
            'installments' => 3
        ];

        $dto = new ProcessPaymentDTO('order_555', 300.00, 'credit_card', $paymentData);

        $this->assertEquals($paymentData, $dto->getPaymentData());
        $this->assertCount(4, $dto->getPaymentData());
        $this->assertEquals('token_123', $dto->getPaymentData()['card_token']);
    }
}

