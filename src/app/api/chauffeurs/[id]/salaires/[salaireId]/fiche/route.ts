import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Mapping des clés de la base de données vers les clés du PDF
const dbKeyToPdfKey: Record<string, string> = {
  'ENTREPRISE_NOM': 'nomEntreprise',
  'ENTREPRISE_ADRESSE': 'adresse',
  'ENTREPRISE_TELEPHONE': 'telephone',
  'ENTREPRISE_EMAIL': 'email',
  'ENTREPRISE_ICE': 'ice',
  'ENTREPRISE_RC': 'rc',
  'ENTREPRISE_CNSS': 'cnss',
  'ENTREPRISE_VILLE': 'ville',
  'ENTREPRISE_LOGO': 'logo',
};

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0) + ' MAD';
}

// Generate Bulletin de Paie PDF directly
function generateBulletinPaiePDF(data: {
  chauffeur: any;
  salaire: any;
  company: Record<string, string>;
}): Buffer {
  const { chauffeur, salaire, company } = data;
  const doc = new jsPDF();
  const nomEntreprise = company.nomEntreprise || 'MGK TRANSPORT';
  
  const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const formatDateLocal = (dateStr: string | Date): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 102, 204);
  doc.text(nomEntreprise.toUpperCase(), 20, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  if (company.adresse) doc.text(company.adresse, 20, 28);
  
  const contactParts: string[] = [];
  if (company.telephone) contactParts.push(`Tél: ${company.telephone}`);
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (contactParts.length > 0) doc.text(contactParts.join(' | '), 20, 36);
  
  const registreParts: string[] = [];
  if (company.ice) registreParts.push(`ICE: ${company.ice}`);
  if (company.rc) registreParts.push(`RC: ${company.rc}`);
  if (registreParts.length > 0) doc.text(registreParts.join(' | '), 20, 44);

  // Title on right
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('FICHE DE SALAIRE', 190, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  doc.text(`Réf: ${(salaire.id || '').toString().slice(-8).toUpperCase()}`, 190, 28, { align: 'right' });
  
  // Period badge
  doc.setFillColor(0, 102, 204);
  doc.rect(140, 35, 50, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${MONTHS[(salaire.mois || 1) - 1]} ${salaire.annee || new Date().getFullYear()}`, 165, 43, { align: 'center' });

  // Separator
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(20, 55, 190, 55);

  // Two columns - Employee and Payment info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations du salarié', 20, 65);
  doc.text('Détails du paiement', 110, 65);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  
  let y = 75;
  doc.text(`Nom complet :`, 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`${chauffeur.nom || ''} ${chauffeur.prenom || ''}`, 60, y);
  
  doc.setTextColor(102, 102, 102);
  doc.text(`Date de paiement :`, 110, y);
  doc.setTextColor(0, 0, 0);
  doc.text(salaire.datePaiement ? formatDateLocal(salaire.datePaiement) : '-', 150, y);
  
  y += 8;
  doc.setTextColor(102, 102, 102);
  doc.text(`CIN :`, 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.cin || '-', 60, y);
  
  doc.setTextColor(102, 102, 102);
  doc.text(`Type de salaire :`, 110, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.typeSalaire === 'FIXE' ? 'Fixe' : chauffeur.typeSalaire === 'HORAIRE' ? 'Horaire' : 'Par tournée', 150, y);
  
  y += 8;
  doc.setTextColor(102, 102, 102);
  doc.text(`Téléphone :`, 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.telephone || '-', 60, y);
  
  doc.setTextColor(102, 102, 102);
  doc.text(`Statut :`, 110, y);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYÉ', 150, y);
  
  y += 8;
  doc.setTextColor(102, 102, 102);
  doc.text(`RIB bancaire :`, 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.ribCompte || 'Non renseigné', 60, y);

  // Salary table
  y += 15;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Détail de la rémunération', 20, y);

  y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Montant']],
    body: [
      ['Salaire de base', formatCurrency(salaire.montantBase)],
      [{ content: '+ Primes', styles: { textColor: [22, 163, 74] } }, { content: formatCurrency(salaire.montantPrimes), styles: { textColor: [22, 163, 74] } }],
      ['- Avances sur salaire', formatCurrency(salaire.montantAvances)],
    ],
    foot: [
      [{ content: 'NET À PAYER', styles: { fillColor: [240, 247, 255], textColor: [0, 102, 204], fontStyle: 'bold' } }, 
       { content: formatCurrency(salaire.montantNet), styles: { fillColor: [240, 247, 255], textColor: [0, 102, 204], fontStyle: 'bold', fontSize: 14 } }]
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("Signature de l'employeur", 50, finalY, { align: 'center' });
  doc.text("Signature du salarié", 160, finalY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text('(Cachet et signature)', 50, finalY + 40, { align: 'center' });
  doc.text('(Lu et approuvé)', 160, finalY + 40, { align: 'center' });
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, finalY + 35, 85, finalY + 35);
  doc.line(115, finalY + 35, 185, finalY + 35);

  return Buffer.from(doc.output('arraybuffer'));
}

// GET /api/chauffeurs/[id]/salaires/[salaireId]/fiche - Generate salary slip PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; salaireId: string }> }
) {
  try {
    const { id: chauffeurId, salaireId } = await params;

    // Get salary with chauffeur info
    const salaire = await db.salaire.findFirst({
      where: {
        id: salaireId,
        chauffeurId,
      },
      include: {
        chauffeur: {
          select: {
            nom: true,
            prenom: true,
            cin: true,
            telephone: true,
            typeContrat: true,
            typeSalaire: true,
            montantSalaire: true,
            ribCompte: true,
          },
        },
      },
    });

    if (!salaire) {
      return NextResponse.json(
        { success: false, error: 'Salaire non trouvé' },
        { status: 404 }
      );
    }

    if (!salaire.paye) {
      return NextResponse.json(
        { success: false, error: 'Ce salaire n\'est pas encore payé' },
        { status: 400 }
      );
    }

    // Get company parameters
    const parametres = await db.parametre.findMany();

    // Build company object
    const company: Record<string, string> = {};
    for (const param of parametres) {
      const pdfKey = dbKeyToPdfKey[param.cle];
      if (pdfKey) {
        company[pdfKey] = param.valeur;
      }
    }

    // Prepare data for PDF
    const pdfData = {
      chauffeur: {
        nom: salaire.chauffeur.nom,
        prenom: salaire.chauffeur.prenom,
        cin: salaire.chauffeur.cin,
        telephone: salaire.chauffeur.telephone,
        typeContrat: salaire.chauffeur.typeContrat,
        typeSalaire: salaire.chauffeur.typeSalaire,
        montantSalaire: salaire.chauffeur.montantSalaire,
        ribCompte: salaire.chauffeur.ribCompte,
      },
      salaire: {
        id: salaire.id,
        mois: salaire.mois,
        annee: salaire.annee,
        montantBase: salaire.montantBase,
        montantPrimes: salaire.montantPrimes,
        montantAvances: salaire.montantAvances,
        montantNet: salaire.montantNet,
        datePaiement: salaire.datePaiement,
        heuresTravaillees: salaire.heuresTravaillees,
        joursTravailles: salaire.joursTravailles,
      },
      company,
    };

    // Generate PDF directly
    const pdfBuffer = generateBulletinPaiePDF(pdfData);
    
    console.log('[Fiche Salaire] PDF generated, size:', pdfBuffer.byteLength);

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Bulletin_Paie_${salaire.chauffeur.nom}_${salaire.chauffeur.prenom}_${salaire.mois}_${salaire.annee}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[Fiche Salaire] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la génération de la fiche de salaire: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}
