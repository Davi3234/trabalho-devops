<?php

namespace App\Domain\Payment\ValueObject;

enum EnumPayment{

    const PAYMENT_METHOD_CARTAO = 'credit_card',
          PAYMENT_METHOD_PIX = 'pix',
          PAYMENT_METHOD_BOLETO = 'boleto';
    
    const PAYMENT_STATUS_PENDING = 'pending',
          PAYMENT_STATUS_CONFIRMED = 'confirmed',
          PAYMENT_STATUS_FAILED = 'failed',
          PAYMENT_STATUS_REFUNDED = 'refunded';

}
