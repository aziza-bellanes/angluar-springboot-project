package com.sip.psm.common;

import java.text.Normalizer;
import java.util.Locale;

/** Builds URL-friendly identifiers such as {@code the-starry-night}. */
public final class Slugs {

    private Slugs() {
    }

    public static String of(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = normalized.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "artwork" : slug;
    }
}
