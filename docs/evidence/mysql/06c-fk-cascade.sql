START TRANSACTION;
INSERT INTO users (first_name, last_name, email, password) VALUES ('Temp', 'Cascade', 'cascade.evidence@example.test', 'not-a-real-hash');
SET @u = LAST_INSERT_ID();
INSERT INTO user_roles (user_id, role_id) VALUES (@u, 3);
SELECT * FROM user_roles WHERE user_id = @u;
DELETE FROM users WHERE id = @u;
SELECT COUNT(*) AS user_roles_left FROM user_roles WHERE user_id = @u;
ROLLBACK;
SELECT COUNT(*) AS temp_users_left FROM users WHERE email = 'cascade.evidence@example.test';
