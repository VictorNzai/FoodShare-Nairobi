-- Add status column to donor, charity, and admins tables
ALTER TABLE donor
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE charity
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE admins
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- For existing banned or deleted users, you can update their status manually:
-- UPDATE donor SET status = 'banned' WHERE id = ...;
-- UPDATE charity SET status = 'banned' WHERE id = ...;
-- UPDATE admins SET status = 'banned' WHERE id = ...;