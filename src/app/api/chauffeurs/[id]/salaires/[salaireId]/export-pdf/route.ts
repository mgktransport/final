import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';

// Month names in French
const MONTHS = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
];

// Clean string for WinAnsi encoding - replace non-ASCII characters
function cleanString(str: string): string {
  return str
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/ë/g, 'e')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .replace(/ù/g, 'u')
    .replace(/û/g, 'u')
    .replace(/ô/g, 'o')
    .replace(/î/g, 'i')
    .replace(/ï/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/É/g, 'E')
    .replace(/È/g, 'E')
    .replace(/Ê/g, 'E')
    .replace(/À/g, 'A')
    .replace(/Â/g, 'A')
    .replace(/Ô/g, 'O')
    .replace(/Î/g, 'I')
    .replace(/Ç/g, 'C')
    .replace(/€/g, 'EUR')
    .replace(/✓/g, '[OK]')
    .replace(/[\u202F\u00A0]/g, ' ') // Non-breaking spaces
    .replace(/[^\x00-\x7F]/g, ''); // Remove any other non-ASCII
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "0.00 DH";
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ') + " DH";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Helper function to draw text
function drawText(
  page: any,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: { red: number; green: number; blue: number } = { red: 0, green: 0, blue: 0 }
) {
  const cleanText = cleanString(text);
  page.drawText(cleanText, {
    x,
    y,
    size,
    font,
    color: rgb(color.red, color.green, color.blue),
  });
}

// Helper function to draw a line
function drawLine(page: any, x1: number, y1: number, x2: number, y2: number) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
}

// Helper function to draw a rectangle
function drawRect(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor?: { red: number; green: number; blue: number },
  borderColor?: { red: number; green: number; blue: number }
) {
  if (fillColor) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(fillColor.red, fillColor.green, fillColor.blue),
    });
  }
  if (borderColor) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: rgb(borderColor.red, borderColor.green, borderColor.blue),
      borderWidth: 0.5,
    });
  }
}

// GET /api/chauffeurs/[id]/salaires/[salaireId]/export-pdf - Export salary sheet as PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; salaireId: string }> }
) {
  try {
    const { id: chauffeurId, salaireId } = await params;

    // Fetch the salary
    const salaire = await db.salaire.findFirst({
      where: {
        id: salaireId,
        chauffeurId,
      },
    });

    if (!salaire) {
      return NextResponse.json(
        { success: false, error: 'Salaire non trouvé' },
        { status: 404 }
      );
    }

    // Fetch chauffeur with all related data
    const chauffeur = await db.chauffeur.findUnique({
      where: { id: chauffeurId },
      select: {
        nom: true,
        prenom: true,
        cin: true,
        telephone: true,
        adresse: true,
        dateEmbauche: true,
        typeContrat: true,
        typeSalaire: true,
        montantSalaire: true,
        ribCompte: true,
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { success: false, error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Fetch primes for the month
    const primes = await db.prime.findMany({
      where: {
        chauffeurId,
        date: {
          gte: new Date(salaire.annee, salaire.mois - 1, 1),
          lt: new Date(salaire.annee, salaire.mois, 1),
        },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch avances for the month
    const avances = await db.avance.findMany({
      where: {
        chauffeurId,
        date: {
          gte: new Date(salaire.annee, salaire.mois - 1, 1),
          lt: new Date(salaire.annee, salaire.mois, 1),
        },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch company info from parametres
    const parametres = await db.parametre.findMany({
      where: {
        cle: {
          in: [
            'ENTREPRISE_NOM',
            'ENTREPRISE_ICE',
            'ENTREPRISE_ADRESSE',
            'ENTREPRISE_TELEPHONE',
            'ENTREPRISE_EMAIL',
            'ENTREPRISE_RC',
            'ENTREPRISE_IF',
            'ENTREPRISE_COMPTE_BANCAIRE',
          ],
        },
      },
    });

    // Build entreprise object from parametres
    const entreprise: Record<string, string> = {};
    for (const param of parametres) {
      const key = param.cle.replace('ENTREPRISE_', '').toLowerCase();
      entreprise[key] = param.valeur;
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    // Embed fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Page dimensions
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // ============== HEADER ==============
    // Company name
    drawText(page, entreprise['nom'] || 'MGK Transport', margin, y, helveticaBold, 16);
    y -= 18;

    // Company info
    if (entreprise['adresse']) {
      drawText(page, entreprise['adresse'], margin, y, helvetica, 9);
      y -= 12;
    }

    const contactParts = [];
    if (entreprise['telephone']) contactParts.push(`Tél: ${entreprise['telephone']}`);
    if (entreprise['email']) contactParts.push(`Email: ${entreprise['email']}`);
    if (contactParts.length > 0) {
      drawText(page, contactParts.join(' | '), margin, y, helvetica, 9);
      y -= 12;
    }

    const legalParts = [];
    if (entreprise['ice']) legalParts.push(`ICE: ${entreprise['ice']}`);
    if (entreprise['rc']) legalParts.push(`RC: ${entreprise['rc']}`);
    if (entreprise['if']) legalParts.push(`IF: ${entreprise['if']}`);
    if (legalParts.length > 0) {
      drawText(page, legalParts.join(' | '), margin, y, helvetica, 9);
      y -= 20;
    }

    // Separator line
    drawLine(page, margin, y, width - margin, y);
    y -= 25;

    // ============== TITLE ==============
    drawText(page, 'FICHE DE SALAIRE', width / 2 - 70, y, helveticaBold, 18);
    y -= 20;
    drawText(page, `Période: ${MONTHS[salaire.mois - 1]} ${salaire.annee}`, width / 2 - 55, y, helvetica, 11);
    y -= 35;

    // ============== CHAUFFEUR INFO ==============
    drawText(page, 'INFORMATIONS DU CHAUFFEUR', margin, y, helveticaBold, 11, { red: 0.2, green: 0.2, blue: 0.4 });
    y -= 20;

    const chauffeurName = `${chauffeur.prenom} ${chauffeur.nom}`;
    const colWidth = 230;

    // Row 1
    drawText(page, 'Nom complet:', margin, y, helveticaBold, 9);
    drawText(page, chauffeurName, margin + 80, y, helvetica, 9);
    drawText(page, 'CIN:', margin + colWidth, y, helveticaBold, 9);
    drawText(page, chauffeur.cin, margin + colWidth + 30, y, helvetica, 9);
    y -= 18;

    // Row 2
    drawText(page, 'Téléphone:', margin, y, helveticaBold, 9);
    drawText(page, chauffeur.telephone, margin + 80, y, helvetica, 9);
    drawText(page, 'Date embauche:', margin + colWidth, y, helveticaBold, 9);
    drawText(page, formatDate(chauffeur.dateEmbauche), margin + colWidth + 75, y, helvetica, 9);
    y -= 18;

    // Row 3
    drawText(page, 'Type contrat:', margin, y, helveticaBold, 9);
    drawText(page, chauffeur.typeContrat, margin + 80, y, helvetica, 9);
    drawText(page, 'Type salaire:', margin + colWidth, y, helveticaBold, 9);
    drawText(page, chauffeur.typeSalaire, margin + colWidth + 70, y, helvetica, 9);
    y -= 18;

    // RIB if available
    if (chauffeur.ribCompte) {
      drawText(page, 'RIB:', margin, y, helveticaBold, 9);
      drawText(page, chauffeur.ribCompte, margin + 80, y, helvetica, 9);
      y -= 18;
    }
    y -= 15;

    // ============== SALARY CALCULATION ==============
    drawText(page, 'CALCUL DU SALAIRE', margin, y, helveticaBold, 11, { red: 0.2, green: 0.2, blue: 0.4 });
    y -= 20;

    // Table dimensions
    const tableWidth = width - 2 * margin;
    const col1Width = 300;
    const cellHeight = 25;

    // Header
    drawRect(page, margin, y - cellHeight, tableWidth, cellHeight, { red: 0.9, green: 0.9, blue: 0.9 });
    drawText(page, 'Description', margin + 8, y - 18, helveticaBold, 10);
    drawText(page, 'Montant', margin + col1Width + 8, y - 18, helveticaBold, 10);
    y -= cellHeight;

    // Base salary
    drawRect(page, margin, y - cellHeight, tableWidth, cellHeight, undefined, { red: 0.8, green: 0.8, blue: 0.8 });
    drawText(page, 'Salaire de base', margin + 8, y - 18, helvetica, 10);
    drawText(page, formatCurrency(salaire.montantBase), margin + col1Width + 8, y - 18, helvetica, 10);
    y -= cellHeight;

    // Primes
    drawRect(page, margin, y - cellHeight, tableWidth, cellHeight, undefined, { red: 0.8, green: 0.8, blue: 0.8 });
    drawText(page, 'Primes', margin + 8, y - 18, helvetica, 10);
    drawText(page, '+' + formatCurrency(salaire.montantPrimes), margin + col1Width + 8, y - 18, helvetica, 10, { red: 0.1, green: 0.5, blue: 0.1 });
    y -= cellHeight;

    // Avances
    drawRect(page, margin, y - cellHeight, tableWidth, cellHeight, undefined, { red: 0.8, green: 0.8, blue: 0.8 });
    drawText(page, 'Avances sur salaire', margin + 8, y - 18, helvetica, 10);
    drawText(page, '-' + formatCurrency(salaire.montantAvances), margin + col1Width + 8, y - 18, helvetica, 10, { red: 0.8, green: 0.1, blue: 0.1 });
    y -= cellHeight;

    // Net to pay
    drawRect(page, margin, y - cellHeight - 5, tableWidth, cellHeight + 5, { red: 0.12, green: 0.3, blue: 0.48 });
    drawText(page, 'NET À PAYER', margin + 8, y - 20, helveticaBold, 12, { red: 1, green: 1, blue: 1 });
    drawText(page, formatCurrency(salaire.montantNet), margin + col1Width + 8, y - 20, helveticaBold, 12, { red: 1, green: 1, blue: 1 });
    y -= cellHeight + 25;

    // ============== PRIMES DETAILS (if any) ==============
    if (primes.length > 0) {
      drawText(page, 'DÉTAIL DES PRIMES', margin, y, helveticaBold, 10, { red: 0.1, green: 0.5, blue: 0.1 });
      y -= 18;

      for (const prime of primes) {
        drawText(page, `${formatDate(prime.date)} - ${prime.motif.substring(0, 40)}: ${formatCurrency(prime.montant)}`, margin + 8, y, helvetica, 9);
        y -= 15;
      }
      y -= 10;
    }

    // ============== AVANCES DETAILS (if any) ==============
    if (avances.length > 0) {
      drawText(page, 'DÉTAIL DES AVANCES', margin, y, helveticaBold, 10, { red: 0.8, green: 0.1, blue: 0.1 });
      y -= 18;

      for (const avance of avances) {
        drawText(page, `${formatDate(avance.date)}: ${formatCurrency(avance.montant)}`, margin + 8, y, helvetica, 9);
        y -= 15;
      }
      y -= 10;
    }

    // ============== PAYMENT STATUS ==============
    y -= 20;
    if (salaire.paye) {
      drawText(page, '✓ PAYÉ', width / 2 - 30, y, helveticaBold, 14, { red: 0.1, green: 0.5, blue: 0.1 });
      if (salaire.datePaiement) {
        y -= 18;
        drawText(page, `Date de paiement: ${formatDate(salaire.datePaiement)}`, width / 2 - 55, y, helvetica, 10, { red: 0.4, green: 0.4, blue: 0.4 });
      }
    } else {
      drawText(page, 'EN ATTENTE DE PAIEMENT', width / 2 - 80, y, helveticaBold, 14, { red: 0.8, green: 0.5, blue: 0 });
    }

    // ============== FOOTER ==============
    drawText(
      page,
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} - MGK Transport`,
      width / 2 - 100,
      40,
      helvetica,
      7,
      { red: 0.5, green: 0.5, blue: 0.5 }
    );

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Generate filename
    const filename = `Fiche_Salaire_${chauffeur.nom}_${chauffeur.prenom}_${MONTHS[salaire.mois - 1]}_${salaire.annee}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération du PDF: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}
