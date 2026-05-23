package com.devops.order_service.infrastructure.messaging;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class OrderEventListener {

    @EventListener
    public void handleOrderEvent(OrderDomainEvent event) {
        log.info("[EVENTO] tipo={} | orderId={} | status={}",
                event.getType(),
                event.getOrder().getId(),
                event.getOrder().getStatus());
    }
}
