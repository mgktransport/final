import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import type { ApiResponse } from '@/types'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (sessionToken) {
      // Delete session from database
      try {
        await db.parametre.delete({
          where: { cle: `session_${sessionToken}` },
        })
      } catch {
        // Session might not exist, ignore error
      }
    }

    // Clear cookie
    cookieStore.delete('session_token')

    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
    } as ApiResponse<never>)
  } catch (error) {
    console.error('Erreur de déconnexion:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la déconnexion' } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
