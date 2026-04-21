<?php

namespace App\Exceptions;

abstract class DomainException extends \Exception{

    protected string $errorCode;
    protected int $httpStatusCode;

    public function __construct(string $message = "", string $errorCode = "", int $httpStatusCode = 500){
        $this->errorCode = $errorCode ?: $this->getDefaultErrorCode();
        $this->httpStatusCode = $httpStatusCode ?: $this->getDefaultHttpStatusCode();

        parent::__construct($message ?: $this->getDefaultMessage());
    }

    abstract protected function getDefaultMessage(): string;
    abstract protected function getDefaultErrorCode(): string;
    abstract protected function getDefaultHttpStatusCode(): int;

    public function getErrorCode(): string{
        return $this->errorCode;
    }

    public function getHttpStatusCode(): int{
        return $this->httpStatusCode;
    }
}
