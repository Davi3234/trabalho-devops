<?php

namespace App\Domain\Exceptions;

use App\Exceptions\DomainException;
use Illuminate\Http\Response;

class InvalidEmailException extends DomainException{
    public function __construct(string $message = ""){
        $message = !empty($message) ? $message : $this->getDefaultMessage();
        parent::__construct($message);
    }

    protected function getDefaultMessage(): string{
        return "Email inválido";
    }

    protected function getDefaultErrorCode(): string{
        return "INVALID_EMAIL";
    }

    protected function getDefaultHttpStatusCode(): int{
        return Response::HTTP_UNPROCESSABLE_ENTITY;
    }
}
