// Parametres [id] API Routes
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Parametre } from '@/types';

// GET /api/parametres/[id] - Get single parametre
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Parametre>>> {
  try {
    const { id } = await params;
    
    const parametre = await db.parametre.findUnique({
      where: { id },
    });

    if (!parametre) {
      return NextResponse.json(
        { success: false, error: 'Paramètre non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parametre,
    });
  } catch (error) {
    console.error('Error fetching parametre:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du paramètre' },
      { status: 500 }
    );
  }
}

// PUT /api/parametres/[id] - Update parametre
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Parametre>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if parametre exists
    const existingParam = await db.parametre.findUnique({
      where: { id },
    });

    if (!existingParam) {
      return NextResponse.json(
        { success: false, error: 'Paramètre non trouvé' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.cle !== undefined) {
      // Check if new key already exists (and it's not the same parametre)
      if (body.cle !== existingParam.cle) {
        const duplicateKey = await db.parametre.findUnique({
          where: { cle: body.cle },
        });
        
        if (duplicateKey) {
          return NextResponse.json(
            { success: false, error: 'Un paramètre avec cette clé existe déjà' },
            { status: 400 }
          );
        }
      }
      updateData.cle = body.cle;
    }
    
    if (body.valeur !== undefined) updateData.valeur = String(body.valeur);

    const parametre = await db.parametre.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: parametre,
      message: 'Paramètre mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating parametre:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du paramètre' },
      { status: 500 }
    );
  }
}

// DELETE /api/parametres/[id] - Delete parametre
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;

    // Check if parametre exists
    const existingParam = await db.parametre.findUnique({
      where: { id },
    });

    if (!existingParam) {
      return NextResponse.json(
        { success: false, error: 'Paramètre non trouvé' },
        { status: 404 }
      );
    }

    await db.parametre.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Paramètre supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting parametre:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du paramètre' },
      { status: 500 }
    );
  }
}
