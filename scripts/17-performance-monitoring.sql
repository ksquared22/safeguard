-- Add performance monitoring and maintenance

-- Create function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_traveler_queries()
RETURNS TABLE(
  query_type TEXT,
  avg_duration INTERVAL,
  call_count BIGINT
) AS $$
BEGIN
  -- This would integrate with pg_stat_statements if available
  RETURN QUERY
  SELECT 
    'travelers_by_person_id'::TEXT,
    INTERVAL '0.001 seconds',
    1::BIGINT
  WHERE FALSE; -- Placeholder - would need actual monitoring setup
END;
$$ LANGUAGE plpgsql;

-- Add maintenance function for cleaning up old data
CREATE OR REPLACE FUNCTION cleanup_old_travelers(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Archive old travelers (example - adjust based on business needs)
  DELETE FROM travelers 
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL
  AND checked_out = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_travelers_composite_status 
ON travelers(type, checked_in, checked_out) 
WHERE checked_in = TRUE OR checked_out = TRUE;

CREATE INDEX IF NOT EXISTS idx_travelers_overnight_arrivals 
ON travelers(type, overnight_hotel) 
WHERE type = 'arrival' AND overnight_hotel = TRUE;

-- Add statistics collection
CREATE OR REPLACE VIEW system_stats AS
SELECT 
  'total_travelers' as metric,
  COUNT(*)::TEXT as value
FROM travelers
UNION ALL
SELECT 
  'checked_in_count',
  COUNT(*)::TEXT
FROM travelers 
WHERE checked_in = TRUE
UNION ALL
SELECT 
  'departed_count',
  COUNT(*)::TEXT
FROM travelers 
WHERE checked_out = TRUE
UNION ALL
SELECT 
  'unique_persons',
  COUNT(DISTINCT person_id)::TEXT
FROM travelers;

GRANT SELECT ON system_stats TO authenticated;
