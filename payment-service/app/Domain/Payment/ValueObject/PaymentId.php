<?php

namespace App\Domain\Payment\ValueObject;

class PaymentId{
    private string $value;

    public function __construct(string $value){
        if (empty($value)) {
            throw new \InvalidArgumentException('Id do pagamento não pode ser vazio');
        }
        $this->value = $value;
    }

    public function value(): string{
        return $this->value;
    }

    public function __toString(): string{
        return $this->value;
    }
}
