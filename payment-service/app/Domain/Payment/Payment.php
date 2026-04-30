<?php

namespace App\Domain\Payment;

use App\Domain\Payment\ValueObject\EnumPayment;
use App\Domain\Payment\ValueObject\PaymentId;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;

class Payment{
    private PaymentId $id;
    private string $orderId;
    private Amount $amount;
    private PaymentMethod $method;
    private string $status;
    private ?string $gatewayResponse;
    private \DateTime $createdAt;
    private ?\DateTime $updatedAt;

    public function __construct(
        PaymentId $id,
        string $orderId,
        Amount $amount,
        PaymentMethod $method
    ) {
        $this->id = $id;
        $this->orderId = $orderId;
        $this->amount = $amount;
        $this->method = $method;
        $this->status = EnumPayment::PAYMENT_STATUS_PENDING;
        $this->gatewayResponse = null;
        $this->createdAt = new \DateTime();
    }

    public function id(): PaymentId{
        return $this->id;
    }

    public function orderId(): string{
        return $this->orderId;
    }

    public function amount(): Amount{
        return $this->amount;
    }

    public function method(): PaymentMethod{
        return $this->method;
    }

    public function status(): string{
        return $this->status;
    }

    public function confirm(): void{
        $this->status = EnumPayment::PAYMENT_STATUS_CONFIRMED;
        $this->updatedAt = new \DateTime();
    }

    public function fail(string $reason): void{
        $this->status = EnumPayment::PAYMENT_STATUS_FAILED;
        $this->gatewayResponse = $reason;
        $this->updatedAt = new \DateTime();
    }

    public function refund(): void{
        $this->status = EnumPayment::PAYMENT_STATUS_REFUNDED;
        $this->updatedAt = new \DateTime();
    }

    public function toArray(): array{
        return [
            'id' => $this->id->value(),
            'order_id' => $this->orderId,
            'amount' => $this->amount->value(),
            'method' => $this->method->value(),
            'status' => $this->status,
            'gateway_response' => $this->gatewayResponse,
            'created_at' => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at' => $this->updatedAt?->format('Y-m-d H:i:s'),
        ];
    }
}
