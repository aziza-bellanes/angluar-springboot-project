package com.sip.psm.artist;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class ArtistDtos {

    private ArtistDtos() {
    }

    public record ArtistRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 190) String email,
            @Size(max = 30) String phone,
            @Size(max = 255) String address,
            @Size(max = 80) String country,
            @Size(max = 4000) String biography,
            @Size(max = 500) String photoUrl,
            Boolean active) {
    }

    /** Public projection: contact details (email, phone, address) are only exposed to the studio. */
    public record ArtistSummary(Long id, String name, String country, String biography, String photoUrl) {

        public static ArtistSummary from(Artist artist) {
            return new ArtistSummary(artist.getId(), artist.getName(), artist.getCountry(),
                    artist.getBiography(), artist.getPhotoUrl());
        }
    }

    public record ArtistResponse(Long id, String name, String email, String phone, String address, String country,
                                 String biography, String photoUrl, boolean active, String createdBy,
                                 Instant createdAt, long version) {

        public static ArtistResponse from(Artist artist) {
            return new ArtistResponse(artist.getId(), artist.getName(), artist.getEmail(), artist.getPhone(),
                    artist.getAddress(), artist.getCountry(), artist.getBiography(), artist.getPhotoUrl(),
                    artist.isActive(), artist.getCreatedBy() == null ? null : artist.getCreatedBy().getEmail(),
                    artist.getCreatedAt(), artist.getVersion());
        }
    }
}
