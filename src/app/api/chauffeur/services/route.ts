// Chauffeur Services API - Get and update chauffeur's services
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import type { ApiResponse, PaginatedResponse } from '@/types';

// GET /api/chauffeur/services - Get services for current chauffeur
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<unknown> | ApiResponse<never>>> {
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

    const sessionData = JSON.parse(session.valeur);
    
    if (new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expirée' },
        { status: 401 }
      );
    }

    if (sessionData.role !== 'CHAUFFEUR') {
      return NextResponse.json(
        { success: false, error: 'Accès réservé aux chauffeurs' },
        { status: 403 }
      );
    }

    // Get chauffeur ID from user
    const utilisateur = await db.utilisateur.findUnique({
      where: { id: sessionData.userId },
      select: { chauffeurId: true },
    });

    if (!utilisateur?.chauffeurId) {
      return NextResponse.json(
        { success: false, error: 'Profil chauffeur non trouvé' },
        { status: 404 }
      );
    }

    const chauffeurId = utilisateur.chauffeurId;
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const skip = (page - 1) * pageSize;
    
    // Filters
    const completedParam = searchParams.get('completed');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const today = searchParams.get('today') === 'true';
    
    // Build where clause
    const where: Record<string, unknown> = { chauffeurId };
    
    if (completedParam !== null) {
      where.completed = completedParam === 'true';
    }
    
    if (today) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      where.dateHeureDepart = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.dateHeureDepart = dateFilter;
    }
    
    // Get total count
    const total = await db.exploitationService.count({ where });
    
    // Get services
    const services = await db.exploitationService.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { dateHeureDepart: 'asc' },
      include: {
        client: {
          select: {
            id: true,
            nomEntreprise: true,
            telephone: true,
            adresse: true,
          },
        },
        service: {
          select: {
            id: true,
            nomService: true,
            typeService: true,
            lieuDepart: true,
            lieuArrive: true,
            heureDepart: true,
          },
        },
        vehicule: {
          select: {
            id: true,
            immatriculation: true,
            marque: true,
            modele: true,
          },
        },
      },
    });
    
    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      data: services,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('Erreur récupération services chauffeur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des services' },
      { status: 500 }
    );
  }
}
