-- 1) Backfill person_id from name when null/empty
UPDATE travelers
SET person_id = 'person-' || regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g')
WHERE person_id IS NULL OR length(trim(person_id)) = 0;

-- 2) Normalize existing person_id values:
-- - Ensure lower case
-- - Collapse multiple hyphens
-- - Remove leading/trailing hyphens
-- - Ensure 'person-' prefix
WITH cleaned AS (
  SELECT
    id,
    CASE
      WHEN person_id LIKE 'person-%' THEN
        'person-' || regexp_replace(
          regexp_replace(lower(substr(person_id, 8)), '[^a-z0-9-]+', '-', 'g'),
          '-+', '-', 'g'
        )
      ELSE
        'person-' || regexp_replace(
          regexp_replace(lower(person_id), '[^a-z0-9-]+', '-', 'g'),
          '-+', '-', 'g'
        )
    END AS new_person_id
  FROM travelers
)
UPDATE travelers t
SET person_id = regexp_replace(cleaned.new_person_id, '(^-+)|(-+$)', '', 'g')
FROM cleaned
WHERE t.id = cleaned.id
  AND t.person_id IS DISTINCT FROM regexp_replace(cleaned.new_person_id, '(^-+)|(-+$)', '', 'g');
