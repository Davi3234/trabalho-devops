echo '-- Starting minikube'
minikube start
minikube addons enable ingress

echo '-- Creating secrets'
kubectl create secret generic grafana-secret \
  --from-literal=GF_SECURITY_ADMIN_USER=admin \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD=admin \
  --from-literal=GF_USERS_ALLOW_SIGN_UP=false \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic order-service-dev-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_DB=order \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=RABBITMQ_USERNAME=admin \
  --from-literal=RABBITMQ_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic inventory-service-dev-secret \
  --from-literal=DATABASE_URL=postgres://postgres:admin@inventory-postgres-dev:5432/inventory \
  --from-literal=POSTGRES_DB=inventory \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=REDIS_PASSWORD=admin \
  --from-literal=RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672 \
  --dry-run=client -o yaml | kubectl apply -f -

echo '-- Building images'
minikube image build -t order-service:latest ./order-service
minikube image build -t inventory-service:latest ./inventory-service
