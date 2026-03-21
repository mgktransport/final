// Clients API Routes
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TypeContratClient } from '@prisma/client';
import type { ApiResponse, PaginatedResponse, Client } from '@/types';

// GET /api/clients - List all clients with pagination and filtering
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<Client> | ApiResponse<never>>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const skip = (page - 1) * pageSize;
    
    // Filter params
    const search = searchParams.get('search') || '';
    const actifParam = searchParams.get('actif');
    const typeContrat = searchParams.get('typeContrat') as TypeContratClient | null;
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { nomEntreprise: { contains: search } },
        { contact: { contains: search } },
        { telephone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    
    if (actifParam !== null) {
      where.actif = actifParam === 'true';
    }
    
    if (typeContrat && Object.values(TypeContratClient).includes(typeContrat)) {
      where.typeContrat = typeContrat;
    }
    
    // Get total count
    const total = await db.client.count({ where });
    
    // Get clients with pagination
    const clients = await db.client.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [
        { actif: 'desc' },
        { nomEntreprise: 'asc' },
      ],
      include: {
        _count: {
          select: {
            services: true,
            factures: true,
          },
        },
      },
    });
    
    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      data: clients,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Client>>> {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { nomEntreprise, telephone, typeContrat } = body;
    
    if (!nomEntreprise || !telephone || !typeContrat) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }
    
    // Validate enum values
    if (!Object.values(TypeContratClient).includes(typeContrat)) {
      return NextResponse.json(
        { success: false, error: 'Type de contrat invalide' },
        { status: 400 }
      );
    }
    
    // Create client
    const client = await db.client.create({
      data: {
        nomEntreprise,
        contact: body.contact || null,
        telephone,
        email: body.email || null,
        adresse: body.adresse || null,
        typeContrat,
        dateFinContrat: body.dateFinContrat ? new Date(body.dateFinContrat) : null,
        actif: body.actif ?? true,
      },
      include: {
        _count: {
          select: {
            services: true,
            factures: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: client,
      message: 'Client créé avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du client' },
      { status: 500 }
    );
  }
}
