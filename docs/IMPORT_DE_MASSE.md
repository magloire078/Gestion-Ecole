# Guide d'importation de masse — GèreEcole

Ce document s'adresse aux **directeurs et secrétariats d'école** qui souhaitent
charger en une seule opération des centaines (ou milliers) d'élèves, classes,
notes, paiements ou autres données depuis un fichier Excel/CSV/JSON, ou
directement à partir d'un export SQL de leur ancien logiciel.

> Besoin d'aide ? Contactez votre administrateur GèreEcole — il peut
> **réaliser l'import à votre place** depuis sa console (« Import (assistance) »).

---

## 1. Où trouver l'outil ?

Menu : **Paramètres → Données → onglet « Importation de Masse »**.

URL directe : `/dashboard/parametres/donnees`

---

## 2. Formats acceptés

| Format | Extension | Quand l'utiliser |
| --- | --- | --- |
| Excel | `.xlsx`, `.xls` | Vous remplissez le modèle fourni à la main. |
| CSV | `.csv` | Export simple depuis un autre tableur ou logiciel. |
| JSON | `.json` | Données déjà structurées (intégrations, API). |
| SQL | `.sql` | Dump complet de votre ancien outil (phpMyAdmin, `mysqldump`, `pg_dump`). |

Tous les fichiers doivent être encodés en **UTF-8** (Excel le gère
nativement, attention en CSV).

---

## 3. Démarche recommandée (5 étapes)

### Étape 1 — Choisir le type de données

Sélectionnez l'entité que vous voulez importer dans la liste déroulante
« Type de données ». Les types disponibles aujourd'hui sont :

- **Élèves**
- **Enseignants / Personnel**
- **Notes**
- **Classes**
- **Cycles** / **Niveaux**
- **Frais de scolarité**
- **Paiements élèves**
- **Transactions comptables**

### Étape 2 — Télécharger le modèle vide

Cliquez sur **« Modèle vide → Excel »** (ou JSON). Le fichier généré contient
**exactement les colonnes attendues** et une ligne d'exemple décrivant
chaque champ.

Conseil : conservez les **noms de colonnes en anglais** (`firstName`,
`lastName`, `dateOfBirth`…). C'est ce qui permet la reconnaissance
automatique.

### Étape 3 — Choisir l'année scolaire cible

Sélectionnez l'année dans laquelle les données doivent être rattachées.

- L'année courante de l'école est marquée *« (courante) »*.
- Pour rattraper l'historique, choisissez une année **archive** : un badge
  orange *« Archive »* s'affiche pour confirmation.
- Si votre fichier contient déjà une colonne `academicYear` par ligne,
  celle-ci **prend le pas** sur l'année cible. Pratique pour importer
  plusieurs années dans le même fichier.

### Étape 4 — Uploader et vérifier l'aperçu

Glissez-déposez le fichier dans la zone d'upload. L'outil affiche :

- Le **nombre de lignes** détectées.
- Un **aperçu des 5 premières lignes** dans un tableau.
- La liste des **colonnes obligatoires manquantes** (le cas échéant).

> Si une colonne obligatoire est absente, **renommez-la** dans votre
> fichier puis ré-uploadez. L'outil ne devine pas les synonymes (sauf
> pour les dumps SQL).

### Étape 5 — Lancer l'importation

Cliquez sur **« Lancer l'importation »**. Une barre de progression
indique l'avancement, ligne par ligne.

À la fin, un rapport s'affiche :

- Nombre de **succès** (vert)
- Nombre d'**échecs** (rouge) avec le détail par ligne.

Les erreurs courantes sont décrites au § 5.

---

## 4. Cas particulier : importer depuis un dump SQL

L'outil sait lire les fichiers **`.sql`** générés par phpMyAdmin ou
`mysqldump` / `pg_dump`. Procédure :

1. Exportez votre ancienne base — uniquement les `INSERT INTO`.
2. Uploadez le `.sql` dans la zone classique.
3. Une fenêtre **« Mappage du dump SQL »** s'ouvre : chaque table SQL
   est listée à gauche, avec un menu déroulant pour la faire correspondre
   à une entité GèreEcole.
4. Les tables nommées `eleves`, `students`, `prof`, `teachers`, `notes`,
   `classes`, etc. sont **détectées automatiquement**.
5. Laissez « Ignorer » pour toutes les tables que vous ne voulez pas
   importer (logs, sessions…).
6. Cliquez sur **« Importer »**.

---

## 5. Erreurs fréquentes et solutions

### « Colonnes obligatoires manquantes »

L'outil exige certaines colonnes pour chaque entité. Exemples pour les
**Élèves** :

| Colonne | Description |
| --- | --- |
| `firstName` | Prénom |
| `lastName` | Nom |
| `dateOfBirth` | Date de naissance (`JJ/MM/AAAA` ou `AAAA-MM-JJ`) |
| `gender` | `M` ou `F` |
| `className` | Nom de la classe (doit déjà exister !) |

**Solution** : téléchargez le modèle vide et reprenez l'en-tête à
l'identique.

### « Classe "6ème A" introuvable pour 2024-2025 »

L'outil refuse d'inscrire un élève dans une classe inexistante.

**Solution** : **importez d'abord les classes** (entité « Classes »), puis
les élèves. L'ordre recommandé est :

1. Cycles
2. Niveaux
3. Classes
4. Enseignants / Personnel
5. Frais de scolarité
6. Élèves
7. Paiements
8. Notes

### « Limite d'élèves atteinte »

Votre plan d'abonnement plafonne le nombre d'élèves.

- **Essentiel** : limite fixe.
- **Pro** : limite plus haute.
- **Premium** : illimité.

**Solution** : montez en plan depuis **Paramètres → Abonnement**, ou
purgez les élèves inactifs.

### « Note invalide (X) »

Les notes doivent être comprises entre **0 et 20**. Les virgules
décimales doivent être au format point (`14.5`, pas `14,5`).

### « Élève "MAT123" introuvable »

Pour importer des notes ou des paiements, l'élève doit déjà exister et la
colonne `studentMatricule` doit correspondre **exactement** au matricule
saisi dans GèreEcole (insensible à la casse mais pas aux espaces).

### Le fichier n'est pas reconnu

- Vérifiez l'extension (`.xlsx`, `.csv`, `.json`, `.sql`).
- Si CSV : le séparateur doit être la **virgule** (`,`). Excel sauvegarde
  parfois en point-virgule ; ré-enregistrez via *« CSV UTF-8 »*.
- Si JSON : le contenu doit être un **tableau** d'objets (`[{...},
  {...}]`).

---

## 6. Bonnes pratiques

1. **Faites un essai sur 5 lignes** avant d'importer 5 000 lignes.
2. **Sauvegardez votre fichier source** : l'outil n'archive pas
   l'original.
3. **Importez aux heures creuses** : la barre de progression peut prendre
   plusieurs minutes pour les gros lots.
4. **Vérifiez après import** depuis l'onglet « Vérification de
   l'Intégrité » (même page) : il signale les liens cassés (élève sans
   classe, classe sans enseignant principal…).

---

## 7. Demander l'assistance de l'administrateur

Si après ces étapes l'import échoue toujours, contactez l'équipe GèreEcole
en joignant :

- **Votre fichier source** (Excel / CSV / SQL).
- Une **capture du rapport d'erreurs** affiché à la fin de l'import.
- Le **nom de votre école** et l'**année scolaire ciblée**.

Le super-administrateur peut alors utiliser sa page interne
**« Import (assistance) »** pour rejouer l'import pour votre compte et
vous transmettre le rapport corrigé.
