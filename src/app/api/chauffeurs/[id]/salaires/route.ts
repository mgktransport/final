import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Salaire } from '@/types';

interface SalaireFormData {
  mois: number;
  annee: number;
  heuresTravaillees?: number;
  joursTravailles?: number;
  montantPrimes?: number; // Optional, auto-calculated from DB if not provided
  montantAvances?: number; // Optional, auto-calculated from DB if not provided
}

// GET /api/chauffeurs/[id]/salaires - List salaires for chauffeur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Salaire[]>>> {
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
    
    if (annee) {
      where.annee = parseInt(annee, 10);
    }
    
    if (mois) {
      where.mois = parseInt(mois, 10);
    }
    
    const salaires = await db.salaire.findMany({
      where,
      orderBy: [
        { annee: 'desc' },
        { mois: 'desc' },
      ],
    });
    
    return NextResponse.json({
      success: true,
      data: salaires,
    });
  } catch (error) {
    console.error('Error fetching salaires:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des salaires' },
      { status: 500 }
    );
  }
}

// POST /api/chauffeurs/[id]/salaires - Create salary record with auto-calculation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Salaire>>> {
  try {
    const { id } = await params;
    const body: SalaireFormData = await request.json();
    
    // Validate required fields
    const { mois, annee } = body;
    
    if (mois === undefined || annee === undefined) {
      return NextResponse.json(
        { success: false, error: 'Le mois et l\'année sont obligatoires' },
        { status: 400 }
      );
    }
    
    // Validate month
    if (mois < 1 || mois > 12) {
      return NextResponse.json(
        { success: false, error: 'Le mois doit être entre 1 et 12' },
        { status: 400 }
      );
    }
    
    // Validate year
    const currentYear = new Date().getFullYear();
    if (annee < 2000 || annee > currentYear + 1) {
      return NextResponse.json(
        { success: false, error: 'L\'année n\'est pas valide' },
        { status: 400 }
      );
    }
    
    // Create date range for the month (using UTC to avoid timezone issues)
    const startDate = new Date(Date.UTC(annee, mois - 1, 1));
    const endDate = new Date(Date.UTC(annee, mois, 1));

    console.log('[SALAIRE CREATE] Date range:', {
      mois,
      annee,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Check if chauffeur exists and get salary info + primes/avances of the month
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      include: {
        primes: {
          where: {
            comptabilise: false,  // Only non-comptabilized primes
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
        avances: {
          where: {
            rembourse: false,  // Only non-reimbursed avances
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
        tournées: {
          where: {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
    });

    console.log('[SALAIRE CREATE] Found primes:', chauffeur?.primes?.map(p => ({
      id: p.id,
      montant: p.montant,
      date: p.date.toISOString(),
      comptabilise: p.comptabilise
    })));

    console.log('[SALAIRE CREATE] Found avances:', chauffeur?.avances?.map(a => ({
      id: a.id,
      montant: a.montant,
      date: a.date.toISOString(),
      rembourse: a.rembourse
    })));
    
    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }
    
    // Check if salary already exists for this month/year
    const existingSalaire = await db.salaire.findUnique({
      where: {
        chauffeurId_mois_annee: {
          chauffeurId: id,
          mois,
          annee,
        },
      },
    });
    
    if (existingSalaire) {
      return NextResponse.json(
        { success: false, error: 'Un salaire existe déjà pour ce mois et cette année' },
        { status: 400 }
      );
    }
    
    // Calculate base salary based on salary type
    let montantBase = chauffeur.montantSalaire;
    
    switch (chauffeur.typeSalaire) {
      case 'FIXE':
        montantBase = chauffeur.montantSalaire;
        break;
      case 'HORAIRE':
        montantBase = chauffeur.montantSalaire * (body.heuresTravaillees || 0);
        break;
      case 'PAR_TOURNEE':
        // Use joursTravailles if provided, otherwise count tournées
        const jours = body.joursTravailles ?? chauffeur.tournées.length;
        montantBase = chauffeur.montantSalaire * jours;
        break;
      default:
        montantBase = chauffeur.montantSalaire;
    }
    
    // Calculate primes total - use provided value or auto-calculate from DB
    const montantPrimes = body.montantPrimes !== undefined 
      ? body.montantPrimes 
      : chauffeur.primes.reduce((sum, prime) => sum + prime.montant, 0);
    
    // Calculate avances total - use provided value or auto-calculate from DB
    const montantAvances = body.montantAvances !== undefined
      ? body.montantAvances
      : chauffeur.avances.reduce((sum, avance) => sum + avance.montant, 0);
    
    // Calculate net salary: Base + Primes - Avances (minimum 0)
    const montantNet = Math.max(0, montantBase + montantPrimes - montantAvances);
    
    // Create salary record
    const salaire = await db.salaire.create({
      data: {
        chauffeurId: id,
        mois,
        annee,
        heuresTravaillees: body.heuresTravaillees || null,
        joursTravailles: body.joursTravailles || null,
        montantBase,
        montantPrimes,
        montantAvances,
        montantNet,
        paye: false,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: salaire,
      message: 'Salaire créé avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating salaire:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du salaire' },
      { status: 500 }
    );
  }
}
