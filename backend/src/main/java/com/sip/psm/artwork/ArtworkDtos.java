package com.sip.psm.artwork;

import com.sip.psm.artist.ArtistDtos.ArtistSummary;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class ArtworkDtos {

    private ArtworkDtos() {
    }

    public record ArtworkRequest(
            @NotBlank @Size(max = 160) String title,
            @Size(max = 4000) String description,
            @Min(1000) @Max(2100) Integer yearCreated,
            @Size(max = 120) String medium,
            @Size(max = 80) String dimensions,
            @NotBlank @Size(max = 500) String imageUrl,
            @Size(max = 255) String imageCredit,
            @DecimalMin("0.0") BigDecimal estimate,
            ArtworkStatus status,
            @NotNull Long artistId,
            Long exhibitionId) {
    }

    /** Compact projection used by public listings. */
    public record ArtworkCard(Long id, String slug, String title, Integer yearCreated, String medium,
                              String imageUrl, Long artistId, String artistName) {

        public static ArtworkCard from(Artwork artwork) {
            return new ArtworkCard(artwork.getId(), artwork.getSlug(), artwork.getTitle(),
                    artwork.getYearCreated(), artwork.getMedium(), artwork.getImageUrl(),
                    artwork.getArtist().getId(), artwork.getArtist().getName());
        }
    }

    public record ArtworkDetail(Long id, String slug, String title, String description, Integer yearCreated,
                                String medium, String dimensions, String imageUrl, String imageCredit,
                                BigDecimal estimate, ArtistSummary artist, Long exhibitionId,
                                String exhibitionTitle) {

        public static ArtworkDetail from(Artwork artwork) {
            return new ArtworkDetail(artwork.getId(), artwork.getSlug(), artwork.getTitle(),
                    artwork.getDescription(), artwork.getYearCreated(), artwork.getMedium(),
                    artwork.getDimensions(), artwork.getImageUrl(), artwork.getImageCredit(),
                    artwork.getEstimate(), ArtistSummary.from(artwork.getArtist()),
                    artwork.getExhibition() == null ? null : artwork.getExhibition().getId(),
                    artwork.getExhibition() == null ? null : artwork.getExhibition().getTitle());
        }
    }

    public record ArtworkResponse(Long id, String slug, String title, String description, Integer yearCreated,
                                  String medium, String dimensions, String imageUrl, String imageCredit,
                                  BigDecimal estimate, ArtworkStatus status, Long artistId, String artistName,
                                  Long exhibitionId, String exhibitionTitle, String createdBy,
                                  Instant createdAt, long version) {

        public static ArtworkResponse from(Artwork artwork) {
            return new ArtworkResponse(artwork.getId(), artwork.getSlug(), artwork.getTitle(),
                    artwork.getDescription(), artwork.getYearCreated(), artwork.getMedium(),
                    artwork.getDimensions(), artwork.getImageUrl(), artwork.getImageCredit(),
                    artwork.getEstimate(), artwork.getStatus(), artwork.getArtist().getId(),
                    artwork.getArtist().getName(),
                    artwork.getExhibition() == null ? null : artwork.getExhibition().getId(),
                    artwork.getExhibition() == null ? null : artwork.getExhibition().getTitle(),
                    artwork.getCreatedBy() == null ? null : artwork.getCreatedBy().getEmail(),
                    artwork.getCreatedAt(), artwork.getVersion());
        }
    }
}
