# MGK Transport - Guide de Déploiement

## 🚀 Déploiement sur Render.com

### Option 1: Déploiement via render.yaml (Recommandé)

1. Connectez-vous sur [render.com](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Blueprint"**
3. Connectez votre repository GitHub `mgktransport/final`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur **"Apply"**

Render créera automatiquement:
- Une base de données PostgreSQL gratuite
- L'application web

### Option 2: Déploiement Manuel

#### Étape 1: Créer la base de données PostgreSQL

1. Allez sur [render.com](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"PostgreSQL"**
3. Configurez:
   - **Name**: `mgk-transport-db`
   - **Region**: `Oregon`
   - **Plan**: `Free`
   - **Database**: `mgk_transport`
   - **User**: (laisser par défaut)
4. Cliquez sur **"Create Database"**
5. Copiez l'**Internal Database URL**

#### Étape 2: Créer le Web Service

1. Cliquez sur **"New +"** → **"Web Service"**
2. Sélectionnez le repository `mgktransport/final`
3. Configurez:

| Paramètre | Valeur |
|-----------|--------|
| **Name** | `mgk-transport` |
| **Region** | `Oregon` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma db push --accept-data-loss && npm run build` |
| **Start Command** | `npm run start:render` |
| **Plan** | `Free` |

#### Étape 3: Variables d'environnement

| Variable | Valeur |
|----------|--------|
| `NODE_VERSION` | `20` |
| `DATABASE_URL` | (l'URL de la base PostgreSQL) |
| `DIRECT_DATABASE_URL` | (même URL que DATABASE_URL) |
| `NEXTAUTH_SECRET` | (cliquez "Generate") |
| `NEXTAUTH_URL` | `https://votre-app.onrender.com` |

4. Cliquez sur **"Create Web Service"**

---

## 📝 Notes Importantes

### Base de données
- Le plan gratuit PostgreSQL sur Render expire après 90 jours
- Pour une solution permanente, considérez [Neon](https://neon.tech) (gratuit)

### Fichiers uploadés
- Les fichiers dans `/public/uploads` sont persistants sur Render
- Pour une meilleure solution, utilisez [Cloudinary](https://cloudinary.com)

### Mot de passe par défaut
- Après le déploiement, créez un compte admin
- Le premier compte créé sera automatiquement admin

---

## 🔧 Développement Local

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Créer la base de données locale
npx prisma db push

# Lancer le serveur de développement
npm run dev
```

---

## 📦 Structure du Projet

```
├── prisma/
│   └── schema.prisma    # Schéma de la base de données
├── src/
│   ├── app/             # Pages Next.js (App Router)
│   ├── components/      # Composants React
│   └── lib/             # Utilitaires et configurations
├── public/
│   └── uploads/         # Fichiers uploadés
└── render.yaml          # Configuration Render
```

---

## 🆘 Support

Pour toute question, consultez la documentation:
- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs)
- [Render](https://render.com/docs)
