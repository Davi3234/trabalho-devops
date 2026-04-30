<?php

namespace App\Application\UseCase\ProcessPayment;

use App\Domain\Payment\Service\PaymentService;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;

class ProcessPaymentDTO{
    public function __construct(
        private string $orderId,
        private float $amount,
        private string $method,
        private array $paymentData
    ) {}

    public function getOrderId(): string{
        return $this->orderId;
    }

    public function getAmount(): Amount{
        return new Amount($this->amount);
    }

    public function getMethod(): PaymentMethod{
        return new PaymentMethod($this->method);
    }

    public function getPaymentData(): array{
        return $this->paymentData;
    }
}
