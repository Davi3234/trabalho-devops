#!/bin/bash
# =============================================================================
# setup.sh — Deploy completo no Minikube
# Executa na raiz do repositório: bash k8s/setup.sh
# =============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Verificando dependências..."
command -v minikube >/dev/null || { echo "ERRO: minikube não encontrado"; exit 1; }
command -v kubectl  >/dev/null || { echo "ERRO: kubectl não encontrado";  exit 1; }
command -v docker   >/dev/null || { echo "ERRO: docker não encontrado";   exit 1; }

# -----------------------------------------------------------------------------
# 1. Minikube
# -----------------------------------------------------------------------------
echo ""
echo "==> [1/6] Iniciando Minikube..."
if ! minikube status --format='{{.Host}}' 2>/dev/null | grep -q "Running"; then
  minikube start --driver=docker --cpus=4 --memory=6144
else
  echo "     Minikube já está rodando."
fi

echo "==> Habilitando Ingress..."
minikube addons enable ingress

# Aponta o Docker local para o daemon do Minikube
echo "==> Configurando Docker para usar o daemon do Minikube..."
eval "$(minikube docker-env --shell bash)"

# -----------------------------------------------------------------------------
# 2. Build das imagens dentro do Minikube
# -----------------------------------------------------------------------------
echo ""
echo "==> [2/6] Buildando imagens dentro do Minikube..."

echo "     → order-service"
docker build -t order-service:latest "$ROOT_DIR/order-service"

echo "     → payment-service"
docker build -t payment-service:latest "$ROOT_DIR/payment-service"

echo "     → inventory-service"
docker build -t inventory-service:latest "$ROOT_DIR/inventory-service"

# -----------------------------------------------------------------------------
# 3. Secrets
# -----------------------------------------------------------------------------
echo ""
echo "==> [3/6] Criando secrets..."

# Redis
kubectl create secret generic redis-secret \
  --from-literal=REDIS_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

# Order Service — dev
kubectl create secret generic order-service-dev-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=POSTGRES_DB=order \
  --from-literal=RABBITMQ_USER=admin \
  --from-literal=RABBITMQ_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

# Order Service — homol
kubectl create secret generic order-service-homol-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=POSTGRES_DB=order \
  --from-literal=RABBITMQ_USER=admin \
  --from-literal=RABBITMQ_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

# Payment Service — dev
kubectl create secret generic payment-service-dev-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=POSTGRES_DB=payment \
  --from-literal=APP_KEY=base64:$(openssl rand -base64 32) \
  --from-literal=RABBITMQ_USER=admin \
  --from-literal=RABBITMQ_PASSWORD=admin \
  --from-literal=REDIS_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

# Payment Service — homol
kubectl create secret generic payment-service-homol-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=POSTGRES_DB=payment \
  --from-literal=APP_KEY=base64:$(openssl rand -base64 32) \
  --from-literal=RABBITMQ_USER=admin \
  --from-literal=RABBITMQ_PASSWORD=admin \
  --from-literal=REDIS_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

# Inventory Service — dev
kubectl create secret generic inventory-service-dev-secret \
  --from-literal=DATABASE_URL=postgres://postgres:admin@inventory-postgres-dev:5432/inventory \
  --from-literal=RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672 \
  --from-literal=REDIS_PASSWORD=admin \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=POSTGRES_DB=inventory \
  --dry-run=client -o yaml | kubectl apply -f -

# Inventory Service — homol
kubectl create secret generic inventory-service-homol-secret \
  --from-literal=DATABASE_URL=postgres://postgres:admin@inventory-postgres-homol:5432/inventory \
  --from-literal=RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672 \
  --from-literal=REDIS_PASSWORD=admin \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=POSTGRES_DB=inventory \
  --dry-run=client -o yaml | kubectl apply -f -

# Grafana
kubectl create secret generic grafana-secret \
  --from-literal=GF_SECURITY_ADMIN_USER=admin \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

# -----------------------------------------------------------------------------
# 4. Aplicar manifests
# -----------------------------------------------------------------------------
echo ""
echo "==> [4/6] Aplicando manifests Kubernetes..."
kubectl apply -k "$ROOT_DIR/k8s"

# -----------------------------------------------------------------------------
# 5. Aguardar pods ficarem prontos
# -----------------------------------------------------------------------------
echo ""
echo "==> [5/6] Aguardando pods ficarem prontos (pode levar alguns minutos)..."

wait_deploy() {
  echo "     Aguardando $1..."
  kubectl rollout status deployment/"$1" --timeout=300s
}

wait_deploy rabbitmq
wait_deploy redis
wait_deploy order-postgres-dev
wait_deploy payment-postgres-dev
wait_deploy inventory-postgres-dev
wait_deploy order-service-dev
wait_deploy payment-service-dev
wait_deploy inventory-service-dev

# -----------------------------------------------------------------------------
# 6. Hosts locais + URLs
# -----------------------------------------------------------------------------
echo ""
echo "==> [6/6] Configurando /etc/hosts..."
MINIKUBE_IP=$(minikube ip)
echo ""
echo "     Adicione estas linhas ao seu /etc/hosts (requer admin):"
echo "     $MINIKUBE_IP  dev.devops.local"
echo "     $MINIKUBE_IP  homol.devops.local"
echo ""

# Tenta adicionar automaticamente (pode pedir senha sudo)
if grep -q "dev.devops.local" /etc/hosts 2>/dev/null; then
  echo "     /etc/hosts já configurado."
else
  echo "     Para adicionar automaticamente execute:"
  echo "     echo '$MINIKUBE_IP  dev.devops.local homol.devops.local' | sudo tee -a /etc/hosts"
fi

echo ""
echo "============================================================"
echo "  Deploy concluído!"
echo "============================================================"
echo ""
echo "  URLs DEV:"
echo "    Orders:    http://dev.devops.local/api/orders"
echo "    Payments:  http://dev.devops.local/api/payments"
echo "    Inventory: http://dev.devops.local/api/inventories"
echo "    Swagger:   http://dev.devops.local/api/payments/docs"
echo ""
echo "  URLs HOMOL:"
echo "    Orders:    http://homol.devops.local/api/orders"
echo "    Payments:  http://homol.devops.local/api/payments"
echo "    Inventory: http://homol.devops.local/api/inventories"
echo ""
echo "  Observabilidade (via port-forward):"
echo "    kubectl port-forward svc/prometheus 9090:9090"
echo "    kubectl port-forward svc/grafana 3001:3000"
echo ""
echo "  RabbitMQ Management (via port-forward):"
echo "    kubectl port-forward svc/rabbitmq 15672:15672"
echo "    http://localhost:15672  (admin/admin)"
echo "============================================================"
