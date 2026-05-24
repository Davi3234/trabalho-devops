package com.devops.order_service.infrastructure.messaging;

import com.devops.order_service.domain.entity.Order;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public void publishOrderCreated(Order order) {
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
    }

    private void publish(OrderDomainEvent.Type type, Order order) {
        applicationEventPublisher.publishEvent(new OrderDomainEvent(this, order, type));
        log.info("Evento publicado: tipo={}, orderId={}, status={}", type, order.getId(), order.getStatus());
    }
}
