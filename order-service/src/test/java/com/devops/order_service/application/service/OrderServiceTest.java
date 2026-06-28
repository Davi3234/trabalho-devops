package com.devops.order_service.application.service;

import com.devops.order_service.application.dto.CreateOrderRequest;
import com.devops.order_service.application.exception.*;
import com.devops.order_service.domain.entity.*;
import com.devops.order_service.domain.repository.CouponRepository;
import com.devops.order_service.domain.repository.CouponUsageRepository;
import com.devops.order_service.domain.repository.OrderRepository;
import com.devops.order_service.infrastructure.messaging.OrderEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CouponUsageRepository couponUsageRepository;

    @Mock
    private OrderEventPublisher eventPublisher;

    @InjectMocks
    private OrderService orderService;

    private CreateOrderRequest buildRequest(double unitPrice, int qty) {
        CreateOrderRequest.OrderItemRequest item = CreateOrderRequest.OrderItemRequest.builder()
                .productId(1L)
                .productName("Produto Teste")
                .unitPrice(BigDecimal.valueOf(unitPrice))
                .quantity(qty)
                .build();

        return CreateOrderRequest.builder()
                .customerId(10L)
                .shippingCost(BigDecimal.valueOf(5.0))
                .items(List.of(item))
                .build();
    }

    private Order savedOrder(Long id) {
        Order order = Order.builder()
                .customerId(10L)
                .status(OrderStatus.PENDENTE)
                .shippingCost(BigDecimal.valueOf(5.0))
                .discount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(105.0))
                .build();
        order.setId(id);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        return order;
    }

    @Nested
    @DisplayName("createOrder")
    class CreateOrder {

        @Test
        @DisplayName("cria pedido com sucesso e publica evento")
        void success() {
            CreateOrderRequest req = buildRequest(50.0, 2);
            Order persisted = savedOrder(1L);
            when(orderRepository.save(any())).thenReturn(persisted);

            Order result = orderService.createOrder(req);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            verify(orderRepository).save(any(Order.class));
            verify(eventPublisher).publishOrderCreated(persisted);
        }

        @Test
        @DisplayName("lança MinimumOrderValueException quando total dos itens < R$10")
        void throwsWhenBelowMinimum() {
            CreateOrderRequest req = buildRequest(3.0, 1);

            assertThatThrownBy(() -> orderService.createOrder(req))
                    .isInstanceOf(MinimumOrderValueException.class);

            verifyNoInteractions(orderRepository, eventPublisher);
        }

        @Test
        @DisplayName("aplica desconto de cupom válido")
        void withValidCoupon() {
            CreateOrderRequest req = CreateOrderRequest.builder()
                    .customerId(10L)
                    .shippingCost(BigDecimal.valueOf(5.0))
                    .couponCode("DESC10")
                    .items(List.of(CreateOrderRequest.OrderItemRequest.builder()
                            .productId(1L).productName("P").unitPrice(BigDecimal.valueOf(100.0)).quantity(1).build()))
                    .build();

            Coupon coupon = Coupon.builder()
                    .id(1L).code("DESC10").discountPercentage(10.0)
                    .singleUse(false).used(false).build();

            when(couponRepository.findByCode("DESC10")).thenReturn(Optional.of(coupon));
            when(couponUsageRepository.existsByCouponIdAndCustomerId(1L, 10L)).thenReturn(false);
            Order persisted = savedOrder(2L);
            when(orderRepository.save(any())).thenReturn(persisted);

            Order result = orderService.createOrder(req);

            assertThat(result).isNotNull();
            ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
            verify(orderRepository).save(captor.capture());
            assertThat(captor.getValue().getDiscount()).isEqualByComparingTo("10.00");
            assertThat(captor.getValue().getTotalAmount()).isEqualByComparingTo("95.00");
        }

        @Test
        @DisplayName("lança InvalidCouponException quando cupom não encontrado")
        void throwsWhenCouponNotFound() {
            CreateOrderRequest req = buildRequest(50.0, 2);
            req.setCouponCode("INVALIDO");
            when(couponRepository.findByCode("INVALIDO")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.createOrder(req))
                    .isInstanceOf(InvalidCouponException.class)
                    .hasMessageContaining("Cupom não encontrado");
        }

        @Test
        @DisplayName("lança InvalidCouponException quando cupom expirado")
        void throwsWhenCouponExpired() {
            CreateOrderRequest req = buildRequest(50.0, 2);
            req.setCouponCode("EXPIRADO");

            Coupon coupon = Coupon.builder()
                    .id(1L).code("EXPIRADO").discountPercentage(10.0)
                    .singleUse(false).used(false)
                    .expiresAt(LocalDateTime.now().minusDays(1))
                    .build();
            when(couponRepository.findByCode("EXPIRADO")).thenReturn(Optional.of(coupon));

            assertThatThrownBy(() -> orderService.createOrder(req))
                    .isInstanceOf(InvalidCouponException.class)
                    .hasMessageContaining("expirado");
        }

        @Test
        @DisplayName("lança InvalidCouponException quando cupom de uso único já foi usado")
        void throwsWhenSingleUseAlreadyUsed() {
            CreateOrderRequest req = buildRequest(50.0, 2);
            req.setCouponCode("UNICO");

            Coupon coupon = Coupon.builder()
                    .id(1L).code("UNICO").discountPercentage(10.0)
                    .singleUse(true).used(true).build();
            when(couponRepository.findByCode("UNICO")).thenReturn(Optional.of(coupon));

            assertThatThrownBy(() -> orderService.createOrder(req))
                    .isInstanceOf(InvalidCouponException.class)
                    .hasMessageContaining("uso único");
        }

        @Test
        @DisplayName("lança InvalidCouponException quando cliente já usou o cupom")
        void throwsWhenAlreadyUsedByCustomer() {
            CreateOrderRequest req = buildRequest(50.0, 2);
            req.setCouponCode("USADO");

            Coupon coupon = Coupon.builder()
                    .id(1L).code("USADO").discountPercentage(10.0)
                    .singleUse(false).used(false).build();
            when(couponRepository.findByCode("USADO")).thenReturn(Optional.of(coupon));
            when(couponUsageRepository.existsByCouponIdAndCustomerId(1L, 10L)).thenReturn(true);

            assertThatThrownBy(() -> orderService.createOrder(req))
                    .isInstanceOf(InvalidCouponException.class)
                    .hasMessageContaining("já foi utilizado por este cliente");
        }
    }

    @Nested
    @DisplayName("cancelOrder")
    class CancelOrder {

        @Test
        @DisplayName("cancela pedido PENDENTE dentro da janela de 30 minutos")
        void success() {
            Order order = Order.builder()
                    .customerId(10L).status(OrderStatus.PENDENTE)
                    .shippingCost(BigDecimal.ZERO).discount(BigDecimal.ZERO)
                    .totalAmount(BigDecimal.TEN).build();
            order.setId(1L);
            order.setCreatedAt(LocalDateTime.now().minusMinutes(10));
            order.setUpdatedAt(LocalDateTime.now());

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
            when(orderRepository.save(any())).thenReturn(order);

            orderService.cancelOrder(1L);

            assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELADO);
            verify(eventPublisher).publishOrderCancelled(order);
        }

        @Test
        @DisplayName("lança OrderNotFoundException quando pedido não existe")
        void throwsWhenNotFound() {
            when(orderRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.cancelOrder(99L))
                    .isInstanceOf(OrderNotFoundException.class)
                    .hasMessageContaining("99");
        }

        @Test
        @DisplayName("lança CancellationNotAllowedException quando status não é cancelável")
        void throwsWhenNotCancellable() {
            Order order = Order.builder()
                    .customerId(10L).status(OrderStatus.PAGO)
                    .shippingCost(BigDecimal.ZERO).discount(BigDecimal.ZERO)
                    .totalAmount(BigDecimal.TEN).build();
            order.setId(1L);
            order.setCreatedAt(LocalDateTime.now().minusMinutes(5));

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

            assertThatThrownBy(() -> orderService.cancelOrder(1L))
                    .isInstanceOf(CancellationNotAllowedException.class)
                    .hasMessageContaining("PAGO");
        }

        @Test
        @DisplayName("lança CancellationNotAllowedException quando janela de 30 min expirou")
        void throwsWhenOutsideWindow() {
            Order order = Order.builder()
                    .customerId(10L).status(OrderStatus.PENDENTE)
                    .shippingCost(BigDecimal.ZERO).discount(BigDecimal.ZERO)
                    .totalAmount(BigDecimal.TEN).build();
            order.setId(1L);
            order.setCreatedAt(LocalDateTime.now().minusMinutes(31));

            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

            assertThatThrownBy(() -> orderService.cancelOrder(1L))
                    .isInstanceOf(CancellationNotAllowedException.class)
                    .hasMessageContaining("30 minutos");
        }
    }

    @Nested
    @DisplayName("getOrderById")
    class GetOrderById {

        @Test
        @DisplayName("retorna pedido quando encontrado")
        void returnsOrder() {
            Order order = savedOrder(1L);
            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

            Optional<Order> result = orderService.getOrderById(1L);

            assertThat(result).isPresent().contains(order);
        }

        @Test
        @DisplayName("retorna vazio quando não encontrado")
        void returnsEmpty() {
            when(orderRepository.findById(99L)).thenReturn(Optional.empty());

            Optional<Order> result = orderService.getOrderById(99L);

            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getAllOrders")
    class GetAllOrders {

        @Test
        @DisplayName("retorna todos os pedidos")
        void returnsList() {
            List<Order> orders = List.of(savedOrder(1L), savedOrder(2L));
            when(orderRepository.findAll()).thenReturn(orders);

            List<Order> result = orderService.getAllOrders();

            assertThat(result).hasSize(2);
        }
    }

    @Nested
    @DisplayName("deleteOrder")
    class DeleteOrder {

        @Test
        @DisplayName("deleta pedido com sucesso")
        void success() {
            Order order = savedOrder(1L);
            when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

            orderService.deleteOrder(1L);

            verify(orderRepository).delete(order);
        }

        @Test
        @DisplayName("lança OrderNotFoundException quando pedido não existe")
        void throwsWhenNotFound() {
            when(orderRepository.findById(5L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> orderService.deleteOrder(5L))
                    .isInstanceOf(OrderNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getOrderHistory – roteamento de queries")
    class GetOrderHistory {

        @Test
        @DisplayName("sem status e sem datas: chama findByCustomerIdOrderByCreatedAtDesc")
        void noStatusNoDate() {
            when(orderRepository.findByCustomerIdOrderByCreatedAtDesc(10L)).thenReturn(List.of());

            orderService.getOrderHistory(10L, null, null, null);

            verify(orderRepository).findByCustomerIdOrderByCreatedAtDesc(10L);
            verifyNoMoreInteractions(orderRepository);
        }

        @Test
        @DisplayName("com status sem datas: chama findByCustomerIdAndStatusOrderByCreatedAtDesc")
        void withStatusNoDate() {
            when(orderRepository.findByCustomerIdAndStatusOrderByCreatedAtDesc(10L, OrderStatus.PENDENTE))
                    .thenReturn(List.of());

            orderService.getOrderHistory(10L, OrderStatus.PENDENTE, null, null);

            verify(orderRepository).findByCustomerIdAndStatusOrderByCreatedAtDesc(10L, OrderStatus.PENDENTE);
            verifyNoMoreInteractions(orderRepository);
        }

        @Test
        @DisplayName("sem status com datas: chama findByCustomerIdAndDateRange")
        void noStatusWithDates() {
            LocalDateTime start = LocalDateTime.now().minusDays(7);
            LocalDateTime end = LocalDateTime.now();
            when(orderRepository.findByCustomerIdAndDateRange(10L, start, end)).thenReturn(List.of());

            orderService.getOrderHistory(10L, null, start, end);

            verify(orderRepository).findByCustomerIdAndDateRange(10L, start, end);
            verifyNoMoreInteractions(orderRepository);
        }

        @Test
        @DisplayName("com status e datas: chama findByFilters")
        void withStatusAndDates() {
            LocalDateTime start = LocalDateTime.now().minusDays(7);
            LocalDateTime end = LocalDateTime.now();
            when(orderRepository.findByFilters(10L, OrderStatus.PAGO, start, end)).thenReturn(List.of());

            orderService.getOrderHistory(10L, OrderStatus.PAGO, start, end);

            verify(orderRepository).findByFilters(10L, OrderStatus.PAGO, start, end);
            verifyNoMoreInteractions(orderRepository);
        }
    }
}
