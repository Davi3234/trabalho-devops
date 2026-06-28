package com.devops.order_service.api.controller;

import com.devops.order_service.application.exception.CancellationNotAllowedException;
import com.devops.order_service.application.exception.OrderNotFoundException;
import com.devops.order_service.application.service.OrderService;
import com.devops.order_service.domain.entity.Order;
import com.devops.order_service.domain.entity.OrderStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private OrderService orderService;

    private Order buildOrder(Long id) {
        Order order = Order.builder()
                .customerId(456L)
                .status(OrderStatus.PENDENTE)
                .shippingCost(BigDecimal.valueOf(10.0))
                .discount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(110.0))
                .build();
        order.setId(id);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        if (order.getItems() == null) {
            order.setItems(new ArrayList<>());
        }
        return order;
    }

    private String validCreateBody() {
        return """
                {
                  "customerId": 456,
                  "shippingCost": 10.0,
                  "items": [
                    {
                      "productId": 123,
                      "productName": "Product A",
                      "unitPrice": 50.0,
                      "quantity": 2
                    }
                  ]
                }
                """;
    }

    @Nested
    @DisplayName("POST /api/orders")
    class CreateOrder {

        @Test
        @DisplayName("201 Created com corpo válido")
        void returns201() throws Exception {
            Order order = buildOrder(1L);
            when(orderService.createOrder(any())).thenReturn(order);

            mockMvc.perform(post("/api/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(validCreateBody()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.status").value("PENDENTE"));
        }

        @Test
        @DisplayName("400 Bad Request quando customerId está ausente")
        void returns400WhenCustomerIdMissing() throws Exception {
            String body = """
                    {
                      "shippingCost": 10.0,
                      "items": [
                        { "productId": 1, "productName": "P", "unitPrice": 50.0, "quantity": 1 }
                      ]
                    }
                    """;

            mockMvc.perform(post("/api/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.customerId").exists());
        }

        @Test
        @DisplayName("400 Bad Request quando lista de itens está vazia")
        void returns400WhenItemsEmpty() throws Exception {
            String body = """
                    {
                      "customerId": 456,
                      "shippingCost": 10.0,
                      "items": []
                    }
                    """;

            mockMvc.perform(post("/api/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.items").exists());
        }

        @Test
        @DisplayName("400 Bad Request quando shippingCost está ausente")
        void returns400WhenShippingCostMissing() throws Exception {
            String body = """
                    {
                      "customerId": 456,
                      "items": [
                        { "productId": 1, "productName": "P", "unitPrice": 50.0, "quantity": 1 }
                      ]
                    }
                    """;

            mockMvc.perform(post("/api/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.details.shippingCost").exists());
        }
    }

    @Nested
    @DisplayName("GET /api/orders")
    class GetAllOrders {

        @Test
        @DisplayName("200 OK com lista de pedidos")
        void returns200() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of(buildOrder(1L), buildOrder(2L)));

            mockMvc.perform(get("/api/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        @DisplayName("200 OK com lista vazia")
        void returns200WhenEmpty() throws Exception {
            when(orderService.getAllOrders()).thenReturn(List.of());

            mockMvc.perform(get("/api/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    @Nested
    @DisplayName("GET /api/orders/{id}")
    class GetOrderById {

        @Test
        @DisplayName("200 OK quando pedido encontrado")
        void returns200() throws Exception {
            when(orderService.getOrderById(1L)).thenReturn(Optional.of(buildOrder(1L)));

            mockMvc.perform(get("/api/orders/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.customerId").value(456));
        }

        @Test
        @DisplayName("404 Not Found quando pedido não existe")
        void returns404() throws Exception {
            when(orderService.getOrderById(99L)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/orders/99"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("DELETE /api/orders/{id}")
    class DeleteOrder {

        @Test
        @DisplayName("204 No Content quando pedido deletado")
        void returns204() throws Exception {
            doNothing().when(orderService).deleteOrder(1L);

            mockMvc.perform(delete("/api/orders/1"))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("404 Not Found quando pedido não existe")
        void returns404() throws Exception {
            doThrow(new OrderNotFoundException(99L)).when(orderService).deleteOrder(99L);

            mockMvc.perform(delete("/api/orders/99"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("POST /api/orders/{id}/cancel")
    class CancelOrder {

        @Test
        @DisplayName("204 No Content quando cancelamento bem sucedido")
        void returns204() throws Exception {
            doNothing().when(orderService).cancelOrder(1L);

            mockMvc.perform(post("/api/orders/1/cancel"))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("404 Not Found quando pedido não existe")
        void returns404() throws Exception {
            doThrow(new OrderNotFoundException(99L)).when(orderService).cancelOrder(99L);

            mockMvc.perform(post("/api/orders/99/cancel"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("422 Unprocessable Entity quando cancelamento não é permitido")
        void returns422() throws Exception {
            doThrow(new CancellationNotAllowedException("status PAGO"))
                    .when(orderService).cancelOrder(1L);

            mockMvc.perform(post("/api/orders/1/cancel"))
                    .andExpect(status().isUnprocessableEntity());
        }
    }

    @Nested
    @DisplayName("GET /api/orders/history/{customerId}")
    class GetOrderHistory {

        @Test
        @DisplayName("200 OK com histórico de pedidos do cliente")
        void returns200() throws Exception {
            when(orderService.getOrderHistory(eq(456L), isNull(), isNull(), isNull()))
                    .thenReturn(List.of(buildOrder(1L), buildOrder(2L)));

            mockMvc.perform(get("/api/orders/history/456"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        @DisplayName("200 OK filtrado por status")
        void returns200WithStatusFilter() throws Exception {
            when(orderService.getOrderHistory(eq(456L), eq(OrderStatus.PENDENTE), isNull(), isNull()))
                    .thenReturn(List.of(buildOrder(1L)));

            mockMvc.perform(get("/api/orders/history/456").param("status", "PENDENTE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));
        }

        @Test
        @DisplayName("200 OK lista vazia quando cliente sem pedidos")
        void returns200WhenEmpty() throws Exception {
            when(orderService.getOrderHistory(eq(999L), isNull(), isNull(), isNull()))
                    .thenReturn(List.of());

            mockMvc.perform(get("/api/orders/history/999"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }
}
