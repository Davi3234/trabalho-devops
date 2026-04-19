package com.devops.order_service.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.queues.estoque-reserva-falhou}")
    private String estoqueReservaFalhouQueue;

    @Value("${rabbitmq.queues.pagamento-recusado}")
    private String pagamentoRecusadoQueue;

    @Value("${rabbitmq.queues.pagamento-confirmado}")
    private String pagamentoConfirmadoQueue;

    @Value("${rabbitmq.queues.entrega-despachada}")
    private String entregaDespachadaQueue;

    // Exchange para eventos do order-service
    @Bean
    public TopicExchange orderEventsExchange() {
        return new TopicExchange("order.events");
    }

    // Filas que o order-service consome
    @Bean
    public Queue estoqueReservaFalhouQueue() {
        return QueueBuilder.durable(estoqueReservaFalhouQueue).build();
    }

    @Bean
    public Queue pagamentoRecusadoQueue() {
        return QueueBuilder.durable(pagamentoRecusadoQueue).build();
    }

    @Bean
    public Queue pagamentoConfirmadoQueue() {
        return QueueBuilder.durable(pagamentoConfirmadoQueue).build();
    }

    @Bean
    public Queue entregaDespachadaQueue() {
        return QueueBuilder.durable(entregaDespachadaQueue).build();
    }

    // Exchanges dos serviços externos
    @Bean
    public TopicExchange estoqueExchange() {
        return new TopicExchange("estoque.events");
    }

    @Bean
    public TopicExchange pagamentoExchange() {
        return new TopicExchange("pagamento.events");
    }

    @Bean
    public TopicExchange entregaExchange() {
        return new TopicExchange("entrega.events");
    }

    // Bindings
    @Bean
    public Binding bindEstoqueReservaFalhou() {
        return BindingBuilder.bind(estoqueReservaFalhouQueue())
                .to(estoqueExchange())
                .with("estoque.reserva_falhou");
    }

    @Bean
    public Binding bindPagamentoRecusado() {
        return BindingBuilder.bind(pagamentoRecusadoQueue())
                .to(pagamentoExchange())
                .with("pagamento.recusado");
    }

    @Bean
    public Binding bindPagamentoConfirmado() {
        return BindingBuilder.bind(pagamentoConfirmadoQueue())
                .to(pagamentoExchange())
                .with("pagamento.confirmado");
    }

    @Bean
    public Binding bindEntregaDespachada() {
        return BindingBuilder.bind(entregaDespachadaQueue())
                .to(entregaExchange())
                .with("entrega.despachada");
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        SimpleMessageConverter converter = new SimpleMessageConverter();
        converter.setAllowedListPatterns(List.of("*"));
        template.setMessageConverter(converter);
        return template;
    }
}
