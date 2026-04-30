<?php

namespace Tests\Unit\Domain\ValueObject;

use App\Domain\Payment\ValueObject\PaymentId;
use PHPUnit\Framework\TestCase;

class PaymentIdTest extends TestCase
{
    public function testCreateValidPaymentId(){
        $id = new PaymentId('pay_123');
        $this->assertEquals('pay_123', $id->value());
    }

    public function testCreatePaymentIdThrowsExceptionForEmpty(){
        $this->expectException(\InvalidArgumentException::class);
        new PaymentId('');
    }

    public function testPaymentIdEquality(){
        $id1 = new PaymentId('pay_123');
        $id2 = new PaymentId('pay_123');
        $this->assertTrue($id1->equals($id2));
    }
}
