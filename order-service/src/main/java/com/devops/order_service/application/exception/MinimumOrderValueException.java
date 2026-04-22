package com.devops.order_service.application.exception;

public class MinimumOrderValueException extends RuntimeException {
    public MinimumOrderValueException() {
        super("O valor total dos itens deve ser no mínimo R$ 10,00.");
    }
}
