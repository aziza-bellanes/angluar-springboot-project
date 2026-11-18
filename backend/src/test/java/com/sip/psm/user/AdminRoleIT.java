package com.sip.psm.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sip.psm.common.BusinessRuleException;
import com.sip.psm.config.RoleAndAdminInitializer;
import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import jakarta.persistence.EntityManager;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/** Real MySQL constraints, API contracts and effective-profile authorization. Changes roll back per test. */
@IntegrationTest
@Transactional
class AdminRoleIT {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TestFixtures fixtures;
    @Autowired RoleRepository roles;
    @Autowired UserRepository users;
    @Autowired RoleAndAdminInitializer initializer;
    @Autowired UserService userService;
    @Autowired EntityManager entityManager;

    private String admin() { return fixtures.bearer(RoleName.ADMIN); }
    private static String name() { return "Curators-" + UUID.randomUUID().toString().substring(0, 8); }

    private ResultActions request(MockHttpServletRequestBuilder method, String bearer, String body) throws Exception {
        if (bearer != null) method.header(HttpHeaders.AUTHORIZATION, bearer);
        if (body != null) method.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(method);
    }

    private JsonNode create(String bearer, String name, RoleName profile) throws Exception {
        return json.readTree(request(post("/api/admin/roles"), bearer,
                json.writeValueAsString(new RoleDtos.RoleRequest(name, profile)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    @Test
    void completeCrudTrimsNameAndChangesUnassignedProfile() throws Exception {
        String bearer = admin();
        String label = name();
        JsonNode created = create(bearer, "  " + label + "  ", RoleName.COLLABORATEUR);
        long id = created.get("id").asLong();
        assertThat(created.get("name").asText()).isEqualTo(label);
        assertThat(created.get("system").asBoolean()).isFalse();
        assertThat(created.get("userCount").asInt()).isZero();
        request(get("/api/admin/roles/{id}", id), bearer, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.profile").value("COLLABORATEUR"));
        request(get("/api/admin/roles"), bearer, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id==" + id + ")].name").value(label));
        request(put("/api/admin/roles/{id}", id), bearer,
                "{\"name\":\"Renamed " + label + "\",\"profile\":\"BIDDER\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Renamed " + label))
                .andExpect(jsonPath("$.profile").value("BIDDER"));
        request(delete("/api/admin/roles/{id}", id), bearer, null).andExpect(status().isNoContent());
        request(get("/api/admin/roles/{id}", id), bearer, null).andExpect(status().isNotFound());
    }

    @Test
    void assignedCustomRoleControlsPermissionsAndMustBeUnassignedBeforeDeletionOrProfileChange() throws Exception {
        String bearer = admin();
        long id = create(bearer, name(), RoleName.COLLABORATEUR).get("id").asLong();
        User user = fixtures.user(RoleName.BIDDER);
        request(put("/api/admin/users/{id}/roles", user.getId()), bearer,
                "{\"roleIds\":[" + id + "],\"roles\":[\"ADMIN\"]}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.roleIds[0]").value(id))
                .andExpect(jsonPath("$.roles[0]").value("COLLABORATEUR"));
        String token = fixtures.bearer(user);
        request(get("/api/studio/artists"), token, null).andExpect(status().isOk());
        request(get("/api/admin/users"), token, null).andExpect(status().isForbidden());
        request(delete("/api/studio/artists/999999"), token, null).andExpect(status().isForbidden());
        request(get("/api/admin/roles/{id}", id), bearer, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.userCount").value(1));
        request(delete("/api/admin/roles/{id}", id), bearer, null)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("role_in_use"));
        request(put("/api/admin/roles/{id}", id), bearer, "{\"name\":\"Assigned curator\",\"profile\":\"ADMIN\"}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("role_in_use"));
        request(put("/api/admin/roles/{id}", id), bearer,
                "{\"name\":\"Assigned curator\",\"profile\":\"COLLABORATEUR\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.userCount").value(1));
        request(put("/api/admin/users/{id}/roles", user.getId()), bearer, "{\"roles\":[\"BIDDER\"]}")
                .andExpect(status().isOk());
        request(delete("/api/admin/roles/{id}", id), bearer, null).andExpect(status().isNoContent());
    }

    @Test
    void roleIdsWorkForUserCreateAndFullUpdateAndInvalidSelectionsHaveFieldErrors() throws Exception {
        String bearer = admin();
        long id = create(bearer, name(), RoleName.COLLABORATEUR).get("id").asLong();
        String email = "role-" + UUID.randomUUID() + "@test.local";
        String body = "{\"firstName\":\"Role\",\"lastName\":\"Test\",\"email\":\"" + email
                + "\",\"password\":\"Password123!\",\"roleIds\":[" + id + "]}";
        JsonNode created = json.readTree(request(post("/api/admin/users"), bearer, body)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.roleIds[0]").value(id))
                .andExpect(jsonPath("$.roles[0]").value("COLLABORATEUR"))
                .andReturn().getResponse().getContentAsString());
        long userId = created.get("id").asLong();
        request(put("/api/admin/users/{id}", userId), bearer,
                body.replace("\"password\":\"Password123!\",", "\"enabled\":true,"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roleIds[0]").value(id));
        request(put("/api/admin/users/{id}/roles", userId), bearer, "{\"roleIds\":[],\"roles\":[\"BIDDER\"]}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.roleIds").exists());
        request(put("/api/admin/users/{id}/roles", userId), bearer, "{}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.roles").exists());
        request(put("/api/admin/users/{id}/roles", userId), bearer, "{\"roleIds\":[999999]}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("unknown_role"));
        request(put("/api/admin/users/{id}/roles", userId), bearer, "{\"roleIds\":[null]}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void builtInRenamesPreserveAuthorityRegistrationAndBootstrapWithoutDuplicates() throws Exception {
        User admin = fixtures.user(RoleName.ADMIN);
        String bearer = fixtures.bearer(admin);
        long adminId = roles.require(RoleName.ADMIN).getId();
        long bidderId = roles.require(RoleName.BIDDER).getId();
        request(put("/api/admin/roles/{id}", adminId), bearer, "{\"name\":\"Gallery directors\",\"profile\":\"ADMIN\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.system").value(true));
        request(put("/api/admin/roles/{id}", bidderId), bearer, "{\"name\":\"Collectors\",\"profile\":\"BIDDER\"}")
                .andExpect(status().isOk());
        initializer.run(new DefaultApplicationArguments());
        assertThat(roles.count()).isEqualTo(3);
        assertThat(roles.require(RoleName.ADMIN).getId()).isEqualTo(adminId);
        request(get("/api/admin/roles"), bearer, null).andExpect(status().isOk());
        request(post("/api/auth/register"), null,
                "{\"firstName\":\"New\",\"lastName\":\"Collector\",\"email\":\"" + UUID.randomUUID()
                        + "@test.local\",\"password\":\"Password123!\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.user.roles[0]").value("BIDDER"))
                .andExpect(jsonPath("$.user.roleIds[0]").value(bidderId));
        request(put("/api/admin/roles/{id}", adminId), bearer, "{\"name\":\"Directors\",\"profile\":\"BIDDER\"}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("system_role"));
        request(delete("/api/admin/roles/{id}", adminId), bearer, null)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("system_role"));
        request(post("/api/admin/roles"), bearer, "{\"name\":\"admin\",\"profile\":\"BIDDER\"}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("role_name_taken"));
    }

    @Test
    void customAdminHasAuthorityAndSelfProtectionUsesEffectiveProfile() throws Exception {
        String bearer = admin();
        long id = create(bearer, name(), RoleName.ADMIN).get("id").asLong();
        User admin = fixtures.user(RoleName.ADMIN);
        String self = fixtures.bearer(admin);
        request(put("/api/admin/users/{id}/roles", admin.getId()), self, "{\"roleIds\":[" + id + "]}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ADMIN"));
        request(get("/api/admin/roles"), self, null).andExpect(status().isOk());
        request(put("/api/admin/users/{id}", admin.getId()), self,
                "{\"firstName\":\"Custom\",\"lastName\":\"Admin\",\"email\":\"" + admin.getEmail()
                        + "\",\"enabled\":true,\"roleIds\":[" + id + "]}")
                .andExpect(status().isOk());
        request(put("/api/admin/users/{id}/roles", admin.getId()), self, "{\"roles\":[\"BIDDER\"]}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("self_demotion"));
        request(put("/api/admin/users/{id}/status", admin.getId()), self, "{\"enabled\":false}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("self_disable"));
        request(delete("/api/admin/users/{id}", admin.getId()), self, null)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("cannot_delete_self"));
    }

    @Test
    void multipleAdminRolesCountOneUserAndLastCustomAdminCannotBeRemoved() {
        // Other tests leave fixtures behind; isolate enabled admins inside this rollback-only transaction.
        entityManager.createQuery("update User u set u.enabled = false").executeUpdate();
        Role customAdmin = roles.saveAndFlush(new Role(name(), RoleName.ADMIN));
        User admin = fixtures.user(RoleName.ADMIN);
        admin.getRoles().add(customAdmin);
        users.saveAndFlush(admin);
        assertThat(users.countEnabledWithRole(RoleName.ADMIN)).isEqualTo(1);
        admin.setRoles(new java.util.HashSet<>(Set.of(customAdmin)));
        users.saveAndFlush(admin);
        assertThatThrownBy(() -> userService.updateStatus(admin.getId(), false, "another-admin@test.local"))
                .isInstanceOfSatisfying(BusinessRuleException.class, ex -> assertThat(ex.getCode()).isEqualTo("last_admin"));
        assertThatThrownBy(() -> userService.updateRoles(admin.getId(), new UserDtos.RolesUpdate(Set.of(RoleName.BIDDER), null),
                "another-admin@test.local"))
                .isInstanceOfSatisfying(BusinessRuleException.class, ex -> assertThat(ex.getCode()).isEqualTo("last_admin"));
        assertThatThrownBy(() -> userService.delete(admin.getId(), "another-admin@test.local"))
                .isInstanceOfSatisfying(BusinessRuleException.class, ex -> assertThat(ex.getCode()).isEqualTo("last_admin"));
    }

    @Test
    void duplicateInvalidAndMissingRolesAreRejected() throws Exception {
        String bearer = admin();
        String label = name();
        long id = create(bearer, label, RoleName.BIDDER).get("id").asLong();
        request(post("/api/admin/roles"), bearer, "{\"name\":\"  " + label.toLowerCase() + "  \",\"profile\":\"ADMIN\"}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("role_name_taken"));
        long other = create(bearer, name(), RoleName.BIDDER).get("id").asLong();
        request(put("/api/admin/roles/{id}", other), bearer, "{\"name\":\"" + label + "\",\"profile\":\"BIDDER\"}")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("role_name_taken"));
        for (String invalid : new String[]{"", "   ", "x".repeat(33)}) {
            request(post("/api/admin/roles"), bearer, "{\"name\":\"" + invalid + "\",\"profile\":\"ADMIN\"}")
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.name").exists());
        }
        request(put("/api/admin/roles/{id}", id), bearer, "{\"name\":\"valid\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.profile").exists());
        request(post("/api/admin/roles"), bearer, "{\"name\":\"valid\",\"profile\":\"SUPERUSER\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.profile").exists());
        request(get("/api/admin/roles/999999"), bearer, null).andExpect(status().isNotFound());
        request(put("/api/admin/roles/999999"), bearer, "{\"name\":\"valid\",\"profile\":\"BIDDER\"}")
                .andExpect(status().isNotFound());
        request(delete("/api/admin/roles/999999"), bearer, null).andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @EnumSource(value = RoleName.class, names = {"COLLABORATEUR", "BIDDER"})
    void nonAdminsCannotReadOrMutateRoleCatalogue(RoleName profile) throws Exception {
        verifyDenied(fixtures.bearer(profile), 403);
    }

    @Test
    void anonymousCannotReadOrMutateRoleCatalogue() throws Exception {
        verifyDenied(null, 401);
    }

    private void verifyDenied(String bearer, int code) throws Exception {
        String body = "{\"name\":\"Forbidden\",\"profile\":\"BIDDER\"}";
        request(get("/api/admin/roles"), bearer, null).andExpect(status().is(code));
        request(get("/api/admin/roles/1"), bearer, null).andExpect(status().is(code));
        request(post("/api/admin/roles"), bearer, body).andExpect(status().is(code));
        request(put("/api/admin/roles/1"), bearer, body).andExpect(status().is(code));
        request(delete("/api/admin/roles/1"), bearer, null).andExpect(status().is(code));
    }
}
