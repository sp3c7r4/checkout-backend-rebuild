CREATE TYPE "public"."order_status" AS ENUM('pending', 'approved', 'canceled');--> statement-breakpoint
CREATE TABLE "address" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"street" varchar(255) NOT NULL,
	"state" varchar(255) NOT NULL,
	"country" varchar(255) NOT NULL,
	"business_id" varchar(26)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"business_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "business" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"image" varchar(255),
	CONSTRAINT "business_admin_id_unique" UNIQUE("admin_id")
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"products" json,
	"client_id" bigint NOT NULL,
	"business_id" varchar(26) NOT NULL,
	"total_price" integer NOT NULL,
	"total_kg" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_states" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"description" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" bigint PRIMARY KEY NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"username" varchar(255),
	"email" varchar(255),
	"phone" varchar(255),
	"current_business_id" varchar(26) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"type" varchar(255) NOT NULL,
	"ip" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"business_id" varchar(26) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"products" json,
	"status" "order_status" NOT NULL,
	"total_price" integer NOT NULL,
	"business_id" varchar(26) NOT NULL,
	"client_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"reference" varchar(255) NOT NULL,
	"paystack_transaction_id" varchar(255),
	"amount" bigint,
	"currency" varchar(10),
	"status" varchar(50),
	"gateway_response" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"customer_id" varchar(255),
	"authorization" json,
	"channel" varchar(50),
	"metadata" json,
	"client_id" bigint NOT NULL,
	"business_id" varchar(26) NOT NULL,
	CONSTRAINT "payment_reference_unique" UNIQUE("reference"),
	CONSTRAINT "payment_paystack_transaction_id_unique" UNIQUE("paystack_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"image" varchar(255) NOT NULL,
	"price" varchar(255) NOT NULL,
	"category" varchar(255) NOT NULL,
	"barcode" varchar(255) NOT NULL,
	"brand" varchar(255),
	"kg" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"description" varchar(255) NOT NULL,
	"business_id" varchar(26) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"mass_view" json NOT NULL,
	"notifications" json NOT NULL,
	"weekly_reports" json NOT NULL,
	"business_id" varchar(26) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spreadsheet" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"spreadsheet_id" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"business_id" varchar(26) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_business" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"client_id" bigint NOT NULL,
	"business_id" varchar(26) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "address" ADD CONSTRAINT "address_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business" ADD CONSTRAINT "business_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client" ADD CONSTRAINT "client_current_business_id_business_id_fk" FOREIGN KEY ("current_business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spreadsheet" ADD CONSTRAINT "spreadsheet_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business" ADD CONSTRAINT "user_business_client_id_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_business" ADD CONSTRAINT "user_business_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;