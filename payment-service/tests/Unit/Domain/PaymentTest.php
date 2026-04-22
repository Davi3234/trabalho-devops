<?php

namespace Tests\Unit\Domain;

use App\Domain\Payment\Entity\Payment;
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

        $payment = new Payment($id, $amount, $method, $orderId);

        $this->assertEquals($id, $payment->id());
        $this->assertEquals($amount, $payment->amount());
        $this->assertEquals($method, $payment->method());
        $this->assertEquals($orderId, $payment->orderId());
        $this->assertEquals('pending', $payment->status());
    }

    public function testConfirmPayment(){
        $payment = new Payment(new PaymentId('pay_123'), new Amount(100.00), new PaymentMethod('pix'), 'order_456');
        $payment->confirm('txn_789');
        $this->assertEquals('confirmed', $payment->status());
        $this->assertEquals('txn_789', $payment->transactionId());
    }

    public function testFailPayment(){
        $payment = new Payment(new PaymentId('pay_123'), new Amount(100.00), new PaymentMethod('boleto'), 'order_456');
        $payment->fail('Insufficient funds');
        $this->assertEquals('failed', $payment->status());
        $this->assertEquals('Insufficient funds', $payment->failureReason());
    }
}
