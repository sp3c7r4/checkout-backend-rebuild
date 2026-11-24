CREATE TYPE "public"."marketplace_subscription_status" AS ENUM('active', 'canceled', 'expired');--> statement-breakpoint
CREATE TABLE "marketplace_pending" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"customer_aws_account_id" varchar(32) NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"license_arn" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_subscription" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"user_id" text,
	"customer_aws_account_id" varchar(32) NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"license_arn" text,
	"status" "marketplace_subscription_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "marketplace_subscription_account_product" UNIQUE("customer_aws_account_id","product_code")
);
--> statement-breakpoint
ALTER TABLE "marketplace_subscription" ADD CONSTRAINT "marketplace_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;