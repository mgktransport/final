import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, DocumentVehicule } from '@/types';
import { createDocumentAlert, resolveDocumentAlert } from '@/lib/alerts';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

// GET /api/vehicules/[id]/documents - List documents for vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<DocumentVehicule[]>>> {
  try {
    const { id } = await params;

    // Check if vehicle exists
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      select: { id: true, immatriculation: true },
    });

    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      );
    }

    const documents = await db.documentVehicule.findMany({
      where: { vehiculeId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Add status information for each document
    const documentsWithStatus = documents.map(doc => {
      const now = new Date();
      let status = 'valid';
      let daysRemaining: number | null = null;

      if (doc.dateExpiration) {
        const expiration = new Date(doc.dateExpiration);
        daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 7) {
          status = 'critical';
        } else if (daysRemaining <= 30) {
          status = 'warning';
        }
      }

      return {
        ...doc,
        status,
        daysRemaining,
      };
    });

    return NextResponse.json({
      success: true,
      data: documentsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching vehicle documents:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

// POST /api/vehicules/[id]/documents - Add document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<DocumentVehicule>>> {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const type = formData.get('type') as string;
    const numero = formData.get('numero') as string | null;
    const dateEmission = formData.get('dateEmission') as string | null;
    const dateExpiration = formData.get('dateExpiration') as string | null;
    const file = formData.get('file') as File | null;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Le type de document est obligatoire' },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const vehicule = await db.vehicule.findUnique({
      where: { id },
      select: { id: true, actif: true, immatriculation: true },
    });

    if (!vehicule) {
      return NextResponse.json(
        { success: false, error: 'Véhicule non trouvé' },
        { status: 404 }
      );
    }

    // Check if document of this type already exists for this vehicle
    const existingDocument = await db.documentVehicule.findFirst({
      where: {
        vehiculeId: id,
        type: type as any,
      },
    });

    if (existingDocument) {
      return NextResponse.json(
        { success: false, error: `Un document de type "${type}" existe déjà pour ce véhicule. Vous pouvez le modifier ou le supprimer.` },
        { status: 400 }
      );
    }

    // Handle file upload using Cloudinary
    let filePath: string | null = null;
    if (file && file.size > 0) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'Le fichier ne doit pas dépasser 5MB' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: 'Type de fichier non autorisé (PDF, JPG, PNG uniquement)' },
          { status: 400 }
        );
      }

      // Upload to Cloudinary
      const uploadResult = await uploadFileToCloudinary(file, `vehicules/${id}/documents`);
      if (uploadResult.success && uploadResult.url) {
        filePath = uploadResult.url;
      } else {
        console.error('Cloudinary upload failed:', uploadResult.error);
        // Continue without file path if upload fails
      }
    }

    // Create document - type is enum in Prisma schema
    const document = await db.documentVehicule.create({
      data: {
        vehiculeId: id,
        type: type as any, // Type is enum TypeDocumentVehicule
        numero: numero || null,
        dateEmission: dateEmission ? new Date(dateEmission) : null,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        fichier: filePath,
      },
    });

    // Create alert if document is expiring soon or already expired
    if (dateExpiration) {
      try {
        const expirationDate = new Date(dateExpiration);
        const now = new Date();
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiration <= 30) {
          const priority = daysUntilExpiration < 0 ? 'HAUTE' : daysUntilExpiration <= 7 ? 'HAUTE' : 'MOYENNE';
          
          await db.alerte.create({
            data: {
              type: 'ASSURANCE_VEHICULE_EXPIREE',
              titre: `Document véhicule: ${type}`,
              message: `${type} du véhicule ${vehicule.immatriculation} ${daysUntilExpiration < 0 ? 'expiré' : `expire dans ${daysUntilExpiration} jour(s)`}`,
              priority: priority as any,
              referenceId: document.id,
            },
          });
        }
      } catch (alertError) {
        console.error('Error creating document alert:', alertError);
        // Don't fail the document creation if alert creation fails
      }
    }

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document ajouté avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du document' },
      { status: 500 }
    );
  }
}
