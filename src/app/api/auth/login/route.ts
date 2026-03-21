import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import type { ApiResponse } from '@/types'

// Generate a simple session token
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, motDePasse } = body

    if (!email || !motDePasse) {
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' } as ApiResponse<never>,
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.utilisateur.findUnique({
      where: { email: email.toLowerCase() },
    })

    console.log('=== LOGIN DEBUG ===');
    console.log('Email recherché:', email.toLowerCase());
    console.log('Utilisateur trouvé:', user ? `Oui - ${user.email} (${user.role})` : 'Non');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Identifiants incorrects' } as ApiResponse<never>,
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.actif) {
      return NextResponse.json(
        { success: false, error: 'Ce compte est désactivé' } as ApiResponse<never>,
        { status: 401 }
      )
    }

    // Verify password (simple comparison for demo - use bcrypt in production)
    if (motDePasse !== user.motDePasse) {
      return NextResponse.json(
        { success: false, error: 'Identifiants incorrects' } as ApiResponse<never>,
        { status: 401 }
      )
    }

    // Create session token
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Store session in Parametre table
    await db.parametre.upsert({
      where: { cle: `session_${sessionToken}` },
      create: {
        cle: `session_${sessionToken}`,
        valeur: JSON.stringify({
          userId: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        }),
      },
      update: {
        valeur: JSON.stringify({
          userId: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        }),
      },
    })

    // Log the login
    await db.log.create({
      data: {
        action: 'CONNEXION',
        details: `Connexion réussie depuis ${request.headers.get('user-agent') || 'Unknown'}`,
        utilisateurId: user.id,
      },
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        mustChangePassword: (user as Record<string, unknown>).mustChangePassword || false,
      },
      message: 'Connexion réussie',
    })
  } catch (error) {
    console.error('Erreur de connexion:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la connexion' } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
