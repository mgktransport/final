import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Prime, PrimeFormData } from '@/types';
import { recalculateSalaireIfUnpaid, getMonthYearFromDate } from '@/lib/salaire-service';

// GET /api/chauffeurs/[id]/primes - List primes for chauffeur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Prime[]>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const annee = searchParams.get('annee');
    const mois = searchParams.get('mois');
    
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
    
    const primes = await db.prime.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    
    // Calculate total
    const total = primes.reduce((sum, prime) => sum + prime.montant, 0);
    
    return NextResponse.json({
      success: true,
      data: primes,
      message: `Total des primes: ${total.toFixed(2)} MAD`,
    });
  } catch (error) {
    console.error('Error fetching primes:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des primes' },
      { status: 500 }
    );
  }
}

// POST /api/chauffeurs/[id]/primes - Add prime
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Prime>>> {
  try {
    const { id } = await params;
    const body: Omit<PrimeFormData, 'chauffeurId'> = await request.json();
    
    // Validate required fields
    const { motif, montant, date } = body;
    
    if (!motif || !montant || !date) {
      return NextResponse.json(
        { success: false, error: 'Le motif, le montant et la date sont obligatoires' },
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
        { success: false, error: 'Impossible d\'ajouter une prime à un chauffeur inactif' },
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

    // Create prime
    const prime = await db.prime.create({
      data: {
        chauffeurId: id,
        motif,
        montant,
        date: parsedDate,
      },
    });
    
    // Recalculer automatiquement le salaire si un salaire non payé existe pour ce mois
    const { mois, annee } = getMonthYearFromDate(parsedDate);
    await recalculateSalaireIfUnpaid(id, mois, annee);
    
    return NextResponse.json({
      success: true,
      data: prime,
      message: `Prime de ${montant.toFixed(2)} MAD ajoutée avec succès`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating prime:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la prime' },
      { status: 500 }
    );
  }
}

// DELETE /api/chauffeurs/[id]/primes - Delete a specific prime
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const primeId = searchParams.get('primeId');
    
    if (!primeId) {
      return NextResponse.json(
        { success: false, error: 'ID de la prime requis' },
        { status: 400 }
      );
    }
    
    // Check if prime exists and belongs to this chauffeur
    const prime = await db.prime.findFirst({
      where: {
        id: primeId,
        chauffeurId: id,
      },
    });
    
    if (!prime) {
      return NextResponse.json(
        { success: false, error: 'Prime non trouvée' },
        { status: 404 }
      );
    }
    
    // Sauvegarder la date avant suppression pour le recalcul
    const primeDate = prime.date;
    const { mois, annee } = getMonthYearFromDate(primeDate);
    
    // Delete prime
    await db.prime.delete({
      where: { id: primeId },
    });
    
    // Recalculer automatiquement le salaire si un salaire non payé existe pour ce mois
    await recalculateSalaireIfUnpaid(id, mois, annee);
    
    return NextResponse.json({
      success: true,
      message: 'Prime supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting prime:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la prime' },
      { status: 500 }
    );
  }
}
