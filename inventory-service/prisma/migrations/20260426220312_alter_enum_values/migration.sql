/*
  Warnings:

  - The values [confirmada,estornada,expirada] on the enum `StatusReserva` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusReserva_new" AS ENUM ('pendente', 'confirmado', 'estornado', 'expirado');
ALTER TABLE "public"."reservas" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "reservas" ALTER COLUMN "status" TYPE "StatusReserva_new" USING ("status"::text::"StatusReserva_new");
ALTER TYPE "StatusReserva" RENAME TO "StatusReserva_old";
ALTER TYPE "StatusReserva_new" RENAME TO "StatusReserva";
DROP TYPE "public"."StatusReserva_old";
ALTER TABLE "reservas" ALTER COLUMN "status" SET DEFAULT 'pendente';
COMMIT;
