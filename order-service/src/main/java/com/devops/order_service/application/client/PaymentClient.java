package com.devops.order_service.application.client;

import java.math.BigDecimal;
import java.util.Map;

public interface PaymentClient {
    void processarPagamento(Long orderId, BigDecimal amount, String method, Map<String, Object> paymentData);
}
