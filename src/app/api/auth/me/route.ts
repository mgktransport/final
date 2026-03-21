import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

// User type from raw query
interface UserRow {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  actif: boolean
  mustChangePassword?: boolean
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        user: null,
      })
    }

    // Get session from database
    const session = await db.parametre.findUnique({
      where: { cle: `session_${sessionToken}` },
    })

    if (!session) {
      // Clear invalid cookie
      cookieStore.delete('session_token')
      return NextResponse.json({
        success: false,
        user: null,
      })
    }

    // Parse session data
    const sessionData = JSON.parse(session.valeur)
    
    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      // Delete expired session
      await db.parametre.delete({
        where: { cle: `session_${sessionToken}` },
      })
      cookieStore.delete('session_token')
      return NextResponse.json({
        success: false,
        user: null,
      })
    }

    // Use raw SQL to get user (avoids Prisma schema validation issues)
    const users = await db.$queryRaw<UserRow[]>`
      SELECT id, email, nom, prenom, role, actif, "mustChangePassword"
      FROM "Utilisateur" 
      WHERE id = ${sessionData.userId}
      LIMIT 1
    `

    const user = users[0]

    if (!user || !user.actif) {
      cookieStore.delete('session_token')
      return NextResponse.json({
        success: false,
        user: null,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        mustChangePassword: user.mustChangePassword || false,
      },
    })
  } catch (error) {
    console.error('Erreur vérification auth:', error)
    return NextResponse.json({
      success: false,
      user: null,
    })
  }
}
