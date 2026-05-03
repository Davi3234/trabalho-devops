<?php

namespace Tests\Unit\Domain\ValueObject;

use App\Domain\Payment\ValueObject\EnumPayment;
use PHPUnit\Framework\TestCase;

class EnumPaymentTest extends TestCase{
    public function testPaymentMethodConstants(): void{
        $this->assertEquals('credit_card', EnumPayment::PAYMENT_METHOD_CARTAO);
        $this->assertEquals('pix', EnumPayment::PAYMENT_METHOD_PIX);
        $this->assertEquals('boleto', EnumPayment::PAYMENT_METHOD_BOLETO);
    }

    public function testPaymentStatusConstants(): void{
        $this->assertEquals('pending', EnumPayment::PAYMENT_STATUS_PENDING);
        $this->assertEquals('confirmed', EnumPayment::PAYMENT_STATUS_CONFIRMED);
        $this->assertEquals('failed', EnumPayment::PAYMENT_STATUS_FAILED);
        $this->assertEquals('refunded', EnumPayment::PAYMENT_STATUS_REFUNDED);
    }

    public function testAllPaymentMethods(): void{
        $methods = [
            EnumPayment::PAYMENT_METHOD_CARTAO,
            EnumPayment::PAYMENT_METHOD_PIX,
            EnumPayment::PAYMENT_METHOD_BOLETO
        ];

        foreach ($methods as $method) {
            $this->assertNotEmpty($method);
            $this->assertIsString($method);
        }
    }

    public function testAllPaymentStatuses(): void{
        $statuses = [
            EnumPayment::PAYMENT_STATUS_PENDING,
            EnumPayment::PAYMENT_STATUS_CONFIRMED,
            EnumPayment::PAYMENT_STATUS_FAILED,
            EnumPayment::PAYMENT_STATUS_REFUNDED
        ];

        foreach ($statuses as $status) {
            $this->assertNotEmpty($status);
            $this->assertIsString($status);
        }
    }
}

