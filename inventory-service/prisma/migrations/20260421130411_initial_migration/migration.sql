-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('pendente', 'confirmada', 'estornada', 'expirada');

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade_total" INTEGER NOT NULL,
    "quantidade_reservada" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "status" "StatusReserva" NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirado_em" TIMESTAMP(3) NOT NULL,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_reserva" (
    "id" SERIAL NOT NULL,
    "reserva_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "itens_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservas_pedido_id_key" ON "reservas"("pedido_id");

-- CreateIndex
CREATE INDEX "reservas_status_expirado_em_idx" ON "reservas"("status", "expirado_em");

-- AddForeignKey
ALTER TABLE "itens_reserva" ADD CONSTRAINT "itens_reserva_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_reserva" ADD CONSTRAINT "itens_reserva_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
