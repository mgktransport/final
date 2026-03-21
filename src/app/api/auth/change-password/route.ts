import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import type { ApiResponse } from '@/types'

// User type from raw query
interface UserRow {
  id: string
  email: string
  motDePasse: string
  nom: string
  prenom: string
  role: string
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Get session from database
    const session = await db.parametre.findUnique({
      where: { cle: `session_${sessionToken}` },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session invalide' },
        { status: 401 }
      )
    }

    // Parse session data
    const sessionData = JSON.parse(session.valeur)
    
    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Validate new password length
    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' },
        { status: 400 }
      )
    }

    // Use raw SQL to get user (avoids Prisma schema validation issues)
    const users = await db.$queryRaw<UserRow[]>`
      SELECT id, email, "motDePasse", nom, prenom, role
      FROM "Utilisateur" 
      WHERE id = ${sessionData.userId}
      LIMIT 1
    `

    const user = users[0]

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Verify current password
    if (currentPassword !== user.motDePasse) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe actuel incorrect' },
        { status: 400 }
      )
    }

    // Update password using raw SQL
    await db.$executeRaw`
      UPDATE "Utilisateur" 
      SET "motDePasse" = ${newPassword}, "updatedAt" = NOW()
      WHERE id = ${user.id}
    `

    // Try to reset mustChangePassword flag
    try {
      await db.$executeRaw`
        UPDATE "Utilisateur" 
        SET "mustChangePassword" = false
        WHERE id = ${user.id}
      `
    } catch {
      // Ignore if column doesn't exist
    }

    // Log the password change
    try {
      await db.log.create({
        data: {
          action: 'CHANGEMENT_MOT_DE_PASSE',
          details: 'Mot de passe changé avec succès',
          utilisateurId: user.id,
        },
      })
    } catch {
      // Ignore log errors
    }

    return NextResponse.json({
      success: true,
      message: 'Mot de passe changé avec succès',
    })
  } catch (error) {
    console.error('Erreur changement mot de passe:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du changement de mot de passe' },
      { status: 500 }
    )
  }
}
