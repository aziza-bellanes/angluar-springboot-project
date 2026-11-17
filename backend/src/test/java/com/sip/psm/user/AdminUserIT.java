package com.sip.psm.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sip.psm.auction.Auction;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Administrator CRUD on user accounts and the read-only role catalogue. */
@IntegrationTest
class AdminUserIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;

    private String admin() {
        return fixtures.bearer(RoleName.ADMIN);
    }

    private ResultActions create(String bearer, String email) throws Exception {
        return mvc.perform(post("/api/admin/users").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"firstName":"Berthe","lastName":"Morisot","email":"%s","phone":"+33 1 23 45 67 89",
                         "password":"Password123!","roles":["COLLABORATEUR"]}
                        """.formatted(email)));
    }

    private static String email() {
        return "managed-" + UUID.randomUUID() + "@test.local";
    }

    @Test
    void adminCreatesAndReadsUser() throws Exception {
        String bearer = admin();
        String email = email();
        String body = create(bearer, email).andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.roles[0]").value("COLLABORATEUR"))
                .andReturn().getResponse().getContentAsString();
        String id = body.replaceAll(".*\"id\":(\\d+).*", "$1");

        mvc.perform(get("/api/admin/users/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Berthe"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password123!\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void duplicateEmailIsRefused() throws Exception {
        String bearer = admin();
        String email = email();
        create(bearer, email).andExpect(status().isCreated());
        create(bearer, email.toUpperCase()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("email_taken"));
    }

    @Test
    void invalidCreateIsRejected() throws Exception {
        mvc.perform(post("/api/admin/users").header(HttpHeaders.AUTHORIZATION, admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"\",\"lastName\":\"X\",\"email\":\"nope\",\"password\":\"short\","
                                + "\"phone\":\"call me\",\"roles\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.firstName").exists())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists())
                .andExpect(jsonPath("$.fields.roles").exists());
    }

    @Test
    void updateChangesFieldsAndPasswordThenLoginUsesNewPassword() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);
        String newEmail = email();
        mvc.perform(put("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Mary","lastName":"Cassatt","email":"%s","phone":"",
                                 "password":"BrandNewSecret1","roles":["BIDDER","COLLABORATEUR"],"enabled":true}
                                """.formatted(newEmail)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Mary"))
                .andExpect(jsonPath("$.email").value(newEmail))
                .andExpect(jsonPath("$.roles.length()").value(2));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + newEmail + "\",\"password\":\"BrandNewSecret1\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + newEmail + "\",\"password\":\"" + TestFixtures.PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateWithoutPasswordKeepsCurrentOneAndRejectsTakenEmail() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);
        User other = fixtures.user(RoleName.BIDDER);
        String bearer = admin();
        mvc.perform(put("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Same","lastName":"Person","email":"%s","roles":["BIDDER"],"enabled":false}
                                """.formatted(other.getEmail())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("email_taken"));
        mvc.perform(put("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Same","lastName":"Person","email":"%s","roles":["BIDDER"],"enabled":true}
                                """.formatted(user.getEmail())))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"" + TestFixtures.PASSWORD + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void adminDeletesUserWithoutActivity() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);
        String bearer = admin();
        mvc.perform(delete("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminCannotDeleteOwnAccount() throws Exception {
        User admin = fixtures.user(RoleName.ADMIN);
        mvc.perform(delete("/api/admin/users/{id}", admin.getId())
                        .header(HttpHeaders.AUTHORIZATION, fixtures.bearer(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("cannot_delete_self"));
    }

    @Test
    void userWithBidsCannotBeDeleted() throws Exception {
        Auction auction = fixtures.openAuction(new BigDecimal("100.00"), new BigDecimal("10.00"));
        User bidder = fixtures.user(RoleName.BIDDER);
        mvc.perform(post("/api/auctions/{id}/bids", auction.getId())
                        .header(HttpHeaders.AUTHORIZATION, fixtures.bearer(bidder))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100.00}"))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/admin/users/{id}", bidder.getId()).header(HttpHeaders.AUTHORIZATION, admin()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("user_has_activity"));
    }

    @Test
    void collaborateurIsForbiddenOnNewEndpoints() throws Exception {
        String bearer = fixtures.bearer(RoleName.COLLABORATEUR);
        User user = fixtures.user(RoleName.BIDDER);
        mvc.perform(get("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
        create(bearer, email()).andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@b.co\",\"roles\":[\"BIDDER\"],\"enabled\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/users/{id}", user.getId()).header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/roles").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isForbidden());
    }

    @Test
    void rolesAreListed() throws Exception {
        mvc.perform(get("/api/admin/roles").header(HttpHeaders.AUTHORIZATION, admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.name=='ADMIN')].id").exists());
    }
}
