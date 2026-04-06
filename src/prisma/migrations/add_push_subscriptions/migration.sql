CREATE TABLE "PushSubscription" (
  "id"        TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "endpoint"  TEXT      NOT NULL,
  "p256dh"    TEXT      NOT NULL,
  "auth"      TEXT      NOT NULL,
  "userId"    TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint")
);
