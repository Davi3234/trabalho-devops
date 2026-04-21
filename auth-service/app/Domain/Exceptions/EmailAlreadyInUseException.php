<?php

namespace App\Domain\Exceptions;

use App\Exceptions\DomainException;
use Illuminate\Http\Response;

class EmailAlreadyInUseException extends DomainException{
    public function __construct(string $message = ""){
        $message = !empty($message) ? $message : $this->getDefaultMessage();
        parent::__construct();
    }

    protected function getDefaultMessage(): string{
        return "Email já está em uso";
    }

    protected function getDefaultErrorCode(): string{
        return "EMAIL_IN_USE";
    }

    protected function getDefaultHttpStatusCode(): int{
        return Response::HTTP_CONFLICT;
    }
}
