import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ApiResponse } from '@/types'

export async function POST() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.utilisateur.findUnique({
      where: { email: 'admin@mgktransport.ma' },
    })

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: 'L\'utilisateur admin existe déjà',
        user: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          nom: existingAdmin.nom,
          prenom: existingAdmin.prenom,
          role: existingAdmin.role,
        },
      })
    }

    // Create default admin user
    const admin = await db.utilisateur.create({
      data: {
        email: 'admin@mgktransport.ma',
        motDePasse: 'admin123', // In production, hash this with bcrypt
        nom: 'Administrateur',
        prenom: 'MGK',
        role: 'ADMIN',
        actif: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Utilisateur admin créé avec succès',
      user: {
        id: admin.id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: admin.role,
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
