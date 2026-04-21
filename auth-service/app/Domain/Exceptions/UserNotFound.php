<?php

namespace App\Domain\Exceptions;

class UserNotFound extends \Exception
{
    public function __construct(string $identifier = ""){
        $message = !empty($identifier) ? "Usuário não encontrado: {$identifier}" : "Usuário não encontrado.";
        parent::__construct($message);
    }
}

