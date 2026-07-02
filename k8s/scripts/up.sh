echo '-- Deploying shared RabbitMQ broker'
kubectl apply -k k8s/messaging/rabbitmq
kubectl rollout status deployment/rabbitmq

echo '-- Deploying shared Grafana e Prometheus'
kubectl apply -k k8s/o11y/grafana
kubectl rollout status deployment/grafana

kubectl apply -k k8s/o11y/prometheus
kubectl rollout status deployment/prometheus

echo '-- Applying manifests'
kubectl apply -k k8s

echo '-- Rollout services'
kubectl rollout status deployment/order-service-dev
kubectl rollout status deployment/inventory-postgres-dev
kubectl rollout status deployment/inventory-redis-dev
kubectl rollout status deployment/inventory-service-dev
kubectl rollout status deployment/payment-postgres-dev
kubectl rollout status deployment/payment-service-dev
