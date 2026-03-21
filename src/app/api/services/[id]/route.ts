// Service API Routes - Single service operations
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, Service } from '@/types';

// Valid service types
const VALID_SERVICE_TYPES = ['TRAJET_JOURNALIER', 'SERVICE_EXCEPTIONNEL'] as const;

// GET /api/services/[id] - Get single service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Service>>> {
  try {
    const { id } = await params;
    
    const service = await db.service.findUnique({
      where: { id },
      include: {
        client: true,
        vehicules: {
          include: {
            vehicule: {
              select: {
                id: true,
                immatriculation: true,
                marque: true,
                modele: true,
                capacite: true,
              },
            },
          },
        },
        tournées: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            chauffeur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
              },
            },
          },
        },
        _count: {
          select: {
            tournées: true,
          },
        },
      },
    });
    
    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Service non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: service,
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du service' },
      { status: 500 }
    );
  }
}

// PUT /api/services/[id] - Update service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Service>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Check if service exists
    const existingService = await db.service.findUnique({
      where: { id },
    });
    
    if (!existingService) {
      return NextResponse.json(
        { success: false, error: 'Service non trouvé' },
        { status: 404 }
      );
    }
    
    // Validate typeService if provided
    if (body.typeService && !VALID_SERVICE_TYPES.includes(body.typeService)) {
      return NextResponse.json(
        { success: false, error: 'Type de service invalide' },
        { status: 400 }
      );
    }
    
    // Update service with vehicles in a transaction
    const service = await db.$transaction(async (tx) => {
      // Update service
      const updated = await tx.service.update({
        where: { id },
        data: {
          clientId: body.clientId,
          typeService: body.typeService,
          nomService: body.nomService,
          description: body.description || null,
          lieuDepart: body.lieuDepart || null,
          lieuArrive: body.lieuArrive || null,
          heureDepart: body.heureDepart || null,
          tarif: body.tarif !== undefined ? parseFloat(body.tarif) : undefined,
          nombreSalariesMin: body.nombreSalariesMin !== undefined ? parseInt(body.nombreSalariesMin) : undefined,
          actif: body.actif,
        },
        include: {
          client: {
            select: {
              id: true,
              nomEntreprise: true,
              telephone: true,
            },
          },
        },
      });
      
      // Update vehicles if provided
      if (body.vehiculeIds) {
        // Delete existing vehicle assignments
        await tx.serviceVehicule.deleteMany({
          where: { serviceId: id },
        });
        
        // Create new vehicle assignments
        await tx.serviceVehicule.createMany({
          data: body.vehiculeIds.map((vid: string) => ({
            serviceId: id,
            vehiculeId: vid,
          })),
        });
      }
      
      return updated;
    });
    
    // Fetch with vehicles for response
    const serviceWithVehicles = await db.service.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            nomEntreprise: true,
            telephone: true,
          },
        },
        vehicules: {
          include: {
            vehicule: {
              select: {
                id: true,
                immatriculation: true,
                marque: true,
                modele: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: serviceWithVehicles,
      message: 'Service modifié avec succès',
    });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification du service' },
      { status: 500 }
    );
  }
}

// DELETE /api/services/[id] - Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const { id } = await params;
    
    // Check if service exists
    const existingService = await db.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tournées: true,
          },
        },
      },
    });
    
    if (!existingService) {
      return NextResponse.json(
        { success: false, error: 'Service non trouvé' },
        { status: 404 }
      );
    }
    
    // Check if service has tours
    if (existingService._count.tournées > 0) {
      // Soft delete - just mark as inactive
      await db.service.update({
        where: { id },
        data: { actif: false },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Service désactivé avec succès (des tournées y sont liées)',
      });
    }
    
    // Hard delete if no related data
    await db.serviceVehicule.deleteMany({
      where: { serviceId: id },
    });
    
    await db.service.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Service supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du service' },
      { status: 500 }
    );
  }
}
