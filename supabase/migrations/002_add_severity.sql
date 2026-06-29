-- Add severity to jobs
CREATE TYPE job_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

ALTER TABLE jobs 
ADD COLUMN severity job_severity NOT NULL DEFAULT 'MEDIUM';
