package com.sip.psm.studio;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Read-only aggregate queries for the studio dashboard, written in SQL for clarity and speed. */
@Repository
public class StudioStatsRepository {

    private final JdbcClient jdbc;

    public StudioStatsRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public long countCreatedBetween(String table, Instant from, Instant to) {
        return jdbc.sql("select count(*) from " + safeTable(table) + " where created_at >= ? and created_at < ?")
                .params(from, to).query(Long.class).single();
    }

    public BigDecimal bidVolumeBetween(Instant from, Instant to) {
        return jdbc.sql("select coalesce(sum(amount), 0) from bids where created_at >= ? and created_at < ?")
                .params(from, to).query(BigDecimal.class).single();
    }

    public List<StudioOverview.DailyActivity> dailyBids(Instant since) {
        return jdbc.sql("""
                        select date(created_at) as day, count(*) as bids, coalesce(sum(amount), 0) as volume
                        from bids where created_at >= ?
                        group by date(created_at) order by day
                        """)
                .param(since)
                .query((rs, n) -> new StudioOverview.DailyActivity(rs.getObject("day", LocalDate.class),
                        rs.getLong("bids"), rs.getBigDecimal("volume")))
                .list();
    }

    public List<StudioOverview.ArtistRanking> topArtists(int limit) {
        return jdbc.sql("""
                        select ar.id, ar.name, count(b.id) as bids, coalesce(sum(b.amount), 0) as volume
                        from bids b
                        join auctions au on au.id = b.auction_id
                        join artworks aw on aw.id = au.artwork_id
                        join artists ar on ar.id = aw.artist_id
                        group by ar.id, ar.name
                        order by volume desc
                        limit ?
                        """)
                .param(limit)
                .query((rs, n) -> new StudioOverview.ArtistRanking(rs.getLong("id"), rs.getString("name"),
                        rs.getLong("bids"), rs.getBigDecimal("volume")))
                .list();
    }

    public List<StudioOverview.RecentBid> recentBids(int limit) {
        return jdbc.sql("""
                        select au.id as auction_id, aw.title, aw.image_url, u.first_name, u.last_name,
                               b.amount, b.created_at
                        from bids b
                        join auctions au on au.id = b.auction_id
                        join artworks aw on aw.id = au.artwork_id
                        join users u on u.id = b.bidder_id
                        order by b.created_at desc, b.id desc
                        limit ?
                        """)
                .param(limit)
                .query((rs, n) -> new StudioOverview.RecentBid(rs.getLong("auction_id"), rs.getString("title"),
                        rs.getString("image_url"),
                        rs.getString("first_name") + " " + rs.getString("last_name").charAt(0) + ".",
                        rs.getBigDecimal("amount"), rs.getTimestamp("created_at").toInstant()))
                .list();
    }

    private static String safeTable(String table) {
        return switch (table) {
            case "artists", "exhibitions", "bids", "users" -> table;
            default -> throw new IllegalArgumentException("Unsupported table " + table);
        };
    }
}
