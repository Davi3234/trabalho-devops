<?php

namespace App\Domain\Exceptions;

class InvalidEmailException extends \Exception{
    public function __construct(string $email = ""){
        $message = !empty($email) ? "Email inválido: {$email}" : "Email inválido";
        parent::__construct($message);
    }
}

