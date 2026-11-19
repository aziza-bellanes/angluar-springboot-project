START TRANSACTION;
INSERT INTO artists (name, email) VALUES ('Evidence Rollback Artist', 'rollback.evidence@example.test');
SELECT id, name, email FROM artists WHERE email = 'rollback.evidence@example.test';
ROLLBACK;
SELECT id, name, email FROM artists WHERE email = 'rollback.evidence@example.test';
