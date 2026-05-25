package com.devops.order_service.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOrderRequest {

    @NotNull(message = "customerId é obrigatório")
    private Long customerId;

    @NotEmpty(message = "O pedido deve conter ao menos um item")
    @Valid
    private List<OrderItemRequest> items;

    @NotNull(message = "shippingCost é obrigatório")
    @Positive(message = "shippingCost deve ser positivo")
    private BigDecimal shippingCost;

    private String couponCode;

    @NotNull(message = "paymentMethod é obrigatório")
    @Pattern(regexp = "credit_card|pix|boleto", message = "paymentMethod deve ser credit_card, pix ou boleto")
    private String paymentMethod;

    private Map<String, Object> paymentData;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemRequest {

        @NotNull(message = "productId é obrigatório")
        private Long productId;

        @NotNull(message = "productName é obrigatório")
        private String productName;

        @NotNull(message = "quantity é obrigatório")
        @Positive(message = "quantity deve ser positivo")
        private Integer quantity;

        @NotNull(message = "unitPrice é obrigatório")
        @Positive(message = "unitPrice deve ser positivo")
        private BigDecimal unitPrice;
    }
}
