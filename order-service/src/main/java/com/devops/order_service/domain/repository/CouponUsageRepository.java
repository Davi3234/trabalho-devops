package com.devops.order_service.domain.repository;

import com.devops.order_service.domain.entity.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {

    boolean existsByCouponIdAndCustomerId(Long couponId, Long customerId);
}
