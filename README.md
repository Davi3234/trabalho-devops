# Trabalho de Microsserviços - DevOps

## Orientações para Execução com docker

1. Clone o repositório do projeto:

```bash
git clone https://github.com/Davi3234/trabalho-devops.git
```

2. Navegue até o diretório do projeto:

```bash
cd trabalho-devops
```

3. Em cada diretório de serviço (`api-gateway`, `auth-service`, `user-service`, `product-service`), copie o arquivo `.env.example` para `.env` e configure as variáveis de ambiente conforme necessário.

4. Na raiz, execute o comando para iniciar os serviços com Docker Compose:

```bash
docker compose up -d
```
