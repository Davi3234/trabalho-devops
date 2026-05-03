<?php

namespace Tests\Unit\Interfaces\Http\Request;

use App\Interfaces\Http\Request\ProcessPaymentRequest;
use PHPUnit\Framework\TestCase;

class ProcessPaymentRequestTest extends TestCase{
    private ProcessPaymentRequest $request;

    protected function setUp(): void{
        $this->request = new ProcessPaymentRequest();
    }

    public function testRulesIncludesOrderId(): void{
        $rules = $this->request->rules();

        $this->assertArrayHasKey('order_id', $rules);
        $this->assertStringContainsString('required', $rules['order_id']);
        $this->assertStringContainsString('string', $rules['order_id']);
    }

    public function testRulesIncludesAmount(): void{
        $rules = $this->request->rules();

        $this->assertArrayHasKey('amount', $rules);
        $this->assertStringContainsString('required', $rules['amount']);
        $this->assertStringContainsString('numeric', $rules['amount']);
        $this->assertStringContainsString('min:0.01', $rules['amount']);
    }

    public function testRulesIncludesMethod(): void
    {
        $rules = $this->request->rules();

        $this->assertArrayHasKey('method', $rules);
        $this->assertStringContainsString('required', $rules['method']);
        $this->assertStringContainsString('in:credit_card,pix,boleto', $rules['method']);
    }

    public function testRulesIncludesPaymentData(): void{
        $rules = $this->request->rules();

        $this->assertArrayHasKey('payment_data', $rules);
        $this->assertStringContainsString('sometimes', $rules['payment_data']);
        $this->assertStringContainsString('array', $rules['payment_data']);
    }

    public function testAllRequiredRulesPresent(): void{
        $rules = $this->request->rules();

        $this->assertCount(4, $rules);
    }

    public function testValidPaymentMethods(): void{
        $rules = $this->request->rules();

        $methodRule = $rules['method'];
        $this->assertStringContainsString('credit_card', $methodRule);
        $this->assertStringContainsString('pix', $methodRule);
        $this->assertStringContainsString('boleto', $methodRule);
    }

    public function testAmountMinimumValue(): void{
        $rules = $this->request->rules();

        $amountRule = $rules['amount'];
        $this->assertStringContainsString('min:0.01', $amountRule);
    }
}

