import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Avance } from '@/types';
import { recalculateSalaireIfUnpaid, getMonthYearFromDate } from '@/lib/salaire-service';

// GET /api/chauffeurs/[id]/avances/[avanceId] - Get single avance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; avanceId: string }> }
): Promise<NextResponse<ApiResponse<Avance>>> {
  try {
    const { id, avanceId } = await params;

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

    return NextResponse.json({
      success: true,
      data: avance,
    });
  } catch (error) {
    console.error('Error fetching avance:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'avance' },
      { status: 500 }
    );
  }
}

// PUT /api/chauffeurs/[id]/avances/[avanceId] - Update avance
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; avanceId: string }> }
): Promise<NextResponse<ApiResponse<Avance>>> {
  try {
    const { id, avanceId } = await params;
    const body = await request.json();

    const { montant, date, rembourse } = body;

    // Check if avance exists and belongs to this chauffeur
    const existingAvance = await db.avance.findFirst({
      where: {
        id: avanceId,
        chauffeurId: id,
      },
    });

    if (!existingAvance) {
      return NextResponse.json(
        { success: false, error: 'Avance non trouvée' },
        { status: 404 }
      );
    }

    // Sauvegarder l'ancienne date pour le recalcul si la date change
    const oldDate = existingAvance.date;
    const oldMonthYear = getMonthYearFromDate(oldDate);

    // Build update data
    const updateData: Record<string, unknown> = {};

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

    if (rembourse !== undefined) {
      updateData.rembourse = rembourse;
    }

    // Update avance
    const avance = await db.avance.update({
      where: { id: avanceId },
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
      data: avance,
      message: 'Avance modifiée avec succès',
    });
  } catch (error) {
    console.error('Error updating avance:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification de l\'avance' },
      { status: 500 }
    );
  }
}

// DELETE /api/chauffeurs/[id]/avances/[avanceId] - Delete avance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; avanceId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id, avanceId } = await params;

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
