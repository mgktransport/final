// PDF Generation for Facture
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { db } from '@/lib/db';
import { StatutFacture } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as fs from 'fs';
import * as path from 'path';

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Helper to format date
function formatDateFR(date: Date): string {
  return format(date, 'dd MMMM yyyy', { locale: fr });
}

// Get status label
function getStatusLabel(statut: StatutFacture): string {
  const labels: Record<StatutFacture, string> = {
    EN_ATTENTE: 'En attente',
    PAYEE: 'Payée',
    EN_RETARD: 'En retard',
    ANNULEE: 'Annulée',
  };
  return labels[statut];
}

// Get status color
function getStatusColor(statut: StatutFacture): string {
  const colors: Record<StatutFacture, string> = {
    EN_ATTENTE: '#3B82F6',
    PAYEE: '#10B981',
    EN_RETARD: '#EF4444',
    ANNULEE: '#6B7280',
  };
  return colors[statut];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch facture with all related data
    const facture = await db.facture.findUnique({
      where: { id },
      include: {
        client: true,
        paiements: {
          orderBy: { date: 'desc' },
        },
        exploitations: {
          include: {
            service: {
              select: {
                id: true,
                nomService: true,
                tarif: true,
                typeService: true,
                lieuDepart: true,
                lieuArrive: true,
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
            chauffeur: {
              select: {
                id: true,
                nom: true,
                prenom: true,
              },
            },
          },
          orderBy: { dateHeureDepart: 'asc' },
        },
      },
    });

    if (!facture) {
      return NextResponse.json(
        { success: false, error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    // Calculate totals
    const totalPaid = facture.paiements.reduce((sum, p) => sum + p.montant, 0);
    const remainingAmount = facture.montantTTC - totalPaid;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Facture ${facture.numero}`,
        Author: 'MGK Transport',
        Subject: `Facture ${facture.numero} - ${facture.client.nomEntreprise}`,
      },
    });

    // Buffer to store PDF
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Return promise that resolves with PDF buffer
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Colors
    const primaryColor = '#0066cc';
    const accentColor = '#ff6600';
    const textColor = '#1f2937';
    const lightGray = '#f3f4f6';
    const borderColor = '#e5e7eb';

    // Try to load logo
    let logoBuffer: Buffer | null = null;
    const logoPaths = [
      path.join(process.cwd(), 'upload', 'logo MGK.png'),
      path.join(process.cwd(), 'upload', 'logo MGKX (1).png'),
      path.join(process.cwd(), 'upload', 'Sanss titre.png'),
    ];

    for (const logoPath of logoPaths) {
      try {
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    // ============ HEADER ============
    // Company logo and name
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 40, { width: 80 });
      } catch (e) {
        // If image fails, draw placeholder
        doc.rect(50, 40, 80, 60).fill(lightGray);
        doc.fontSize(10).fillColor(textColor).text('MGK', 50, 65, { width: 80, align: 'center' });
      }
    } else {
      // Draw placeholder logo
      doc.rect(50, 40, 80, 60).fill(primaryColor);
      doc.fontSize(18).fillColor('#ffffff').text('MGK', 50, 60, { width: 80, align: 'center' });
      doc.fontSize(10).text('TRANSPORT', 50, 78, { width: 80, align: 'center' });
    }

    // Company info (right side)
    doc.fontSize(20).fillColor(primaryColor).text('MGK TRANSPORT', 150, 45);
    doc.fontSize(9).fillColor(textColor).text('Transport de personnel & Services logistiques', 150, 70);
    doc.fontSize(8).fillColor('#6b7280').text('Tel: +212 XXX XXX XXX | Email: contact@mgktransport.ma', 150, 85);
    doc.text('Adresse: [Adresse de l\'entreprise]', 150, 97);

    // Invoice title and number (right aligned)
    doc.fontSize(28).fillColor(primaryColor).text('FACTURE', 350, 45, { align: 'right' });
    doc.fontSize(12).fillColor(textColor).text(facture.numero, 350, 78, { align: 'right' });

    // Status badge
    const statusColor = getStatusColor(facture.statut);
    const statusWidth = 80;
    const statusX = 545 - statusWidth;
    doc.roundedRect(statusX, 95, statusWidth, 22, 4).fill(statusColor);
    doc.fontSize(9).fillColor('#ffffff').text(getStatusLabel(facture.statut), statusX, 100, {
      width: statusWidth,
      align: 'center',
    });

    // Horizontal line
    doc.moveTo(50, 130).lineTo(545, 130).stroke(borderColor).lineWidth(1);

    // ============ CLIENT & DATES SECTION ============
    const startY = 150;

    // Client box
    doc.roundedRect(50, startY, 230, 90, 5).fillAndStroke(lightGray, borderColor);
    doc.fontSize(9).fillColor('#6b7280').text('FACTURÉ À', 60, startY + 10);
    doc.fontSize(12).fillColor(textColor).text(facture.client.nomEntreprise, 60, startY + 28);
    if (facture.client.telephone) {
      doc.fontSize(9).fillColor('#6b7280').text(`Tél: ${facture.client.telephone}`, 60, startY + 48);
    }
    if (facture.client.email) {
      doc.fontSize(9).fillColor('#6b7280').text(`Email: ${facture.client.email}`, 60, startY + 62);
    }
    if (facture.client.adresse) {
      doc.fontSize(9).fillColor('#6b7280').text(facture.client.adresse, 60, startY + 76, { width: 210 });
    }

    // Dates box
    doc.roundedRect(315, startY, 230, 90, 5).fillAndStroke(lightGray, borderColor);
    doc.fontSize(9).fillColor('#6b7280').text('DÉTAILS DE LA FACTURE', 325, startY + 10);
    
    doc.fontSize(9).fillColor('#6b7280').text('Date d\'émission:', 325, startY + 30);
    doc.fontSize(10).fillColor(textColor).text(formatDateFR(facture.dateEmission), 450, startY + 30);
    
    doc.fontSize(9).fillColor('#6b7280').text('Date d\'échéance:', 325, startY + 48);
    doc.fontSize(10).fillColor(textColor).text(formatDateFR(facture.dateEcheance), 450, startY + 48);

    // ============ SERVICES TABLE ============
    const tableY = 260;

    if (facture.exploitations && facture.exploitations.length > 0) {
      // Table header
      doc.rect(50, tableY, 495, 28).fill(primaryColor);
      doc.fontSize(10).fillColor('#ffffff');
      doc.text('Date', 55, tableY + 9);
      doc.text('Service / Trajet', 130, tableY + 9);
      doc.text('Véhicule', 320, tableY + 9);
      doc.text('Chauffeur', 400, tableY + 9);
      doc.text('Montant', 485, tableY + 9, { align: 'right' });

      // Table rows
      let rowY = tableY + 28;
      let rowIndex = 0;

      for (const exp of facture.exploitations) {
        const rowHeight = 30;
        const bgColor = rowIndex % 2 === 0 ? '#ffffff' : lightGray;
        
        doc.rect(50, rowY, 495, rowHeight).fillAndStroke(bgColor, borderColor);
        
        doc.fontSize(9).fillColor(textColor);
        doc.text(formatDateFR(exp.dateHeureDepart), 55, rowY + 10, { width: 70 });
        
        // Service name and route
        doc.fontSize(9).fillColor(textColor).text(exp.service?.nomService || '-', 130, rowY + 5, { width: 180 });
        if (exp.service?.lieuDepart && exp.service?.lieuArrive) {
          doc.fontSize(7).fillColor('#6b7280').text(`${exp.service.lieuDepart} → ${exp.service.lieuArrive}`, 130, rowY + 18, { width: 180 });
        }
        
        doc.fontSize(9).fillColor(textColor).text(exp.vehicule?.immatriculation || '-', 320, rowY + 10);
        doc.fontSize(9).fillColor(textColor).text(`${exp.chauffeur?.prenom || ''} ${exp.chauffeur?.nom || ''}`, 400, rowY + 10, { width: 70 });
        
        doc.fontSize(10).fillColor(primaryColor).text(formatCurrency(exp.service?.tarif || 0), 485, rowY + 10, { align: 'right' });
        
        rowY += rowHeight;
        rowIndex++;
      }
    }

    // ============ TOTALS SECTION ============
    const totalsY = facture.exploitations && facture.exploitations.length > 0 
      ? 290 + (facture.exploitations.length * 30) + 20 
      : 360;

    // Totals box (right aligned)
    doc.roundedRect(350, totalsY, 195, 110, 5).fillAndStroke(lightGray, borderColor);

    doc.fontSize(10).fillColor('#6b7280').text('Montant HT', 360, totalsY + 12);
    doc.fontSize(10).fillColor(textColor).text(formatCurrency(facture.montantHT), 480, totalsY + 12, { align: 'right' });

    doc.fontSize(10).fillColor('#6b7280').text(`TVA (${facture.tauxTVA}%)`, 360, totalsY + 32);
    doc.fontSize(10).fillColor(textColor).text(formatCurrency(facture.montantTVA), 480, totalsY + 32, { align: 'right' });

    doc.moveTo(360, totalsY + 55).lineTo(535, totalsY + 55).stroke(borderColor);

    doc.fontSize(12).fillColor(textColor).text('Total TTC', 360, totalsY + 65);
    doc.fontSize(14).fillColor(primaryColor).text(formatCurrency(facture.montantTTC), 480, totalsY + 65, { align: 'right' });

    // Payment status
    if (remainingAmount > 0 && facture.statut !== StatutFacture.PAYEE) {
      doc.fontSize(9).fillColor(accentColor).text(`Reste à payer: ${formatCurrency(remainingAmount)}`, 360, totalsY + 90, { align: 'right', width: 175 });
    }

    // ============ PAYMENTS HISTORY ============
    if (facture.paiements && facture.paiements.length > 0) {
      const paymentsY = totalsY + 130;

      doc.fontSize(11).fillColor(primaryColor).text('Historique des paiements', 50, paymentsY);
      
      let payRowY = paymentsY + 20;
      doc.rect(50, payRowY, 495, 24).fill(lightGray);
      doc.fontSize(9).fillColor('#6b7280');
      doc.text('Date', 55, payRowY + 7);
      doc.text('Mode', 150, payRowY + 7);
      doc.text('Référence', 280, payRowY + 7);
      doc.text('Montant', 485, payRowY + 7, { align: 'right' });

      for (const paiement of facture.paiements) {
        payRowY += 24;
        doc.fontSize(9).fillColor(textColor);
        doc.text(formatDateFR(paiement.date), 55, payRowY + 7);
        doc.text(paiement.mode, 150, payRowY + 7);
        doc.text(paiement.reference || '-', 280, payRowY + 7);
        doc.fillColor('#10B981').text(formatCurrency(paiement.montant), 485, payRowY + 7, { align: 'right' });
      }
    }

    // ============ FOOTER ============
    const footerY = 750;
    doc.moveTo(50, footerY).lineTo(545, footerY).stroke(borderColor);
    
    doc.fontSize(8).fillColor('#6b7280').text(
      'Merci pour votre confiance. Pour toute question concernant cette facture, veuillez nous contacter.',
      50, footerY + 15, { width: 495, align: 'center' }
    );
    
    doc.fontSize(7).fillColor('#9ca3af').text(
      'MGK Transport - SIRET: XXX XXX XXX XXXXX - TVA Intracommunautaire: FRXXXXXXXXXX',
      50, footerY + 35, { width: 495, align: 'center' }
    );

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    const pdfBuffer = await pdfPromise;

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Facture_${facture.numero}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
