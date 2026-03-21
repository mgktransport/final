// Chauffeurs [id] API Routes - v2 with conditional delete
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TypeContrat, TypeSalaire } from '@prisma/client';
import type { ApiResponse, Chauffeur, ChauffeurFormData } from '@/types';

// GET /api/chauffeurs/[id] - Get single chauffeur with relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Chauffeur>>> {
  try {
    const { id } = await params;
    
    const chauffeur = await db.chauffeur.findUnique({
      where: { id },
      include: {
        vehicules: {
          where: { actif: true },
          select: {
            id: true,
            immatriculation: true,
            marque: true,
            modele: true,
            annee: true,
            capacite: true,
            kilometrage: true,
          },
        },
        salaires: {
          orderBy: [
            { annee: 'desc' },
            { mois: 'desc' },
          ],
          take: 12,
        },
        primes: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        avances: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            tournées: true,
          },
        },
      },
    });
    
    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: chauffeur,
    });
  } catch (error) {
    console.error('Error fetching chauffeur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du chauffeur' },
      { status: 500 }
    );
  }
}

// PUT /api/chauffeurs/[id] - Update chauffeur
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Chauffeur>>> {
  try {
    const { id } = await params;
    const body: Partial<ChauffeurFormData> = await request.json();
    
    // Check if chauffeur exists
    const existingChauffeur = await db.chauffeur.findUnique({
      where: { id },
    });
    
    if (!existingChauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }
    
    // If CIN is being updated, check for duplicates
    if (body.cin && body.cin !== existingChauffeur.cin) {
      const duplicateCin = await db.chauffeur.findUnique({
        where: { cin: body.cin },
      });
      
      if (duplicateCin) {
        return NextResponse.json(
          { success: false, error: 'Un chauffeur avec ce CIN existe déjà' },
          { status: 400 }
        );
      }
    }
    
    // If numeroCNSS is being updated, check for duplicates
    if (body.numeroCNSS && body.numeroCNSS !== existingChauffeur.numeroCNSS) {
      const duplicateCNSS = await db.chauffeur.findUnique({
        where: { numeroCNSS: body.numeroCNSS },
      });
      
      if (duplicateCNSS) {
        return NextResponse.json(
          { success: false, error: 'Un chauffeur avec ce N°CNSS existe déjà' },
          { status: 400 }
        );
      }
    }
    
    // Validate enum values if provided
    if (body.typeContrat && !Object.values(TypeContrat).includes(body.typeContrat)) {
      return NextResponse.json(
        { success: false, error: 'Type de contrat invalide' },
        { status: 400 }
      );
    }
    
    if (body.typeSalaire && !Object.values(TypeSalaire).includes(body.typeSalaire)) {
      return NextResponse.json(
        { success: false, error: 'Type de salaire invalide' },
        { status: 400 }
      );
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.nom !== undefined) updateData.nom = body.nom;
    if (body.prenom !== undefined) updateData.prenom = body.prenom;
    if (body.cin !== undefined) updateData.cin = body.cin;
    if (body.telephone !== undefined) updateData.telephone = body.telephone;
    if (body.adresse !== undefined) updateData.adresse = body.adresse || null;
    if (body.numeroCNSS !== undefined) updateData.numeroCNSS = body.numeroCNSS || null;
    if (body.dateEmbauche !== undefined) updateData.dateEmbauche = new Date(body.dateEmbauche);
    if (body.typeContrat !== undefined) updateData.typeContrat = body.typeContrat;
    if (body.typeSalaire !== undefined) updateData.typeSalaire = body.typeSalaire;
    if (body.montantSalaire !== undefined) updateData.montantSalaire = body.montantSalaire;
    if (body.montantCNSS !== undefined) updateData.montantCNSS = body.montantCNSS;
    if (body.montantAssurance !== undefined) updateData.montantAssurance = body.montantAssurance;
    if (body.ribCompte !== undefined) updateData.ribCompte = body.ribCompte || null;
    if (body.actif !== undefined) updateData.actif = body.actif;
    
    // Update chauffeur
    const chauffeur = await db.chauffeur.update({
      where: { id },
      data: updateData,
      include: {
        vehicules: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: chauffeur,
      message: 'Chauffeur mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating chauffeur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du chauffeur' },
      { status: 500 }
    );
  }
}

// DELETE /api/chauffeurs/[id] - Delete chauffeur (conditional: hard delete or soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;

    // Check if chauffeur exists and get relations
    const existingChauffeur = await db.chauffeur.findUnique({
      where: { id },
      include: {
        vehicules: { where: { actif: true } },
        salaires: { where: { paye: true } }, // Only paid salaries
        primes: true,
        avances: true,
        documents: true,
        tournées: true,
      },
    });

    if (!existingChauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Check if chauffeur has vehicles assigned, paid salaries, or primes
    const hasVehicles = existingChauffeur.vehicules && existingChauffeur.vehicules.length > 0;
    const hasPaidSalaries = existingChauffeur.salaires && existingChauffeur.salaires.length > 0;
    const hasPrimes = existingChauffeur.primes && existingChauffeur.primes.length > 0;

    // If any of these conditions are true, do soft delete (set actif=false)
    if (hasVehicles || hasPaidSalaries || hasPrimes) {
      await db.chauffeur.update({
        where: { id },
        data: { actif: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Chauffeur désactivé avec succès (a des véhicules, salaires payés ou primes)',
      });
    }

    // Otherwise, do hard delete (permanent deletion)
    // Delete related records first (cascade delete)

    // Delete all salaires (paid or unpaid)
    await db.salaire.deleteMany({
      where: { chauffeurId: id },
    });

    // Delete primes if any (should be none based on our check, but just in case)
    await db.prime.deleteMany({
      where: { chauffeurId: id },
    });

    // Delete avances
    await db.avance.deleteMany({
      where: { chauffeurId: id },
    });

    // Delete documents
    await db.documentChauffeur.deleteMany({
      where: { chauffeurId: id },
    });

    // Delete tournées
    await db.tournee.deleteMany({
      where: { chauffeurId: id },
    });

    // Now delete the chauffeur permanently
    await db.chauffeur.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Chauffeur supprimé définitivement avec succès',
    });
  } catch (error) {
    console.error('Error deleting chauffeur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du chauffeur' },
      { status: 500 }
    );
  }
}
