package com.devops.order_service.application.service;

import com.devops.order_service.application.exception.OrderNotFoundException;
import com.devops.order_service.domain.entity.*;
import com.devops.order_service.domain.repository.CouponRepository;
import com.devops.order_service.domain.repository.CouponUsageRepository;
import com.devops.order_service.domain.repository.OrderRepository;
import com.devops.order_service.infrastructure.messaging.OrderEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderStateService {

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderEventPublisher eventPublisher;

    @Transactional
    public void handleStockReservationFailed(Long orderId) {
        Order order = findOrder(orderId);
        order.setStatus(OrderStatus.CANCELADO);
        orderRepository.save(order);
        eventPublisher.publishOrderCancelled(order);
        log.info("Pedido {} cancelado por falha na reserva de estoque", orderId);
    }

    @Transactional
    public void handlePaymentRejected(Long orderId) {
        Order order = findOrder(orderId);
        order.setStatus(OrderStatus.CANCELADO);
        orderRepository.save(order);
        eventPublisher.publishOrderCancelled(order);
        log.info("Pedido {} cancelado por pagamento recusado", orderId);
    }

    @Transactional
    public void handlePaymentConfirmed(Long orderId) {
        Order order = findOrder(orderId);
        order.setStatus(OrderStatus.PAGO);
        orderRepository.save(order);

        invalidateSingleUseCoupon(order);

        eventPublisher.publishOrderPaid(order);
        log.info("Pedido {} marcado como pago", orderId);
    }

    @Transactional
    public void handleDeliveryDispatched(Long orderId) {
        Order order = findOrder(orderId);
        order.setStatus(OrderStatus.DESPACHADO);
        orderRepository.save(order);
        eventPublisher.publishOrderDispatched(order);
        log.info("Pedido {} marcado como despachado", orderId);
    }

    @Transactional
    public void handleReservationTimeout(Long orderId) {
        Order order = findOrder(orderId);
        if (order.getStatus() == OrderStatus.RESERVADO) {
            order.setStatus(OrderStatus.CANCELADO);
            orderRepository.save(order);
            eventPublisher.publishOrderCancelled(order);
            log.info("Pedido {} cancelado por timeout de reserva (15 min)", orderId);
        }
    }

    private void invalidateSingleUseCoupon(Order order) {
        if (order.getCouponCode() != null && !order.getCouponCode().isBlank()) {
            couponRepository.findByCode(order.getCouponCode()).ifPresent(coupon -> {
                if (coupon.isSingleUse()) {
                    coupon.setUsed(true);
                    couponRepository.save(coupon);
                    log.info("Cupom {} marcado como usado (uso único)", coupon.getCode());
                }

                CouponUsage usage = CouponUsage.builder()
                        .couponId(coupon.getId())
                        .customerId(order.getCustomerId())
                        .orderId(order.getId())
                        .build();
                couponUsageRepository.save(usage);
            });
        }
    }

    private Order findOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
}
