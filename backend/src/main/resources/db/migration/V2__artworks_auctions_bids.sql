-- ATELIER extensions: artworks, auctions and bids.

CREATE TABLE artworks (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug          VARCHAR(180)   NOT NULL,
    title         VARCHAR(160)   NOT NULL,
    description   VARCHAR(4000),
    year_created  INT,
    medium        VARCHAR(120),
    dimensions    VARCHAR(80),
    image_url     VARCHAR(500)   NOT NULL,
    image_credit  VARCHAR(255),
    estimate      DECIMAL(14, 2),
    status        VARCHAR(16)    NOT NULL DEFAULT 'PUBLISHED',
    artist_id     BIGINT         NOT NULL,
    exhibition_id BIGINT,
    created_by_id BIGINT,
    created_at    TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    version       BIGINT         NOT NULL DEFAULT 0,
    CONSTRAINT uk_artworks_slug UNIQUE (slug),
    CONSTRAINT fk_artworks_artist FOREIGN KEY (artist_id) REFERENCES artists (id),
    CONSTRAINT fk_artworks_exhibition FOREIGN KEY (exhibition_id) REFERENCES exhibitions (id) ON DELETE SET NULL,
    CONSTRAINT fk_artworks_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE INDEX idx_artworks_status ON artworks (status);

CREATE TABLE auctions (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    artwork_id        BIGINT         NOT NULL,
    starting_price    DECIMAL(14, 2) NOT NULL,
    current_price     DECIMAL(14, 2) NOT NULL,
    minimum_increment DECIMAL(14, 2) NOT NULL,
    starts_at         TIMESTAMP(6)   NOT NULL,
    ends_at           TIMESTAMP(6)   NOT NULL,
    status            VARCHAR(16)    NOT NULL,
    bid_count         INT            NOT NULL DEFAULT 0,
    leading_bidder_id BIGINT,
    winner_id         BIGINT,
    created_at        TIMESTAMP(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    version           BIGINT         NOT NULL DEFAULT 0,
    CONSTRAINT fk_auctions_artwork FOREIGN KEY (artwork_id) REFERENCES artworks (id),
    CONSTRAINT fk_auctions_leader FOREIGN KEY (leading_bidder_id) REFERENCES users (id),
    CONSTRAINT fk_auctions_winner FOREIGN KEY (winner_id) REFERENCES users (id),
    CONSTRAINT ck_auctions_prices CHECK (starting_price > 0 AND minimum_increment > 0 AND current_price >= starting_price),
    CONSTRAINT ck_auctions_window CHECK (ends_at > starts_at)
) ENGINE = InnoDB;

CREATE INDEX idx_auctions_status_ends ON auctions (status, ends_at);
CREATE INDEX idx_auctions_artwork ON auctions (artwork_id);

CREATE TABLE bids (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    auction_id BIGINT         NOT NULL,
    bidder_id  BIGINT         NOT NULL,
    amount     DECIMAL(14, 2) NOT NULL,
    created_at TIMESTAMP(6)   NOT NULL,
    CONSTRAINT fk_bids_auction FOREIGN KEY (auction_id) REFERENCES auctions (id) ON DELETE CASCADE,
    CONSTRAINT fk_bids_bidder FOREIGN KEY (bidder_id) REFERENCES users (id),
    CONSTRAINT uk_bids_auction_amount UNIQUE (auction_id, amount)
) ENGINE = InnoDB;

CREATE INDEX idx_bids_bidder ON bids (bidder_id, created_at);
