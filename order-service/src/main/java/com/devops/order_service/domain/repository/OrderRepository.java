package com.devops.order_service.domain.repository;

import com.devops.order_service.domain.entity.Order;
import com.devops.order_service.domain.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

        List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

        List<Order> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, OrderStatus status);

        @Query("SELECT o FROM Order o WHERE o.customerId = :customerId " +
                        "AND o.status = :status " +
                        "AND (:startDate IS NULL OR o.createdAt >= :startDate) " +
                        "AND (:endDate IS NULL OR o.createdAt <= :endDate) " +
                        "ORDER BY o.createdAt DESC")
        List<Order> findByFilters(
                        @Param("customerId") Long customerId,
                        @Param("status") OrderStatus status,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        @Query("SELECT o FROM Order o WHERE o.customerId = :customerId " +
                        "AND (:startDate IS NULL OR o.createdAt >= :startDate) " +
                        "AND (:endDate IS NULL OR o.createdAt <= :endDate) " +
                        "ORDER BY o.createdAt DESC")
        List<Order> findByCustomerIdAndDateRange(
                        @Param("customerId") Long customerId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        @Query("SELECT o FROM Order o WHERE o.status = :status AND o.updatedAt <= :threshold")
        List<Order> findByStatusAndUpdatedAtBefore(
                        @Param("status") OrderStatus status,
                        @Param("threshold") LocalDateTime threshold);
}
