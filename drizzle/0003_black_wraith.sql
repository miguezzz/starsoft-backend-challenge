ALTER TABLE "sales"
RENAME COLUMN "seat_id" TO "user_email"
ALTER COLUMN "user_email" SET DATA TYPE VARCHAR(255);--> statement-breakpoint

ALTER TABLE "sales" DROP CONSTRAINT "sales_seat_id_seats_id_fk";
