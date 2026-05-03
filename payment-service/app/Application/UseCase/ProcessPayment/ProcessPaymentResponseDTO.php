<?php

namespace App\Application\UseCase\ProcessPayment;

class ProcessPaymentResponseDTO{
    public function __construct(
        private string $paymentId,
        private string $orderId,
        private ?float $amount,
        private ?string $method = null,
        private string $status = 'confirmed'

    ) {}

    public function toArray(): array{
        return [
            'payment_id' => $this->paymentId,
            'order_id' => $this->orderId,
            'amount' => $this->amount,
            'method' => $this->method,
            'status' => $this->status,
        ];
    }
}
