// Chauffeur Me API - Get current chauffeur profile and services
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import type { ApiResponse } from '@/types';

// GET /api/chauffeur/me - Get current chauffeur profile
export async function GET(): Promise<NextResponse<ApiResponse<{
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  cin: string;
  vehicules: Array<{
    id: string;
    immatriculation: string;
    marque: string;
    modele: string;
  }>;
}>>> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Get session from database
    const session = await db.parametre.findUnique({
      where: { cle: `session_${sessionToken}` },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session invalide' },
        { status: 401 }
      );
    }

    // Parse session data
    const sessionData = JSON.parse(session.valeur);
    
    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      );
    }

    // Check if user is a chauffeur
    if (sessionData.role !== 'CHAUFFEUR') {
      return NextResponse.json(
        { success: false, error: 'Accès réservé aux chauffeurs' },
        { status: 403 }
      );
    }

    // Get chauffeur data via the chauffeurId link
    const utilisateur = await db.utilisateur.findUnique({
      where: { id: sessionData.userId },
      include: {
        chauffeur: true, // The chauffeur relation from Utilisateur
      },
    });

    if (!utilisateur || !utilisateur.chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Profil chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Get the chauffeur with their vehicles
    const chauffeur = await db.chauffeur.findUnique({
      where: { id: utilisateur.chauffeurId },
      include: {
        vehicules: {
          where: { actif: true },
          select: {
            id: true,
            immatriculation: true,
            marque: true,
            modele: true,
          },
        },
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Profil chauffeur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: chauffeur.id,
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        telephone: chauffeur.telephone,
        cin: chauffeur.cin,
        vehicules: chauffeur.vehicules,
      },
    });
  } catch (error) {
    console.error('Erreur récupération profil chauffeur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}
