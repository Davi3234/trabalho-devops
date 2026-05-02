package com.devops.order_service.infrastructure.messaging;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.devops.order_service.application.service.OrderStateService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventListener {

    private final OrderStateService orderStateService;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${rabbitmq.queues.estoque-reserva-falhou}")
    public void handleEstoqueReservaFalhou(String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            Long orderId = json.get("pedidoId").asLong();
            log.info("Evento recebido: inventory.reserva.falhou para pedido {}", orderId);
            orderStateService.handleStockReservationFailed(orderId);
        } catch (Exception e) {
            log.error("Erro ao processar inventory.reserva.falhou: {}", e.getMessage(), e);
        }
    }

    @RabbitListener(queues = "${rabbitmq.queues.pagamento-recusado}")
    public void handlePagamentoRecusado(String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            Long orderId = json.get("orderId").asLong();
            log.info("Evento recebido: pagamento.recusado para pedido {}", orderId);
            orderStateService.handlePaymentRejected(orderId);
        } catch (Exception e) {
            log.error("Erro ao processar payment.pagamento.recusado: {}", e.getMessage(), e);
        }
    }

    @RabbitListener(queues = "${rabbitmq.queues.pagamento-confirmado}")
    public void handlePagamentoConfirmado(String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            Long orderId = json.get("orderId").asLong();
            log.info("Evento recebido: pagamento.confirmado para pedido {}", orderId);
            orderStateService.handlePaymentConfirmed(orderId);
        } catch (Exception e) {
            log.error("Erro ao processar payment.pagamento.confirmado: {}", e.getMessage(), e);
        }
    }

    @RabbitListener(queues = "${rabbitmq.queues.entrega-despachada}")
    public void handleEntregaDespachada(String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            Long orderId = json.get("orderId").asLong();
            log.info("Evento recebido: delivery.entrega.despachada para pedido {}", orderId);
            orderStateService.handleDeliveryDispatched(orderId);
        } catch (Exception e) {
            log.error("Erro ao processar delivery.entrega.despachada: {}", e.getMessage(), e);
        }
    }
}
