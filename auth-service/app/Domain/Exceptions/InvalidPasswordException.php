<?php

namespace App\Domain\Exceptions;

class InvalidPasswordException extends \Exception
{
    public function __construct(string $message = ""){
        $defaultMessage = !empty($message) ? $message : "Usuário ou senha incorreta.";
        parent::__construct($defaultMessage);
    }
}

