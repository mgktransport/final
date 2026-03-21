import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth/ensure-admin - Ensure admin user exists
export async function GET() {
  try {
    // Check if admin exists
    const existingAdmin = await db.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT id, email FROM "Utilisateur" WHERE email = 'admin@mgktransport.ma' LIMIT 1
    `

    if (existingAdmin && existingAdmin.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'L\'utilisateur admin existe déjà',
        user: existingAdmin[0],
      })
    }

    // Add mustChangePassword column if it doesn't exist
    try {
      await db.$executeRaw`ALTER TABLE "Utilisateur" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`
    } catch {
      // Ignore if column exists or can't be added
    }

    // Create admin user
    const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    try {
      await db.$executeRaw`
        INSERT INTO "Utilisateur" (id, email, "motDePasse", nom, prenom, role, actif, "createdAt", "updatedAt", "mustChangePassword")
        VALUES (${adminId}, 'admin@mgktransport.ma', 'admin123', 'Administrateur', 'MGK', 'ADMIN', true, NOW(), NOW(), false)
      `
    } catch {
      // Fallback without mustChangePassword
      await db.$executeRaw`
        INSERT INTO "Utilisateur" (id, email, "motDePasse", nom, prenom, role, actif, "createdAt", "updatedAt")
        VALUES (${adminId}, 'admin@mgktransport.ma', 'admin123', 'Administrateur', 'MGK', 'ADMIN', true, NOW(), NOW())
      `
    }

    return NextResponse.json({
      success: true,
      message: 'Utilisateur admin créé avec succès',
      user: {
        id: adminId,
        email: 'admin@mgktransport.ma',
        nom: 'Administrateur',
        prenom: 'MGK',
        role: 'ADMIN',
      },
    })
  } catch (error) {
    console.error('Erreur création admin:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'utilisateur admin: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    )
  }
}

// Also support POST
export async function POST() {
  return GET()
}
