-- ATELIER core schema.
-- Specification equivalence: users/roles (User, Role), artists (Client), exhibitions (Projet).

CREATE TABLE roles (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(32) NOT NULL,
    CONSTRAINT uk_roles_libelle UNIQUE (libelle)
) ENGINE = InnoDB;

CREATE TABLE users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(80)  NOT NULL,
    last_name  VARCHAR(80)  NOT NULL,
    email      VARCHAR(190) NOT NULL,
    password   VARCHAR(100) NOT NULL,
    phone      VARCHAR(30),
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE = InnoDB;

CREATE TABLE artists (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(190)  NOT NULL,
    phone         VARCHAR(30),
    address       VARCHAR(255),
    country       VARCHAR(80),
    biography     VARCHAR(4000),
    photo_url     VARCHAR(500),
    active        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by_id BIGINT,
    created_at    TIMESTAMP(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    version       BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT fk_artists_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX idx_artists_name ON artists (name);

CREATE TABLE exhibitions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(160)   NOT NULL,
    description   VARCHAR(4000),
    budget        DECIMAL(14, 2) NOT NULL,
    duration_days INT            NOT NULL,
    starts_on     DATE,
    venue         VARCHAR(160),
    cover_url     VARCHAR(500),
    artist_id     BIGINT         NOT NULL,
    created_by_id BIGINT,
    created_at    TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    version       BIGINT         NOT NULL DEFAULT 0,
    CONSTRAINT fk_exhibitions_artist FOREIGN KEY (artist_id) REFERENCES artists (id),
    CONSTRAINT fk_exhibitions_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT ck_exhibitions_budget CHECK (budget >= 0),
    CONSTRAINT ck_exhibitions_duration CHECK (duration_days > 0)
) ENGINE = InnoDB;
