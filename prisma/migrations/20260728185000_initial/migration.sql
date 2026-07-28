-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'hard',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptPattern" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "whenToUse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptPattern_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "name" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedPrompt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "useCase" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "patternsUsed" TEXT[],
    "provider" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "qualityScore" INTEGER,
    "variantLabel" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SOPDocument" (
    "id" TEXT NOT NULL,
    "generatedPromptId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SOPDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldOverride" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "required" BOOLEAN,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedValue" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoffLog" (
    "id" TEXT NOT NULL,
    "generatedPromptId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandoffLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Department_orgId_key_key" ON "Department"("orgId", "key");
CREATE UNIQUE INDEX "FormTemplate_departmentId_version_key" ON "FormTemplate"("departmentId", "version");
CREATE UNIQUE INDEX "ComplianceRule_departmentId_code_key" ON "ComplianceRule"("departmentId", "code");
CREATE UNIQUE INDEX "PromptPattern_key_key" ON "PromptPattern"("key");
CREATE UNIQUE INDEX "GeneratedPrompt_submissionId_version_key" ON "GeneratedPrompt"("submissionId", "version");
CREATE UNIQUE INDEX "SOPDocument_generatedPromptId_key" ON "SOPDocument"("generatedPromptId");
CREATE UNIQUE INDEX "FieldOverride_departmentId_fieldId_key" ON "FieldOverride"("departmentId", "fieldId");

ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRule" ADD CONSTRAINT "ComplianceRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedPrompt" ADD CONSTRAINT "GeneratedPrompt_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedPrompt" ADD CONSTRAINT "GeneratedPrompt_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SOPDocument" ADD CONSTRAINT "SOPDocument_generatedPromptId_fkey" FOREIGN KEY ("generatedPromptId") REFERENCES "GeneratedPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldOverride" ADD CONSTRAINT "FieldOverride_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
