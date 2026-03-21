import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import type { ApiResponse } from '@/types'

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

// GET - List all users
export async function GET() {
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

    // Only ADMIN can list users
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Get all users
    const users = await db.utilisateur.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Remove passwords from response
    const usersResponse: UserResponse[] = users.map(user => ({
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      data: usersResponse,
    })
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}

// POST - Create a new user
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

    // Only ADMIN can create users
    if (sessionData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, motDePasse, nom, prenom, role } = body

    // Validation
    if (!email || !motDePasse || !nom || !prenom) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    if (motDePasse.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.utilisateur.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Create user
    const user = await db.utilisateur.create({
      data: {
        email,
        motDePasse,
        nom,
        prenom,
        role: role || 'EXPLOITATION',
        actif: true,
      },
    })

    // Log the creation
    await db.log.create({
      data: {
        action: 'CREATION_UTILISATEUR',
        details: `Utilisateur ${email} créé avec le rôle ${role || 'EXPLOITATION'}`,
        utilisateurId: sessionData.userId,
      },
    })

    // Return user without password
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
    console.error('Erreur création utilisateur:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    )
  }
}
