// Client API Routes - Single client operations
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TypeContratClient } from '@prisma/client';
import type { ApiResponse, Client } from '@/types';

// GET /api/clients/[id] - Get single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Client>>> {
  try {
    const { id } = await params;
    
    const client = await db.client.findUnique({
      where: { id },
      include: {
        services: {
          where: { actif: true },
          orderBy: { nomService: 'asc' },
          include: {
            _count: {
              select: {
                tournées: true,
              },
            },
          },
        },
        factures: {
          orderBy: { dateEmission: 'desc' },
          take: 10,
        },
        paiements: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            services: true,
            factures: true,
          },
        },
      },
    });
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Client>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if client exists
    const existingClient = await db.client.findUnique({
      where: { id },
    });
    
    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }
    
    // Validate typeContrat if provided
    if (body.typeContrat && !Object.values(TypeContratClient).includes(body.typeContrat)) {
      return NextResponse.json(
        { success: false, error: 'Type de contrat invalide' },
        { status: 400 }
      );
    }
    
    // Update client
    const client = await db.client.update({
      where: { id },
      data: {
        nomEntreprise: body.nomEntreprise,
        contact: body.contact,
        telephone: body.telephone,
        email: body.email,
        adresse: body.adresse,
        typeContrat: body.typeContrat,
        dateFinContrat: body.dateFinContrat ? new Date(body.dateFinContrat) : null,
        actif: body.actif,
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
      message: 'Client modifié avec succès',
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification du client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const { id } = await params;
    
    // Check if client exists
    const existingClient = await db.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            services: true,
            factures: true,
          },
        },
      },
    });
    
    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }
    
    // Check if client has related data
    if (existingClient._count.services > 0 || existingClient._count.factures > 0) {
      // Soft delete - just mark as inactive
      await db.client.update({
        where: { id },
        data: { actif: false },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Client désactivé avec succès (des données y sont liées)',
      });
    }
    
    // Hard delete if no related data
    await db.client.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Client supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du client' },
      { status: 500 }
    );
  }
}
