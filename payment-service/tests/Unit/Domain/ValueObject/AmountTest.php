<?php

namespace Tests\Unit\Domain\ValueObject;

use App\Domain\Payment\ValueObject\Amount;
use PHPUnit\Framework\TestCase;

class AmountTest extends TestCase{
    public function testCreateValidAmount(){
        $amount = new Amount(100.50);
        $this->assertEquals(100.50, $amount->value());
    }

    public function testCreateAmountWithZero(){
        $amount = new Amount(0.00);
        $this->assertEquals(0.00, $amount->value());
    }

    public function testCreateAmountThrowsExceptionForNegative(){
        $this->expectException(\InvalidArgumentException::class);
        new Amount(-10.00);
    }

    public function testCreateAmountThrowsExceptionForTooHigh(){
        $this->expectException(\InvalidArgumentException::class);
        new Amount(1000000.00);
    }
}
