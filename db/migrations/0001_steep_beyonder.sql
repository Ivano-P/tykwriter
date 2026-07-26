CREATE TABLE "anon_usage" (
	"day" text NOT NULL,
	"ip" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "anon_usage_day_ip_pk" PRIMARY KEY("day","ip")
);
