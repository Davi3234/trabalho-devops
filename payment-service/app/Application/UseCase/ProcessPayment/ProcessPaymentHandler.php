<?php

namespace App\Application\UseCase\ProcessPayment;

use App\Domain\Payment\Service\PaymentService;
use App\Domain\Exceptions\PaymentFailedException;

class ProcessPaymentHandler{
    public function __construct(
        private PaymentService $paymentService
    ) {}

    public function handle(ProcessPaymentDTO $dto): ProcessPaymentResponseDTO{
        try {
            $payment = $this->paymentService->processPayment(
                $dto->getOrderId(),
                $dto->getAmount(),
                $dto->getMethod(),
                $dto->getPaymentData()
            );

            return new ProcessPaymentResponseDTO(
                $payment->id()->value(),
                $payment->orderId(),
                $payment->amount()->value(),
                $payment->method()->value(),
                $payment->status()
            );
        } catch (PaymentFailedException $e) {
            throw $e;
        }
    }
}
