import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import type { ApiResponse } from '@/types'

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
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Get user
    const user = await db.utilisateur.findUnique({
      where: { id: sessionData.userId },
    })

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

    // Update password and try to reset mustChangePassword flag if it exists
    try {
      await db.utilisateur.update({
        where: { id: user.id },
        data: {
          motDePasse: newPassword,
          mustChangePassword: false, // Reset flag after password change
        },
      })
    } catch {
      // If mustChangePassword column doesn't exist, just update the password
      await db.utilisateur.update({
        where: { id: user.id },
        data: {
          motDePasse: newPassword,
        },
      })
    }

    // Log the password change
    await db.log.create({
      data: {
        action: 'CHANGEMENT_MOT_DE_PASSE',
        details: 'Mot de passe changé avec succès',
        utilisateurId: user.id,
      },
    })

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
