package com.sip.psm.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Studio catalogue management and the public projections of artists, exhibitions and artworks. */
@IntegrationTest
class CatalogFlowIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;
    @Autowired
    ObjectMapper json;

    @Test
    void collaboratorBuildsCatalogueAndVisitorsSeeOnlyPublicFields() throws Exception {
        String token = fixtures.bearer(RoleName.COLLABORATEUR);
        long artistId = createArtist(token);
        long exhibitionId = createExhibition(token, artistId);
        String title = "Flow " + UUID.randomUUID();
        JsonNode artwork = createArtwork(token, title, artistId, exhibitionId, "PUBLISHED");

        mvc.perform(get("/api/artists/{id}", artistId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").exists())
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.phone").doesNotExist());
        mvc.perform(get("/api/exhibitions/{id}", exhibitionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.artistId").value(artistId))
                .andExpect(jsonPath("$.budget").doesNotExist());
        mvc.perform(get("/api/artworks/{slug}", artwork.get("slug").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.exhibitionId").value(exhibitionId))
                .andExpect(jsonPath("$.artist.id").value(artistId))
                .andExpect(jsonPath("$.artist.email").doesNotExist());
        mvc.perform(get("/api/artworks").param("artistId", String.valueOf(artistId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title").value(hasItem(title)));
    }

    @Test
    void draftArtworksAreHiddenFromThePublicCatalogue() throws Exception {
        String token = fixtures.bearer(RoleName.COLLABORATEUR);
        long artistId = createArtist(token);
        String title = "Draft " + UUID.randomUUID();
        JsonNode draft = createArtwork(token, title, artistId, null, "DRAFT");

        mvc.perform(get("/api/artworks/{slug}", draft.get("slug").asText()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("not_found"));
        mvc.perform(get("/api/artworks").param("artistId", String.valueOf(artistId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].title").value(not(hasItem(title))));
        mvc.perform(get("/api/studio/artworks/{id}", draft.get("id").asLong()).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void artworksWithTheSameTitleReceiveDistinctSlugs() throws Exception {
        String token = fixtures.bearer(RoleName.COLLABORATEUR);
        long artistId = createArtist(token);
        String title = "Twin " + UUID.randomUUID();

        String first = createArtwork(token, title, artistId, null, "PUBLISHED").get("slug").asText();
        String second = createArtwork(token, title, artistId, null, "PUBLISHED").get("slug").asText();

        assertThat(second).isEqualTo(first + "-2");
        assertThat(first).isEqualTo(title.toLowerCase().replace(' ', '-'));
    }

    @Test
    void artworkWithExhibitionOfAnotherArtistIsRejected() throws Exception {
        String token = fixtures.bearer(RoleName.COLLABORATEUR);
        long artistId = createArtist(token);
        long otherExhibition = createExhibition(token, createArtist(token));

        mvc.perform(post("/api/studio/artworks").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(artworkBody("Mismatch", artistId, otherExhibition, "PUBLISHED")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("exhibition_artist_mismatch"));
    }

    @Test
    void artistWithExhibitionsCannotBeDeleted() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);
        long artistId = createArtist(admin);
        createExhibition(admin, artistId);

        mvc.perform(delete("/api/studio/artists/{id}", artistId).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("integrity_violation"));
    }

    @Test
    void adminUpdatesAnArtistAndChangesAreReturned() throws Exception {
        String admin = fixtures.bearer(RoleName.ADMIN);
        long artistId = createArtist(admin);

        mvc.perform(put("/api/studio/artists/{id}", artistId).header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Renamed Artist\",\"email\":\"renamed@test.local\",\"country\":\"Japan\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Artist"))
                .andExpect(jsonPath("$.email").value("renamed@test.local"))
                .andExpect(jsonPath("$.country").value("Japan"));
    }

    @Test
    void invalidArtistPayloadReturnsFieldErrors() throws Exception {
        mvc.perform(post("/api/studio/artists").header("Authorization", fixtures.bearer(RoleName.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"email\":\"bad\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists())
                .andExpect(jsonPath("$.fields.email").exists());
    }

    private long createArtist(String token) throws Exception {
        String body = "{\"name\":\"Artist %s\",\"email\":\"secret@test.local\",\"phone\":\"+33 1 23\",\"country\":\"France\"}"
                .formatted(UUID.randomUUID());
        return read(mvc.perform(post("/api/studio/artists").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    private long createExhibition(String token, long artistId) throws Exception {
        String body = "{\"title\":\"Show %s\",\"budget\":12345.67,\"durationDays\":30,\"artistId\":%d}"
                .formatted(UUID.randomUUID(), artistId);
        return read(mvc.perform(post("/api/studio/exhibitions").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
    }

    private JsonNode createArtwork(String token, String title, long artistId, Long exhibitionId, String status)
            throws Exception {
        return read(mvc.perform(post("/api/studio/artworks").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(artworkBody(title, artistId, exhibitionId, status)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private static String artworkBody(String title, long artistId, Long exhibitionId, String status) {
        return "{\"title\":\"%s\",\"imageUrl\":\"/artworks/x.jpg\",\"artistId\":%d,\"exhibitionId\":%s,\"status\":\"%s\"}"
                .formatted(title, artistId, exhibitionId, status);
    }

    private JsonNode read(String body) throws Exception {
        return json.readTree(body);
    }
}
