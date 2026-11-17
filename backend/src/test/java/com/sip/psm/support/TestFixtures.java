package com.sip.psm.support;

import com.sip.psm.artist.Artist;
import com.sip.psm.artist.ArtistRepository;
import com.sip.psm.artwork.Artwork;
import com.sip.psm.artwork.ArtworkRepository;
import com.sip.psm.artwork.ArtworkStatus;
import com.sip.psm.auction.Auction;
import com.sip.psm.auction.AuctionRepository;
import com.sip.psm.exhibition.Exhibition;
import com.sip.psm.exhibition.ExhibitionRepository;
import com.sip.psm.security.JwtService;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.RoleRepository;
import com.sip.psm.user.User;
import com.sip.psm.user.UserRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Creates persisted test data and bearer tokens. Every call uses unique values, so tests stay independent. */
@TestComponent
public class TestFixtures {

    public static final String PASSWORD = "Password123!";

    private final UserRepository users;
    private final RoleRepository roles;
    private final ArtistRepository artists;
    private final ArtworkRepository artworks;
    private final AuctionRepository auctions;
    private final ExhibitionRepository exhibitions;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public TestFixtures(UserRepository users, RoleRepository roles, ArtistRepository artists,
                        ArtworkRepository artworks, AuctionRepository auctions,
                        ExhibitionRepository exhibitions, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.roles = roles;
        this.artists = artists;
        this.artworks = artworks;
        this.auctions = auctions;
        this.exhibitions = exhibitions;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public User user(RoleName role) {
        User user = new User();
        user.setFirstName("Test");
        user.setLastName(role.name());
        user.setEmail(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@test.local");
        user.setPassword(encoder.encode(PASSWORD));
        user.getRoles().add(roles.require(role));
        return users.save(user);
    }

    public String bearer(User user) {
        return "Bearer " + jwt.issue(user.getEmail()).value();
    }

    public String bearer(RoleName role) {
        return bearer(user(role));
    }

    public Artist artist() {
        Artist artist = new Artist();
        artist.setName("Artist " + UUID.randomUUID());
        artist.setEmail("artist@test.local");
        artist.setCountry("Netherlands");
        return artists.save(artist);
    }

    public Artwork artwork() {
        Artwork artwork = new Artwork();
        artwork.setArtist(artist());
        artwork.setTitle("Study");
        artwork.setSlug("study-" + UUID.randomUUID());
        artwork.setImageUrl("/artworks/study.jpg");
        artwork.setStatus(ArtworkStatus.PUBLISHED);
        return artworks.save(artwork);
    }

    public Exhibition exhibition(Artist artist) {
        Exhibition exhibition = new Exhibition();
        exhibition.setTitle("Exhibition " + UUID.randomUUID());
        exhibition.setBudget(new BigDecimal("1000.00"));
        exhibition.setDurationDays(30);
        exhibition.setArtist(artist);
        return exhibitions.save(exhibition);
    }

    public Artwork artwork(ArtworkStatus status) {
        Artwork artwork = artwork();
        artwork.setStatus(status);
        return artworks.save(artwork);
    }

    /** An auction that is already open and ends in one hour. */
    public Auction openAuction(BigDecimal startingPrice, BigDecimal increment) {
        Auction auction = new Auction();
        auction.setArtwork(artwork());
        auction.setStartingPrice(startingPrice);
        auction.setCurrentPrice(startingPrice);
        auction.setMinimumIncrement(increment);
        auction.setStartsAt(Instant.now().minus(Duration.ofMinutes(1)));
        auction.setEndsAt(Instant.now().plus(Duration.ofHours(1)));
        auction.synchronize(Instant.now());
        return auctions.save(auction);
    }
}
