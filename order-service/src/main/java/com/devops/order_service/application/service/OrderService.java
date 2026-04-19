package com.devops.order_service.application.service;

import com.devops.order_service.application.dto.CreateOrderRequest;
import com.devops.order_service.application.exception.*;
import com.devops.order_service.domain.entity.*;
import com.devops.order_service.domain.repository.CouponRepository;
import com.devops.order_service.domain.repository.CouponUsageRepository;
import com.devops.order_service.domain.repository.OrderRepository;
import com.devops.order_service.infrastructure.messaging.OrderEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;
    private final OrderEventPublisher eventPublisher;

    private static final BigDecimal MINIMUM_ORDER_VALUE = new BigDecimal("10.00");

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        Order order = Order.builder()
                .customerId(request.getCustomerId())
                .status(OrderStatus.PENDENTE)
                .shippingCost(request.getShippingCost())
                .discount(BigDecimal.ZERO)
                .build();

        for (CreateOrderRequest.OrderItemRequest itemReq : request.getItems()) {
            OrderItem item = OrderItem.builder()
                    .productId(itemReq.getProductId())
                    .productName(itemReq.getProductName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .build();
            order.addItem(item);
        }

        BigDecimal itemsTotal = order.calculateItemsTotal();

        if (itemsTotal.compareTo(MINIMUM_ORDER_VALUE) < 0) {
            throw new MinimumOrderValueException();
        }

        BigDecimal discount = BigDecimal.ZERO;
        if (request.getCouponCode() != null && !request.getCouponCode().isBlank()) {
            discount = applyCoupon(request.getCouponCode(), request.getCustomerId(), itemsTotal);
            order.setCouponCode(request.getCouponCode());
        }

        order.setDiscount(discount);
        order.setTotalAmount(itemsTotal.subtract(discount).add(request.getShippingCost()));

        Order savedOrder = orderRepository.save(order);

        eventPublisher.publishOrderCreated(savedOrder);
        log.info("Pedido {} criado com sucesso para cliente {}", savedOrder.getId(), savedOrder.getCustomerId());

        return savedOrder;
    }

    @Transactional
    public void cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (!order.isCancellable()) {
            throw new CancellationNotAllowedException(
                    "O pedido está com status " + order.getStatus() + " e não pode ser cancelado.");
        }

        if (!order.isWithinCancellationWindow()) {
            throw new CancellationNotAllowedException(
                    "A janela de cancelamento de 30 minutos expirou.");
        }

        order.setStatus(OrderStatus.CANCELADO);
        orderRepository.save(order);

        eventPublisher.publishOrderCancelled(order);
        log.info("Pedido {} cancelado pelo cliente", orderId);
    }

    @Transactional(readOnly = true)
    public List<Order> getOrderHistory(Long customerId, OrderStatus status,
                                       LocalDateTime startDate, LocalDateTime endDate) {
        return orderRepository.findByFilters(customerId, status, startDate, endDate);
    }

    private BigDecimal applyCoupon(String couponCode, Long customerId, BigDecimal itemsTotal) {
        Coupon coupon = couponRepository.findByCode(couponCode)
                .orElseThrow(() -> new InvalidCouponException("Cupom não encontrado: " + couponCode));

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidCouponException("Cupom expirado.");
        }

        if (coupon.isSingleUse() && coupon.isUsed()) {
            throw new InvalidCouponException("Cupom de uso único já foi utilizado.");
        }

        boolean alreadyUsedByCustomer = couponUsageRepository.existsByCouponIdAndCustomerId(coupon.getId(), customerId);
        if (alreadyUsedByCustomer) {
            throw new InvalidCouponException("Este cupom já foi utilizado por este cliente.");
        }

        BigDecimal discountValue = itemsTotal
                .multiply(BigDecimal.valueOf(coupon.getDiscountPercentage()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        return discountValue;
    }
}
