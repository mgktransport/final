// Alertes API Routes
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TypeAlerte, PrioriteAlerte } from '@prisma/client';
import type { ApiResponse, Alerte } from '@/types';

// GET /api/alertes - Get all alertes with optional filters
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Alerte[]>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lu = searchParams.get('lu');
    const resolute = searchParams.get('resolute');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};
    
    if (lu !== null) where.lu = lu === 'true';
    if (resolute !== null) where.resolute = resolute === 'true';
    if (priority && Object.values(PrioriteAlerte).includes(priority as PrioriteAlerte)) {
      where.priority = priority;
    }
    if (type && Object.values(TypeAlerte).includes(type as TypeAlerte)) {
      where.type = type;
    }

    const alertes = await db.alerte.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: alertes,
    });
  } catch (error) {
    console.error('Error fetching alertes:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des alertes' },
      { status: 500 }
    );
  }
}

// POST /api/alertes - Create new alerte
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<Alerte>>> {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.type || !body.titre || !body.message || !body.priority) {
      return NextResponse.json(
        { success: false, error: 'Type, titre, message et priorité sont requis' },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(TypeAlerte).includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Type d\'alerte invalide' },
        { status: 400 }
      );
    }

    if (!Object.values(PrioriteAlerte).includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: 'Priorité invalide' },
        { status: 400 }
      );
    }

    const alerte = await db.alerte.create({
      data: {
        type: body.type,
        titre: body.titre,
        message: body.message,
        priority: body.priority,
        referenceId: body.referenceId || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: alerte,
      message: 'Alerte créée avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating alerte:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'alerte' },
      { status: 500 }
    );
  }
}
