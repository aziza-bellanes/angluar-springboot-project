package com.sip.psm.demo;

import java.math.BigDecimal;
import java.util.List;

/** Shape of {@code classpath:demo/catalog.json}. */
record DemoCatalog(List<ArtistEntry> artists, List<ArtworkEntry> artworks) {

    record ArtistEntry(String key, String name, String country, String biography, String email, String phone,
                       String address, ExhibitionEntry exhibition) {
    }

    record ExhibitionEntry(String title, String venue, BigDecimal budget, int durationDays, int startOffsetDays,
                           String description) {
    }

    record ArtworkEntry(String artistKey, String slug, String title, Integer yearCreated, String medium,
                        String dimensions, String imageUrl, String imageCredit, String description,
                        BigDecimal estimate) {
    }
}
