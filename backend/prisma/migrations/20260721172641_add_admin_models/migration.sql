-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "library_settings" (
    "id" SERIAL NOT NULL,
    "libraryName" TEXT NOT NULL DEFAULT 'KNUST Library',
    "institution" TEXT NOT NULL DEFAULT 'Kwame Nkrumah University of Science and Technology',
    "address" TEXT NOT NULL DEFAULT 'Kumasi, Ghana',
    "phone" TEXT NOT NULL DEFAULT '+233 32 206 0000',
    "email" TEXT NOT NULL DEFAULT 'library@knust.edu.gh',
    "website" TEXT NOT NULL DEFAULT 'https://library.knust.edu.gh',
    "openingHours" JSONB NOT NULL DEFAULT '{"Monday":{"open":"08:00","close":"17:00","closed":false},"Tuesday":{"open":"08:00","close":"17:00","closed":false},"Wednesday":{"open":"08:00","close":"17:00","closed":false},"Thursday":{"open":"08:00","close":"17:00","closed":false},"Friday":{"open":"08:00","close":"17:00","closed":false},"Saturday":{"open":"09:00","close":"14:00","closed":false},"Sunday":{"open":"00:00","close":"00:00","closed":true}}',
    "maxBooksPerStudent" INTEGER NOT NULL DEFAULT 5,
    "maxBooksPerStaff" INTEGER NOT NULL DEFAULT 10,
    "loanDurationDays" INTEGER NOT NULL DEFAULT 14,
    "renewalLimit" INTEGER NOT NULL DEFAULT 2,
    "fineRatePerDay" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "maxFineAmount" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableSmsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_configs" (
    "id" SERIAL NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "time" TEXT NOT NULL DEFAULT '02:00',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "lastBackup" TIMESTAMP(3),
    "nextBackup" TIMESTAMP(3),
    "autoBackup" BOOLEAN NOT NULL DEFAULT true,
    "includeFiles" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "backup_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);
