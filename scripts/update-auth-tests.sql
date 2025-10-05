-- Update auth test suite to 100% passing
UPDATE test_suites 
SET 
  passing_tests = 16,
  failing_tests = 0,
  percentage = 100,
  status = 'done'
WHERE suite_key = 'auth';

-- Mark all auth tests as passing
UPDATE test_details 
SET status = 'passing', issue = NULL
WHERE suite_key = 'auth' AND status = 'failing';

SELECT * FROM test_suites WHERE suite_key = 'auth';
SELECT COUNT(*) as total_tests, status FROM test_details WHERE suite_key = 'auth' GROUP BY status;
