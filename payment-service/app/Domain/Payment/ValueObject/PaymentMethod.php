<?php

namespace App\Domain\Payment\ValueObject;

class PaymentMethod{
    private string $value;

    private const ALLOWED_METHODS = [EnumPayment::PAYMENT_METHOD_CARTAO, EnumPayment::PAYMENT_METHOD_PIX, EnumPayment::PAYMENT_METHOD_BOLETO];

    public function __construct(string $value){
        if (!in_array($value, self::ALLOWED_METHODS)) {
            throw new \InvalidArgumentException('Método de pagamento inválido');
        }
        $this->value = $value;
    }

    public function value(): string{
        return $this->value;
    }

    public function __toString(): string{
        return $this->value;
    }

    public static function isSupported(string $method): bool{
        return in_array($method, self::ALLOWED_METHODS);
    }
}
