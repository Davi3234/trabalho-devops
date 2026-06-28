package com.devops.order_service.domain.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OrderTest {

    private Order orderWithStatus(OrderStatus status) {
        Order order = Order.builder()
                .customerId(1L)
                .status(status)
                .shippingCost(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.TEN)
                .build();
        order.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        order.setUpdatedAt(LocalDateTime.now());
        return order;
    }

    @Nested
    @DisplayName("isCancellable")
    class IsCancellable {

        @Test
        @DisplayName("retorna true para status PENDENTE")
        void trueWhenPendente() {
            assertThat(orderWithStatus(OrderStatus.PENDENTE).isCancellable()).isTrue();
        }

        @Test
        @DisplayName("retorna true para status RESERVADO")
        void trueWhenReservado() {
            assertThat(orderWithStatus(OrderStatus.RESERVADO).isCancellable()).isTrue();
        }

        @Test
        @DisplayName("retorna false para status PAGO")
        void falseWhenPago() {
            assertThat(orderWithStatus(OrderStatus.PAGO).isCancellable()).isFalse();
        }

        @Test
        @DisplayName("retorna false para status DESPACHADO")
        void falseWhenDespachado() {
            assertThat(orderWithStatus(OrderStatus.DESPACHADO).isCancellable()).isFalse();
        }

        @Test
        @DisplayName("retorna false para status ENTREGUE")
        void falseWhenEntregue() {
            assertThat(orderWithStatus(OrderStatus.ENTREGUE).isCancellable()).isFalse();
        }

        @Test
        @DisplayName("retorna false para status CANCELADO")
        void falseWhenCancelado() {
            assertThat(orderWithStatus(OrderStatus.CANCELADO).isCancellable()).isFalse();
        }
    }

    @Nested
    @DisplayName("isWithinCancellationWindow")
    class IsWithinCancellationWindow {

        @Test
        @DisplayName("retorna true quando criado há menos de 30 minutos")
        void trueWhenWithin30Min() {
            Order order = orderWithStatus(OrderStatus.PENDENTE);
            order.setCreatedAt(LocalDateTime.now().minusMinutes(10));

            assertThat(order.isWithinCancellationWindow()).isTrue();
        }

        @Test
        @DisplayName("retorna false quando criado há mais de 30 minutos")
        void falseWhenOutside30Min() {
            Order order = orderWithStatus(OrderStatus.PENDENTE);
            order.setCreatedAt(LocalDateTime.now().minusMinutes(31));

            assertThat(order.isWithinCancellationWindow()).isFalse();
        }

        @Test
        @DisplayName("retorna false quando createdAt é null")
        void falseWhenCreatedAtNull() {
            Order order = orderWithStatus(OrderStatus.PENDENTE);
            order.setCreatedAt(null);

            assertThat(order.isWithinCancellationWindow()).isFalse();
        }
    }

    @Nested
    @DisplayName("calculateItemsTotal")
    class CalculateItemsTotal {

        @Test
        @DisplayName("soma corretamente o total dos itens")
        void sumsCorrectly() {
            Order order = orderWithStatus(OrderStatus.PENDENTE);

            OrderItem item1 = OrderItem.builder()
                    .productId(1L).productName("A").unitPrice(BigDecimal.valueOf(50.0)).quantity(2).build();
            OrderItem item2 = OrderItem.builder()
                    .productId(2L).productName("B").unitPrice(BigDecimal.valueOf(30.0)).quantity(3).build();

            order.addItem(item1);
            order.addItem(item2);

            assertThat(order.calculateItemsTotal()).isEqualByComparingTo("190.00");
        }

        @Test
        @DisplayName("retorna zero quando sem itens")
        void returnsZeroWhenEmpty() {
            Order order = orderWithStatus(OrderStatus.PENDENTE);

            assertThat(order.calculateItemsTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    @Nested
    @DisplayName("calculateFinalAmount")
    class CalculateFinalAmount {

        @Test
        @DisplayName("total = itens - desconto + frete")
        void calculatesCorrectly() {
            Order order = Order.builder()
                    .customerId(1L).status(OrderStatus.PENDENTE)
                    .shippingCost(BigDecimal.valueOf(10.0))
                    .discount(BigDecimal.valueOf(5.0))
                    .totalAmount(BigDecimal.ZERO)
                    .build();

            OrderItem item = OrderItem.builder()
                    .productId(1L).productName("P").unitPrice(BigDecimal.valueOf(50.0)).quantity(2).build();
            order.addItem(item);

            assertThat(order.calculateFinalAmount()).isEqualByComparingTo("105.00");
        }
    }

    @Nested
    @DisplayName("addItem")
    class AddItem {

        @Test
        @DisplayName("adiciona item e seta a referência ao pedido")
        void addsItemAndSetsOrder() {
            Order order = orderWithStatus(OrderStatus.PENDENTE);
            OrderItem item = OrderItem.builder()
                    .productId(1L).productName("P").unitPrice(BigDecimal.TEN).quantity(1).build();

            order.addItem(item);

            assertThat(order.getItems()).hasSize(1);
            assertThat(item.getOrder()).isSameAs(order);
        }
    }
}
