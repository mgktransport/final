import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/migrate - Run database migrations for PostgreSQL
export async function POST() {
  try {
    // Check if we're using PostgreSQL
    const dbUrl = process.env.DATABASE_URL || ''
    const isPostgreSQL = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')

    if (!isPostgreSQL) {
      return NextResponse.json({
        success: true,
        message: 'Skipping migrations - not PostgreSQL (using SQLite)'
      })
    }

    console.log('[Migration API] Running PostgreSQL table migrations...')

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
      )`,

      `CREATE TABLE IF NOT EXISTS "Log" (
        "id" TEXT PRIMARY KEY,
        "action" TEXT,
        "details" TEXT,
        "utilisateurId" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS "Alerte" (
        "id" TEXT PRIMARY KEY,
        "type" TEXT,
        "titre" TEXT,
        "message" TEXT,
        "priority" TEXT,
        "lu" BOOLEAN DEFAULT false,
        "resolute" BOOLEAN DEFAULT false,
        "referenceId" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ]

    const results: { table: string; status: string }[] = []

    for (const sql of postgresTables) {
      try {
        await db.$executeRawUnsafe(sql)
        // Extract table name from SQL
        const match = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)
        const tableName = match ? match[1] : 'unknown'
        results.push({ table: tableName, status: 'created/exists' })
      } catch (error) {
        console.error('[Migration API] Error:', error)
        const match = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)
        const tableName = match ? match[1] : 'unknown'
        results.push({ table: tableName, status: 'error: ' + (error as Error).message })
      }
    }

    console.log('[Migration API] Migrations completed')

    return NextResponse.json({
      success: true,
      message: 'PostgreSQL migrations completed',
      results
    })
  } catch (error) {
    console.error('[Migration API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Migration failed: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

// GET /api/migrate - Check migration status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Send a POST request to run migrations',
    database: process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://')
      ? 'PostgreSQL'
      : 'SQLite'
  })
}
