-- AlterTable
ALTER TABLE "public"."seeking_preferences" ADD COLUMN     "ethnicity_preference" TEXT,
ADD COLUMN     "food_preference" TEXT,
ADD COLUMN     "gender_weight" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "hobby_preference" TEXT,
ADD COLUMN     "interest_preference" TEXT,
ADD COLUMN     "language_preference" TEXT,
ADD COLUMN     "location_weight" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "movie_preference" TEXT,
ADD COLUMN     "music_preference" TEXT,
ADD COLUMN     "relationship_weight" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "religion_preference" TEXT,
ADD COLUMN     "status_weight" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "travel_preference" TEXT;
