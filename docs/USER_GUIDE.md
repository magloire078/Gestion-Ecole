# Guide Utilisateur — Gestion-Ecole

Ce guide s'adresse aux **directeurs**, **personnel administratif** et **parents** utilisant la plateforme Gestion-Ecole.

> Pour la configuration technique (Stripe, emails, déploiement), voir les autres fichiers dans `docs/`.

---

## Table des matières

1. [Premiers pas](#1-premiers-pas)
2. [Rôles et permissions](#2-rôles-et-permissions)
3. [Gestion des élèves](#3-gestion-des-élèves)
4. [Gestion des classes et de la pédagogie](#4-gestion-des-classes-et-de-la-pédagogie)
5. [Notes, bulletins et évaluations](#5-notes-bulletins-et-évaluations)
6. [Frais de scolarité et paiements](#6-frais-de-scolarité-et-paiements)
7. [Comptabilité](#7-comptabilité)
8. [Ressources humaines et paie](#8-ressources-humaines-et-paie)
9. [Modules de vie scolaire](#9-modules-de-vie-scolaire)
10. [Espace parent](#10-espace-parent)
11. [Communication](#11-communication)
12. [Paramètres et abonnement](#12-paramètres-et-abonnement)
13. [Dépannage](#13-dépannage)

---

## 1. Premiers pas

### 1.1 Création de compte (Directeur)

1. Ouvrez la page d'accueil → cliquez **« Commencer l'aventure »**
2. Remplissez le formulaire d'inscription (6 étapes) :
   - Informations personnelles du directeur
   - Informations de l'établissement (nom, pays, adresse)
   - Type d'établissement et cycles proposés
   - Choix du plan (Essentiel gratuit, Pro, Premium)
   - Email de contact et logo (optionnel)
3. Validez → un email de bienvenue est envoyé
4. Vous êtes automatiquement connecté au tableau de bord

### 1.2 Connexion

- URL : `https://<votre-domaine>/auth/login`
- Identifiant : email + mot de passe
- En cas d'oubli : **« Mot de passe oublié »** → email de réinitialisation

### 1.3 Premier paramétrage recommandé

Dans l'ordre :

1. **Paramètres → Établissement** → compléter logo, devise, année scolaire courante
2. **Classes** → créer vos cycles, niveaux et classes
3. **Matières** → définir les matières par cycle avec coefficients
4. **Frais de scolarité** → définir les grilles tarifaires par niveau
5. **Personnel → Rôles** → créer les rôles administratifs et leurs permissions
6. **Personnel** → inviter les enseignants et le staff
7. **Élèves** → inscrire les élèves (manuel ou import en masse)

---

## 2. Rôles et permissions

### 2.1 Hiérarchie

- **Super Admin** (Anthropic / propriétaire de la plateforme) — accès transverse à tout
- **Directeur** — contrôle total sur son école
- **Personnel administratif** — permissions granulaires par rôle
- **Enseignant** — accès aux notes/absences de ses classes
- **Parent** — accès en lecture seule aux données de ses enfants

### 2.2 Permissions disponibles

Configurables via **Paramètres → Rôles** :

| Permission | Utilisation |
|---|---|
| `manageUsers` | Créer/modifier élèves et personnel |
| `manageClasses` | Créer classes, cycles, matières |
| `manageGrades` | Saisir et modifier les notes |
| `viewGrades` | Lecture seule des notes |
| `manageAttendance` | Marquer les absences |
| `manageDiscipline` | Saisir les incidents |
| `manageBilling` | Paiements, comptabilité, paie |
| `manageSchedule` | Emploi du temps |
| `manageCommunication` | Messagerie, notifications |
| `manageLibrary` | Bibliothèque |
| `manageCantine`, `manageTransport`, `manageInternat` | Modules concernés |
| `manageRooms`, `manageInventory` | Immobilier et stock |
| `manageMedical` | Dossier médical |
| `manageSettings` | Paramètres école |

### 2.3 Inviter un collaborateur

1. **RH → Personnel → Ajouter**
2. Renseigner email + rôle administratif
3. L'intéressé reçoit un lien par email pour créer son compte
4. Dès la première connexion, il voit uniquement les modules autorisés

---

## 3. Gestion des élèves

### 3.1 Inscription manuelle

**Inscription → Nouvelle inscription** :
- Informations élève (nom, date de naissance, genre, photo)
- Affectation à une classe
- Informations parents (minimum un parent, un contact)
- Frais de scolarité (appliqué automatiquement selon le niveau)

### 3.2 Import en masse

**Inscription → Importation de masse** :
1. Choisir le type (Élèves, Enseignants ou Notes)
2. Télécharger le modèle Excel
3. Remplir le modèle (colonnes `firstName`, `lastName`, `className`, etc. — voir descriptions dans le template)
4. Uploader — l'aperçu affiche les 5 premières lignes
5. Lancer l'importation → rapport d'erreurs par ligne en cas de problème

> ⚠️ Les classes doivent exister avant l'import. La colonne `className` doit matcher exactement (ex : « 6ème A »).

### 3.3 Fiche élève

**Dossiers élèves → Cliquer sur un élève** donne accès à :
- Informations civiles et photo
- Parents et contacts d'urgence
- Scolarité (classe, année d'inscription, statut)
- Notes, absences, incidents, paiements, dossier médical
- Documents (bulletin, certificats, fiches d'inscription PDF)

### 3.4 Génération de codes d'accès parents

Pour qu'un parent accède à l'espace parent :
1. **Dossiers élèves → [élève] → Parents → Générer un code**
2. Partager le code (QR, email ou SMS)
3. Le parent se connecte via `/parent-access` et saisit le code → son compte est lié

---

## 4. Gestion des classes et de la pédagogie

### 4.1 Structure hiérarchique

```
École
 └── Cycles (ex: Primaire, Collège, Lycée)
      └── Niveaux (ex: CP, 6ème, Seconde)
           └── Classes (ex: 6ème A, 6ème B)
                └── Matières (avec coefficients)
```

### 4.2 Créer une classe

**Classes → Nouvelle classe** → nom, niveau, enseignant principal, capacité max, salle habituelle.

### 4.3 Emploi du temps

**Emploi du temps → [Classe]** → glisser-déposer des créneaux. Chaque créneau lie une matière, un enseignant et une salle. Les conflits (enseignant double-booké, salle occupée) sont détectés automatiquement.

---

## 5. Notes, bulletins et évaluations

### 5.1 Saisie des notes

**Notes → [Classe] → [Matière]** :
- Saisie individuelle ou en lot
- Types : Devoir, Composition, Oral (configurable)
- Coefficient par défaut de la matière, modifiable par évaluation
- Dates et commentaires optionnels

### 5.2 Bulletins

**Notes → [Classe] → Bulletins** :
- Génération automatique des moyennes par matière et générale
- Rang dans la classe calculé
- PDF téléchargeable (ou envoi par email aux parents)

### 5.3 Importation en masse de notes

Format CSV/Excel avec colonnes : `studentMatricule`, `subject`, `grade`, `coefficient`, `type`, `date` (voir Import en masse).

---

## 6. Frais de scolarité et paiements

### 6.1 Définir les frais

**Frais de scolarité → Nouveau frais** → nom, montant, niveau concerné, périodicité (annuelle, trimestrielle, mensuelle).

### 6.2 Enregistrer un paiement

Deux modes :

- **Caisse (espèces, chèque, virement)** :
  **Paiements → [élève] → Enregistrer un paiement** → montant, date, mode, numéro de reçu. Un reçu PDF est généré et peut être envoyé par email au parent.

- **Stripe / Wave / PayDunya / Orange Money / MTN MoMo** :
  Le parent paie directement depuis son espace via Stripe Checkout ou le provider mobile money sélectionné. Le webhook crédite automatiquement le compte de l'élève et envoie le reçu par email.

### 6.3 Suivi des impayés

**Paiements → Rappels** :
- Liste filtrable des élèves en retard
- Envoi groupé d'emails de rappel
- Historique des relances

### 6.4 Remboursements

Dans le dashboard Stripe (ou manuellement pour autres providers), rembourser le paiement. Le webhook :
- Ajoute une écriture négative en comptabilité
- Remet le solde de l'élève à jour
- Marque le paiement comme `refunded: true`

---

## 7. Comptabilité

**Comptabilité → Journal** donne accès à la liste de toutes les transactions (paiements scolarité, paie, achats fournisseurs). Les écritures sont automatiques pour les paiements Stripe, manuelles pour le reste.

Exports :
- **Comptabilité → Rapports** → CSV, PDF, ou compte rendu par email à l'administrateur

---

## 8. Ressources humaines et paie

### 8.1 Fiches personnel

**RH → Personnel → [employé]** :
- Informations civiles + contrat
- Salaire de base, primes récurrentes, retenues
- Historique des congés

### 8.2 Exécuter une paie

**RH → Paie → Nouveau cycle** :
1. Choisir le mois
2. Système calcule automatiquement les fiches de paie (base + primes − retenues)
3. Valider → fiches de paie PDF générées par employé
4. Envoyer par email ou imprimer

### 8.3 Congés

Les employés soumettent leur demande depuis leur profil. Un admin avec `manageUsers` approuve ou refuse.

---

## 9. Modules de vie scolaire

Activables selon votre plan :

| Module | Fonctions clés |
|---|---|
| **Cantine** | Menus hebdomadaires, réservations, abonnements mensuels |
| **Transport** | Bus, lignes, abonnés, émargement montée/descente |
| **Internat** | Bâtiments, chambres, affectation des internes, entrées/sorties |
| **Santé** | Dossier médical, consultations, vaccins, allergies |
| **Bibliothèque** | Catalogue, prêts/retours, alertes de retard |
| **Activités** | Clubs parascolaires, inscriptions, compétitions |
| **Immobilier** | Bâtiments, salles, réservations, inventaire, maintenance |
| **Stocks** | Fournitures, entrées/sorties, alertes seuil minimum |

Chaque module a son tableau de bord avec ses propres statistiques et exports.

---

## 10. Espace parent

### 10.1 Connexion

Via `/parent-access` avec le code d'accès fourni par l'école (voir section 3.4).

### 10.2 Ce que voit un parent

- Fiches de ses enfants uniquement
- Notes et bulletins
- Absences et incidents
- Solde scolarité et historique des paiements
- Bouton **« Payer en ligne »** (selon les providers activés par l'école)
- Dossier médical (si autorisé)
- Messages de l'école

### 10.3 Paiement en ligne

1. L'enfant a un solde dû → bouton **« Payer »**
2. Choix du provider (Stripe, Wave, Orange Money...)
3. Redirection vers le provider → paiement
4. Retour sur l'app → confirmation + reçu par email

---

## 11. Communication

### 11.1 Messagerie interne

**Messagerie** → envoyer à un élève, une classe, une liste de parents, ou tout l'établissement.

### 11.2 Notifications

Les événements importants (nouvelle note, absence, paiement reçu) créent automatiquement une notification. Cloche en haut à droite dans le dashboard.

### 11.3 WhatsApp (optionnel)

Si configuré (voir `docs/WHATSAPP_INTEGRATION.md`), les rappels de paiement et bulletins peuvent être envoyés par WhatsApp.

---

## 12. Paramètres et abonnement

### 12.1 Abonnement

**Paramètres → Abonnement** :
- Plan en cours et limites (nombre d'élèves, stockage, modules)
- Historique des paiements
- Mise à niveau en un clic → Stripe Checkout
- Annulation en self-service (période en cours honorée)

### 12.2 Modules complémentaires

Les modules comme Santé, Cantine, etc. peuvent être activés à la carte depuis **Paramètres → Modules**. Tarification par module (mensuelle).

### 12.3 Backup et export

**Paramètres → Export des données** :
- Export JSON de toute l'école (pour backup local)
- Export CSV par module (élèves, notes, paiements, etc.)

---

## 13. Dépannage

### Le parent ne reçoit pas d'email

1. Vérifier que l'extension Trigger Email est installée et fonctionnelle
   (voir `docs/EMAIL_SETUP.md`)
2. Vérifier les logs de l'extension dans la console Firebase
3. Vérifier le dossier spam côté parent
4. Vérifier SPF/DKIM sur votre domaine d'envoi

### Un paiement Stripe n'active pas l'abonnement

1. Dashboard Stripe → le paiement est bien `succeeded`
2. Dashboard Stripe → Webhooks → vérifier que l'événement `checkout.session.completed` a bien été délivré (200 OK)
3. Côté app : logs Next.js pour `[Stripe Webhook]`
4. Si besoin, rejouer l'événement depuis le dashboard Stripe

### Import Excel : « Classe introuvable »

La colonne `className` doit matcher exactement le nom de la classe existante (casse, espaces, accents). Corriger dans le fichier Excel et relancer.

### « Limite d'élèves atteinte »

Votre plan est plein. Soit supprimer des élèves archivés, soit migrer vers un plan supérieur via **Paramètres → Abonnement**.

### « Permission refusée » sur un module

Votre rôle administratif n'a pas la permission requise. Demander au directeur de l'ajouter via **Paramètres → Rôles → [votre rôle]**.

---

## Support

- Support intégré : **Aide → Nouveau ticket** depuis le dashboard
- Email : support@gere-ecole.com
- Documentation technique : `docs/` (pour les administrateurs système)
