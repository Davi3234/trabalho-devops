package com.devops.order_service;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class OrderServiceApplicationTests {

	@MockitoBean
	RabbitTemplate rabbitTemplate;

	@Test
	void contextLoads() {
	}

}
