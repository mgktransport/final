import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/bulletins-paie - Liste des bulletins de paie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chauffeurId = searchParams.get('chauffeurId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const where: any = {};
    if (chauffeurId) {
      where.chauffeurId = chauffeurId;
    }

    const [bulletins, total] = await Promise.all([
      db.bulletinPaie.findMany({
        where,
        include: {
          chauffeur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              cin: true,
              numeroCNSS: true,
              telephone: true,
            },
          },
        },
        orderBy: [
          { annee: 'desc' },
          { mois: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.bulletinPaie.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        data: bulletins,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des bulletins:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des bulletins de paie' },
      { status: 500 }
    );
  }
}

// POST /api/bulletins-paie - Créer un bulletin de paie
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Vérifier si un bulletin existe déjà pour ce mois/année/chauffeur
    const existing = await db.bulletinPaie.findUnique({
      where: {
        chauffeurId_mois_annee: {
          chauffeurId: data.chauffeurId,
          mois: data.mois,
          annee: data.annee,
        },
      },
    });

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

    const bulletinData = {
      chauffeurId: data.chauffeurId,
      mois: data.mois,
      annee: data.annee,
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
    };

    let bulletin;
    if (existing) {
      // Mettre à jour le bulletin existant
      bulletin = await db.bulletinPaie.update({
        where: { id: existing.id },
        data: bulletinData,
        include: {
          chauffeur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              cin: true,
              numeroCNSS: true,
              telephone: true,
            },
          },
        },
      });
    } else {
      // Créer un nouveau bulletin
      bulletin = await db.bulletinPaie.create({
        data: bulletinData,
        include: {
          chauffeur: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              cin: true,
              numeroCNSS: true,
              telephone: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: bulletin,
      message: existing
        ? 'Bulletin de paie mis à jour avec succès'
        : 'Bulletin de paie créé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la création du bulletin:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du bulletin de paie' },
      { status: 500 }
    );
  }
}
