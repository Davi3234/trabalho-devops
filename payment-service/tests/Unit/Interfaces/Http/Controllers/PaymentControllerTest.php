<?php

namespace Tests\Unit\Interfaces\Http\Controllers;

use App\Application\UseCase\ProcessPayment\ProcessPaymentHandler;
use App\Application\UseCase\ProcessPayment\ProcessPaymentResponseDTO;
use Laravel\Lumen\Testing\TestCase;
use Mockery;

class PaymentControllerTest extends TestCase{
    public function createApplication(){
        return require __DIR__ . '/../../../../bootstrap/app.php';
    }

    public function testProcessPaymentSuccess(){
        $handler = Mockery::mock(ProcessPaymentHandler::class);
        $handler->shouldReceive('handle')
            ->once()
            ->andReturn(new ProcessPaymentResponseDTO('confirmed', 'txn_123', null));

        $this->app->instance(ProcessPaymentHandler::class, $handler);

        $this->json('POST', '/payments/process', [
            'order_id' => 'order_123',
            'amount' => 100.00,
            'method' => 'credit_card',
            'data' => []
        ])
        ->seeJson([
            'success' => true,
            'data' => [
                'status' => 'confirmed',
                'transaction_id' => 'txn_123'
            ]
        ])
        ->assertResponseOk();
    }

    public function testProcessPaymentFailure(){
        $handler = Mockery::mock(ProcessPaymentHandler::class);
        $handler->shouldReceive('handle')
            ->once()
            ->andThrow(new \App\Domain\Exceptions\PaymentFailedException('Insufficient funds'));

        $this->app->instance(ProcessPaymentHandler::class, $handler);

        $this->json('POST', '/payments/process', [
            'order_id' => 'order_123',
            'amount' => 100.00,
            'method' => 'pix',
            'data' => []
        ])
        ->seeJson([
            'success' => false,
            'message' => 'Pagamento falhou: Insufficient funds',
            'error' => 'PAYMENT_FAILED'
        ])
        ->assertResponseStatus(400);
    }
}
