<?php

namespace Tests\Unit\Domain\ValueObject;

use App\Domain\Payment\ValueObject\PaymentMethod;
use PHPUnit\Framework\TestCase;

class PaymentMethodTest extends TestCase{
    public function testCreateValidPaymentMethod(){
        $method = new PaymentMethod('credit_card');
        $this->assertEquals('credit_card', $method->value());
    }

    public function testCreatePaymentMethodThrowsExceptionForInvalid(){
        $this->expectException(\InvalidArgumentException::class);
        new PaymentMethod('invalid_method');
    }

    public function testSupportedMethods(){
        $this->assertTrue(PaymentMethod::isSupported('credit_card'));
        $this->assertTrue(PaymentMethod::isSupported('pix'));
        $this->assertTrue(PaymentMethod::isSupported('boleto'));
        $this->assertFalse(PaymentMethod::isSupported('cash'));
    }
}
