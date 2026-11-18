# Email

ATELIER sends multipart email with an HTML design and a plain-text alternative. The templates use midnight (`#101d35`), cobalt (`#315c91`), sunflower (`#e7b84b`) and ivory (`#f4edde`). Links use `PUBLIC_URL`, the browser origin of this instance.

## Account messages

Public registration sends a welcome message to the new collector and a registration notification to `ADMIN_EMAIL`. Creating an enabled account in **Studio → Users** also sends that user a welcome message and an administrator notification, including accounts with staff roles. Editing an existing user or assigning a role does not resend it. Welcome messages contain no password or authentication token; the administrator must communicate any initial password separately.

Creating an artist/client contact, or changing its email to a different normalized address, sends a contact welcome message and an administrator notice. An artist contact is a catalogue record; this message does not create a login account.

## Auction messages

A successful bid sends the bidder a confirmation and the previous leader an outbid notice, when applicable. Administrators do not receive a message for every bid.

When an auction closes, the winner receives congratulations and `ADMIN_EMAIL` receives the result, including a no-bids result when there is no winner. Cancellation sends an administrator summary and a cancellation message to the current leader, if any. A winning email confirms the recorded auction result; it is not a payment receipt. See the auction result in the application for the authoritative current state.

Messages run asynchronously after the transaction commits. An SMTP failure is logged and does not roll back account creation or auction settlement. Delivery is best effort: there is no persistent outbox or automatic retry queue, and API success does not prove inbox delivery.

## Local Mailpit

The default development `.env` uses `SMTP_HOST=mailpit`, port `1025`, `SMTP_AUTH=false` and `SMTP_TLS=false`. Run `docker compose up` and open http://localhost:8025 to inspect messages. Mailpit captures email; it does not deliver to external inboxes. For a backend launched outside Docker, use `SMTP_HOST=localhost` with the exposed port `1025`.

## Real SMTP

Keep credentials only in your private environment file. Development Compose reads root `.env`; production uses `deployment/.env.prod` through `--env-file`. Spring Boot started directly needs exported variables or a service environment file; it does not automatically read either Compose file.

For Gmail with STARTTLS:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sender@example.com
SMTP_PASSWORD=your-private-app-password
SMTP_AUTH=true
SMTP_TLS=true
MAIL_FROM=sender@example.com
ADMIN_EMAIL=administrator@example.com
PUBLIC_URL=https://atelier.example.com
```

Use the account's app password rather than its normal login password. `MAIL_FROM` must be accepted by the SMTP provider, usually the authenticated Gmail address. For another provider, use its host, port and authentication settings. `SMTP_TLS` enables STARTTLS; these settings describe port 587, not implicit TLS on port 465.

After updating configuration, recreate the backend/app container so it receives the new environment. Verify with a fresh account and a controlled auction, check the recipient inbox and spam folder, and inspect application logs without sharing credentials. Mailpit evidence and SMTP acceptance alone do not establish external inbox delivery. Private SMTP credentials are excluded from Git. The recorded production-image check captured 17 themed multipart messages in Mailpit; a controlled Gmail check accepted five messages for welcome, bid, winner and administrator flows. SMTP acceptance does not establish inbox placement. See [email-smoke.json](evidence/email-smoke.json) and [email-provider.json](evidence/email-provider.json). Synthetic desktop/mobile previews are in [emails/](emails/).
