# PSM Smart Manager

Application de gestion des clients et projets — Spring Boot 3, Angular 18, MySQL et JWT.

**Statut de livraison : builds Maven et Angular, tests API/sécurité et JAR unifié vérifiés.**

## Prérequis
- JDK 17 ou 21, Maven 3.9+
- Node.js 20.11+ ou version compatible avec Angular 18, npm
- MySQL 8 (ou Docker Desktop)

## 1. Base de données et serveur SMTP de développement

Depuis la racine :

```bash
cp .env.example .env
# Modifier notamment MYSQL_ROOT_PASSWORD, JWT_SECRET et BOOTSTRAP_ADMIN_PASSWORD
docker compose --env-file .env -f deployment/docker-compose.yml up -d
```

Mailpit : http://localhost:8025 (SMTP 1025). Cette boîte ne livre pas d'emails réels à l'admin ; configurez votre serveur SMTP pour cela.

## 2. Démarrer le backend

Variables d'environnement minimales (Windows PowerShell) :

```powershell
$env:DB_URL='jdbc:mysql://localhost:3306/psm_db?createDatabaseIfNotExist=true&serverTimezone=UTC'
$env:DB_USER='psm'
$env:DB_PASSWORD='psm_dev_password'
$env:JWT_SECRET='replace_with_random_secret_at_least_32_bytes_long_please'
$env:BOOTSTRAP_ADMIN_EMAIL='admin@psm.local'
$env:BOOTSTRAP_ADMIN_PASSWORD='change-this-admin-password'
$env:ADMIN_EMAIL='admin@example.test'
$env:SMTP_HOST='localhost'
$env:SMTP_PORT='1025'
cd backend
mvn spring-boot:run
```

Par défaut backend : http://localhost:8080. Ne publiez pas ces identifiants d'exemple en production.

## 3. Démarrer Angular

Depuis un second terminal :

```bash
cd frontend
npm install
npm start
```

Frontend : http://localhost:4200. Le proxy `frontend/proxy.conf.json` transmet `/api` au backend local ; le build de production utilise la même origine que le JAR.

## 4. Tester

```bash
cd backend && mvn test
cd ../frontend && npm test -- --browsers=ChromeHeadless
```

Importez `postman/PSM-Smart-Manager.postman_collection.json` dans Postman. Connectez-vous puis utilisez la variable `token`.

## 5. Construire le JAR unique demandé par l'enseignante

```bash
cd frontend
npm ci
npm run build -- --configuration production
```

Sous Angular 18, le build de type application est généralement dans `frontend/dist/psm/browser/`.
Copiez le **contenu** de ce dossier vers `backend/src/main/resources/static/`, puis :

```bash
cd ../backend
mvn clean package
java -jar target/psm.jar
```

La page `/` charge l'application Angular. Le contrôleur de fallback SPA du backend assure le fallback des routes frontend (voir `SpaController`).

## 6. VPS

Voir `docs/DEPLOYMENT.md`, `deployment/nginx-psm.conf` et `deployment/psm.service` pour Docker, systemd, les variables, HTTPS/TLS et les contrôles après déploiement.

## Organisation
- `backend/` Spring Boot (entités, repositories, services, controllers, JWT)
- `frontend/` Angular standalone (pages, Router, guards, interceptor)
- `database/` informations MySQL
- `postman/` collection API
- `docs/` architecture et plan de tests
- `deployment/` Docker Compose et exemple proxy
