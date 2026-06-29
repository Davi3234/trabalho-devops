# Kubernetes, CI/CD e o11y

Este diretorio contem os manifests Kubernetes do `order-service` e do
`inventory-service` separados por ambiente:

```text
k8s/
  services/
    order-service/
      dev/
      homol/
    inventory-service/
      dev/
      homol/
  messaging/
    rabbitmq/        # broker compartilhado por todos os servicos
  o11y/
    prometheus/
    grafana/
```

Cada ambiente possui nomes proprios:

```text
ORDER-SERVICE / DEV:
  Deployment: order-service-dev
  Secret: order-service-dev-secret
  Service: order-service-dev
  Postgres: order-postgres-dev
  Ingress: dev.devops.local

ORDER-SERVICE / HOMOL:
  Deployment: order-service-homol
  Secret: order-service-homol-secret
  Service: order-service-homol
  Postgres: order-postgres-homol
  Ingress: homol.devops.local

INVENTORY-SERVICE / DEV:
  Deployment: inventory-service-dev
  Secret: inventory-service-dev-secret
  Service: inventory-service-dev (porta 3000)
  Postgres: inventory-postgres-dev
  Redis: inventory-redis-dev
  Ingress: dev.devops.local (path /estoque)

INVENTORY-SERVICE / HOMOL:
  Deployment: inventory-service-homol
  Secret: inventory-service-homol-secret
  Service: inventory-service-homol (porta 3000)
  Postgres: inventory-postgres-homol
  Redis: inventory-redis-homol
  Ingress: homol.devops.local (path /estoque)

MESSAGING (compartilhado):
  Deployment: rabbitmq
  Service: rabbitmq (amqp 5672 / management 15672)
```

> **RabbitMQ e infraestrutura compartilhada.** O broker NAO pertence a um
> servico especifico: ele e usado por todos (order, inventory, payment...), por
> isso fica em `messaging/rabbitmq` com Service unico `rabbitmq` (mesmo host do
> `docker-compose.yaml`). Sobe com as `definitions.json` (mesmos exchanges/filas
> do compose), incluindo o exchange `order.events` consumido pelo inventory.
>
> O `inventory-service` (NestJS) depende de **PostgreSQL** (Prisma) e **Redis**
> proprios, alem do **RabbitMQ** compartilhado, para iniciar. O `order-service`
> alcanca o inventory via DNS interno em `http://inventory-service-<env>:3000`
> (`INVENTORY_SERVICE_URL`).

## 1. Pre-requisitos

Instale:

- Docker
- Minikube
- kubectl
- Git
- GitHub Actions Runner self-hosted
- Powershell disponivel no runner

Verifique:

```bash
docker --version
minikube version
kubectl version --client
git --version
$PSVersionTable
```

## 2. Subir o cluster

```bash
minikube start
minikube addons enable ingress
kubectl get nodes
```

## 3. Configurar GitHub Runner

No GitHub:

```text
Repository -> Settings -> Actions -> Runners -> New self-hosted runner
```

Instale o runner na mesma maquina que acessa o Minikube e adicione os labels:

```text
self-hosted
kubernetes
order-service
inventory-service
```

Valide antes de rodar a pipeline:

```bash
kubectl get nodes
kubectl get pods -A
```

## 4. Executar a pipeline

Workflow:

```text
.github/workflows/order-service.yml
```

Fluxo:

1. Build e testes.
2. SonarCloud.
3. Build e push Docker.
4. Cria/atualiza a secret Kubernetes do ambiente.
5. Aplica o kustomization do ambiente.
6. Atualiza a imagem do deployment.
7. Aguarda rollout.

Ambientes:

```text
develop -> dev -> k8s/services/order-service/dev
main    -> homol -> k8s/services/order-service/homol
```

## 5. Deploy manual DEV

```bash
kubectl create secret generic order-service-dev-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_DB=order \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

minikube image build -t order-service:latest ./order-service
kubectl apply -k k8s/services/order-service/dev
kubectl rollout status deployment/order-service-dev
```

## 6. Deploy manual HOMOL

```bash
kubectl create secret generic order-service-homol-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_DB=order \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -

minikube image build -t order-service:latest ./order-service
kubectl apply -k k8s/services/order-service/homol
kubectl rollout status deployment/order-service-homol
```

## 6.1 Deploy do RabbitMQ compartilhado

O broker e compartilhado por todos os servicos e precisa estar no ar antes do
`inventory-service` (que conecta nele no startup):

```bash
kubectl apply -k k8s/messaging/rabbitmq
kubectl rollout status deployment/rabbitmq
```

## 6.2 Deploy manual inventory-service (DEV)

A secret guarda as credenciais do Postgres, a senha do Redis, a `DATABASE_URL`
(usada pelo Prisma) e a `RABBITMQ_URL` (apontando para o broker compartilhado):

```bash
kubectl create secret generic inventory-service-dev-secret \
  --from-literal=DATABASE_URL=postgres://postgres:admin@inventory-postgres-dev:5432/inventory \
  --from-literal=POSTGRES_DB=inventory \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=REDIS_PASSWORD=admin \
  --from-literal=RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672 \
  --dry-run=client -o yaml | kubectl apply -f -

minikube image build -t inventory-service:latest ./inventory-service
kubectl apply -k k8s/services/inventory-service/dev
kubectl rollout status deployment/inventory-postgres-dev
kubectl rollout status deployment/inventory-redis-dev
kubectl rollout status deployment/inventory-service-dev
```

## 6.3 Deploy manual inventory-service (HOMOL)

```bash
kubectl create secret generic inventory-service-homol-secret \
  --from-literal=DATABASE_URL=postgres://postgres:admin@inventory-postgres-homol:5432/inventory \
  --from-literal=POSTGRES_DB=inventory \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=REDIS_PASSWORD=admin \
  --from-literal=RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672 \
  --dry-run=client -o yaml | kubectl apply -f -

minikube image build -t inventory-service:latest ./inventory-service
kubectl apply -k k8s/services/inventory-service/homol
kubectl rollout status deployment/inventory-service-homol
```

## 7. Deploy de o11y

Prometheus e Grafana ficam em:

```text
k8s/o11y
```

Crie a secret do Grafana:

```bash
kubectl create secret generic grafana-secret \
  --from-literal=GF_SECURITY_ADMIN_USER=admin \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD=admin \
  --from-literal=GF_USERS_ALLOW_SIGN_UP=false \
  --dry-run=client -o yaml | kubectl apply -f -
```

Suba a observabilidade:

```bash
kubectl apply -k k8s/o11y
kubectl rollout status deployment/prometheus
kubectl rollout status deployment/grafana
```

Acesse:

```bash
kubectl port-forward svc/prometheus 9090:9090
kubectl port-forward svc/grafana 3000:3000
```

URLs:

```text
http://localhost:9090
http://localhost:3000
```
