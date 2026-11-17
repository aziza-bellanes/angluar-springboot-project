package com.sip.psm.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sip.psm.artist.Artist;
import com.sip.psm.artist.ArtistRepository;
import com.sip.psm.artwork.Artwork;
import com.sip.psm.artwork.ArtworkRepository;
import com.sip.psm.artwork.ArtworkStatus;
import com.sip.psm.auction.Auction;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.auction.BidRepository;
import com.sip.psm.exhibition.Exhibition;
import com.sip.psm.exhibition.ExhibitionRepository;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.RoleRepository;
import com.sip.psm.user.User;
import com.sip.psm.user.UserRepository;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads a demonstration gallery (public-domain works from The Met Open Access) when
 * {@code DEMO_DATA=true} and the catalogue is empty: artists, exhibitions, artworks,
 * demo accounts and auctions in every state.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "atelier.demo-data", havingValue = "true")
public class DemoDataInitializer implements ApplicationRunner {

    public static final String DEMO_PASSWORD = "Atelier2026!";

    private static final Logger log = LoggerFactory.getLogger(DemoDataInitializer.class);

    private final ObjectMapper json;
    private final ArtistRepository artists;
    private final ExhibitionRepository exhibitions;
    private final ArtworkRepository artworks;
    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public DemoDataInitializer(ObjectMapper json, ArtistRepository artists, ExhibitionRepository exhibitions,
                               ArtworkRepository artworks, AuctionRepository auctions, BidRepository bids,
                               UserRepository users, RoleRepository roles, PasswordEncoder encoder, Clock clock) {
        this.json = json;
        this.artists = artists;
        this.exhibitions = exhibitions;
        this.artworks = artworks;
        this.auctions = auctions;
        this.bids = bids;
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        if (artists.count() > 0) {
            return;
        }
        DemoCatalog catalog = readCatalog();
        User curator = account("curator@atelier.demo", "Camille", "Curator", RoleName.COLLABORATEUR);
        User collectorA = account("collector@atelier.demo", "Theo", "Collector", RoleName.BIDDER);
        User collectorB = account("patron@atelier.demo", "Jo", "Patron", RoleName.BIDDER);

        Map<String, Artist> artistsByKey = new HashMap<>();
        Map<String, Exhibition> exhibitionsByArtist = new HashMap<>();
        for (DemoCatalog.ArtistEntry entry : catalog.artists()) {
            Artist artist = artists.save(toArtist(entry, curator));
            artistsByKey.put(entry.key(), artist);
            exhibitionsByArtist.put(entry.key(), exhibitions.save(exhibition(artist, entry.exhibition(), curator)));
        }

        List<Artwork> saved = catalog.artworks().stream()
                .map(entry -> artworks.save(toArtwork(entry, artistsByKey.get(entry.artistKey()),
                        exhibitionsByArtist.get(entry.artistKey()), curator)))
                .toList();

        seedAuctions(saved, collectorA, collectorB);
        log.info("Demo gallery loaded: {} artists, {} artworks, {} auctions",
                artistsByKey.size(), saved.size(), auctions.count());
    }

    private DemoCatalog readCatalog() throws IOException {
        try (InputStream in = new ClassPathResource("demo/catalog.json").getInputStream()) {
            return json.readValue(in, DemoCatalog.class);
        }
    }

    private User account(String email, String firstName, String lastName, RoleName role) {
        return users.findByEmailIgnoreCase(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setPassword(encoder.encode(DEMO_PASSWORD));
            user.setRoles(Set.of(roles.require(role)));
            return users.save(user);
        });
    }

    private static Artist toArtist(DemoCatalog.ArtistEntry entry, User curator) {
        Artist artist = new Artist();
        artist.setName(entry.name());
        artist.setEmail(entry.email());
        artist.setPhone(entry.phone());
        artist.setAddress(entry.address());
        artist.setCountry(entry.country());
        artist.setBiography(entry.biography());
        artist.setCreatedBy(curator);
        return artist;
    }

    private Exhibition exhibition(Artist artist, DemoCatalog.ExhibitionEntry entry, User curator) {
        Exhibition exhibition = new Exhibition();
        exhibition.setArtist(artist);
        exhibition.setTitle(entry.title());
        exhibition.setDescription(entry.description());
        exhibition.setBudget(entry.budget());
        exhibition.setDurationDays(entry.durationDays());
        exhibition.setStartsOn(LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC).plusDays(entry.startOffsetDays()));
        exhibition.setVenue(entry.venue());
        exhibition.setCreatedBy(curator);
        return exhibition;
    }

    private static Artwork toArtwork(DemoCatalog.ArtworkEntry entry, Artist artist, Exhibition exhibition,
                                     User curator) {
        Artwork artwork = new Artwork();
        artwork.setArtist(artist);
        artwork.setExhibition(exhibition);
        artwork.setSlug(entry.slug());
        artwork.setTitle(entry.title());
        artwork.setYearCreated(entry.yearCreated());
        artwork.setMedium(entry.medium());
        artwork.setDimensions(entry.dimensions());
        artwork.setImageUrl(entry.imageUrl());
        artwork.setImageCredit(entry.imageCredit());
        artwork.setDescription(entry.description());
        artwork.setEstimate(entry.estimate());
        artwork.setStatus(ArtworkStatus.PUBLISHED);
        artwork.setCreatedBy(curator);
        return artwork;
    }

    /** First eight works: six open auctions (half with bids), one scheduled, one closed with a winner. */
    private void seedAuctions(List<Artwork> works, User collectorA, User collectorB) {
        Instant now = clock.instant();
        for (int i = 0; i < Math.min(8, works.size()); i++) {
            Auction auction = auctions.save(newAuction(works.get(i), now));
            if (i == 6) {
                window(auction, now.plus(Duration.ofHours(2)), now.plus(Duration.ofDays(3)), now);
            } else if (i == 7) {
                window(auction, now.minus(Duration.ofDays(3)), now.plus(Duration.ofHours(1)), now);
                placeTwoBids(auction, collectorA, collectorB, now.minus(Duration.ofDays(1)));
                auction.setEndsAt(now.minus(Duration.ofHours(1)));
                auction.synchronize(now);
            } else {
                window(auction, now.minus(Duration.ofDays(1)), now.plus(Duration.ofHours(6L + 12L * i)), now);
                if (i % 2 == 0) {
                    placeTwoBids(auction, collectorA, collectorB, now.minus(Duration.ofHours(3)));
                }
            }
            auctions.save(auction);
        }
    }

    private static Auction newAuction(Artwork artwork, Instant now) {
        BigDecimal start = startingPrice(artwork);
        Auction auction = new Auction();
        auction.setArtwork(artwork);
        auction.setStartingPrice(start);
        auction.setCurrentPrice(start);
        auction.setMinimumIncrement(start.divide(BigDecimal.TEN, 0, RoundingMode.UP).max(BigDecimal.ONE));
        auction.setStartsAt(now);
        auction.setEndsAt(now.plus(Duration.ofDays(1)));
        return auction;
    }

    private static void window(Auction auction, Instant startsAt, Instant endsAt, Instant now) {
        auction.setStartsAt(startsAt);
        auction.setEndsAt(endsAt);
        auction.synchronize(now);
    }

    private void placeTwoBids(Auction auction, User first, User second, Instant at) {
        bids.save(auction.placeBid(first, auction.minimumNextBid(), at, Duration.ZERO));
        bids.save(auction.placeBid(second, auction.minimumNextBid(), at.plusSeconds(600), Duration.ZERO));
    }

    private static BigDecimal startingPrice(Artwork artwork) {
        BigDecimal estimate = artwork.getEstimate() == null ? new BigDecimal("10000") : artwork.getEstimate();
        return estimate.multiply(new BigDecimal("0.6")).setScale(0, RoundingMode.HALF_UP);
    }
}
