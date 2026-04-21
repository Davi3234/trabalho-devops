-- AlterTable
ALTER TABLE "produtos" ALTER COLUMN "quantidade_total" SET DEFAULT 0,
ALTER COLUMN "atualizado_em" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reservas" ALTER COLUMN "atualizado_em" SET DEFAULT CURRENT_TIMESTAMP;
