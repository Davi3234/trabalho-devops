package com.devops.order_service.application.exception;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(Long orderId) {
        super("Pedido não encontrado: " + orderId);
    }
}
