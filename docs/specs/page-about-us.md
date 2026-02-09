# Spécification Technique - Page "À Propos de Nous" et Liste de l'Équipe

## Contexte

Cette fonctionnalité vise à créer une nouvelle page essentielle pour l'image de marque et la transparence de l'entreprise. La page "À Propos de Nous" est un point de confiance crucial pour les utilisateurs et partenaires potentiels. Elle doit présenter la mission de l'entreprise et, plus spécifiquement, les individus qui constituent l'équipe.

## User Stories

| ID | En tant que... | Je veux... | Afin de... | Priorité |
|----|----------------|------------|------------|----------|
| US-001 | Visiteur | Accéder à la page "À Propos de Nous" | Comprendre qui se cache derrière le projet/produit | Élevée |
| US-002 | Visiteur | Voir une introduction claire sur la mission et les valeurs de l'entreprise | M'aligner avec la vision du projet | Élevée |
| US-003 | Visiteur | Voir une section dédiée à la liste des membres de l'équipe | Mettre un visage sur les créateurs du produit | Élevée |
| US-004 | Visiteur | Pour chaque membre de l'équipe, voir son nom, son rôle, sa photo et une courte biographie | Mieux connaître les contributeurs clés | Élevée |
| US-005 | Administrateur | Pouvoir ajouter, modifier ou supprimer facilement un membre de l'équipe | Maintenir la liste à jour sans intervention de développement | Moyenne (Dépend du CMS) |

## Tech Details

### 1. Structure de la Route et de l'URL

*   **URL :** `/about-us` ou `/a-propos` (à confirmer selon la stratégie de localisation).
*   **Intégration :** Un lien vers cette page doit être ajouté au pied de page (`Footer`) et potentiellement dans la navigation principale (`Header`).

### 2. Composants Frontend

| Composant | Description | Dépendances |
|-----------|-------------|-------------|
| \`AboutUsPage\` | Le conteneur de la page. Gère l'introduction textuelle et la mise en page générale. | \`TeamList\` |
| \`TeamList\` | Liste les composants \`TeamMemberCard\` et gère l'affichage en grille (grid layout). | \`TeamMemberCard\` |
| \`TeamMemberCard\` | Affiche les détails d'un membre (Photo, Nom, Rôle, Bio). | (Données des membres) |

### 3. Source de Données (Backend/CMS)

Les données de l'équipe seront gérées via :

*   **Option A (Statique, Initial) :** Un fichier JSON dans le projet (\`/data/team.json\`).
*   **Option B (Dynamique, À terme) :** Une collection dédiée dans le CMS (si utilisé).

**Structure de l'objet \`TeamMember\` :**

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| \`id\` | UUID/Integer | Oui | Identifiant unique |
| \`name\` | String | Oui | Nom complet du membre |
| \`role\` | String | Oui | Titre ou rôle (ex: Lead Developer, Product Owner) |
| \`bio\` | String (Markdown) | Oui | Courte description/citation (max 200 mots) |
| \`photoUrl\` | String | Oui | Chemin vers la photo du membre (optimisée web) |
| \`socialLinks\` | Array<Object> | Non | Liens sociaux (LinkedIn, Twitter, etc.) |
| \`order\` | Integer | Non | Ordre d'affichage dans la liste |

### 4. Design et Expérience Utilisateur (UX)

*   La section "Team List" doit utiliser un affichage en grille réactif (2 colonnes sur desktop, 1 colonne sur mobile).
*   Les photos des membres doivent être optimisées (compression, format web comme WebP) et avoir un format carré ou 4:3.
*   Un texte d'introduction engageant doit précéder la liste de l'équipe.