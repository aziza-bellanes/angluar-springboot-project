START TRANSACTION;
SELECT auction_id, bidder_id, amount FROM bids WHERE auction_id = 1 ORDER BY amount LIMIT 1;
INSERT INTO bids (auction_id, bidder_id, amount, created_at)
SELECT auction_id, bidder_id, amount, NOW(6) FROM bids WHERE auction_id = 1 ORDER BY amount LIMIT 1;
ROLLBACK;
START TRANSACTION;
INSERT INTO exhibitions (title, budget, duration_days, artist_id) VALUES ('Negative budget', -1, 10, 1);
ROLLBACK;
SELECT COUNT(*) AS rows_left FROM exhibitions WHERE title = 'Negative budget';
