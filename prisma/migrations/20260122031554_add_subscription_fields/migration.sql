-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stripe_price_id" VARCHAR(255),
ADD COLUMN     "stripe_subscription_id" VARCHAR(255),
ALTER COLUMN "stripe_payment_intent_id" DROP NOT NULL;
