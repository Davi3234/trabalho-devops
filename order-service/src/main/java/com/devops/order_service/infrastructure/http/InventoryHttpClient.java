package com.devops.order_service.infrastructure.http;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.devops.order_service.application.client.InventoryClient;
import com.devops.order_service.application.dto.CreateOrderRequest;
import com.devops.order_service.application.exception.StockUnavailableException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class InventoryHttpClient implements InventoryClient {

    private final RestClient restClient;

    public InventoryHttpClient(@Value("${inventory.service.url}") String inventoryUrl) {
        this.restClient = RestClient.create(inventoryUrl);
    }

    @Override
    public void validarDisponibilidade(List<CreateOrderRequest.OrderItemRequest> items) {
        List<Long> produtoIds = items.stream()
                .map(CreateOrderRequest.OrderItemRequest::getProductId)
                .toList();

        Map<String, Object> requestBody = Map.of("produtoIds", produtoIds);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/estoque/disponibilidade")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new StockUnavailableException("Resposta inválida do serviço de inventário.");
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itens = (List<Map<String, Object>>) response.get("itens");

            Map<Long, Integer> disponivelPorProduto = new java.util.HashMap<>();
            if (itens != null) {
                for (Map<String, Object> item : itens) {
                    Long produtoId = ((Number) item.get("produtoId")).longValue();
                    int disponivel = ((Number) item.get("quantidadeDisponivel")).intValue();
                    disponivelPorProduto.put(produtoId, disponivel);
                }
            }

            for (CreateOrderRequest.OrderItemRequest item : items) {
                int disponivel = disponivelPorProduto.getOrDefault(item.getProductId(), 0);
                if (disponivel < item.getQuantity()) {
                    throw new StockUnavailableException(
                            String.format("Estoque insuficiente para o produto %d. Disponível: %d, Solicitado: %d",
                                    item.getProductId(), disponivel, item.getQuantity()));
                }
            }

            log.info("Disponibilidade validada para {} produto(s)", items.size());

        } catch (HttpClientErrorException ex) {
            log.error("Erro ao validar disponibilidade no inventário: {}", ex.getMessage());
            throw new StockUnavailableException("Não foi possível validar o estoque: " + ex.getMessage());
        }
    }

    public void reservarItens(Long pedidoId, List<CreateOrderRequest.OrderItemRequest> items) {
        List<Map<String, Object>> itens = items.stream()
                .map(item -> Map.<String, Object>of(
                        "produtoId", item.getProductId(),
                        "quantidade", item.getQuantity()))
                .toList();

        Map<String, Object> requestBody = Map.of(
                "pedidoId", pedidoId,
                "itens", itens);

        try {
            restClient.post()
                    .uri("/estoque/reservar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Estoque reservado para o pedido {}", pedidoId);

        } catch (HttpClientErrorException ex) {
            log.error("Erro ao reservar estoque para o pedido {}: {}", pedidoId, ex.getMessage());
            throw new StockUnavailableException("Não foi possível reservar o estoque: " + ex.getMessage());
        }
    }
}
