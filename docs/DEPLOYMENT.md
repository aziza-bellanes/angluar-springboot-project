# Déploiement et recette

## Artefact unique

Depuis la racine du dépôt :

```bash
./deployment/build-unified.sh
java -jar backend/target/psm.jar
```

Sous Windows, utiliser `deployment/build-unified.ps1`. Le résultat est `backend/target/psm.jar`; il contient le build Angular dans `BOOT-INF/classes/static`.

## Variables obligatoires

Créer `/etc/psm/psm.env` lisible uniquement par l'utilisateur `psm` (`chmod 600`) :

```dotenv
DB_URL=jdbc:mysql://127.0.0.1:3306/psm_db?serverTimezone=UTC
DB_USER=psm
DB_PASSWORD=change-me
JWT_SECRET=generate-at-least-32-random-bytes
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=change-me-at-first-deployment
ADMIN_EMAIL=admin@example.com
MAIL_FROM=psm@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=psm@example.com
SMTP_PASSWORD=change-me
SMTP_AUTH=true
SMTP_TLS=true
CORS_ORIGIN=https://psm.example.com
DDL_AUTO=update
PORT=8080
```

Ne jamais versionner ce fichier. En production, remplacer `DDL_AUTO=update` par des migrations versionnées avant les évolutions de schéma, limiter MySQL au réseau privé et planifier des sauvegardes testées.

## Docker Compose

1. Construire le JAR unifié.
2. Copier `.env.example` vers `.env` et remplacer tous les secrets et le domaine.
3. Valider puis démarrer :

```bash
docker compose --env-file .env -f deployment/docker-compose.yml config
docker compose --env-file .env -f deployment/docker-compose.yml up -d --build
docker compose --env-file .env -f deployment/docker-compose.yml ps
```

Mailpit est prévu pour la recette locale. En production, supprimer le service Mailpit et pointer les variables SMTP vers le fournisseur réel.

## VPS avec systemd et HTTPS

1. Copier `psm.jar` dans `/opt/psm/` et installer `deployment/psm.service` dans `/etc/systemd/system/`.
2. Adapter puis installer `deployment/nginx-psm.conf`.
3. Obtenir le certificat (par exemple avec Certbot), puis exécuter `nginx -t`.
4. Démarrer : `systemctl daemon-reload && systemctl enable --now psm nginx`.
5. Autoriser uniquement SSH, HTTP et HTTPS au pare-feu. Ne pas exposer les ports MySQL, SMTP de test ou 8080 publiquement.

## Contrôles après déploiement

```bash
curl -fsS https://psm.example.com/actuator/health
curl -I https://psm.example.com/login
curl -i https://psm.example.com/api/clients
```

Le health check doit indiquer `UP`, `/login` doit servir l'application Angular, et l'API sans JWT doit répondre `401`. Effectuer ensuite une inscription de recette, confirmer le message SMTP, se connecter avec les deux rôles et vérifier création/lecture/modification/suppression selon les permissions.
