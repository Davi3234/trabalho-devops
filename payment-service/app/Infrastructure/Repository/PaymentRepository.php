<?php

namespace App\Infrastructure\Repository;

use App\Domain\Payment\Payment;
use App\Domain\Payment\Repository\PaymentRepositoryInterface;
use App\Domain\Payment\ValueObject\PaymentId;
use App\Domain\Payment\ValueObject\Amount;
use App\Domain\Payment\ValueObject\PaymentMethod;

class PaymentRepository implements PaymentRepositoryInterface{
    public function save(Payment $payment): void{
        $data = $payment->toArray();
        PaymentModel::updateOrCreate(
            ['id' => $data['id']],
            $data
        );
    }

    public function findById(PaymentId $id): ?Payment{
        $model = PaymentModel::find($id->value());
        if (!$model) {
            return null;
        }

        return $this->modelToEntity($model);
    }

    public function findByOrderId(string $orderId): ?Payment{
        $model = PaymentModel::where('order_id', $orderId)->first();
        if (!$model) {
            return null;
        }

        return $this->modelToEntity($model);
    }

    private function modelToEntity(PaymentModel $model): Payment{
        $payment = new Payment(
            new PaymentId($model->id),
            $model->order_id,
            new Amount($model->amount),
            new PaymentMethod($model->method)
        );

        $reflection = new \ReflectionClass($payment);
        $statusProp = $reflection->getProperty('status');
        $statusProp->setAccessible(true);
        $statusProp->setValue($payment, $model->status);

        if ($model->gateway_response) {
            $gatewayProp = $reflection->getProperty('gatewayResponse');
            $gatewayProp->setAccessible(true);
            $gatewayProp->setValue($payment, $model->gateway_response);
        }

        return $payment;
    }
}
