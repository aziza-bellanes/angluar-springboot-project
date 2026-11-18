package com.sip.psm.mail;

import com.sip.psm.config.AtelierProperties;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/** One accessible gallery identity, with HTML and plain-text alternatives for every notification. */
@Component
public class GalleryMailTemplate {

    private static final Pattern SLOT = Pattern.compile("\\$\\{([a-z]+)}");
    private final String template;
    private final String publicUrl;

    public GalleryMailTemplate(AtelierProperties properties) throws IOException {
        this.publicUrl = properties.mail().publicUrl();
        try (var input = new ClassPathResource("mail/gallery.html").getInputStream()) {
            this.template = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    public Rendered render(Content content) {
        String url = publicUrl + content.actionPath();
        StringBuilder paragraphs = new StringBuilder();
        StringBuilder details = new StringBuilder();
        StringBuilder plain = new StringBuilder(content.title()).append("\n\n")
                .append(content.greeting()).append("\n\n");
        for (String paragraph : content.paragraphs()) {
            paragraphs.append("<p style=\"margin:0 0 18px;font-size:16px;line-height:1.7;color:#34445b\">")
                    .append(escape(paragraph)).append("</p>");
            plain.append(paragraph).append("\n\n");
        }
        for (Detail detail : content.details()) {
            details.append("<tr><td style=\"padding:10px 12px;border-bottom:1px solid #ddd5c7;color:#526078;font-size:13px;vertical-align:top;width:32%\">")
                    .append(escape(detail.label()))
                    .append("</td><td style=\"padding:10px 12px;border-bottom:1px solid #ddd5c7;color:#101d35;font-size:14px;font-weight:bold;word-break:break-word\">")
                    .append(escape(detail.value())).append("</td></tr>");
            plain.append(detail.label()).append(": ").append(detail.value()).append('\n');
        }
        Map<String, String> slots = Map.of(
                "title", escape(content.title()), "preheader", escape(content.preheader()),
                "greeting", escape(content.greeting()), "paragraphs", paragraphs.toString(),
                "details", details.toString(), "url", escape(url),
                "action", escape(content.actionLabel()), "site", escape(publicUrl));
        var matcher = SLOT.matcher(template);
        // Replace once: values resembling template markers never become executable markup or slots.
        String html = matcher.replaceAll(match -> java.util.regex.Matcher.quoteReplacement(slots.get(match.group(1))));
        plain.append("\n").append(content.actionLabel()).append(": ").append(url)
                .append("\n\nATELIER — Art comes alive.\nSmartSoft Solutions\n")
                .append("This is an account or gallery activity notification. No payment is taken by this email.\n");
        return new Rendered(plain.toString(), html);
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value, "UTF-8");
    }

    public record Detail(String label, String value) { }

    public record Content(String subject, String title, String preheader, String greeting,
                          List<String> paragraphs, List<Detail> details,
                          String actionLabel, String actionPath) {
        public Content {
            if (actionPath == null || !actionPath.startsWith("/") || actionPath.startsWith("//")) {
                throw new IllegalArgumentException("Email actions must be local site paths");
            }
            paragraphs = List.copyOf(paragraphs);
            details = List.copyOf(details);
        }
    }

    public record Rendered(String plain, String html) { }
}
