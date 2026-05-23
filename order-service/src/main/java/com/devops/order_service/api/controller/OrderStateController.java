package com.devops.order_service.api.controller;

import com.devops.order_service.application.service.OrderStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders/{orderId}/events")
@RequiredArgsConstructor
public class OrderStateController {

    private final OrderStateService orderStateService;

    @PostMapping("/stock-reserved")
    public ResponseEntity<Void> stockReserved(@PathVariable Long orderId) {
        orderStateService.handleStockReserved(orderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/stock-failed")
    public ResponseEntity<Void> stockFailed(@PathVariable Long orderId) {
        orderStateService.handleStockReservationFailed(orderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/payment-confirmed")
    public ResponseEntity<Void> paymentConfirmed(@PathVariable Long orderId) {
        orderStateService.handlePaymentConfirmed(orderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/payment-rejected")
    public ResponseEntity<Void> paymentRejected(@PathVariable Long orderId) {
        orderStateService.handlePaymentRejected(orderId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/delivery-dispatched")
    public ResponseEntity<Void> deliveryDispatched(@PathVariable Long orderId) {
        orderStateService.handleDeliveryDispatched(orderId);
        return ResponseEntity.ok().build();
    }
}
