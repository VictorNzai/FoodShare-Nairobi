-- Add a verified column to charity table
ALTER TABLE charity
ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0;

-- Add a verified column to charity_verifications table
ALTER TABLE charity_verifications
ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0;