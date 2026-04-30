<?php

namespace App\Domain\Exceptions;

abstract class DomainException extends \Exception{
    protected string $errorCode;
    protected int $httpStatus;

    public function getErrorCode(): string{
        return $this->errorCode;
    }

    public function getHttpStatus(): int{
        return $this->httpStatus;
    }
}
