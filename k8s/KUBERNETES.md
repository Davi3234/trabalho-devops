Aqui está o guia completo de comandos para executar, operar e visualizar o cluster funcionando. Os nomes batem com os recursos que criei.

## 1. Subir o cluster (uma vez)

```bash
minikube start
minikube addons enable ingress
kubectl get nodes
```

## 2. Build das imagens (dentro do Minikube)

> Sempre que mudar o código de um serviço, rebuilde a imagem e faça rollout (passo 6).

```bash
minikube image build -t inventory-service:latest ./inventory-service
minikube image build -t order-service:latest ./order-service
```

## 3. Criar as secrets (uma vez)

**inventory** (bash / git-bash):

```bash
kubectl create secret generic inventory-service-dev-secret \
  --from-literal=DATABASE_URL=postgres://postgres:admin@inventory-postgres-dev:5432/inventory \
  --from-literal=POSTGRES_DB=inventory \
  --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --from-literal=REDIS_PASSWORD=admin \
  --from-literal=RABBITMQ_URL=amqp://admin:admin@inventory-rabbitmq-dev:5672 \
  --dry-run=client -o yaml | kubectl apply -f -
```

**order**:

```bash
kubectl create secret generic order-service-dev-secret \
  --from-literal=DB_USERNAME=postgres --from-literal=DB_PASSWORD=admin \
  --from-literal=POSTGRES_DB=order --from-literal=POSTGRES_USER=postgres \
  --from-literal=POSTGRES_PASSWORD=admin \
  --dry-run=client -o yaml | kubectl apply -f -
```

> No **PowerShell** troque a `\` de fim de linha por crase `` ` `` (ou cole tudo numa linha só).

## 4. Aplicar os manifests

```bash
kubectl apply -k k8s/services/order-service/dev
kubectl apply -k k8s/services/inventory-service/dev
```

## 5. Acompanhar a subida

```bash
# infra primeiro (o inventory-service só sobe depois dela)
kubectl rollout status deployment/inventory-postgres-dev
kubectl rollout status deployment/inventory-redis-dev
kubectl rollout status deployment/inventory-rabbitmq-dev
kubectl rollout status deployment/inventory-service-dev
kubectl rollout status deployment/order-service-dev

kubectl get pods           # tudo deve ficar 1/1 Running
```

## 6. Operação do dia a dia

```bash
# Logs (siga em tempo real com -f)
kubectl logs -f deployment/inventory-service-dev -c inventory-service
kubectl logs -f deployment/order-service-dev

# Após rebuildar a imagem, forçar novo deploy:
kubectl rollout restart deployment/inventory-service-dev

# Escalar réplicas
kubectl scale deployment/inventory-service-dev --replicas=3

# Inspecionar um pod que não sobe
kubectl describe pod <nome-do-pod>

# Abrir shell num pod
kubectl exec -it deployment/inventory-service-dev -c inventory-service -- sh
```

## 7. Visualizar funcionando 👀

Cada `port-forward` **trava o terminal** — abra um terminal por comando (ou rode em background).

**A) inventory-service (Swagger / health / métricas)**

```bash
kubectl port-forward svc/inventory-service-dev 3000:3000
```

Abra no navegador:

- Swagger UI → http://localhost:3000/docs
- Health → http://localhost:3000/health (retorna `true`)
- Métricas Prometheus → http://localhost:3000/metrics

**B) order-service**

```bash
kubectl port-forward svc/order-service-dev 8080:8080
```

- Swagger → http://localhost:8080/swagger-ui.html
- Health → http://localhost:8080/actuator/health

**C) RabbitMQ Management (ver filas/mensagens da comunicação)**

```bash
kubectl port-forward svc/inventory-rabbitmq-dev 15672:15672
```

- UI → http://localhost:15672 — login **admin / admin**
- Em **Queues** você vê `inventory.pedido.criado/pago/cancelado` ligadas ao exchange `order.events`.

## 8. Testar a comunicação (mensageria order → inventory)

Publica um evento e observe o inventory consumir nos logs:

```bash
# terminal 1 — acompanhe os logs
kubectl logs -f deployment/inventory-service-dev -c inventory-service

# terminal 2 — publica o evento no exchange order.events
kubectl exec deploy/inventory-rabbitmq-dev -- \
  rabbitmqadmin -u admin -p admin publish \
  exchange=order.events routing_key=order.pedido.criado \
  payload='{"orderId":9999,"items":[{"productId":1,"quantity":1}]}'
```

No terminal 1 aparece `Recebido pedido.criado [pedido: 9999]` → prova o fluxo ponta a ponta.

## 9. (Opcional) Acessar pelo Ingress como produção

```bash
minikube tunnel        # trava o terminal; precisa de admin
```

Adicione ao `hosts` (`C:\Windows\System32\drivers\etc\hosts`, como admin):

```
127.0.0.1 dev.devops.local
```

Depois: `http://dev.devops.local/estoque/...` (inventory) e `http://dev.devops.local/api/orders` (order).

## 10. Parar / limpar

```bash
# remover só as aplicações (mantém o cluster)
kubectl delete -k k8s/services/inventory-service/dev
kubectl delete -k k8s/services/order-service/dev

minikube stop          # desliga o cluster (preserva estado)
# minikube delete      # apaga o cluster por completo
```

---

**Resumo de portas:** inventory `3000` · order `8080` · RabbitMQ UI `15672` · Postgres inventory `5432` · Redis `6379` (todos internos; use `port-forward` para acessar do host).

Quer que eu adicione esse guia operacional ao `k8s/README.md` e faça o commit na branch `feat/inventory-cluster`?
