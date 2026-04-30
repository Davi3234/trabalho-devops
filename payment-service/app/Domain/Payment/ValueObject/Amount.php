<?php

namespace App\Domain\Payment\ValueObject;

class Amount{
    private float $value;

    public function __construct(float $value){
        if ($value < 0) {
            throw new \InvalidArgumentException('Valor não pode ser negativo');
        }
        if ($value > 999999.99) {
            throw new \InvalidArgumentException('Valor muito alto');
        }
        $this->value = $value;
    }

    public function value(): float{
        return $this->value;
    }

    public function __toString(): string{
        return number_format($this->value, 2, '.', '');
    }
}
