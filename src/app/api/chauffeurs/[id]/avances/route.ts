import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Avance, AvanceFormData } from '@/types';
import { recalculateSalaireIfUnpaid, getMonthYearFromDate } from '@/lib/salaire-service';

// GET /api/chauffeurs/[id]/avances - List avances for chauffeur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Avance[]>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const annee = searchParams.get('annee');
    const mois = searchParams.get('mois');
    const rembourse = searchParams.get('rembourse');
    
    // Check if chauffeur exists
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      select: { id: true, nom: true, prenom: true },
    });
    
    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }
    
    // Build where clause
    const where: Record<string, unknown> = { chauffeurId: id };
    
    // Filter by reimbursement status
    if (rembourse !== null && rembourse !== undefined) {
      where.rembourse = rembourse === 'true';
    }
    
    // Filter by date range if month/year provided (using UTC for consistency)
    if (annee && mois) {
      const startDate = new Date(Date.UTC(parseInt(annee), parseInt(mois) - 1, 1));
      const endDate = new Date(Date.UTC(parseInt(annee), parseInt(mois), 1));
      
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    } else if (annee) {
      const startDate = new Date(Date.UTC(parseInt(annee), 0, 1));
      const endDate = new Date(Date.UTC(parseInt(annee) + 1, 0, 1));
      
      where.date = {
        gte: startDate,
        lt: endDate,
      };
    }
    
    const avances = await db.avance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    
    // Calculate totals
    const totalAvances = avances.reduce((sum, avance) => sum + avance.montant, 0);
    const avancesNonRemboursees = avances.filter(a => !a.rembourse);
    const totalNonRembourse = avancesNonRemboursees.reduce((sum, avance) => sum + avance.montant, 0);
    
    return NextResponse.json({
      success: true,
      data: avances,
      message: `Total avances: ${totalAvances.toFixed(2)} MAD | Non remboursées: ${totalNonRembourse.toFixed(2)} MAD`,
    });
  } catch (error) {
    console.error('Error fetching avances:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des avances' },
      { status: 500 }
    );
  }
}

// POST /api/chauffeurs/[id]/avances - Add avance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Avance>>> {
  try {
    const { id } = await params;
    const body: Omit<AvanceFormData, 'chauffeurId'> = await request.json();
    
    // Validate required fields
    const { montant, date } = body;
    
    if (!montant || !date) {
      return NextResponse.json(
        { success: false, error: 'Le montant et la date sont obligatoires' },
        { status: 400 }
      );
    }
    
    // Validate montant
    if (montant <= 0) {
      return NextResponse.json(
        { success: false, error: 'Le montant doit être supérieur à 0' },
        { status: 400 }
      );
    }
    
    // Check if chauffeur exists
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      select: { id: true, nom: true, prenom: true, actif: true },
    });
    
    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }
    
    if (!chauffeur.actif) {
      return NextResponse.json(
        { success: false, error: 'Impossible d\'ajouter une avance à un chauffeur inactif' },
        { status: 400 }
      );
    }
    
    // Parse date and ensure it's stored as UTC midnight
    // If date is a string like "2026-03-15", parse it as UTC
    let parsedDate: Date;
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date string in YYYY-MM-DD format - parse as UTC
      const [year, month, day] = date.split('-').map(Number);
      parsedDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      parsedDate = new Date(date);
    }

    // Create avance
    const avance = await db.avance.create({
      data: {
        chauffeurId: id,
        montant,
        date: parsedDate,
        rembourse: false,
      },
    });
    
    // Recalculer automatiquement le salaire si un salaire non payé existe pour ce mois
    const { mois, annee } = getMonthYearFromDate(parsedDate);
    await recalculateSalaireIfUnpaid(id, mois, annee);
    
    return NextResponse.json({
      success: true,
      data: avance,
      message: `Avance de ${montant.toFixed(2)} MAD ajoutée avec succès`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating avance:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'avance' },
      { status: 500 }
    );
  }
}

// PUT /api/chauffeurs/[id]/avances - Mark as reimbursed
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Avance>>> {
  try {
    const { id } = await params;
    const body: { avanceId: string; rembourse?: boolean } = await request.json();
    
    const { avanceId, rembourse = true } = body;
    
    if (!avanceId) {
      return NextResponse.json(
        { success: false, error: 'ID de l\'avance requis' },
        { status: 400 }
      );
    }
    
    // Check if avance exists and belongs to this chauffeur
    const avance = await db.avance.findFirst({
      where: {
        id: avanceId,
        chauffeurId: id,
      },
    });
    
    if (!avance) {
      return NextResponse.json(
        { success: false, error: 'Avance non trouvée' },
        { status: 404 }
      );
    }
    
    // Update avance
    const updatedAvance = await db.avance.update({
      where: { id: avanceId },
      data: { rembourse },
    });
    
    // Recalculer automatiquement le salaire si un salaire non payé existe pour ce mois
    const { mois, annee } = getMonthYearFromDate(avance.date);
    await recalculateSalaireIfUnpaid(id, mois, annee);
    
    return NextResponse.json({
      success: true,
      data: updatedAvance,
      message: rembourse ? 'Avance marquée comme remboursée' : 'Avance marquée comme non remboursée',
    });
  } catch (error) {
    console.error('Error updating avance:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'avance' },
      { status: 500 }
    );
  }
}

// DELETE /api/chauffeurs/[id]/avances - Delete an avance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const avanceId = searchParams.get('avanceId');
    
    if (!avanceId) {
      return NextResponse.json(
        { success: false, error: 'ID de l\'avance requis' },
        { status: 400 }
      );
    }
    
    // Check if avance exists and belongs to this chauffeur
    const avance = await db.avance.findFirst({
      where: {
        id: avanceId,
        chauffeurId: id,
      },
    });
    
    if (!avance) {
      return NextResponse.json(
        { success: false, error: 'Avance non trouvée' },
        { status: 404 }
      );
    }
    
    // Sauvegarder la date avant suppression pour le recalcul
    const avanceDate = avance.date;
    const { mois, annee } = getMonthYearFromDate(avanceDate);
    
    // Delete avance
    await db.avance.delete({
      where: { id: avanceId },
    });
    
    // Recalculer automatiquement le salaire si un salaire non payé existe pour ce mois
    await recalculateSalaireIfUnpaid(id, mois, annee);
    
    return NextResponse.json({
      success: true,
      message: 'Avance supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting avance:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'avance' },
      { status: 500 }
    );
  }
}
