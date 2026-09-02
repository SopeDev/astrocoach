CREATE TABLE "birth_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "birth_date" DATE NOT NULL,
  "birth_time_minutes" INTEGER,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "birth_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "birth_profiles_birth_time_minutes_check" CHECK ("birth_time_minutes" IS NULL OR "birth_time_minutes" BETWEEN 0 AND 1439)
);

CREATE UNIQUE INDEX "birth_profiles_user_id_key" ON "birth_profiles"("user_id");

ALTER TABLE "birth_profiles" ADD CONSTRAINT "birth_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
