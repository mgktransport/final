# MGK Transport - Guide de Sauvegarde et Restauration

## 📥 Télécharger le Projet

### Méthode 1: Via le navigateur
Accédez au fichier ZIP dans le dossier `/download/` de ce projet.

### Méthode 2: Commande d'export
```bash
cd /home/z/my-project
zip -r ../mgk-transport.zip . -x "node_modules/*" -x ".next/*" -x ".turbo/*" -x "*.log"
```

---

## 🔄 Restaurer le Projet

### Prérequis
- **Node.js** 18+ ou **Bun** installé
- **SQLite** (inclus avec le projet)

### Étapes de restauration

1. **Extraire le ZIP**
   ```bash
   unzip mgk-transport-backup.zip -d mgk-transport
   cd mgk-transport
   ```

2. **Installer les dépendances**
   ```bash
   bun install
   # ou
   npm install
   ```

3. **Initialiser la base de données**
   ```bash
   bun run db:push
   bun run db:seed
   # ou
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. **Démarrer le serveur**
   ```bash
   bun run dev
   # ou
   npm run dev
   ```

5. **Accéder à l'application**
   ```
   http://localhost:3000
   ```

---

## 📋 Structure du Projet

```
mgk-transport/
├── prisma/
│   ├── schema.prisma    # Schéma de la base de données
│   └── seed.ts          # Données initiales
├── src/
│   ├── app/             # Pages Next.js (App Router)
│   ├── components/      # Composants React
│   │   ├── dashboard/   # Tableau de bord
│   │   ├── chauffeurs/  # Gestion chauffeurs
│   │   ├── vehicules/   # Gestion véhicules
│   │   ├── clients/     # Gestion clients
│   │   ├── factures/    # Gestion factures
│   │   ├── alertes/     # Alertes
│   │   └── parametres/  # Paramètres
│   ├── hooks/           # Hooks React
│   ├── lib/             # Utilitaires
│   └── types/           # Types TypeScript
├── db/                  # Base de données SQLite
├── public/              # Fichiers statiques
└── package.json         # Dépendances
```

---

## ⚠️ Recommandations de Sauvegarde

1. **Sauvegardez régulièrement** - Exportez le projet après chaque modification importante
2. **Utilisez Git** - Initialisez un dépôt Git pour le versionnage
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. **Stockez sur GitHub/GitLab** - Poussez votre code vers un dépôt distant
4. **Sauvegardez la base de données** - Le fichier `db/custom.db` contient toutes vos données

---

## 🛠️ Commandes Utiles

| Commande | Description |
|----------|-------------|
| `bun run dev` | Démarrer le serveur de développement |
| `bun run build` | Compiler pour la production |
| `bun run db:push` | Mettre à jour le schéma de la base de données |
| `bun run db:seed` | Remplir avec les données initiales |
| `bun run lint` | Vérifier la qualité du code |

---

## 📞 Support

Ce projet a été développé avec l'aide de Z.ai Code Assistant.
Pour toute question, consultez la documentation ou demandez de l'aide.
