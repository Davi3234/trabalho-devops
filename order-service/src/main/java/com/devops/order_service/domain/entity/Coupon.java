package com.devops.order_service.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "discount_percentage", precision = 5)
    private Double discountPercentage;

    @Column(name = "single_use", nullable = false)
    private boolean singleUse;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
