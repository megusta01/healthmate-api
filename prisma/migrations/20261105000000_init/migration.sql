-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROFESSIONAL', 'PATIENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicamentStatus" AS ENUM ('ACTIVE', 'CONCLUDED', 'CANCELED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "google_id" VARCHAR(255),
    "phone" VARCHAR(20),
    "role" "Role" NOT NULL DEFAULT 'PROFESSIONAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "refresh_token_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "specialty" VARCHAR(120),
    "license" VARCHAR(40),
    "bio" VARCHAR(500),
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "gender" "Gender",
    "birth_date" DATE,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "blood_type" VARCHAR(3),
    "address" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_professionals" (
    "patient_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_professionals_pkey" PRIMARY KEY ("patient_id","professional_id")
);

-- CreateTable
CREATE TABLE "medicaments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "dosage" VARCHAR(60),
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_at" INTEGER NOT NULL DEFAULT 5,
    "status" "MedicamentStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medicaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "medicament_id" UUID NOT NULL,
    "time" VARCHAR(5) NOT NULL,
    "message" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_assessments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "professional_id" UUID,
    "symptoms" TEXT,
    "side_effects" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "health_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_user_id_key" ON "professionals"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE INDEX "patients_name_idx" ON "patients"("name");

-- CreateIndex
CREATE INDEX "patient_professionals_professional_id_idx" ON "patient_professionals"("professional_id");

-- CreateIndex
CREATE INDEX "medicaments_patient_id_idx" ON "medicaments"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_medicament_id_time_key" ON "reminders"("medicament_id", "time");

-- CreateIndex
CREATE INDEX "health_assessments_patient_id_created_at_idx" ON "health_assessments"("patient_id", "created_at");

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_professionals" ADD CONSTRAINT "patient_professionals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_professionals" ADD CONSTRAINT "patient_professionals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicaments" ADD CONSTRAINT "medicaments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_medicament_id_fkey" FOREIGN KEY ("medicament_id") REFERENCES "medicaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_assessments" ADD CONSTRAINT "health_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_assessments" ADD CONSTRAINT "health_assessments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase: as tabelas ficam no schema "public", que o Supabase expõe pela
-- Data API (PostgREST). Como todo acesso passa pela API NestJS, habilitamos RLS
-- sem políticas: o papel "anon"/"authenticated" não lê nada, e a conexão do
-- Prisma (usuário "postgres", dono das tabelas) continua com acesso total.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "professionals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_professionals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medicaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "health_assessments" ENABLE ROW LEVEL SECURITY;
