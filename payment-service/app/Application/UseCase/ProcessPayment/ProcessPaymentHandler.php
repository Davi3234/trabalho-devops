<?php

namespace App\Application\UseCase\ProcessPayment;

use App\Domain\Payment\Service\PaymentService;
use App\Domain\Exceptions\PaymentFailedException;
use App\Domain\Shared\Service\EventPublisherInterface;

class ProcessPaymentHandler {
    public function __construct(
        private PaymentService $paymentService,
        private EventPublisherInterface $eventPublisher
    ) {
    }

    public function handle(ProcessPaymentDTO $dto): ProcessPaymentResponseDTO {
        try {
            $payment = $this->paymentService->processPayment(
                $dto->getOrderId(),
                $dto->getAmount(),
                $dto->getMethod(),
                $dto->getPaymentData()
            );

            $event = $payment->status() === 'confirmed' ? 'payments.pagamento.confirmado' : 'payments.pagamento.recusado';
            $this->eventPublisher->publish($event, [
                'orderId' => $payment->orderId(),
                'paymentId' => $payment->id()->value(),
                'amount' => $payment->amount()->value(),
                'method' => $payment->method()->value(),
                'status' => $payment->status()
            ]);

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
