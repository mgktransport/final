import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/bulletins-paie/[id] - Récupérer un bulletin spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bulletin = await db.bulletinPaie.findUnique({
      where: { id },
      include: {
        chauffeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            cin: true,
            numeroCNSS: true,
            telephone: true,
            montantSalaire: true,
          },
        },
      },
    });

    if (!bulletin) {
      return NextResponse.json(
        { success: false, error: 'Bulletin non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bulletin,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du bulletin:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du bulletin' },
      { status: 500 }
    );
  }
}

// DELETE /api/bulletins-paie/[id] - Supprimer un bulletin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.bulletinPaie.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Bulletin supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du bulletin:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du bulletin' },
      { status: 500 }
    );
  }
}

// PUT /api/bulletins-paie/[id] - Mettre à jour un bulletin
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Calculer le salaire brut
    const salaireBrut =
      (data.salaireBase || 0) +
      (data.heuresSupplementaires || 0) +
      (data.primeTrajet || 0) +
      (data.primeRendement || 0) +
      (data.indemniteDeplacement || 0) +
      (data.indemnitePanier || 0) +
      (data.autresPrimes || 0);

    // Calculer les retenues
    const totalRetenues =
      (data.cnss || 0) +
      (data.amo || 0) +
      (data.ir || 0) +
      (data.avanceSalaire || 0) +
      (data.autresRetenues || 0);

    // Calculer le salaire net
    const salaireNet = salaireBrut - totalRetenues;

    const bulletin = await db.bulletinPaie.update({
      where: { id },
      data: {
        salaireBase: data.salaireBase || 0,
        heuresSupplementaires: data.heuresSupplementaires || 0,
        primeTrajet: data.primeTrajet || 0,
        primeRendement: data.primeRendement || 0,
        indemniteDeplacement: data.indemniteDeplacement || 0,
        indemnitePanier: data.indemnitePanier || 0,
        autresPrimes: data.autresPrimes || 0,
        salaireBrut,
        cnss: data.cnss || 0,
        amo: data.amo || 0,
        ir: data.ir || 0,
        avanceSalaire: data.avanceSalaire || 0,
        autresRetenues: data.autresRetenues || 0,
        totalRetenues,
        salaireNet,
        updatedAt: new Date(),
      },
      include: {
        chauffeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            cin: true,
            numeroCNSS: true,
            telephone: true,
            montantSalaire: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: bulletin,
      message: 'Bulletin mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du bulletin:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du bulletin' },
      { status: 500 }
    );
  }
}
