-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stripe_invoice_id" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_invoice_id_key" ON "payments"("stripe_invoice_id");
