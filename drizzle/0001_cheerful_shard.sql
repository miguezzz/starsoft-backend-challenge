CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_seat_id_seats_id_fk";
--> statement-breakpoint
DROP INDEX "reservation_seat_idx";--> statement-breakpoint
ALTER TABLE "seats" ADD COLUMN "reservation_id" uuid;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" DROP COLUMN "seat_id";