import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ApiResponse, DocumentVehicule } from '@/types';
import { uploadFileToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '@/lib/cloudinary';

// GET /api/vehicules/[id]/documents/[documentId] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
): Promise<NextResponse<ApiResponse<DocumentVehicule>>> {
  try {
    const { id, documentId } = await params;

    const document = await db.documentVehicule.findFirst({
      where: {
        id: documentId,
        vehiculeId: id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error fetching vehicle document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du document' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicules/[id]/documents/[documentId] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
): Promise<NextResponse<ApiResponse<DocumentVehicule>>> {
  try {
    const { id, documentId } = await params;
    const formData = await request.formData();

    const type = formData.get('type') as string | null;
    const numero = formData.get('numero') as string | null;
    const dateEmission = formData.get('dateEmission') as string | null;
    const dateExpiration = formData.get('dateExpiration') as string | null;
    const file = formData.get('file') as File | null;
    const removeFile = formData.get('removeFile') === 'true';

    // Check if document exists
    const existingDoc = await db.documentVehicule.findFirst({
      where: { id: documentId, vehiculeId: id },
      include: {
        vehicule: {
          select: { immatriculation: true },
        },
      },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (type) {
      updateData.type = type;
    }

    if (numero !== null) {
      updateData.numero = numero || null;
    }

    if (dateEmission !== null) {
      updateData.dateEmission = dateEmission ? new Date(dateEmission) : null;
    }

    let newExpirationDate: Date | null = null;
    if (dateExpiration !== null) {
      newExpirationDate = dateExpiration ? new Date(dateExpiration) : null;
      updateData.dateExpiration = newExpirationDate;
    }

    // Handle file removal
    if (removeFile && existingDoc.fichier) {
      try {
        // Delete from Cloudinary if it's a Cloudinary URL
        if (existingDoc.fichier.includes('cloudinary.com')) {
          const publicId = extractPublicIdFromUrl(existingDoc.fichier);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'raw');
          }
        }
      } catch {
        // Ignore error if file doesn't exist
      }
      updateData.fichier = null;
    }

    // Handle new file upload
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

      // Delete old file if exists (from Cloudinary)
      if (existingDoc.fichier && existingDoc.fichier.includes('cloudinary.com')) {
        try {
          const publicId = extractPublicIdFromUrl(existingDoc.fichier);
          if (publicId) {
            await deleteFromCloudinary(publicId, 'raw');
          }
        } catch {
          // Ignore error
        }
      }

      // Upload to Cloudinary
      const uploadResult = await uploadFileToCloudinary(file, `vehicules/${id}/documents`);
      if (uploadResult.success && uploadResult.url) {
        updateData.fichier = uploadResult.url;
      } else {
        console.error('Cloudinary upload failed:', uploadResult.error);
      }
    }

    // Update document
    const document = await db.documentVehicule.update({
      where: { id: documentId },
      data: updateData,
    });

    // Update alerts for the document
    try {
      const effectiveExpirationDate = newExpirationDate || existingDoc.dateExpiration;
      const effectiveType = type || existingDoc.type;

      if (effectiveExpirationDate) {
        const now = new Date();
        const daysUntilExpiration = Math.ceil(
          (effectiveExpirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Delete old alerts for this document
        await db.alerte.deleteMany({
          where: { referenceId: documentId },
        });

        if (daysUntilExpiration <= 30) {
          const priority = daysUntilExpiration < 0 ? 'HAUTE' : daysUntilExpiration <= 7 ? 'HAUTE' : 'MOYENNE';
          
          await db.alerte.create({
            data: {
              type: 'ASSURANCE_VEHICULE_EXPIREE',
              titre: `Document véhicule: ${effectiveType}`,
              message: `${effectiveType} du véhicule ${existingDoc.vehicule.immatriculation} ${daysUntilExpiration < 0 ? 'expiré' : `expire dans ${daysUntilExpiration} jour(s)`}`,
              priority: priority as any,
              referenceId: documentId,
            },
          });
        }
      }
    } catch (alertError) {
      console.error('Error updating vehicle document alert:', alertError);
      // Don't fail the document update if alert handling fails
    }

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document mis à jour avec succès',
    });
  } catch (error) {
    console.error('Error updating vehicle document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du document' },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicules/[id]/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id, documentId } = await params;

    // Check if document exists and belongs to this vehicle
    const document = await db.documentVehicule.findFirst({
      where: {
        id: documentId,
        vehiculeId: id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Delete file from Cloudinary if exists
    if (document.fichier && document.fichier.includes('cloudinary.com')) {
      try {
        const publicId = extractPublicIdFromUrl(document.fichier);
        if (publicId) {
          await deleteFromCloudinary(publicId, 'raw');
        }
      } catch {
        // Ignore error if file doesn't exist
      }
    }

    // Delete associated alerts
    try {
      await db.alerte.deleteMany({
        where: { referenceId: documentId },
      });
    } catch {
      // Ignore error if no alerts exist
    }

    // Delete document from database
    await db.documentVehicule.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès',
    });
  } catch (error) {
    console.error('Error deleting vehicle document:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    );
  }
}
