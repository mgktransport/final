import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { creerChargeEntretien, mettreAJourChargeEntretien } from '@/lib/charges-auto'

// Types d'entretien prédéfinis pour l'affichage
const TYPES_ENTRETIEN_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  PNEUS: 'Pneus',
  FREINS: 'Freins',
  ASSURANCE_VEHICULE: 'Assurance',
  VISITE_TECHNIQUE: 'Visite technique',
  REPARATION: 'Réparation',
}

function getTypeEntretienLabel(type: string): string {
  return TYPES_ENTRETIEN_LABELS[type] || type
}

// GET /api/vehicules/[id]/entretiens - Liste des entretiens d'un véhicule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      select: { id: true, immatriculation: true, kilometrage: true },
    })
    
    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }
    
    // Build where clause
    const where: { vehiculeId: string; type?: string } = { vehiculeId: id }
    if (type) {
      where.type = type
    }
    
    const entretiens = await db.entretien.findMany({
      where,
      orderBy: { dateIntervention: 'desc' },
      take: limit,
    })
    
    // Calculer le total des coûts
    const totalCout = entretiens.reduce((sum, e) => sum + e.cout, 0)
    
    // Entretiens à venir
    const entretiensAVenir = entretiens.filter(e => 
      (e.prochaineDate && new Date(e.prochaineDate) > new Date()) ||
      (e.prochainKm && e.prochainKm > vehicule.kilometrage)
    )
    
    return NextResponse.json({
      success: true,
      data: entretiens,
      vehicule,
      summary: {
        total: entretiens.length,
        totalCout,
        aVenir: entretiensAVenir.length,
      },
    })
  } catch (error) {
    console.error('Erreur récupération entretiens:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des entretiens' },
      { status: 500 }
    )
  }
}

// POST /api/vehicules/[id]/entretiens - Ajouter un entretien et créer la charge automatique
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const {
      type,
      description,
      cout,
      kilometrage,
      dateIntervention,
      prochainKm,
      prochaineDate,
    } = body
    
    // Validation
    if (!type || !cout || !dateIntervention) {
      return NextResponse.json(
        { success: false, error: 'Type, coût et date d\'intervention sont obligatoires' },
        { status: 400 }
      )
    }
    
    // Vérifier que le véhicule existe
    const vehicule = await db.vehicule.findUnique({
      where: { id },
    })
    
    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      )
    }
    
    const dateInterv = new Date(dateIntervention)
    
    // Créer l'entretien
    const entretien = await db.entretien.create({
      data: {
        vehiculeId: id,
        type: type,
        description: description || null,
        cout: parseFloat(cout),
        kilometrage: kilometrage ? parseInt(kilometrage) : null,
        dateIntervention: dateInterv,
        prochainKm: prochainKm ? parseInt(prochainKm) : null,
        prochaineDate: prochaineDate ? new Date(prochaineDate) : null,
      },
    })
    
    // Mettre à jour le kilométrage du véhicule si fourni
    if (kilometrage && parseInt(kilometrage) > vehicule.kilometrage) {
      await db.vehicule.update({
        where: { id },
        data: { kilometrage: parseInt(kilometrage) },
      })
    }
    
    // Créer la charge automatique pour cet entretien
    try {
      await creerChargeEntretien({
        entretienId: entretien.id,
        vehiculeId: id,
        vehiculeImmat: vehicule.immatriculation,
        typeEntretien: getTypeEntretienLabel(type),
        montant: parseFloat(cout),
        date: dateInterv,
      })
    } catch (chargeError) {
      console.error('Erreur création charge entretien:', chargeError)
      // Continue even if charge creation fails
    }
    
    return NextResponse.json({ success: true, data: entretien }, { status: 201 })
  } catch (error) {
    console.error('Erreur création entretien:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'entretien' },
      { status: 500 }
    )
  }
}
