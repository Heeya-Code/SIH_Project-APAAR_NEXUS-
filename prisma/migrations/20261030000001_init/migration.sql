-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'AICTE_ADMIN', 'REGIONAL_OFFICER', 'INSTITUTION_ADMIN', 'DATA_ENTRY_OPERATOR', 'STUDENT', 'VERIFIER');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTH_EAST');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('GOVERNMENT', 'GOVT_AIDED', 'PRIVATE', 'UNIVERSITY_DEPARTMENT', 'DEEMED');

-- CreateEnum
CREATE TYPE "ProgrammeLevel" AS ENUM ('DIPLOMA', 'UG', 'PG', 'PGDM', 'MBA', 'MCA');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'CONDITIONAL', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApaarFormatStatus" AS ENUM ('MISSING', 'INVALID_FORMAT', 'WELL_FORMED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'STRUCTURALLY_VALID', 'FLAGGED_DUPLICATE', 'UNDER_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnrolmentStatus" AS ENUM ('ENROLLED', 'WITHDRAWN', 'GRADUATED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'VALIDATED', 'NEEDS_CORRECTION', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ValidationOutcome" AS ENUM ('VALID', 'WARNING', 'REQUIRES_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "DuplicateKind" AS ENUM ('EXACT_APAAR', 'NORMALISED_APAAR', 'POTENTIAL_MATCH', 'CONFLICTING_IDENTITY', 'WITHIN_INSTITUTION');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskBand" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('NAME', 'INSTITUTION', 'PROGRAMME', 'ADMISSION_YEAR', 'ENROLMENT_STATUS');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('QR_SCAN', 'CREDENTIAL_ID');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('VALID', 'REVOKED', 'EXPIRED', 'NOT_FOUND', 'SIGNATURE_INVALID', 'CONSENT_DENIED');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aicteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "state" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "region" "Region" NOT NULL,
    "establishedYear" INTEGER NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionApproval" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "InstitutionApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ProgrammeLevel" NOT NULL,
    "durationYears" INTEGER NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedIntake" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "baseIntake" INTEGER NOT NULL,
    "approvalRef" TEXT,

    CONSTRAINT "ApprovedIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionCategory" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSupernumerary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdmissionCategory_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "severity" "ValidationOutcome" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "localStudentId" TEXT NOT NULL,
    "apaarHmac" TEXT,
    "apaarFormat" "ApaarFormatStatus" NOT NULL,
    "apaarNormalised" BOOLEAN NOT NULL DEFAULT false,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "authoritativeVerified" BOOLEAN NOT NULL DEFAULT false,
    "gender" "Gender" NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "matchKey" TEXT,
    "dobKey" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentIdentity" (
    "studentId" TEXT NOT NULL,
    "fullNameEnc" TEXT NOT NULL,
    "dobEnc" TEXT NOT NULL,
    "apaarEnc" TEXT,
    "apaarSubmittedEnc" TEXT,
    "apaarMasked" TEXT,

    CONSTRAINT "StudentIdentity_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "admissionYear" INTEGER NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "status" "EnrolmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "submissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSubmission" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "parentId" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "fileName" TEXT,
    "fileSha256" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "DataSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagedRecord" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "payloadEnc" TEXT NOT NULL,
    "outcome" "ValidationOutcome" NOT NULL DEFAULT 'VALID',

    CONSTRAINT "StagedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationIssue" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "stagedRecordId" TEXT,
    "severity" "ValidationOutcome" NOT NULL,
    "code" TEXT NOT NULL,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "fixHint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateAlert" (
    "id" TEXT NOT NULL,
    "kind" "DuplicateKind" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "studentAId" TEXT NOT NULL,
    "studentBId" TEXT NOT NULL,
    "institutionAId" TEXT NOT NULL,
    "institutionBId" TEXT NOT NULL,
    "apaarHmac" TEXT,
    "evidence" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyAlert" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "detector" TEXT NOT NULL,
    "explanation" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskScore" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "band" "RiskBand" NOT NULL,
    "factors" JSONB NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalCredential" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolmentId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadSha256" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DigitalCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scope" "ConsentScope" NOT NULL,
    "granteeOrg" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "requestedNote" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "verifierUserId" TEXT NOT NULL,
    "credentialId" TEXT,
    "credentialIdQuery" TEXT NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "disclosedFields" JSONB NOT NULL,
    "purpose" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "institutionId" TEXT,
    "region" "Region",
    "studentId" TEXT,
    "organisation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "seq" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "institutionId" TEXT,
    "outcome" TEXT NOT NULL,
    "metadata" JSONB,
    "ipHash" TEXT,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_aicteId_key" ON "Institution"("aicteId");

-- CreateIndex
CREATE INDEX "Institution_state_idx" ON "Institution"("state");

-- CreateIndex
CREATE INDEX "Institution_region_idx" ON "Institution"("region");

-- CreateIndex
CREATE INDEX "Institution_type_idx" ON "Institution"("type");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionApproval_institutionId_academicYear_key" ON "InstitutionApproval"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "Department_institutionId_code_key" ON "Department"("institutionId", "code");

-- CreateIndex
CREATE INDEX "Programme_departmentId_idx" ON "Programme"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_institutionId_code_key" ON "Programme"("institutionId", "code");

-- CreateIndex
CREATE INDEX "ApprovedIntake_institutionId_academicYear_idx" ON "ApprovedIntake"("institutionId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedIntake_programmeId_academicYear_key" ON "ApprovedIntake"("programmeId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRule_code_key" ON "ComplianceRule"("code");

-- CreateIndex
CREATE INDEX "Student_apaarHmac_idx" ON "Student"("apaarHmac");

-- CreateIndex
CREATE INDEX "Student_matchKey_idx" ON "Student"("matchKey");

-- CreateIndex
CREATE INDEX "Student_dobKey_idx" ON "Student"("dobKey");

-- CreateIndex
CREATE INDEX "Student_institutionId_idx" ON "Student"("institutionId");

-- CreateIndex
CREATE INDEX "Student_apaarFormat_idx" ON "Student"("apaarFormat");

-- CreateIndex
CREATE UNIQUE INDEX "Student_institutionId_localStudentId_key" ON "Student"("institutionId", "localStudentId");

-- CreateIndex
CREATE INDEX "Enrolment_institutionId_academicYear_idx" ON "Enrolment"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "Enrolment_programmeId_academicYear_idx" ON "Enrolment"("programmeId", "academicYear");

-- CreateIndex
CREATE INDEX "Enrolment_categoryCode_idx" ON "Enrolment"("categoryCode");

-- CreateIndex
CREATE INDEX "Enrolment_submissionId_idx" ON "Enrolment"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrolment_studentId_programmeId_academicYear_key" ON "Enrolment"("studentId", "programmeId", "academicYear");

-- CreateIndex
CREATE INDEX "DataSubmission_institutionId_status_idx" ON "DataSubmission"("institutionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DataSubmission_institutionId_academicYear_version_key" ON "DataSubmission"("institutionId", "academicYear", "version");

-- CreateIndex
CREATE UNIQUE INDEX "StagedRecord_submissionId_rowNumber_key" ON "StagedRecord"("submissionId", "rowNumber");

-- CreateIndex
CREATE INDEX "ValidationIssue_submissionId_severity_idx" ON "ValidationIssue"("submissionId", "severity");

-- CreateIndex
CREATE INDEX "ValidationIssue_code_idx" ON "ValidationIssue"("code");

-- CreateIndex
CREATE INDEX "DuplicateAlert_status_idx" ON "DuplicateAlert"("status");

-- CreateIndex
CREATE INDEX "DuplicateAlert_institutionAId_idx" ON "DuplicateAlert"("institutionAId");

-- CreateIndex
CREATE INDEX "DuplicateAlert_institutionBId_idx" ON "DuplicateAlert"("institutionBId");

-- CreateIndex
CREATE UNIQUE INDEX "DuplicateAlert_studentAId_studentBId_kind_key" ON "DuplicateAlert"("studentAId", "studentBId", "kind");

-- CreateIndex
CREATE INDEX "AnomalyAlert_institutionId_academicYear_idx" ON "AnomalyAlert"("institutionId", "academicYear");

-- CreateIndex
CREATE INDEX "AnomalyAlert_status_idx" ON "AnomalyAlert"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RiskScore_institutionId_academicYear_engine_key" ON "RiskScore"("institutionId", "academicYear", "engine");

-- CreateIndex
CREATE INDEX "DigitalCredential_studentId_idx" ON "DigitalCredential"("studentId");

-- CreateIndex
CREATE INDEX "ConsentRecord_studentId_idx" ON "ConsentRecord"("studentId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_studentId_idx" ON "CorrectionRequest"("studentId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_status_idx" ON "CorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_verifierUserId_createdAt_idx" ON "VerificationRequest"("verifierUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_hash_key" ON "AuditLog"("hash");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_institutionId_createdAt_idx" ON "AuditLog"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "InstitutionApproval" ADD CONSTRAINT "InstitutionApproval_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedIntake" ADD CONSTRAINT "ApprovedIntake_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedIntake" ADD CONSTRAINT "ApprovedIntake_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentIdentity" ADD CONSTRAINT "StudentIdentity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "AdmissionCategory"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrolment" ADD CONSTRAINT "Enrolment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DataSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubmission" ADD CONSTRAINT "DataSubmission_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubmission" ADD CONSTRAINT "DataSubmission_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DataSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagedRecord" ADD CONSTRAINT "StagedRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DataSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationIssue" ADD CONSTRAINT "ValidationIssue_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DataSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationIssue" ADD CONSTRAINT "ValidationIssue_stagedRecordId_fkey" FOREIGN KEY ("stagedRecordId") REFERENCES "StagedRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateAlert" ADD CONSTRAINT "DuplicateAlert_studentAId_fkey" FOREIGN KEY ("studentAId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateAlert" ADD CONSTRAINT "DuplicateAlert_studentBId_fkey" FOREIGN KEY ("studentBId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyAlert" ADD CONSTRAINT "AnomalyAlert_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskScore" ADD CONSTRAINT "RiskScore_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalCredential" ADD CONSTRAINT "DigitalCredential_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalCredential" ADD CONSTRAINT "DigitalCredential_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "Enrolment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalCredential" ADD CONSTRAINT "DigitalCredential_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "DigitalCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_verifierUserId_fkey" FOREIGN KEY ("verifierUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
