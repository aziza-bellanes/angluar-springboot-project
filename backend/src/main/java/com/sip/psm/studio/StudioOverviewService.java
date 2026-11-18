package com.sip.psm.studio;

import com.sip.psm.artist.ArtistRepository;
import com.sip.psm.artwork.ArtworkRepository;
import com.sip.psm.artwork.ArtworkStatus;
import com.sip.psm.auction.AuctionDtos.AuctionView;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.auction.AuctionStatus;
import com.sip.psm.auction.BidRepository;
import com.sip.psm.exhibition.ExhibitionRepository;
import com.sip.psm.studio.StudioOverview.DailyActivity;
import com.sip.psm.studio.StudioOverview.Trends;
import com.sip.psm.user.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StudioOverviewService {

    private static final int ACTIVITY_DAYS = 14;
    private static final Duration WEEK = Duration.ofDays(7);

    private final ArtistRepository artists;
    private final ExhibitionRepository exhibitions;
    private final ArtworkRepository artworks;
    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final UserRepository users;
    private final StudioStatsRepository stats;
    private final Clock clock;

    public StudioOverviewService(ArtistRepository artists, ExhibitionRepository exhibitions,
                                 ArtworkRepository artworks, AuctionRepository auctions, BidRepository bids,
                                 UserRepository users, StudioStatsRepository stats, Clock clock) {
        this.artists = artists;
        this.exhibitions = exhibitions;
        this.artworks = artworks;
        this.auctions = auctions;
        this.bids = bids;
        this.users = users;
        this.stats = stats;
        this.clock = clock;
    }

    public StudioOverview overview() {
        Instant now = clock.instant();
        var endingSoon = auctions.search(EnumSet.of(AuctionStatus.OPEN), null,
                PageRequest.of(0, 5, Sort.by("endsAt"))).map(AuctionView::from).getContent();
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (AuctionStatus status : AuctionStatus.values()) {
            byStatus.put(status.name(), auctions.countByStatus(status));
        }
        return new StudioOverview(artists.count(), exhibitions.count(),
                artworks.countByStatus(ArtworkStatus.PUBLISHED), artworks.countByStatus(ArtworkStatus.DRAFT),
                byStatus.get("OPEN"), byStatus.get("SCHEDULED"), byStatus.get("CLOSED"), bids.count(), users.count(),
                exhibitions.totalBudget(), trends(now), activity(now), byStatus, stats.topArtists(5),
                stats.recentBids(6), endingSoon);
    }

    private Trends trends(Instant now) {
        Instant weekAgo = now.minus(WEEK);
        Instant twoWeeksAgo = weekAgo.minus(WEEK);
        return new Trends(
                stats.countCreatedBetween("artists", weekAgo, now),
                stats.countCreatedBetween("artists", twoWeeksAgo, weekAgo),
                stats.countCreatedBetween("exhibitions", weekAgo, now),
                stats.countCreatedBetween("exhibitions", twoWeeksAgo, weekAgo),
                stats.countCreatedBetween("bids", weekAgo, now),
                stats.countCreatedBetween("bids", twoWeeksAgo, weekAgo),
                stats.bidVolumeBetween(weekAgo, now),
                stats.bidVolumeBetween(twoWeeksAgo, weekAgo),
                stats.countCreatedBetween("users", weekAgo, now),
                stats.countCreatedBetween("users", twoWeeksAgo, weekAgo));
    }

    /** One point per day for the last two weeks, including days without bids. */
    private List<DailyActivity> activity(Instant now) {
        LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
        LocalDate first = today.minusDays(ACTIVITY_DAYS - 1L);
        Map<LocalDate, DailyActivity> recorded = stats
                .dailyBids(first.atStartOfDay().toInstant(ZoneOffset.UTC))
                .stream()
                .collect(Collectors.toMap(DailyActivity::day, Function.identity()));
        return Stream.iterate(first, day -> !day.isAfter(today), day -> day.plus(1, ChronoUnit.DAYS))
                .map(day -> recorded.getOrDefault(day, new DailyActivity(day, 0, BigDecimal.ZERO)))
                .toList();
    }
}
