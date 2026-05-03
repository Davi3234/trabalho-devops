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

    public function testRefundPayment(){
        $payment = new Payment(new PaymentId('pay_123'), 'order_456', new Amount(100.00), new PaymentMethod('credit_card'));
        $payment->confirm();
        $payment->refund();
        $this->assertEquals('refunded', $payment->status());
    }

    public function testPaymentToArray(){
        $payment = new Payment(new PaymentId('pay_123'), 'order_456', new Amount(100.00), new PaymentMethod('pix'));
        $result = $payment->toArray();

        $this->assertIsArray($result);
        $this->assertEquals('pay_123', $result['id']);
        $this->assertEquals('order_456', $result['order_id']);
        $this->assertEquals(100.00, $result['amount']);
        $this->assertEquals('pix', $result['method']);
        $this->assertEquals('pending', $result['status']);
        $this->assertArrayHasKey('created_at', $result);
        $this->assertNull($result['updated_at']);
    }

    public function testPaymentStatusUpdateTimestamp(){
        $payment = new Payment(new PaymentId('pay_456'), 'order_789', new Amount(50.00), new PaymentMethod('boleto'));

        $initialArray = $payment->toArray();
        $this->assertNull($initialArray['updated_at']);

        $payment->confirm();

        $updatedArray = $payment->toArray();
        $this->assertNotNull($updatedArray['updated_at']);
    }

    public function testPaymentWithDifferentMethods(){
        $methods = ['credit_card', 'pix', 'boleto'];

        foreach ($methods as $method) {
            $payment = new Payment(new PaymentId('pay_' . $method), 'order_123', new Amount(100.00), new PaymentMethod($method));
            $this->assertEquals($method, $payment->method()->value());
        }
    }
}
