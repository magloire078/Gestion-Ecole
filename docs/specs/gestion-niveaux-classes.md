# Spécifications Techniques : Gestion des Niveaux et Classes (Pédagogie)

## Contexte et État d'Avancement

Le projet **GèreÉcole** dispose d'une infrastructure technique solide (Next.js, Firebase) et l'authentification des administrateurs est fonctionnelle. Le tableau de bord initial est en place.

Nous passons maintenant à la construction du module **Pédagogie**, en commençant par la définition de la structure académique de l'établissement. Cette structure est essentielle pour lier ultérieurement les élèves, les enseignants et les matières.

**Statut au dernier point de contact :**
*   **Terminé :** Configuration du projet, Authentification (Admin), Tableau de Bord (Shell).
*   **Prochaine étape critique :** Implémentation des fonctionnalités de gestion des Niveaux et des Classes.

## User Stories

Les spécifications suivantes décrivent les fonctionnalités attendues pour la première itération du module Pédagogie.

### US-PED-001 : Gestion des Niveaux
**En tant qu'Administrateur Scolaire,**
**Je veux** pouvoir créer, modifier et supprimer des niveaux académiques (ex: "Maternelle", "Primaire 1", "Secondaire 3")
**Afin de** structurer l'établissement et d'organiser les classes.

### US-PED-002 : Gestion des Classes
**En tant qu'Administrateur Scolaire,**
**Je veux** pouvoir créer des classes (ex: "CP-A", "6ème Bleu") et les associer à un niveau existant,
**Afin de** définir les groupes d'élèves qui seront gérés dans le système.

### US-PED-003 : Visualisation de la Structure
**En tant qu'Administrateur Scolaire,**
**Je veux** voir un aperçu clair de tous les niveaux et des classes qui leur sont rattachées,
**Afin de** vérifier l'intégrité de la structure académique.

## Spécifications Techniques Détaillées

### 1. Modèle de Données (Firestore)

Nous allons introduire deux nouvelles collections de niveau racine : `niveaux` et `classes`.

#### Collection : `niveaux`

| Champ | Type | Description | Requis |
| :--- | :--- | :--- | :--- |
| `id` | `string` | ID généré par Firestore | OUI |
| `nom` | `string` | Nom du niveau (ex: "Primaire 1", "Lycée") | OUI |
| `ordre` | `number` | Ordre d'affichage dans les listes | OUI |
| `ecoleId` | `string` | ID de l'école (multitenant) | OUI |
| `createdAt` | `timestamp` | Date de création | OUI |
| `updatedAt` | `timestamp` | Date de dernière modification | OUI |

#### Collection : `classes`

| Champ | Type | Description | Requis |
| :--- | :--- | :--- | :--- |
| `id` | `string` | ID généré par Firestore | OUI |
| `nom` | `string` | Nom de la classe (ex: "CE1-A", "Terminale S") | OUI |
| `niveauRef` | `DocumentReference` | Référence au document dans la collection `niveaux` | OUI |
| `niveauId` | `string` | ID du niveau (pour les requêtes simplifiées) | OUI |
| `capacite` | `number` | Nombre maximal d'élèves | NON (Defaut: 40) |
| `ecoleId` | `string` | ID de l'école (multitenant) | OUI |
| `createdAt` | `timestamp` | Date de création | OUI |
| `updatedAt` | `timestamp` | Date de dernière modification | OUI |

### 2. Conception de l'Interface Utilisateur (UI)

Le développement sera réalisé en utilisant **ShadCN UI** pour maintenir la cohérence visuelle.

1.  **Page :** `/dashboard/pedagogie/structure`
2.  **Affichage :** Utilisation d'un composant de type **Accordion** ou **Tree View** pour présenter les Niveaux comme des nœuds parents et les Classes rattachées comme des enfants.
3.  **CRUD Niveaux :** Un bouton "Ajouter un Niveau" doit ouvrir un dialogue (`Dialog` ShadCN) pour la saisie du nom et de l'ordre.
4.  **CRUD Classes :** Un bouton "Ajouter une Classe" doit être disponible pour chaque niveau, ouvrant un dialogue pour la saisie du nom, de la capacité, et permettant la sélection du niveau si le bouton est cliqué depuis une vue globale.

### 3. Logique Applicative (Next.js et TypeScript)

1.  **Services/Hooks :** Créer des hooks `useNiveaux()` et `useClasses()` dans le répertoire `src/hooks` pour gérer la synchronisation des données Firestore.
2.  **Validation :** Les noms de niveaux et de classes doivent être uniques au sein d'une même `ecoleId`. La validation des formulaires doit être gérée côté client (React Hook Form/Zod) et côté serveur (règles de sécurité Firestore/Genkit si applicable).
3.  **Suppression en Cascade :** La suppression d'un Niveau doit être **interdite** s'il existe des classes rattachées. Si des élèves sont rattachés à une classe, la suppression de cette classe doit également être interdite.

### 4. Règles de Sécurité Firebase

Les règles Firestore devront être mises à jour pour s'assurer que seuls les utilisateurs avec le rôle `ADMIN` ou `PEDAGOGIE_MANAGER` peuvent :
*   `read`, `write`, `update`, `delete` dans les collections `niveaux` et `classes`.
*   Toutes les opérations doivent être scoped à l'identifiant de l'école (`ecoleId`) de l'utilisateur connecté.
