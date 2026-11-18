package com.sip.psm.account;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Self-service profile and password management for every signed-in user. */
@IntegrationTest
class ProfileIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;

    @Test
    void userUpdatesOwnProfile() throws Exception {
        User user = fixtures.user(RoleName.COLLABORATEUR);
        mvc.perform(put("/api/account/profile").header(HttpHeaders.AUTHORIZATION, fixtures.bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\" Berthe \",\"lastName\":\"Morisot\",\"phone\":\"+33 1 23 45 67 89\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Berthe"))
                .andExpect(jsonPath("$.phone").value("+33 1 23 45 67 89"))
                .andExpect(jsonPath("$.email").value(user.getEmail()));
    }

    @Test
    void invalidProfileIsRejected() throws Exception {
        mvc.perform(put("/api/account/profile").header(HttpHeaders.AUTHORIZATION, fixtures.bearer(RoleName.BIDDER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"\",\"lastName\":\"X\",\"phone\":\"call me\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.firstName").exists())
                .andExpect(jsonPath("$.fields.phone").exists());
    }

    @Test
    void passwordChangeRequiresCurrentPasswordAndThenAllowsLogin() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);
        String bearer = fixtures.bearer(user);

        mvc.perform(put("/api/account/password").header(HttpHeaders.AUTHORIZATION, bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"wrong-one\",\"newPassword\":\"NewSecret2026\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("wrong_password"));

        mvc.perform(put("/api/account/password").header(HttpHeaders.AUTHORIZATION, bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + TestFixtures.PASSWORD + "\",\"newPassword\":\"NewSecret2026\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.getEmail() + "\",\"password\":\"NewSecret2026\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousCannotUpdateProfile() throws Exception {
        mvc.perform(put("/api/account/profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"A\",\"lastName\":\"B\"}"))
                .andExpect(status().isUnauthorized());
    }
}
