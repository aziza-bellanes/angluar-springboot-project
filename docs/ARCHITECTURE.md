# Architecture

```text
Angular 18 (Router, Guards, JWT Interceptor, Forms)
           |
           | HTTP + Authorization: Bearer JWT
           v
Spring Boot 3 /api/* (controllers → services → repositories)
           |
           v
        MySQL 8

Spring Mail → SMTP → notification administrateur lors d'une inscription
```

## Entités
- User ↔ Role : Many-to-Many (`user_roles`)
- Client → Projet : One-to-Many (via `projets.client_id`), pas de cascade DELETE
- Statuts : `A_FAIRE`, `EN_COURS`, `TERMINE`
- Retard : date de fin antérieure à aujourd'hui et statut différent de `TERMINE`.

## Permissions
- ADMIN : lecture, création, modification, suppression, rôles.
- COLLABORATEUR : lecture et création de clients et projets uniquement.
- Contrôles côté Spring Security + vérifications des méthodes d'écriture; guards Angular ne remplacent pas le backend.

## Décisions
- Une suppression de client ayant des projets est refusée (HTTP 400).
- Les mails d'inscription sont tentés; un échec SMTP est journalisé et ne bloque pas la création du compte.
- `GET /api/dashboard/stats` calcule les statistiques depuis MySQL.
- Les tokens de démonstration sont stockés en sessionStorage; pour une production sensible, envisager des cookies HttpOnly, CSRF et durcissement.
- Le déploiement production requiert une stratégie de migrations et sauvegardes DB.
