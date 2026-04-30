package com.devops.order_service.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "coupon_usages", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "coupon_id", "customer_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;
}
