import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/bulletins-paie/preview - Prévisualiser les données pour un bulletin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chauffeurId = searchParams.get('chauffeurId');
    const mois = parseInt(searchParams.get('mois') || '0');
    const annee = parseInt(searchParams.get('annee') || '0');

    if (!chauffeurId || !mois || !annee) {
      return NextResponse.json(
        { success: false, error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Récupérer le chauffeur
    const chauffeur = await db.chauffeur.findUnique({
      where: { id: chauffeurId },
      select: {
        id: true,
        nom: true,
        prenom: true,
        cin: true,
        numeroCNSS: true,
        telephone: true,
        montantSalaire: true,
        typeSalaire: true,
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les primes du mois
    const debutMois = new Date(annee, mois - 1, 1);
    const finMois = new Date(annee, mois, 0, 23, 59, 59);

    const primes = await db.prime.findMany({
      where: {
        chauffeurId,
        date: {
          gte: debutMois,
          lte: finMois,
        },
        comptabilise: false,
      },
    });

    // Récupérer les avances du mois (non remboursées)
    const avances = await db.avance.findMany({
      where: {
        chauffeurId,
        date: {
          gte: debutMois,
          lte: finMois,
        },
        rembourse: false,
      },
    });

    // Vérifier si un bulletin existe déjà
    const bulletinExistant = await db.bulletinPaie.findUnique({
      where: {
        chauffeurId_mois_annee: {
          chauffeurId,
          mois,
          annee,
        },
      },
    });

    const primesDuMois = {
      total: primes.reduce((sum, p) => sum + p.montant, 0),
      liste: primes,
    };

    const avancesDuMois = {
      total: avances.reduce((sum, a) => sum + a.montant, 0),
      liste: avances,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...chauffeur,
        salaireBase: chauffeur.montantSalaire,
        primesDuMois,
        avancesDuMois,
        bulletinExistant: !!bulletinExistant,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la prévisualisation:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la prévisualisation' },
      { status: 500 }
    );
  }
}
