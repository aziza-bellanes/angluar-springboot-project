package com.sip.psm.mail;

import com.sip.psm.artist.ArtistContactCreatedEvent;
import com.sip.psm.auction.AuctionResultEvent;
import com.sip.psm.auction.AuctionStatus;
import com.sip.psm.auction.BidAcceptedEvent;
import com.sip.psm.config.AtelierProperties;
import com.sip.psm.mail.GalleryMailTemplate.Content;
import com.sip.psm.mail.GalleryMailTemplate.Detail;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** After-commit callbacks use immutable snapshots, never managed JPA entities. */
@Component
public class GalleryActivityMailListener {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM uuuu, HH:mm 'UTC'", java.util.Locale.ENGLISH)
            .withZone(ZoneOffset.UTC);
    private final GalleryMailSender sender;
    private final String admin;

    public GalleryActivityMailListener(GalleryMailSender sender, AtelierProperties properties) {
        this.sender = sender;
        this.admin = properties.mail().adminAddress();
    }

    @Async("galleryMailExecutor")
    @TransactionalEventListener
    public void onArtistContact(ArtistContactCreatedEvent event) {
        sender.send(event.email(), new Content("Your artist connection", "Art starts with a connection.",
                "Your artist contact details are now with ATELIER.", "Hello, " + event.name() + ".",
                List.of("The ATELIER team has added or updated your email in our artist directory. We look forward to connecting your work with new perspectives.",
                        "This is a gallery contact record. It does not create a sign-in account. Reply to this email if your details need correcting."),
                List.of(new Detail("Artist", event.name()), new Detail("Contact email", event.email())),
                "Discover ATELIER", "/artists"));
        sender.send(admin, new Content("Artist contact · " + event.name(), "A connection for the gallery.",
                "An artist contact was added or its email changed.", "Hello, gallery team.",
                List.of("An artist contact has been added, or assigned a new email address. Their gallery welcome has been requested."),
                List.of(new Detail("Artist", event.name()), new Detail("Email", event.email()),
                        new Detail("Artist reference", String.valueOf(event.artistId()))),
                "Review artist contacts", "/studio/artists"));
    }

    @Async("galleryMailExecutor")
    @TransactionalEventListener
    public void onBidAccepted(BidAcceptedEvent event) {
        String path = "/auctions/" + event.auctionId();
        List<Detail> details = List.of(new Detail("Artwork", event.artworkTitle()),
                new Detail("Artist", event.artistName()), new Detail("Your bid", money(event.amount())),
                new Detail("Closing time", DATE.format(event.endsAt())));
        sender.send(event.bidder().email(), new Content("Bid received · " + event.artworkTitle(),
                "Your bid is on the wall.", "Your bid has been accepted by ATELIER.",
                "Hello, " + event.bidder().fullName() + ".",
                List.of("We have recorded your bid. You were the highest bidder when it was accepted; the live auction page shows the current position.",
                        "Bidding can continue until the closing time. A late bid may extend the auction. We will email you if another collector takes the lead."),
                details, "View your auction", path));
        if (event.previousLeader() != null) {
            sender.send(event.previousLeader().email(), new Content("You have been outbid · " + event.artworkTitle(),
                    "A new perspective leads.", "Another collector placed a higher bid.",
                    "Hello, " + event.previousLeader().fullName() + ".",
                    List.of("Another collector has placed a higher bid on this artwork. Open the auction to see whether bidding is still available and review the current minimum."),
                    List.of(new Detail("Artwork", event.artworkTitle()), new Detail("Artist", event.artistName()),
                            new Detail("Accepted higher bid", money(event.amount())),
                            new Detail("Closing time", DATE.format(event.endsAt()))), "Return to the auction", path));
        }
    }

    @Async("galleryMailExecutor")
    @TransactionalEventListener
    public void onAuctionResult(AuctionResultEvent event) {
        if (event.status() != AuctionStatus.CLOSED && event.status() != AuctionStatus.CANCELLED) return;
        String path = "/auctions/" + event.auctionId();
        boolean cancelled = event.status() == AuctionStatus.CANCELLED;
        boolean sold = !cancelled && event.winner() != null;
        List<Detail> details = new ArrayList<>(List.of(new Detail("Artwork", event.artworkTitle()),
                new Detail("Artist", event.artistName()), new Detail("Auction reference", "#" + event.auctionId())));
        details.add(new Detail("Result", cancelled ? "Cancelled" : sold ? "Winning bid recorded" : "Closed without bids"));
        if (sold) {
            details.add(new Detail("Winning bid", money(event.currentPrice())));
            sender.send(event.winner().email(), new Content("You won · " + event.artworkTitle(),
                    "A new chapter for this artwork.", "The auction is closed. You are the winning bidder.",
                    "Congratulations, " + event.winner().fullName() + ".",
                    List.of("The auction has closed and your bid is the winning bid. Thank you for bringing your perspective to ATELIER.",
                            "Reply to this email to arrange the next steps with the gallery. This message records the result; payment and delivery are arranged separately."),
                    details, "View your winning artwork", path));
        } else if (cancelled && event.leadingBidder() != null) {
            sender.send(event.leadingBidder().email(), new Content("Auction cancelled · " + event.artworkTitle(),
                    "An update from the gallery.", "The auction you were leading has been cancelled.",
                    "Hello, " + event.leadingBidder().fullName() + ".",
                    List.of("The gallery has cancelled this auction. No winning bid has been awarded. Reply to this email if you have questions about the artwork."),
                    details, "View the auction", path));
        }
        List<Detail> adminDetails = new ArrayList<>(details);
        if (sold) {
            adminDetails.add(new Detail("Winner", event.winner().fullName()));
            adminDetails.add(new Detail("Winner email", event.winner().email()));
        }
        sender.send(admin, new Content((cancelled ? "Auction cancelled · " : "Auction result · ") + event.artworkTitle(),
                cancelled ? "The auction has been cancelled." : sold ? "An artwork found its collector." : "The auction has closed.",
                "A final auction result is ready in Studio.", "Hello, gallery team.",
                List.of(sold ? "A winning bidder has been recorded. Contact the collector to arrange payment and delivery outside the application."
                        : cancelled ? "The auction is cancelled. No winner has been awarded."
                        : "This auction closed without bids. No winner or sale has been recorded."),
                adminDetails, "Review auctions in Studio", "/studio/auctions"));
    }

    private static String money(BigDecimal amount) {
        return "EUR " + amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
