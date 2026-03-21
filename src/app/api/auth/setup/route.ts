import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ApiResponse } from '@/types'

export async function POST() {
  try {
    // Use raw SQL to check if admin exists (avoids Prisma schema validation issues)
    const existingAdmin = await db.$queryRaw<Array<{ id: string; email: string; nom: string; prenom: string; role: string }>>`
      SELECT id, email, nom, prenom, role FROM "Utilisateur" WHERE email = 'admin@mgktransport.ma' LIMIT 1
    `

    if (existingAdmin && existingAdmin.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'L\'utilisateur admin existe déjà',
        user: {
          id: existingAdmin[0].id,
          email: existingAdmin[0].email,
          nom: existingAdmin[0].nom,
          prenom: existingAdmin[0].prenom,
          role: existingAdmin[0].role,
        },
      })
    }

    // Create default admin user using raw SQL
    // Generate a simple ID
    const adminId = `admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    await db.$executeRaw`
      INSERT INTO "Utilisateur" (id, email, "motDePasse", nom, prenom, role, actif, "createdAt", "updatedAt")
      VALUES (${adminId}, 'admin@mgktransport.ma', 'admin123', 'Administrateur', 'MGK', 'ADMIN', true, NOW(), NOW())
    `

    // Try to add mustChangePassword column if it doesn't exist
    try {
      await db.$executeRaw`ALTER TABLE "Utilisateur" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`
    } catch {
      // Ignore error if column already exists or can't be added
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
      { success: false, error: 'Erreur lors de la création de l\'utilisateur admin' } as ApiResponse<never>,
      { status: 500 }
    )
  }
}

// Also run on GET to make it easier to setup
export async function GET() {
  return POST()
}
