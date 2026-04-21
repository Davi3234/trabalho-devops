<?php

namespace App\Infrastructure\Service;

use App\Domain\Payment\Service\PaymentGatewayInterface;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;

class MockPaymentGateway implements PaymentGatewayInterface{
    public function charge(Amount $amount, PaymentMethod $method, array $data, string $idempotencyKey): array{

        $success = rand(0, 1);

        if ($success) {
            return [
                'status' => 'confirmed',
                'transaction_id' => uniqid('txn_'),
            ];
        } else {
            return [
                'status' => 'failed',
                'reason' => 'Insufficient funds',
            ];
        }
    }

    public function refund(string $paymentId): void{
        // Simulate refund
    }
}
