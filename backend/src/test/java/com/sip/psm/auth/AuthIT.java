package com.sip.psm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sip.psm.support.IntegrationTest;
import com.sip.psm.support.TestFixtures;
import com.sip.psm.user.RoleName;
import com.sip.psm.user.User;
import com.sip.psm.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Registration, login and identity endpoints, including the admin notification email. */
@IntegrationTest
class AuthIT {

    @Autowired
    MockMvc mvc;
    @Autowired
    TestFixtures fixtures;
    @Autowired
    UserRepository users;
    @MockitoBean
    JavaMailSender mailSender;
    @Value("${atelier.mail.admin-address:admin@atelier.local}")
    String adminAddress;

    @Test
    void registerCreatesBidderAndReturnsToken() throws Exception {
        String email = uniqueEmail();

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("Ada", "Lovelace", email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.roles[0]").value("BIDDER"))
                .andExpect(jsonPath("$.user.roles.length()").value(1));
    }

    @Test
    void registerWithExistingEmailIsRejectedAsConflict() throws Exception {
        String email = uniqueEmail();
        String body = registration("Ada", "Lovelace", email);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("email_taken"));
    }

    @Test
    void registerWithInvalidPayloadReturnsFieldErrors() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"\",\"lastName\":\"X\",\"email\":\"nope\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("validation_failed"))
                .andExpect(jsonPath("$.fields.firstName").exists())
                .andExpect(jsonPath("$.fields.email").exists())
                .andExpect(jsonPath("$.fields.password").exists());
    }

    @Test
    void registrationSendsExactlyOneEmailToTheAdmin() throws Exception {
        String email = uniqueEmail();

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("Grace", "Hopper", email)))
                .andExpect(status().isCreated());

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, timeout(5000)).send(captor.capture());
        SimpleMailMessage message = captor.getValue();
        assertThat(message.getTo()).containsExactly(adminAddress);
        assertThat(message.getSubject()).contains("Grace Hopper");
        assertThat(message.getText()).contains(email);
    }

    @Test
    void registrationStillSucceedsWhenTheMailServerFails() throws Exception {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        String email = uniqueEmail();

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("Alan", "Turing", email)))
                .andExpect(status().isCreated());

        verify(mailSender, timeout(5000)).send(any(SimpleMailMessage.class));
        assertThat(users.existsByEmailIgnoreCase(email)).isTrue();
    }

    @Test
    void loginWithValidCredentialsReturnsToken() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login(user.getEmail(), TestFixtures.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(user.getEmail()));
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login(user.getEmail(), "WrongPassword1!")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("invalid_credentials"));
    }

    @Test
    void loginOfDisabledUserIsUnauthorized() throws Exception {
        User user = fixtures.user(RoleName.BIDDER);
        user.setEnabled(false);
        users.save(user);

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login(user.getEmail(), TestFixtures.PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("invalid_credentials"));
    }

    @Test
    void meReturnsTheCurrentUserWithAToken() throws Exception {
        User user = fixtures.user(RoleName.COLLABORATEUR);

        mvc.perform(get("/api/auth/me").header("Authorization", fixtures.bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.getEmail()))
                .andExpect(jsonPath("$.roles[0]").value("COLLABORATEUR"));
    }

    @Test
    void meWithoutATokenIsUnauthorized() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("authentication_required"));
    }

    private static String uniqueEmail() {
        return "new-" + UUID.randomUUID() + "@test.local";
    }

    private static String registration(String first, String last, String email) {
        return "{\"firstName\":\"%s\",\"lastName\":\"%s\",\"email\":\"%s\",\"password\":\"%s\"}"
                .formatted(first, last, email, TestFixtures.PASSWORD);
    }

    private static String login(String email, String password) {
        return "{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password);
    }
}
