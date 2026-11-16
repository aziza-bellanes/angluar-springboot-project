-- JPA creates tables on first development startup (DDL_AUTO=update).
-- Production: review generated schema and use versioned migrations instead of update.
CREATE DATABASE IF NOT EXISTS psm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
