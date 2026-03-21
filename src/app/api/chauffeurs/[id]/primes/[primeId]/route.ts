import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Prime } from '@/types';
import { recalculateSalaireIfUnpaid, getMonthYearFromDate } from '@/lib/salaire-service';

// GET /api/chauffeurs/[id]/primes/[primeId] - Get single prime
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; primeId: string }> }
): Promise<NextResponse<ApiResponse<Prime>>> {
  try {
    const { id, primeId } = await params;

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

    return NextResponse.json({
      success: true,
      data: prime,
    });
  } catch (error) {
    console.error('Error fetching prime:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la prime' },
      { status: 500 }
    );
  }
}

// PUT /api/chauffeurs/[id]/primes/[primeId] - Update prime
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; primeId: string }> }
): Promise<NextResponse<ApiResponse<Prime>>> {
  try {
    const { id, primeId } = await params;
    const body = await request.json();

    const { motif, montant, date } = body;

    // Check if prime exists and belongs to this chauffeur
    const existingPrime = await db.prime.findFirst({
      where: {
        id: primeId,
        chauffeurId: id,
      },
    });

    if (!existingPrime) {
      return NextResponse.json(
        { success: false, error: 'Prime non trouvée' },
        { status: 404 }
      );
    }

    // Sauvegarder l'ancienne date pour le recalcul si la date change
    const oldDate = existingPrime.date;
    const oldMonthYear = getMonthYearFromDate(oldDate);

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (motif !== undefined) {
      if (!motif || motif.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Le motif doit contenir au moins 3 caractères' },
          { status: 400 }
        );
      }
      updateData.motif = motif;
    }

    if (montant !== undefined) {
      if (!montant || montant <= 0) {
        return NextResponse.json(
          { success: false, error: 'Le montant doit être supérieur à 0' },
          { status: 400 }
        );
      }
      updateData.montant = montant;
    }

    let newDate: Date | null = null;
    if (date !== undefined) {
      // Parse date and ensure it's stored as UTC midnight
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number);
        newDate = new Date(Date.UTC(year, month - 1, day));
        updateData.date = newDate;
      } else {
        newDate = new Date(date);
        updateData.date = newDate;
      }
    }

    // Update prime
    const prime = await db.prime.update({
      where: { id: primeId },
      data: updateData,
    });

    // Recalculer automatiquement le salaire
    // Toujours recalculer l'ancien mois
    await recalculateSalaireIfUnpaid(id, oldMonthYear.mois, oldMonthYear.annee);

    // Si la date a changé, recalculer aussi le nouveau mois
    if (newDate) {
      const newMonthYear = getMonthYearFromDate(newDate);
      if (newMonthYear.mois !== oldMonthYear.mois || newMonthYear.annee !== oldMonthYear.annee) {
        await recalculateSalaireIfUnpaid(id, newMonthYear.mois, newMonthYear.annee);
      }
    }

    return NextResponse.json({
      success: true,
      data: prime,
      message: 'Prime modifiée avec succès',
    });
  } catch (error) {
    console.error('Error updating prime:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de la prime' },
      { status: 500 }
    );
  }
}

// DELETE /api/chauffeurs/[id]/primes/[primeId] - Delete prime
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; primeId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id, primeId } = await params;

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
