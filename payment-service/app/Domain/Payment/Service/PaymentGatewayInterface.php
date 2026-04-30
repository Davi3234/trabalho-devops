<?php

namespace App\Domain\Payment\Service;

use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;

interface PaymentGatewayInterface{
    public function charge(Amount $amount, PaymentMethod $method, array $data, string $idempotencyKey): array;
    public function refund(string $paymentId): void;
}
