echo '-- Deploying shared RabbitMQ broker'
kubectl apply -k k8s/messaging/rabbitmq
kubectl rollout status deployment/rabbitmq

echo '-- Deploying shared Grafana e Prometheus'
kubectl apply -k k8s/o11y/grafana
kubectl rollout status deployment/prometheus

kubectl apply -k k8s/o11y/prometheus
kubectl rollout status deployment/grafana

echo '-- Applying manifests'
kubectl apply -k k8s/services/order-service/dev
kubectl apply -k k8s/services/inventory-service/dev

echo '-- Rollout services'
kubectl rollout status deployment/order-service-dev
kubectl rollout status deployment/inventory-postgres-dev
kubectl rollout status deployment/inventory-redis-dev
kubectl rollout status deployment/inventory-service-dev
