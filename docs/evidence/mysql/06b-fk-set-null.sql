START TRANSACTION;
SELECT id, title, exhibition_id FROM artworks WHERE artist_id = 2 ORDER BY id;
DELETE FROM exhibitions WHERE id = 2;
SELECT id, title, exhibition_id FROM artworks WHERE artist_id = 2 ORDER BY id;
ROLLBACK;
SELECT id, title, exhibition_id FROM artworks WHERE artist_id = 2 ORDER BY id;
