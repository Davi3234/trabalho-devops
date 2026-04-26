package com.devops.order_service.application.exception;

public class InvalidCouponException extends RuntimeException {
    public InvalidCouponException(String reason) {
        super("Cupom inválido: " + reason);
    }
}
