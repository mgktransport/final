// Database Migration Script - Creates missing tables for PostgreSQL
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PostgreSQL table creation SQL
const postgresTables = [
  `CREATE TABLE IF NOT EXISTS "Vehicule" (
    "id" TEXT PRIMARY KEY,
    "immatriculation" TEXT UNIQUE,
    "marque" TEXT,
    "modele" TEXT,
    "annee" INTEGER,
    "typeCarburant" TEXT DEFAULT 'DIESEL',
    "capacite" INTEGER,
    "kilometrage" INTEGER DEFAULT 0,
    "actif" BOOLEAN DEFAULT true,
    "chauffeurId" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "Entretien" (
    "id" TEXT PRIMARY KEY,
    "vehiculeId" TEXT,
    "type" TEXT,
    "description" TEXT,
    "cout" DOUBLE PRECISION,
    "kilometrage" INTEGER,
    "dateIntervention" TIMESTAMP,
    "prochainKm" INTEGER,
    "prochaineDate" TIMESTAMP,
    "alerteEnvoyee" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "PleinCarburant" (
    "id" TEXT PRIMARY KEY,
    "vehiculeId" TEXT,
    "quantite" DOUBLE PRECISION,
    "prixUnitaire" DOUBLE PRECISION,
    "prixTotal" DOUBLE PRECISION,
    "station" TEXT,
    "kilometrage" INTEGER,
    "date" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "DocumentVehicule" (
    "id" TEXT PRIMARY KEY,
    "vehiculeId" TEXT,
    "type" TEXT,
    "numero" TEXT,
    "dateEmission" TIMESTAMP,
    "dateExpiration" TIMESTAMP,
    "fichier" TEXT,
    "alerteEnvoyee" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "AchatVehicule" (
    "id" TEXT PRIMARY KEY,
    "vehiculeId" TEXT UNIQUE,
    "typeAchat" TEXT,
    "dateAchat" TIMESTAMP,
    "montantTotal" DOUBLE PRECISION,
    "acompte" DOUBLE PRECISION DEFAULT 0,
    "fournisseur" TEXT,
    "adresseFournisseur" TEXT,
    "telephoneFournisseur" TEXT,
    "numeroFacture" TEXT,
    "observations" TEXT,
    "nombreEcheances" INTEGER,
    "montantEcheance" DOUBLE PRECISION,
    "datePremiereEcheance" TIMESTAMP,
    "frequencePaiement" TEXT,
    "statut" TEXT DEFAULT 'EN_COURS',
    "montantPaye" DOUBLE PRECISION DEFAULT 0,
    "montantRestant" DOUBLE PRECISION DEFAULT 0,
    "dateDernierPaiement" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "EcheanceCredit" (
    "id" TEXT PRIMARY KEY,
    "achatVehiculeId" TEXT,
    "numeroEcheance" INTEGER,
    "dateEcheance" TIMESTAMP,
    "montantEcheance" DOUBLE PRECISION,
    "montantPaye" DOUBLE PRECISION DEFAULT 0,
    "datePaiement" TIMESTAMP,
    "statut" TEXT DEFAULT 'EN_ATTENTE',
    "observations" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "PaiementAchat" (
    "id" TEXT PRIMARY KEY,
    "achatVehiculeId" TEXT,
    "datePaiement" TIMESTAMP,
    "montant" DOUBLE PRECISION,
    "modePaiement" TEXT,
    "reference" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "Charge" (
    "id" TEXT PRIMARY KEY,
    "type" TEXT,
    "categorie" TEXT,
    "description" TEXT,
    "montant" DOUBLE PRECISION,
    "dateCharge" TIMESTAMP,
    "vehiculeId" TEXT,
    "automatique" BOOLEAN DEFAULT false,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "chauffeurId" TEXT,
    "fournisseur" TEXT,
    "numeroFacture" TEXT,
    "fichier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "TypeEntretienPersonnalise" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT UNIQUE,
    "nom" TEXT,
    "description" TEXT,
    "actif" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "CategorieChargePersonnalise" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT UNIQUE,
    "nom" TEXT,
    "type" TEXT,
    "description" TEXT,
    "actif" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
]

// Check if we're using PostgreSQL
function isPostgreSQL(): boolean {
  const dbUrl = process.env.DATABASE_URL || ''
  return dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')
}

// Run migrations for PostgreSQL
export async function runMigrations(): Promise<void> {
  if (!isPostgreSQL()) {
    console.log('[Migration] Skipping - not PostgreSQL')
    return
  }

  console.log('[Migration] Running PostgreSQL table migrations...')

  for (const sql of postgresTables) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (error) {
      console.error('[Migration] Error creating table:', error)
    }
  }

  console.log('[Migration] PostgreSQL table migrations completed')
}

// Initialize migrations
let migrationsRun = false

export async function ensureMigrations(): Promise<void> {
  if (migrationsRun) return
  migrationsRun = true
  await runMigrations()
}
