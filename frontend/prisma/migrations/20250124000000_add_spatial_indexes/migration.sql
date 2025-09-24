-- Add spatial indexes for efficient location-based queries
-- These indexes will significantly improve performance for proximity-based recommendations

-- Composite index for location-based filtering
CREATE INDEX IF NOT EXISTS "idx_locations_coords_active" ON "public"."locations" ("latitude", "longitude") WHERE "deleted_at" IS NULL;

-- Index for user_id with location data
CREATE INDEX IF NOT EXISTS "idx_locations_user_coords" ON "public"."locations" ("user_id") WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "deleted_at" IS NULL;

-- Index for seeking preferences with location preference
CREATE INDEX IF NOT EXISTS "idx_seeking_preferences_location" ON "public"."seeking_preferences" ("location_preference") WHERE "deleted_at" IS NULL;

-- Index for max distance filtering
CREATE INDEX IF NOT EXISTS "idx_seeking_preferences_max_distance" ON "public"."seeking_preferences" ("max_distance_km") WHERE "max_distance_km" IS NOT NULL AND "deleted_at" IS NULL;

-- Composite index for users with active status and location data
CREATE INDEX IF NOT EXISTS "idx_users_active_location" ON "public"."users" ("is_active") WHERE "is_active" = true AND "deleted_at" IS NULL;
