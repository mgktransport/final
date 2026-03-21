# Module Chauffeurs - Documentation Complete

## 📋 Resume des Fonctionnalites

Le module **Chauffeurs** est le module principal de l'application MGK Transport. Il permet la gestion complete des chauffeurs, de leurs salaires, primes, avances et documents.

---

## 🏗️ Structure du Module

### Composants Frontend (`/src/components/chauffeurs/`)

| Fichier | Description |
|---------|-------------|
| `chauffeurs-content.tsx` | Conteneur principal du module |
| `chauffeurs-list.tsx` | Liste des chauffeurs avec filtres et pagination |
| `chauffeur-form.tsx` | Formulaire de creation/modification |
| `chauffeur-details.tsx` | Details complets d'un chauffeur (onglets) |
| `salaires-tab.tsx` | Onglet gestion des salaires |
| `documents-tab.tsx` | Onglet gestion des documents |
| `index.ts` | Exports du module |

### Routes API (`/src/app/api/chauffeurs/`)

| Route | Methode | Description |
|-------|---------|-------------|
| `/api/chauffeurs` | GET | Liste paginee des chauffeurs |
| `/api/chauffeurs` | POST | Creer un nouveau chauffeur |
| `/api/chauffeurs/[id]` | GET | Details d'un chauffeur |
| `/api/chauffeurs/[id]` | PUT | Modifier un chauffeur |
| `/api/chauffeurs/[id]` | DELETE | Supprimer un chauffeur |
| `/api/chauffeurs/[id]/salaires` | GET/POST | Salaires du chauffeur |
| `/api/chauffeurs/[id]/salaires/[salaireId]` | PUT | Modifier un salaire |
| `/api/chauffeurs/[id]/salaires/[salaireId]/payer` | PUT | Marquer salaire comme paye |
| `/api/chauffeurs/[id]/primes` | GET/POST | Primes du chauffeur |
| `/api/chauffeurs/[id]/primes/[primeId]` | PUT/DELETE | Modifier/Supprimer une prime |
| `/api/chauffeurs/[id]/avances` | GET/POST | Avances du chauffeur |
| `/api/chauffeurs/[id]/avances/[avanceId]` | PUT/DELETE | Modifier/Supprimer une avance |
| `/api/chauffeurs/[id]/documents` | GET/POST | Documents du chauffeur |
| `/api/chauffeurs/[id]/documents/[docId]` | PUT/DELETE | Modifier/Supprimer un document |

---

## 👤 Gestion des Chauffeurs

### Informations Gerees

- **Identite**: Nom, prenom, CIN (unique)
- **Contact**: Telephone, adresse
- **Contrat**: Type (CDI/CDD/Journalier), date d'embauche
- **Salaire**: Type (Fixe/Horaire/Par tournee), montant
- **Deductions**: CNSS, Assurance mensuelles
- **Bancaire**: RIB compte (24 chiffres)
- **Statut**: Actif/Inactif

### Fonctionnalites

- [x] Creation de chauffeur avec validation
- [x] Modification des informations
- [x] Suppression (soft delete - marquer inactif)
- [x] Liste avec pagination (10, 20, 50 elements)
- [x] Recherche par nom, prenom, CIN, telephone
- [x] Filtre par statut (actif/inactif)
- [x] Indicateur de salaire du mois en cours
- [x] Compteurs (salaires, primes, avances, documents)

---

## 💰 Gestion des Salaires

### Calcul Automatique

```
Salaire Net = Montant Base + Primes - Avances - CNSS - Assurance
```

### Fonctionnalites

- [x] Creation automatique du salaire mensuel
- [x] Calcul automatique du montant de base selon type:
  - **Fixe**: Montant salaire fixe
  - **Horaire**: Heures travaillees x Taux horaire
  - **Par tournee**: Journees travaillees x Tarif journalier
- [x] Integration automatique des primes du mois (non comptabilisees)
- [x] Integration automatique des avances du mois (non remboursees)
- [x] Deductions CNSS et Assurance
- [x] Modification du salaire avant paiement
- [x] **Paiement du salaire** avec:
  - Marquage comme "paye"
  - Date de paiement enregistree
  - **Auto-remboursement des avances** du mois
  - **Comptabilisation des primes** du mois
- [x] Protection: Impossible de supprimer un salaire paye
- [x] Statuts visuels:
  - 🟢 **Paye** (badge vert)
  - 🟡 **Non paye** (badge jaune)

### Export PDF

- [x] Generation de fiche de paie en PDF
- [x] En-tete avec logo MGK Transport
- [x] Details complets du chauffeur
- [x] Decompte salaire (base, primes, avances, deductions)
- [x] Format professionnel

---

## 🎁 Gestion des Primes

### Fonctionnalites

- [x] Ajout de prime (motif, montant, date)
- [x] Modification d'une prime
- [x] Suppression d'une prime
- [x] Indicateur de comptabilisation:
  - Prime non comptabilisee = peut etre incluse dans salaire
  - Prime comptabilisee = deja incluse dans un salaire paye
- [x] **Protection**: Impossible de modifier/supprimer une prime comptabilisee

---

## 💵 Gestion des Avances

### Fonctionnalites

- [x] Ajout d'avance (montant, date)
- [x] Modification d'une avance
- [x] Suppression d'une avance
- [x] Remboursement manuel possible
- [x] Indicateur de remboursement:
  - Avance non remboursee = peut etre deduite du salaire
  - Avance remboursee = deja deduite d'un salaire paye
- [x] **Auto-remboursement**: Lors du paiement du salaire, les avances du mois sont automatiquement marquees remboursees
- [x] **Protection**: Impossible de modifier/supprimer une avance remboursee

---

## 📄 Gestion des Documents

### Types de Documents Predefinis

- Permis de conduire
- Assurance chauffeur
- Visite medicale
- CIN

### Types Personnalises

- [x] Ajout de types de documents personnalises via Parametres
- [x] Categories: CHAUFFEUR ou VEHICULE

### Fonctionnalites Documents

- [x] Ajout de document avec:
  - Type (selection parmi liste)
  - Numero (optionnel)
  - Date d'expiration (optionnel)
  - Fichier joint (image/PDF)
- [x] Modification de document
- [x] Suppression de document
- [x] Visualisation du fichier
- [x] Indicateur d'expiration (alertes automatiques)

---

## 🔔 Alertes Automatiques

### Declenchement

- [x] Verification automatique a la connexion utilisateur
- [x] Verification des documents expires ou expirant bientot
- [x] Creation d'alertes pour:
  - Permis expires
  - Visite medicale expiree
  - Documents expirant dans 30 jours

---

## 🎨 Interface Utilisateur

### Design

- Theme MGK Transport (couleurs: #0066cc, #ff6600)
- Sidebar avec navigation
- Responsive design (mobile/desktop)
- Tableaux avec tri et pagination
- Formulaires avec validation
- Badges de statut colores
- Dialogs de confirmation

### UX

- Feedback visuel immediat
- Messages de succes/erreur (toasts)
- Etat de chargement (spinners)
- Confirmation avant actions critiques

---

## 🔒 Regles Metier

1. **Salaire unique par mois**: Un chauffeur ne peut avoir qu'un seul salaire par mois/annee
2. **Protection salaire paye**: Impossible de modifier/supprimer un salaire deja paye
3. **Protection prime comptabilisee**: Impossible de modifier/supprimer une prime deja comptabilisee
4. **Protection avance remboursee**: Impossible de modifier/supprimer une avance deja remboursee
5. **Auto-remboursement**: Avances deduites automatiquement au paiement du salaire
6. **Auto-comptabilisation**: Primes marquees automatiquement au paiement du salaire
7. **CIN unique**: Chaque chauffeur doit avoir un CIN unique

---

## 📊 Statut du Module

| Fonctionnalite | Statut |
|---------------|--------|
| CRUD Chauffeurs | ✅ Complete |
| Gestion Salaires | ✅ Complete |
| Gestion Primes | ✅ Complete |
| Gestion Avances | ✅ Complete |
| Gestion Documents | ✅ Complete |
| Export PDF | ✅ Complete |
| Alertes | ✅ Complete |
| Protection donnees | ✅ Complete |
| Interface responsive | ✅ Complete |

---

## 📅 Derniere mise a jour

**Date**: 2 Mars 2026
**Version**: 1.0.0
**Statut**: Module valide et fonctionnel

---

*Documentation generee automatiquement pour MGK Transport*
