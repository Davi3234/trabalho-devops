package com.devops.order_service.infrastructure.messaging;

import com.devops.order_service.domain.entity.Order;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class OrderDomainEvent extends ApplicationEvent {

    public enum Type {
        CREATED, APPROVED, CANCELLED, PAID, DISPATCHED
    }

    private final Order order;
    private final Type type;

    public OrderDomainEvent(Object source, Order order, Type type) {
        super(source);
        this.order = order;
        this.type = type;
    }
}
