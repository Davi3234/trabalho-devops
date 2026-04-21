<?php

namespace App\Domain\Payment\Service;

use App\Domain\Payment\Payment;
use App\Domain\Payment\Repository\PaymentRepositoryInterface;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;
use App\Domain\Exceptions\PaymentFailedException;

class PaymentService{
    private PaymentRepositoryInterface $paymentRepository;
    private PaymentGatewayInterface $paymentGateway;

    public function __construct(
        PaymentRepositoryInterface $paymentRepository,
        PaymentGatewayInterface $paymentGateway
    ) {
        $this->paymentRepository = $paymentRepository;
        $this->paymentGateway = $paymentGateway;
    }

    public function processPayment(
        string $orderId,
        Amount $amount,
        PaymentMethod $method,
        array $paymentData
    ): ?Payment {
        $paymentId = new \App\Domain\Payment\ValueObject\PaymentId(uniqid('pay_', true));
        $payment = new Payment($paymentId, $orderId, $amount, $method);

        $idempotencyKey = $orderId . '_' . time();

        $attempts = 0;
        $maxAttempts = 3;
        $backoff = [10, 30, 60];

        while ($attempts < $maxAttempts) {
            try {
                $result = $this->paymentGateway->charge($amount, $method, $paymentData, $idempotencyKey);

                if ($result['status'] === 'confirmed') {
                    $payment->confirm();
                    $this->paymentRepository->save($payment);

                    return $payment;
                } else {
                    $payment->fail($result['reason']);
                    $this->paymentRepository->save($payment);
                    throw new PaymentFailedException($result['reason']);
                }
            } catch (\Exception $e) {
                $attempts++;
                if ($attempts >= $maxAttempts) {
                    $payment->fail($e->getMessage());
                    $this->paymentRepository->save($payment);

                    throw new PaymentFailedException('Payment failed after retries: ' . $e->getMessage());
                }
                sleep($backoff[$attempts - 1] ?? 60);
            }
        }

        return null;
    }

    public function refundPayment(string $orderId): void{
        $payment = $this->paymentRepository->findByOrderId($orderId);
        if (!$payment) {
            throw new \Exception('Payment not found');
        }

        $this->paymentGateway->refund($payment->id()->value());
        $payment->refund();
        $this->paymentRepository->save($payment);
    }
}
