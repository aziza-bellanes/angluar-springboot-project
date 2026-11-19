SET SESSION innodb_lock_wait_timeout = 10;
START TRANSACTION;
SELECT NOW(3) AS s2_before_lock;
SELECT id, current_price, version FROM auctions WHERE id = 5 FOR UPDATE;
SELECT NOW(3) AS s2_lock_acquired;
ROLLBACK;
