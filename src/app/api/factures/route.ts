// Factures API Routes
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StatutFacture } from '@prisma/client';
import type { ApiResponse, PaginatedResponse, Facture } from '@/types';

// Generate invoice number
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Get count of invoices this month
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0);
  
  const count = await db.facture.count({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `FAC-${year}${month}-${sequence}`;
}

// GET /api/factures - List all factures with pagination and filtering
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<Facture> | ApiResponse<never>>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const skip = (page - 1) * pageSize;
    
    // Filter params
    const search = searchParams.get('search') || '';
    const statut = searchParams.get('statut') as StatutFacture | null;
    const clientId = searchParams.get('clientId');
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { numero: { contains: search } },
        { client: { nomEntreprise: { contains: search } } },
      ];
    }
    
    if (statut && Object.values(StatutFacture).includes(statut)) {
      where.statut = statut;
    }
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    // Get total count
    const total = await db.facture.count({ where });
    
    // Get factures with pagination
    const factures = await db.facture.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { dateEmission: 'desc' },
      ],
      include: {
        client: {
          select: {
            id: true,
            nomEntreprise: true,
            telephone: true,
            email: true,
          },
        },
        _count: {
          select: {
            paiements: true,
          },
        },
      },
    });
    
    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      data: factures,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching factures:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    );
  }
}

// POST /api/factures - Create new facture
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Facture>>> {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { clientId, dateEmission, dateEcheance, montantHT, tauxTVA } = body;
    
    if (!clientId || !dateEmission || !dateEcheance || montantHT === undefined) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }
    
    // Check if client exists
    const client = await db.client.findUnique({
      where: { id: clientId },
    });
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }
    
    // Calculate TVA and TTC
    const tva = tauxTVA ?? 20;
    const montantTVA = montantHT * (tva / 100);
    const montantTTC = montantHT + montantTVA;
    
    // Generate invoice number
    const numero = await generateInvoiceNumber();
    
    // Determine initial status
    const dateEmissionDate = new Date(dateEmission);
    const dateEcheanceDate = new Date(dateEcheance);
    const now = new Date();
    
    let statut = StatutFacture.EN_ATTENTE;
    if (dateEcheanceDate < now) {
      statut = StatutFacture.EN_RETARD;
    }
    
    // Create facture
    const facture = await db.facture.create({
      data: {
        numero,
        clientId,
        dateEmission: dateEmissionDate,
        dateEcheance: dateEcheanceDate,
        montantHT,
        tauxTVA: tva,
        montantTVA,
        montantTTC,
        statut,
      },
      include: {
        client: {
          select: {
            id: true,
            nomEntreprise: true,
            telephone: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: facture,
      message: 'Facture créée avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating facture:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la facture' },
      { status: 500 }
    );
  }
}
