package com.sip.psm.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.awaitility.Awaitility.await;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import jakarta.mail.Session;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
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

    private final ConcurrentLinkedQueue<MimeMessage> sent = new ConcurrentLinkedQueue<>();

    @BeforeEach
    void mockMimeTransport() {
        when(mailSender.createMimeMessage()).thenAnswer(call -> new MimeMessage(Session.getInstance(new Properties())));
        doAnswer(call -> { sent.add(call.getArgument(0)); return null; }).when(mailSender).send(any(MimeMessage.class));
    }

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
    void registrationSendsWelcomeAndOneEmailToTheAdmin() throws Exception {
        String email = uniqueEmail();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("Grace <b>", "Hopper &", email)))
                .andExpect(status().isCreated());
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            var messages = sent.stream().filter(message -> text(message).contains(email)).toList();
            assertThat(messages).hasSize(2);
            assertThat(messages.stream().map(AuthIT::destination)).containsExactlyInAnyOrder(email, adminAddress);
            for (var message : messages) {
                assertThat(message.isMimeType("multipart/*")).isTrue();
                assertThat(text(message)).contains("Grace &lt;b&gt; Hopper &amp;");
                assertThat(text(message)).doesNotContain(TestFixtures.PASSWORD);
            }
        });
    }

    @Test
    void registrationStillSucceedsWhenTheMailServerFails() throws Exception {
        doAnswer(call -> {
            sent.add(call.getArgument(0));
            throw new MailSendException("smtp down");
        }).when(mailSender).send(any(MimeMessage.class));
        String email = uniqueEmail();
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("Alan", "Turing", email)))
                .andExpect(status().isCreated());
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(sent.stream().filter(message -> text(message).contains(email))
                        .map(AuthIT::destination)).containsExactlyInAnyOrder(email, adminAddress));
        assertThat(users.existsByEmailIgnoreCase(email)).isTrue();
    }

    private static String destination(MimeMessage message) {
        try { return message.getAllRecipients()[0].toString(); }
        catch (Exception ex) { throw new AssertionError(ex); }
    }

    private static String text(Part part) {
        try {
            Object content = part.getContent();
            if (content instanceof Multipart multipart) {
                StringBuilder result = new StringBuilder();
                for (int i = 0; i < multipart.getCount(); i++) result.append(text(multipart.getBodyPart(i)));
                return result.toString();
            }
            return String.valueOf(content);
        } catch (Exception ex) { throw new AssertionError(ex); }
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
