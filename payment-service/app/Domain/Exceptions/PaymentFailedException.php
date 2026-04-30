<?php

namespace App\Domain\Exceptions;

use Illuminate\Http\Response;

class PaymentFailedException extends DomainException{
    protected string $errorCode = 'PAYMENT_FAILED';
    protected int $httpStatus = Response::HTTP_BAD_REQUEST;

    public function __construct(string $message = 'Pagamento falhou'){
        parent::__construct($message);
    }
}
