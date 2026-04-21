<?php

namespace App\Interfaces\Exceptions;

use App\Exceptions\DomainException;
use Illuminate\Http\Response;

class InvalidTokenException extends DomainException{

    protected function getDefaultMessage(): string{
        return "Token inválido";
    }

    protected function getDefaultErrorCode(): string{
        return "INVALID_TOKEN";
    }

    protected function getDefaultHttpStatusCode(): int{
        return Response::HTTP_UNAUTHORIZED;
    }
}
