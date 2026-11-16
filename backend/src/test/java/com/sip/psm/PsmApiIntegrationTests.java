package com.sip.psm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sip.psm.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:psm;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "management.health.mail.enabled=false",
    "psm.jwt.secret=integration-test-secret-at-least-32-bytes-long",
    "psm.jwt.expiration-ms=60000",
    "psm.bootstrap.email=admin@psm.local",
    "psm.bootstrap.password=admin-password",
    "psm.cors.origin=http://localhost:4200"
})
@AutoConfigureMockMvc
class PsmApiIntegrationTests {
    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean JavaMailSender mailSender;

    @Test
    void registrationLoginPermissionsKpisAndCorsWorkEndToEnd() throws Exception {
        mvc.perform(get("/api/clients"))
            .andExpect(status().isUnauthorized());

        String registration = mvc.perform(post("/api/auth/register")
                .contentType(JSON)
                .content("""
                    {"nom":"Martin","prenom":"Alice","email":"alice@psm.local","password":"Password123!","tel":"0102030405"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.roles", hasItem("COLLABORATEUR")))
            .andReturn().getResponse().getContentAsString();
        long collaboratorId = json.readTree(registration).path("user").path("id").asLong();
        verify(mailSender).send(any(org.springframework.mail.SimpleMailMessage.class));

        mvc.perform(post("/api/auth/login").contentType(JSON)
                .content("{\"email\":\"alice@psm.local\",\"password\":\"wrong-password\"}"))
            .andExpect(status().isUnauthorized());

        String collaboratorToken = login("alice@psm.local", "Password123!");
        String clientResponse = mvc.perform(post("/api/clients")
                .header("Authorization", bearer(collaboratorToken))
                .contentType(JSON)
                .content("{\"nom\":\"ACME\",\"email\":\"contact@acme.test\",\"tel\":\"123\",\"adresse\":\"Paris\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        long clientId = json.readTree(clientResponse).path("id").asLong();

        mvc.perform(put("/api/clients/{id}", clientId)
                .header("Authorization", bearer(collaboratorToken))
                .contentType(JSON)
                .content("{\"nom\":\"Forbidden\",\"email\":\"contact@acme.test\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").header("Authorization", bearer(collaboratorToken)))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/projets")
                .header("Authorization", bearer(collaboratorToken))
                .contentType(JSON)
                .content("""
                    {"libelle":"Portail","description":"Test KPI","budget":3000,"duree":10,"dateDebut":"2020-01-01","dateFin":"2020-01-10","statut":"EN_COURS","progression":25,"clientId":%d}
                    """.formatted(clientId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.progression").value(25));

        mvc.perform(get("/api/dashboard/stats").header("Authorization", bearer(collaboratorToken)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.clients").value(1))
            .andExpect(jsonPath("$.projets").value(1))
            .andExpect(jsonPath("$.enCours").value(1))
            .andExpect(jsonPath("$.enRetard").value(1))
            .andExpect(jsonPath("$.budgetTotal").value(3000));

        String adminToken = login("admin@psm.local", "admin-password");
        mvc.perform(put("/api/clients/{id}", clientId)
                .header("Authorization", bearer(adminToken))
                .contentType(JSON)
                .content("{\"nom\":\"ACME France\",\"email\":\"contact@acme.test\",\"tel\":\"123\",\"adresse\":\"Paris\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nom").value("ACME France"));

        mvc.perform(put("/api/admin/users/{id}/roles", collaboratorId)
                .header("Authorization", bearer(adminToken))
                .contentType(JSON)
                .content("{\"roles\":[\"ADMIN\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roles", hasItem("ADMIN")));

        mvc.perform(options("/api/clients")
                .header("Origin", "http://localhost:4200")
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
    }

    @Test
    void expiredJwtIsRejected() throws Exception {
        JwtService expired = new JwtService("integration-test-secret-at-least-32-bytes-long", -1);
        mvc.perform(get("/api/clients").header("Authorization", bearer(expired.issue("admin@psm.local"))))
            .andExpect(status().isUnauthorized());
    }

    private String login(String email, String password) throws Exception {
        String response = mvc.perform(post("/api/auth/login")
                .contentType(JSON)
                .content(json.writeValueAsString(new Credentials(email, password))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode body = json.readTree(response);
        return body.path("token").asText();
    }

    private static String bearer(String token) { return "Bearer " + token; }
    private record Credentials(String email, String password) {}
}
