package com.sip.psm.exhibition;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ExhibitionDtos {

    private ExhibitionDtos() {
    }

    public record ExhibitionRequest(
            @NotBlank @Size(max = 160) String title,
            @Size(max = 4000) String description,
            @NotNull @DecimalMin("0.0") @Digits(integer = 12, fraction = 2) BigDecimal budget,
            @NotNull @Min(1) @Max(3650) Integer durationDays,
            LocalDate startsOn,
            @Size(max = 160) String venue,
            @Size(max = 500) String coverUrl,
            @NotNull Long artistId) {
    }

    /** Public projection: the budget is internal and only exposed to the studio. */
    public record ExhibitionSummary(Long id, String title, String description, int durationDays, LocalDate startsOn,
                                    LocalDate endsOn, String venue, String coverUrl, Long artistId,
                                    String artistName) {

        public static ExhibitionSummary from(Exhibition exhibition) {
            return new ExhibitionSummary(exhibition.getId(), exhibition.getTitle(), exhibition.getDescription(),
                    exhibition.getDurationDays(), exhibition.getStartsOn(), computeEnd(exhibition),
                    exhibition.getVenue(), exhibition.getCoverUrl(), exhibition.getArtist().getId(),
                    exhibition.getArtist().getName());
        }
    }

    public record ExhibitionResponse(Long id, String title, String description, BigDecimal budget, int durationDays,
                                     LocalDate startsOn, LocalDate endsOn, String venue, String coverUrl,
                                     Long artistId, String artistName, String createdBy, Instant createdAt,
                                     long version) {

        public static ExhibitionResponse from(Exhibition exhibition) {
            return new ExhibitionResponse(exhibition.getId(), exhibition.getTitle(), exhibition.getDescription(),
                    exhibition.getBudget(), exhibition.getDurationDays(), exhibition.getStartsOn(),
                    computeEnd(exhibition), exhibition.getVenue(), exhibition.getCoverUrl(),
                    exhibition.getArtist().getId(), exhibition.getArtist().getName(),
                    exhibition.getCreatedBy() == null ? null : exhibition.getCreatedBy().getEmail(),
                    exhibition.getCreatedAt(), exhibition.getVersion());
        }
    }

    private static LocalDate computeEnd(Exhibition exhibition) {
        return exhibition.getStartsOn() == null ? null
                : exhibition.getStartsOn().plusDays(exhibition.getDurationDays());
    }
}
