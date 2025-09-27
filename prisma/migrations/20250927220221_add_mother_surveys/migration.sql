-- CreateEnum
CREATE TYPE "public"."ExerciseHabit" AS ENUM ('NONE', 'LIGHT', 'MODERATE', 'VIGOROUS');

-- CreateEnum
CREATE TYPE "public"."EatingHabit" AS ENUM ('POOR', 'FAIR', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "public"."SleepHabit" AS ENUM ('POOR', 'FAIR', 'GOOD', 'EXCELLENT');

-- CreateTable
CREATE TABLE "public"."MoodWellbeingSurvey" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "exercise" "public"."ExerciseHabit" NOT NULL,
    "eating" "public"."EatingHabit" NOT NULL,
    "sleep" "public"."SleepHabit" NOT NULL,
    "mentalScore" INTEGER NOT NULL,
    "sessionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodWellbeingSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BondingSurvey" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "babyContentScore" INTEGER NOT NULL,
    "timeWithBabyMin" INTEGER NOT NULL,
    "sessionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BondingSurvey_pkey" PRIMARY KEY ("id")
);
