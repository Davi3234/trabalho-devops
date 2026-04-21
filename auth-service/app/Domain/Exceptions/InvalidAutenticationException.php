<?php

namespace App\Domain\Exceptions;

use App\Exceptions\DomainException;
use Illuminate\Http\Response;

class InvalidAutenticationException extends DomainException{

    public function __construct(string $message = ""){
        $defaultMessage = !empty($message) ? $message : $this->getDefaultMessage();
        parent::__construct($defaultMessage);
    }

    protected function getDefaultMessage(): string{
        return "Usuário e/ou senha incorretos.";
    }

    protected function getDefaultErrorCode(): string{
        return "INVALID_AUTENTICATION";
    }

    protected function getDefaultHttpStatusCode(): int{
        return Response::HTTP_UNAUTHORIZED;
    }
}
