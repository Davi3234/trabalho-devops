<?php

namespace App\Domain\Exceptions;

class EmailAlreadyInUseException extends \Exception{
    public function __construct(string $email = ""){
        $message = !empty($email) ? "Email '{$email}' já está em uso" : "Email já está em uso";
        parent::__construct($message);
    }
}

