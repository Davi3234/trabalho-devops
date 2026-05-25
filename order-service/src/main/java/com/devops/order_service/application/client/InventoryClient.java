package com.devops.order_service.application.client;

import java.util.List;

import com.devops.order_service.application.dto.CreateOrderRequest;

public interface InventoryClient {
    void validarDisponibilidade(List<CreateOrderRequest.OrderItemRequest> items);

    void reservarItens(Long pedidoId, List<CreateOrderRequest.OrderItemRequest> items);
}
