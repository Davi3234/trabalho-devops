package com.devops.order_service.infrastructure.http;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.devops.order_service.application.client.PaymentClient;
import com.devops.order_service.application.exception.PaymentProcessingException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class PaymentHttpClient implements PaymentClient {

    private final RestClient restClient;

    public PaymentHttpClient(@Value("${payment.service.url}") String paymentUrl) {
        this.restClient = RestClient.create(paymentUrl);
    }

    @Override
    public void processarPagamento(Long orderId, BigDecimal amount, String method, Map<String, Object> paymentData) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("order_id", orderId.toString());
        requestBody.put("amount", amount);
        requestBody.put("method", method);
        requestBody.put("payment_data", paymentData != null ? paymentData : Map.of());

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/process")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !Boolean.TRUE.equals(response.get("success"))) {
                throw new PaymentProcessingException("Pagamento não confirmado pelo serviço de pagamento.");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) response.get("data");
            String status = data != null ? (String) data.get("status") : null;

            if (!"confirmed".equals(status)) {
                throw new PaymentProcessingException("Pagamento recusado. Status: " + status);
            }

            log.info("Pagamento confirmado para o pedido {}", orderId);

        } catch (HttpClientErrorException ex) {
            log.error("Erro ao processar pagamento para o pedido {}: {}", orderId, ex.getMessage());
            throw new PaymentProcessingException("Não foi possível processar o pagamento: " + ex.getMessage());
        }
    }
}
