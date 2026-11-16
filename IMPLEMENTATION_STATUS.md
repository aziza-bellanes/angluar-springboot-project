# PSM Smart Manager — Implementation Status

## Current status

The application is complete and verified locally. The backend and frontend build successfully, automated security/API tests pass, MySQL and SMTP work in the local Docker environment, and Angular is packaged inside the executable Spring Boot JAR.

The remaining work is mainly production deployment and final user-acceptance testing in the real target environment.

## Completed and verified locally

- [x] Spring Boot entities, repositories, services and REST controllers
- [x] Angular authentication, dashboard, clients, projects and user-management screens
- [x] JWT authentication, token expiration handling and unauthorized-request handling
- [x] `ADMIN` and `COLLABORATEUR` authorization rules
- [x] Registration and login flows
- [x] Client and project CRUD APIs
- [x] Dashboard KPI calculations and project-status summaries
- [x] CORS configuration through environment variables
- [x] MySQL connection and schema creation
- [x] SMTP notification transaction tested with Mailpit
- [x] `mvn clean package` and backend test suite
- [x] `npm install`, Angular production build and ChromeHeadless test
- [x] Angular and Spring Boot development-server startup
- [x] Angular distribution embedded in `backend/target/psm.jar`
- [x] Angular routes, static assets and protected APIs tested from the unified JAR
- [x] Docker Compose configuration and non-root Docker image validated
- [x] Postman collection JSON validated
- [x] README and deployment documentation updated

## Required before the project is fully finished

### 1. Complete manual user-acceptance testing

- [ ] Test every authenticated screen in a real browser as an `ADMIN`.
- [ ] Test every authenticated screen as a `COLLABORATEUR` and confirm that edit/delete/admin controls are unavailable.
- [ ] Create realistic clients and projects, then verify dashboard KPIs, status counts, overdue calculations, progress bars and recent-project lists against the stored data.
- [ ] Test create, edit, delete, validation-error and cancellation flows for every form.
- [ ] Test searches, filters, empty states, long text, accented characters and large data sets.
- [ ] Test direct navigation and browser refresh on `/dashboard`, `/clients`, `/projets` and `/utilisateurs`.
- [ ] Test the interface at phone, tablet and desktop sizes, including at least one physical phone if available.
- [ ] Check keyboard navigation, visible focus, labels, color contrast and accessible error messages.
- [ ] Correct any defects found and rerun the relevant automated and manual tests.

### 2. Verify real email delivery

- [ ] Choose the production SMTP provider and obtain its host, port and credentials.
- [ ] Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM` and `ADMIN_EMAIL` on the production server.
- [ ] Enable the provider's required TLS/STARTTLS settings.
- [ ] Configure SPF, DKIM and DMARC when required by the provider.
- [ ] Register a test user and confirm that the notification arrives in the real administrator mailbox, including spam-folder checks.
- [ ] Confirm that an SMTP outage is logged and monitored without preventing registration.
- [ ] Never commit SMTP credentials to the repository.

### 3. Deploy and verify the production environment

- [ ] Provision the target VPS and follow `docs/DEPLOYMENT.md`.
- [ ] Create the production `.env` outside version control with strong unique database, bootstrap-admin and JWT secrets.
- [ ] Use a cryptographically random `JWT_SECRET` of at least 32 bytes.
- [ ] Change every example/default password and restrict database/network access.
- [ ] Configure the real domain name and DNS records.
- [ ] Install a trusted HTTPS certificate, enable automatic renewal and redirect HTTP to HTTPS.
- [ ] Set `CORS_ORIGIN` to the exact public HTTPS origin.
- [ ] Start the application using Docker Compose or `deployment/psm.service` and enable automatic restart after a reboot.
- [ ] Confirm `/actuator/health` reports `UP` without exposing sensitive actuator endpoints publicly.
- [ ] Run production smoke tests for registration, login, dashboard, clients, projects, administration, SPA route refreshes and logout.
- [ ] Confirm unauthenticated and unauthorized requests return `401`/`403` as expected.
- [ ] Inspect application, Nginx and database logs after the smoke test.

### 4. Protect production data and operations

- [ ] Configure automatic MySQL backups with a documented retention policy.
- [ ] Perform at least one restore test into a separate database.
- [ ] Configure log rotation for application and Nginx logs.
- [ ] Add uptime/health alerts for the application, database, disk usage and SMTP failures.
- [ ] Document upgrade, rollback and incident-recovery procedures.
- [ ] Restrict VPS firewall ports to SSH, HTTP and HTTPS; do not expose MySQL or Mailpit publicly.
- [ ] Run dependency and container-image vulnerability scans and address high/critical findings.

### 5. Prepare the final acceptance package

- [ ] Rebuild Angular and `psm.jar` from a clean checkout using the documented commands.
- [ ] Rerun backend tests, frontend tests and the Postman smoke collection against the final deployment.
- [ ] Record the final JAR SHA-256 checksum and release/version number.
- [ ] Verify that the final archive contains no `.env` files, passwords, API keys, test databases or temporary folders.
- [ ] Confirm README prerequisites and commands on a clean machine.
- [ ] Add the production URL, account-creation procedure, release notes and known limitations to the handover document.
- [ ] Obtain final stakeholder/teacher acceptance after demonstrating all required features.

## Definition of fully done

The project is fully done when all required checkboxes above are completed, the final JAR and production deployment pass the same smoke/security tests, real notification email delivery is confirmed, backups can be restored, HTTPS is valid, and the stakeholder has accepted the application.

## Current verified artifact

- JAR: `backend/target/psm.jar`
- SHA-256 at the last local verification: `E0F9A5E713CD91208122D90CC621914FCAA4A99EB087E04C64FAB99F171BB6AE`

Recalculate the checksum after any source-code, configuration or frontend change.
