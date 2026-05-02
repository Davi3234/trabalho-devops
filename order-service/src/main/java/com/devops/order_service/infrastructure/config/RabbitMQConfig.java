package com.devops.order_service.infrastructure.config;

import java.util.List;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.SimpleMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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

    @Bean
    public TopicExchange orderEventsExchange() {
        return new TopicExchange("order.events");
    }

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

    @Bean
    public TopicExchange estoqueExchange() {
        return new TopicExchange("inventory.events");
    }

    @Bean
    public TopicExchange pagamentoExchange() {
        return new TopicExchange("payment.events");
    }

    @Bean
    public TopicExchange entregaExchange() {
        return new TopicExchange("delivery.events");
    }

    @Bean
    public Binding bindEstoqueReservaFalhou() {
        return BindingBuilder.bind(estoqueReservaFalhouQueue())
                .to(estoqueExchange())
                .with("inventory.reserva.falhou");
    }

    @Bean
    public Binding bindPagamentoRecusado() {
        return BindingBuilder.bind(pagamentoRecusadoQueue())
                .to(pagamentoExchange())
                .with("payment.pagamento.recusado");
    }

    @Bean
    public Binding bindPagamentoConfirmado() {
        return BindingBuilder.bind(pagamentoConfirmadoQueue())
                .to(pagamentoExchange())
                .with("payment.pagamento.confirmado");
    }

    @Bean
    public Binding bindEntregaDespachada() {
        return BindingBuilder.bind(entregaDespachadaQueue())
                .to(orderEventsExchange())
                .with("delivery.entrega.despachada");
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
