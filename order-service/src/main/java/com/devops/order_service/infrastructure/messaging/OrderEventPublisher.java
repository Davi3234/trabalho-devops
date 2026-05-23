package com.devops.order_service.infrastructure.messaging;

<<<<<<< HEAD
import com.devops.order_service.domain.entity.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

=======
import java.util.HashMap;
import java.util.Map;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import com.devops.order_service.domain.entity.Order;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

>>>>>>> origin/main
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public void publishOrderCreated(Order order) {
<<<<<<< HEAD
        publish(OrderDomainEvent.Type.CREATED, order);
    }

    public void publishOrderAprove(Order order) {
        publish(OrderDomainEvent.Type.APPROVED, order);
    }

    public void publishOrderCancelled(Order order) {
        publish(OrderDomainEvent.Type.CANCELLED, order);
    }

    public void publishOrderPaid(Order order) {
        publish(OrderDomainEvent.Type.PAID, order);
    }

    public void publishOrderDispatched(Order order) {
        publish(OrderDomainEvent.Type.DISPATCHED, order);
=======
        publish("order.pedido.criado", buildPayload(order));
    }

    public void publishOrderAprove(Order order) {
        publish("order.pedido.aprovado", buildPayload(order));
    }

    public void publishOrderCancelled(Order order) {
        publish("order.pedido.cancelado", buildPayload(order));
    }

    public void publishOrderPaid(Order order) {
        publish("order.pedido.pago", buildPayload(order));
    }

    public void publishOrderDispatched(Order order) {
        publish("order.pedido.despachado", buildPayload(order));
>>>>>>> origin/main
    }

    private void publish(OrderDomainEvent.Type type, Order order) {
        applicationEventPublisher.publishEvent(new OrderDomainEvent(this, order, type));
        log.info("Evento publicado: tipo={}, orderId={}, status={}", type, order.getId(), order.getStatus());
    }
}
