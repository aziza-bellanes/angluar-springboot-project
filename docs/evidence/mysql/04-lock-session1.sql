START TRANSACTION;
SELECT NOW(3) AS s1_before_lock;
SELECT id, current_price, version FROM auctions WHERE id = 5 FOR UPDATE;
SELECT NOW(3) AS s1_lock_acquired;
SELECT SLEEP(5);
ROLLBACK;
SELECT NOW(3) AS s1_released;
