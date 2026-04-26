package com.devops.order_service.application.exception;

public class CancellationNotAllowedException extends RuntimeException {
    public CancellationNotAllowedException(String reason) {
        super("Cancelamento não permitido: " + reason);
    }
}
