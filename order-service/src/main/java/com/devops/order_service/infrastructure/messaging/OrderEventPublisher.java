package com.devops.order_service.infrastructure.messaging;

import java.util.HashMap;
import java.util.Map;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.devops.order_service.domain.entity.Order;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    private static final String EXCHANGE = "order.events";

    public void publishOrderCreated(Order order) {
        publish("order.pedido.criado", buildPayload(order));
    }

    public void publishOrderCancelled(Order order) {
        publish("order.pedido.cancelado", buildPayload(order));
    }

    public void publishOrderPaid(Order order) {
        publish("order.pedido.pago", buildPayload(order));
    }

    public void publishOrderDispatched(Order order) {
        publish("order.pedido.despachado", buildPayload(order));
    }

    private void publish(String routingKey, Map<String, Object> payload) {
        try {
            String message = objectMapper.writeValueAsString(payload);
            rabbitTemplate.convertAndSend(EXCHANGE, routingKey, message);
            log.info("Evento publicado: exchange={}, routingKey={}, orderId={}", EXCHANGE, routingKey, payload.get("orderId"));
        } catch (Exception e) {
            log.error("Erro ao publicar evento {}: {}", routingKey, e.getMessage(), e);
        }
    }

    private Map<String, Object> buildPayload(Order order) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("orderId", order.getId());
        payload.put("customerId", order.getCustomerId());
        payload.put("status", order.getStatus().name());
        payload.put("totalAmount", order.getTotalAmount());
        payload.put("shippingCost", order.getShippingCost());
        payload.put("discount", order.getDiscount());
        payload.put("couponCode", order.getCouponCode());

        var items = order.getItems().stream().map(item -> {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("productId", item.getProductId());
            itemMap.put("productName", item.getProductName());
            itemMap.put("quantity", item.getQuantity());
            itemMap.put("unitPrice", item.getUnitPrice());
            return itemMap;
        }).toList();

        payload.put("items", items);
        return payload;
    }
}
