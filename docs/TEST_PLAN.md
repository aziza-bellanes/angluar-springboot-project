# Plan de vérification

Aucun succès d'exécution n'est affirmé dans ce document. Suivre les cas et conserver des preuves :

| ID | Scénario | Attendu |
|---|---|---|
| T01 | POST /api/auth/register valide | 201, rôle COLLABORATEUR, mail capturé dans Mailpit |
| T02 | Login valide / invalide | 200 JWT / erreur d'authentification |
| T03 | GET /api/clients sans JWT | 401 |
| T04 | Collaborateur POST /api/clients | 201 et ligne SQL créée |
| T05 | Collaborateur PUT /api/clients/{id} | 403 |
| T06 | Admin PUT /api/clients/{id} | 200 et données modifiées |
| T07 | Créer un projet lié à un client | 201, relation enregistrée |
| T08 | Projet budget négatif | 400 |
| T09 | Projet dates incohérentes | 400 |
| T10 | Supprimer client avec projets | 400, données conservées |
| T11 | Dashboard /api/dashboard/stats | totaux cohérents avec DB |
| T12 | Filtrer par client / statut dans Angular | lignes correspondantes |
| T13 | Suppression d'un projet par admin | 204, ligne absente de MySQL |
| T14 | Admin attribue COLLABORATEUR | rôles sauvegardés |
| T15 | Guard Angular non connecté | redirection login |
| T16 | JAR avec build Angular | frontend + /api servies sur le même port |
| T17 | Déploiement VPS | navigation HTTPS et authentification fonctionnelles |

Preuves recommandées : captures navigateur + requêtes Postman + SELECT MySQL avant/après.
