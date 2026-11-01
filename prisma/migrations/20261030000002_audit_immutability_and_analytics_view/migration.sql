-- 1) Audit trail is append-only at the database level.
--    (Application code also hash-chains every row; see src/lib/audit.ts.)
CREATE OR REPLACE FUNCTION nexus_audit_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_no_update_delete
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION nexus_audit_immutable();

CREATE TRIGGER audit_no_truncate
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION nexus_audit_immutable();

-- 2) PII-free analytics surface. Dashboards and reports read THIS view, never
--    StudentIdentity. No names, DOBs or APAAR IDs (raw or hashed) are exposed.
CREATE VIEW "v_enrolment_analytics" AS
SELECT
  e.id                AS enrolment_id,
  e."institutionId"   AS institution_id,
  i.state             AS state,
  i.region            AS region,
  i.type              AS institution_type,
  e."programmeId"     AS programme_id,
  p.level             AS programme_level,
  e."departmentId"    AS department_id,
  e."academicYear"    AS academic_year,
  e."categoryCode"    AS category_code,
  c."isSupernumerary" AS is_supernumerary,
  e.status            AS enrolment_status,
  s.gender            AS gender,
  s."apaarFormat"     AS apaar_format,
  s.verification      AS verification,
  (s."apaarHmac" IS NOT NULL) AS has_apaar
FROM "Enrolment" e
JOIN "Student" s           ON s.id = e."studentId"
JOIN "Institution" i       ON i.id = e."institutionId"
JOIN "Programme" p         ON p.id = e."programmeId"
JOIN "AdmissionCategory" c ON c.code = e."categoryCode";
