// Alertes [id] API Routes
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TypeAlerte, PrioriteAlerte } from '@prisma/client';
import type { ApiResponse, Alerte } from '@/types';

// GET /api/alertes/[id] - Get single alerte
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Alerte>>> {
  try {
    const { id } = await params;
    
    const alerte = await db.alerte.findUnique({
      where: { id },
    });

    if (!alerte) {
      return NextResponse.json(
        { success: false, error: 'Alerte non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: alerte,
    });
  } catch (error) {
    console.error('Error fetching alerte:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'alerte' },
      { status: 500 }
    );
  }
}

// PUT /api/alertes/[id] - Update alerte
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Alerte>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if alerte exists
    const existingAlerte = await db.alerte.findUnique({
      where: { id },
    });

    if (!existingAlerte) {
      return NextResponse.json(
        { success: false, error: 'Alerte non trouvée' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.type !== undefined) {
      if (!Object.values(TypeAlerte).includes(body.type)) {
        return NextResponse.json(
          { success: false, error: 'Type d\'alerte invalide' },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }
    
    if (body.titre !== undefined) updateData.titre = body.titre;
    if (body.message !== undefined) updateData.message = body.message;
    
    if (body.priority !== undefined) {
      if (!Object.values(PrioriteAlerte).includes(body.priority)) {
        return NextResponse.json(
          { success: false, error: 'Priorité invalide' },
          { status: 400 }
        );
      }
      updateData.priority = body.priority;
    }
    
    if (body.lu !== undefined) updateData.lu = body.lu;
    if (body.resolute !== undefined) updateData.resolute = body.resolute;
    if (body.referenceId !== undefined) updateData.referenceId = body.referenceId || null;

    const alerte = await db.alerte.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: alerte,
      message: 'Alerte mise à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating alerte:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'alerte' },
      { status: 500 }
    );
  }
}

// DELETE /api/alertes/[id] - Delete alerte
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;

    // Check if alerte exists
    const existingAlerte = await db.alerte.findUnique({
      where: { id },
    });

    if (!existingAlerte) {
      return NextResponse.json(
        { success: false, error: 'Alerte non trouvée' },
        { status: 404 }
      );
    }

    await db.alerte.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Alerte supprimée avec succès',
    });
  } catch (error) {
    console.error('Error deleting alerte:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'alerte' },
      { status: 500 }
    );
  }
}
