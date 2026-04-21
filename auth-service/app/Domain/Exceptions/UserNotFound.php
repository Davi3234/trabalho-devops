<?php

namespace App\Domain\Exceptions;

use App\Exceptions\DomainException;
use Illuminate\Http\Response;

class UserNotFound extends DomainException
{
    public function __construct(string $message = ""){
        $message = !empty($message) ? $message : $this->getDefaultMessage();
        parent::__construct($message);
    }

    protected function getDefaultMessage(): string{
        return "Usuário não encontrado.";
    }

    protected function getDefaultErrorCode(): string{
        return "USER_NOT_FOUND";
    }

    protected function getDefaultHttpStatusCode(): int{
        return Response::HTTP_UNAUTHORIZED;
    }
}
