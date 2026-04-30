<?php

namespace Tests\Unit\Domain;

use App\Domain\Payment\Payment;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentId;
use App\Domain\Payment\ValueObject\PaymentMethod;
use PHPUnit\Framework\TestCase;

class PaymentTest extends TestCase{
    public function testCreatePayment(){
        $id = new PaymentId('pay_123');
        $amount = new Amount(100.00);
        $method = new PaymentMethod('credit_card');
        $orderId = 'order_456';

        $payment = new Payment($id, $orderId, $amount, $method);

        $this->assertEquals($id, $payment->id());
        $this->assertEquals($amount, $payment->amount());
        $this->assertEquals($method, $payment->method());
        $this->assertEquals($orderId, $payment->orderId());
        $this->assertEquals('pending', $payment->status());
    }

    public function testConfirmPayment(){
        $payment = new Payment(new PaymentId('pay_123'), 'order_456', new Amount(100.00), new PaymentMethod('pix'));
        $payment->confirm();
        $this->assertEquals('confirmed', $payment->status());
    }

    public function testFailPayment(){
        $payment = new Payment(new PaymentId('pay_123'), 'order_456', new Amount(100.00), new PaymentMethod('boleto'));
        $payment->fail('Insufficient funds');
        $this->assertEquals('failed', $payment->status());
    }
}
