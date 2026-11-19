START TRANSACTION;
SELECT @v := version AS version_read FROM artists WHERE id = 1;
UPDATE artists SET name = name, version = version + 1 WHERE id = 1 AND version = @v;
UPDATE artists SET name = name, version = version + 1 WHERE id = 1 AND version = @v;
SELECT id, version FROM artists WHERE id = 1;
ROLLBACK;
SELECT id, version FROM artists WHERE id = 1;
