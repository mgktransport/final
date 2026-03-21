import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// User response type (without password)
type UserResponse = {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  actif: boolean
  createdAt: Date
  updatedAt: Date
}

// GET - Get a single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const session = await db.parametre.findUnique({
      where: { cle: `session_${sessionToken}` },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session invalide' },
        { status: 401 }
      )
    }

    const sessionData = JSON.parse(session.valeur)
    
    if (new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      )
    }

    // Only ADMIN can view user details
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { id } = await params

    const user = await db.utilisateur.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: userResponse,
    })
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    )
  }
}

// PUT - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const session = await db.parametre.findUnique({
      where: { cle: `session_${sessionToken}` },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session invalide' },
        { status: 401 }
      )
    }

    const sessionData = JSON.parse(session.valeur)
    
    if (new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      )
    }

    // Only ADMIN can update users
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { email, nom, prenom, role, actif, motDePasse } = body

    // Check if user exists
    const existingUser = await db.utilisateur.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await db.utilisateur.findUnique({
        where: { email },
      })

      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: 'Un utilisateur avec cet email existe déjà' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: {
      email?: string
      nom?: string
      prenom?: string
      role?: string
      actif?: boolean
      motDePasse?: string
    } = {}

    if (email) updateData.email = email
    if (nom) updateData.nom = nom
    if (prenom) updateData.prenom = prenom
    if (role) updateData.role = role
    if (typeof actif === 'boolean') updateData.actif = actif
    if (motDePasse && motDePasse.length >= 6) updateData.motDePasse = motDePasse

    // Update user
    const user = await db.utilisateur.update({
      where: { id },
      data: updateData,
    })

    // Log the update
    await db.log.create({
      data: {
        action: 'MODIFICATION_UTILISATEUR',
        details: `Utilisateur ${user.email} modifié`,
        utilisateurId: sessionData.userId,
      },
    })

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: userResponse,
    })
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const session = await db.parametre.findUnique({
      where: { cle: `session_${sessionToken}` },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session invalide' },
        { status: 401 }
      )
    }

    const sessionData = JSON.parse(session.valeur)
    
    if (new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      )
    }

    // Only ADMIN can delete users
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Prevent deleting yourself
    if (id === sessionData.userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.utilisateur.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Delete user's logs first
    await db.log.deleteMany({
      where: { utilisateurId: id },
    })

    // Delete user
    await db.utilisateur.delete({
      where: { id },
    })

    // Log the deletion
    await db.log.create({
      data: {
        action: 'SUPPRESSION_UTILISATEUR',
        details: `Utilisateur ${existingUser.email} supprimé`,
        utilisateurId: sessionData.userId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'utilisateur' },
      { status: 500 }
    )
  }
}
