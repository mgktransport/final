import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicules/[id]/entretiens/last-vidange - Dernière vidange avec kilométrage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      select: { id: true },
    })
    
    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }
    
    // Trouver la dernière vidange avec kilométrage
    const lastVidange = await db.entretien.findFirst({
      where: { 
        vehiculeId: id,
        type: 'VIDANGE',
        kilometrage: { not: null }
      },
      orderBy: { dateIntervention: 'desc' },
      select: {
        id: true,
        kilometrage: true,
        dateIntervention: true,
        prochainKm: true,
      },
    })
    
    return NextResponse.json({
      success: true,
      data: lastVidange,
    })
  } catch (error) {
    console.error('Erreur récupération dernière vidange:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la dernière vidange' },
      { status: 500 }
    )
  }
}
