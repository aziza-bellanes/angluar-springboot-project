package com.sip.psm.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.sip.psm.artist.Artist;
import com.sip.psm.artwork.Artwork;
import com.sip.psm.auction.Auction;
import com.sip.psm.exhibition.Exhibition;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Verifies the authorization matrix of {@code SecurityConfig} for anonymous, BIDDER, COLLABORATEUR and ADMIN. */
@IntegrationTest
class SecurityMatrixIT {

    /** Builds a request against freshly created fixture data. */
    private interface RequestFactory extends Function<TestFixtures, MockHttpServletRequestBuilder> {
    }

    private record Endpoint(String label, RequestFactory request, int anonymous, int bidder, int collaborateur,
                            int admin) {
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;

    @ParameterizedTest(name = "{0} as {1} -> {2}")
    @MethodSource("matrix")
    void endpointRespectsTheAuthorizationMatrix(String endpoint, String role, int expected,
                                                RequestFactory factory) throws Exception {
        MockHttpServletRequestBuilder request = factory.apply(fixtures);
        if (!"ANONYMOUS".equals(role)) {
            request.header("Authorization", fixtures.bearer(RoleName.valueOf(role)));
        }

        MockHttpServletResponse response = mvc.perform(request).andReturn().getResponse();

        assertThat(response.getStatus()).as("%s as %s", endpoint, role).isEqualTo(expected);
        if (expected == 401) {
            assertThat(response.getContentAsString()).contains("\"code\":\"authentication_required\"");
        }
        if (expected == 403) {
            assertThat(response.getContentAsString()).contains("\"code\":\"forbidden\"");
        }
    }

    static Stream<Arguments> matrix() {
        return endpoints().stream().flatMap(e -> Stream.of(
                Arguments.of(e.label(), "ANONYMOUS", e.anonymous(), e.request()),
                Arguments.of(e.label(), "BIDDER", e.bidder(), e.request()),
                Arguments.of(e.label(), "COLLABORATEUR", e.collaborateur(), e.request()),
                Arguments.of(e.label(), "ADMIN", e.admin(), e.request())));
    }

    private static List<Endpoint> endpoints() {
        List<Endpoint> list = new ArrayList<>();
        list.add(new Endpoint("GET /api/artworks", f -> get("/api/artworks"), 200, 200, 200, 200));

        list.add(new Endpoint("GET /api/studio/artists", f -> get("/api/studio/artists"), 401, 403, 200, 200));
        list.add(new Endpoint("POST /api/studio/artists", f -> json(post("/api/studio/artists"), artistBody()),
                401, 403, 201, 201));
        list.add(new Endpoint("PUT /api/studio/artists/{id}",
                f -> json(put("/api/studio/artists/{id}", f.artist().getId()), artistBody()), 401, 403, 403, 200));
        list.add(new Endpoint("DELETE /api/studio/artists/{id}",
                f -> delete("/api/studio/artists/{id}", f.artist().getId()), 401, 403, 403, 204));

        list.add(new Endpoint("POST /api/studio/exhibitions",
                f -> json(post("/api/studio/exhibitions"), exhibitionBody(f.artist())), 401, 403, 201, 201));
        list.add(new Endpoint("PUT /api/studio/exhibitions/{id}", f -> {
            Exhibition exhibition = f.exhibition(f.artist());
            return json(put("/api/studio/exhibitions/{id}", exhibition.getId()),
                    exhibitionBody(exhibition.getArtist()));
        }, 401, 403, 403, 200));
        list.add(new Endpoint("DELETE /api/studio/exhibitions/{id}",
                f -> delete("/api/studio/exhibitions/{id}", f.exhibition(f.artist()).getId()),
                401, 403, 403, 204));

        list.add(new Endpoint("POST /api/studio/artworks",
                f -> json(post("/api/studio/artworks"), artworkBody(f.artist())), 401, 403, 201, 201));
        list.add(new Endpoint("PUT /api/studio/artworks/{id}", f -> {
            Artwork artwork = f.artwork();
            return json(put("/api/studio/artworks/{id}", artwork.getId()), artworkBody(artwork.getArtist()));
        }, 401, 403, 403, 200));
        list.add(new Endpoint("DELETE /api/studio/artworks/{id}",
                f -> delete("/api/studio/artworks/{id}", f.artwork().getId()), 401, 403, 403, 204));

        list.add(new Endpoint("GET /api/studio/overview", f -> get("/api/studio/overview"), 401, 403, 200, 200));
        list.add(new Endpoint("POST /api/studio/auctions", f -> {
            Instant now = Instant.now();
            return json(post("/api/studio/auctions"), """
                    {"artworkId":%d,"startingPrice":100.00,"minimumIncrement":10.00,"startsAt":"%s","endsAt":"%s"}
                    """.formatted(f.artwork().getId(), now.plus(Duration.ofHours(1)), now.plus(Duration.ofHours(2))));
        }, 401, 403, 403, 201));
        list.add(new Endpoint("GET /api/admin/users", f -> get("/api/admin/users"), 401, 403, 403, 200));
        list.add(new Endpoint("POST /api/auctions/{id}/bids", f -> {
            Auction auction = f.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));
            return json(post("/api/auctions/{id}/bids", auction.getId()), "{\"amount\":100.00}");
        }, 401, 201, 403, 403));
        list.add(new Endpoint("GET /api/account/bids", f -> get("/api/account/bids"), 401, 200, 200, 200));
        return list;
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder builder, String body) {
        return builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static String artistBody() {
        return "{\"name\":\"Matrix Artist\",\"email\":\"matrix@test.local\",\"country\":\"France\"}";
    }

    private static String exhibitionBody(Artist artist) {
        return "{\"title\":\"Matrix Show\",\"budget\":500.00,\"durationDays\":14,\"artistId\":%d}"
                .formatted(artist.getId());
    }

    private static String artworkBody(Artist artist) {
        return "{\"title\":\"Matrix Work\",\"imageUrl\":\"/artworks/m.jpg\",\"artistId\":%d}"
                .formatted(artist.getId());
    }
}
