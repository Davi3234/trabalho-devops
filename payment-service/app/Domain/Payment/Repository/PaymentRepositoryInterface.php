<?php

namespace App\Domain\Payment\Repository;

use App\Domain\Payment\Payment;
use App\Domain\Payment\ValueObject\PaymentId;

interface PaymentRepositoryInterface{
    public function save(Payment $payment): void;
    public function findById(PaymentId $id): ?Payment;
    public function findByOrderId(string $orderId): ?Payment;
}
