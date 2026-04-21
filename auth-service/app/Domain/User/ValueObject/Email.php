<?php

namespace App\Domain\User\ValueObject;

use App\Domain\Exceptions\InvalidEmailException;

class Email{
    
    private string $value;

    public function __construct(string $value){
        if (!$this->isValid($value)) {
            throw new InvalidEmailException();
        }
        $this->value = $value;
    }

    /**
     * Valida o formato do email
     * @param string $email
     * @return bool
     */
    private function isValid(string $email): bool{
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Retorna o valor do email
     * @return string
     */
    public function value(): string{
        return $this->value;
    }

    /**
     * Retorna a representação em string do email
     * @return string
     */
    public function __toString(): string{
        return $this->value;
    }

    /**
     * Compara dois emails
     * @param Email $email
     * @return bool
     */
    public function equals(Email $email): bool{
        return $this->value === $email->value();
    }
}


