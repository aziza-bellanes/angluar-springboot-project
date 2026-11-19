START TRANSACTION;
SELECT id, title, artist_id FROM exhibitions WHERE artist_id = 1;
DELETE FROM artists WHERE id = 1;
ROLLBACK;
SELECT id, name FROM artists WHERE id = 1;
