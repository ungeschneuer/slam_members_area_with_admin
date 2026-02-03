-- Pronoun Updates for SLAM25 Participants
-- Generated: 2025-10-29T01:36:32.438Z
-- 
-- IMPORTANT: Review all updates before executing!
-- This script updates pronouns for participants matched between CSV and database.

BEGIN;

UPDATE participants SET pronouns = 'sie, ihr' WHERE id = 1287; -- Mieze Medusa
UPDATE participants SET pronouns = 'er/ihm' WHERE id = 1296; -- Nathan der Nice
UPDATE participants SET pronouns = 'sie/ihr' WHERE id = 1349; -- Olli Schuhmann
UPDATE participants SET pronouns = 'Sie' WHERE id = 1344; -- Rainer R.
UPDATE participants SET pronouns = 'keine/alle' WHERE id = 1322; -- Suse B.
UPDATE participants SET pronouns = 'Sie' WHERE id = 1337; -- Vanessa A.

COMMIT;

-- Summary:
-- 6 pronoun updates applied
-- Participants updated: Mieze Medusa, Nathan der Nice, Olli Schuhmann, Rainer R., Suse B., Vanessa A.
