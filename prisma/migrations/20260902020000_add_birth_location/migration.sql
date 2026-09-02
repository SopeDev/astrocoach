ALTER TABLE "birth_profiles"
  ADD COLUMN "geoname_id" INTEGER,
  ADD COLUMN "location_name" TEXT,
  ADD COLUMN "admin_name" TEXT,
  ADD COLUMN "country_name" TEXT,
  ADD COLUMN "country_code" CHAR(2),
  ADD COLUMN "latitude" DECIMAL(9, 6),
  ADD COLUMN "longitude" DECIMAL(9, 6),
  ADD COLUMN "timezone_id" TEXT,
  ADD COLUMN "utc_offset_minutes" INTEGER,
  ADD COLUMN "birth_instant" TIMESTAMPTZ(6);

ALTER TABLE "birth_profiles"
  ADD CONSTRAINT "birth_profiles_latitude_check" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "birth_profiles_longitude_check" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
