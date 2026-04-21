package com.devops.order_service.infrastructure.scheduler;

import com.devops.order_service.application.service.OrderStateService;
import com.devops.order_service.domain.entity.Order;
import com.devops.order_service.domain.entity.OrderStatus;
import com.devops.order_service.domain.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationTimeoutScheduler {

    private final OrderRepository orderRepository;
    private final OrderStateService orderStateService;

    private static final int RESERVATION_TIMEOUT_MINUTES = 15;

    @Scheduled(fixedRate = 60000)
    public void checkReservationTimeouts() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(RESERVATION_TIMEOUT_MINUTES);
        List<Order> expiredOrders = orderRepository.findByStatusAndUpdatedAtBefore(
                OrderStatus.RESERVADO, threshold);

        for (Order order : expiredOrders) {
            try {
                orderStateService.handleReservationTimeout(order.getId());
            } catch (Exception e) {
                log.error("Erro ao processar timeout de reserva para pedido {}: {}",
                        order.getId(), e.getMessage(), e);
            }
        }

        if (!expiredOrders.isEmpty()) {
            log.info("Processados {} pedidos com timeout de reserva", expiredOrders.size());
        }
    }
}
