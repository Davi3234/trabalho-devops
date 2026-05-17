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

        @Query(value = "SELECT * FROM orders WHERE customer_id = :customerId " +
                        "AND status = :status " +
                        "AND (CAST(:startDate AS timestamp) IS NULL OR created_at >= CAST(:startDate AS timestamp)) " +
                        "AND (CAST(:endDate AS timestamp) IS NULL OR created_at <= CAST(:endDate AS timestamp)) " +
                        "ORDER BY created_at DESC", nativeQuery = true)
        List<Order> findByFilters(
                        @Param("customerId") Long customerId,
                        @Param("status") String status,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        @Query(value = "SELECT * FROM orders WHERE customer_id = :customerId " +
                        "AND (CAST(:startDate AS timestamp) IS NULL OR created_at >= CAST(:startDate AS timestamp)) " +
                        "AND (CAST(:endDate AS timestamp) IS NULL OR created_at <= CAST(:endDate AS timestamp)) " +
                        "ORDER BY created_at DESC", nativeQuery = true)
        List<Order> findByCustomerIdAndDateRange(
                        @Param("customerId") Long customerId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        @Query("SELECT o FROM Order o WHERE o.status = :status AND o.updatedAt <= :threshold")
        List<Order> findByStatusAndUpdatedAtBefore(
                        @Param("status") OrderStatus status,
                        @Param("threshold") LocalDateTime threshold);
}
