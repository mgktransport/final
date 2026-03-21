import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PORT = 3005;

// Types
interface Chauffeur {
  nom: string;
  prenom: string;
  cin: string;
  numeroCNSS?: string;
  dateEmbauche: string;
  dateFinContrat?: string;
  typeContrat?: string;
  actif: boolean;
}

interface Company {
  nomEntreprise?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  ice?: string;
  rc?: string;
  cnss?: string;
  ville?: string;
  logo?: string;
}

// Helper functions
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTypeContratLabel(type: string | undefined): string {
  const labels: Record<string, string> = {
    'CDI': 'Contrat à Durée Indéterminée (CDI)',
    'CDD': 'Contrat à Durée Déterminée (CDD)',
    'ANAEM': 'Contrat ANAEM',
    'TEMPORAIRE': 'Contrat Temporaire',
    'JOURNALIER': 'Journalier',
  };
  return type ? (labels[type] || type) : 'Non spécifié';
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0) + ' MAD';
}

// Generate Attestation de Travail PDF
function generateAttestationPDF(chauffeur: Chauffeur, company: Company): Buffer {
  const doc = new jsPDF();
  const nomEntreprise = company.nomEntreprise || 'MGK TRANSPORT';
  const ville = company.ville || 'Casablanca';
  const today = new Date();
  const dateStr = `Fait à ${ville}, le ${today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  
  const nomComplet = `${chauffeur.prenom} ${chauffeur.nom}`;
  const cnss = chauffeur.numeroCNSS ? `, immatriculé(e) à la CNSS sous le N° ${chauffeur.numeroCNSS}` : '';
  const dateEmbauche = formatDate(chauffeur.dateEmbauche);
  const dateFin = chauffeur.dateFinContrat ? formatDate(chauffeur.dateFinContrat) : null;
  const aQuitte = dateFin && dateFin !== 'N/A';

  let mainText: string;
  if (aQuitte || !chauffeur.actif) {
    mainText = `Nous soussignés, ${nomEntreprise}, certifions par la présente que ${nomComplet}, titulaire de la CIN N° ${chauffeur.cin}${cnss}, a travaillé au sein de notre entreprise en qualité de CHAUFFEUR du ${dateEmbauche} au ${dateFin}.`;
  } else {
    mainText = `Nous soussignés, ${nomEntreprise}, certifions par la présente que ${nomComplet}, titulaire de la CIN N° ${chauffeur.cin}${cnss}, travaille au sein de notre entreprise en qualité de CHAUFFEUR depuis le ${dateEmbauche}.`;
  }

  // Header
  doc.setFontSize(18);
  doc.setTextColor(26, 54, 93);
  doc.text(nomEntreprise.toUpperCase(), 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(74, 85, 104);
  if (company.adresse) {
    doc.text(company.adresse, 105, 28, { align: 'center' });
  }
  
  const contactParts: string[] = [];
  if (company.telephone) contactParts.push(`Tél: ${company.telephone}`);
  if (company.email) contactParts.push(`Email: ${company.email}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' | '), 105, 36, { align: 'center' });
  }
  
  const registreParts: string[] = [];
  if (company.ice) registreParts.push(`ICE: ${company.ice}`);
  if (company.rc) registreParts.push(`RC: ${company.rc}`);
  if (registreParts.length > 0) {
    doc.text(registreParts.join(' | '), 105, 44, { align: 'center' });
  }

  // Separator
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(26, 54, 93);
  doc.text('ATTESTATION DE TRAVAIL', 105, 65, { align: 'center' });
  
  // Date
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(dateStr, 190, 80, { align: 'right' });

  // Body
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(mainText, 170);
  doc.text(splitText, 20, 95, { align: 'justify' });

  // Info section
  let yPos = 95 + (splitText.length * 7) + 15;
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Informations complémentaires :', 20, yPos, { underline: true });
  
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Poste occupé :', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Chauffeur', 70, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Type de contrat :', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(getTypeContratLabel(chauffeur.typeContrat), 70, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text("Date d'embauche :", 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(dateEmbauche, 70, yPos);

  if (dateFin && dateFin !== 'N/A') {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Date de départ :', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(dateFin, 70, yPos);
  }

  yPos += 15;
  doc.setFontSize(11);
  doc.text("Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.", 20, yPos, { align: 'justify', maxWidth: 170 });

  // Signatures
  yPos += 30;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("Signature de l'employeur", 50, yPos, { align: 'center' });
  doc.text("Signature de l'employé", 160, yPos, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('(Cachet et signature)', 50, yPos + 45, { align: 'center' });
  doc.text('(Lu et approuvé)', 160, yPos + 45, { align: 'center' });
  
  // Signature lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, yPos + 40, 85, yPos + 40);
  doc.line(115, yPos + 40, 185, yPos + 40);

  return Buffer.from(doc.output('arraybuffer'));
}

// Generate Bulletin de Paie PDF
function generateBulletinPaiePDF(data: {
  chauffeur: any;
  salaire: any;
  company: Company;
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

// Generate detailed Bulletin de Paie PDF (from BulletinPaie table)
function generateBulletinPaieDetailPDF(data: {
  bulletin: any;
  chauffeur: any;
  company: Company;
}): Buffer {
  const { bulletin, chauffeur, company } = data;
  const doc = new jsPDF();
  const nomEntreprise = company.nomEntreprise || 'MGK TRANSPORT';
  
  const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

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
  doc.text('BULLETIN DE PAIE', 190, 20, { align: 'right' });
  
  // Period badge
  doc.setFillColor(0, 102, 204);
  doc.rect(140, 28, 50, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${MONTHS[bulletin.mois - 1]} ${bulletin.annee}`, 165, 36, { align: 'center' });

  // Separator
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(20, 48, 190, 48);

  // Employee info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations du salarié', 20, 58);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  let y = 68;
  doc.setTextColor(102, 102, 102);
  doc.text('Nom complet :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`${chauffeur.prenom || ''} ${chauffeur.nom || ''}`, 60, y);
  
  y += 7;
  doc.setTextColor(102, 102, 102);
  doc.text('CIN :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.cin || '-', 60, y);
  
  y += 7;
  doc.setTextColor(102, 102, 102);
  doc.text('N° CNSS :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.numeroCNSS || '-', 60, y);
  
  y += 7;
  doc.setTextColor(102, 102, 102);
  doc.text('Téléphone :', 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(chauffeur.telephone || '-', 60, y);

  // Gains table
  y += 12;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Gains', 20, y);

  y += 5;
  const gainsBody: any[][] = [];
  
  if (bulletin.salaireBase > 0) gainsBody.push(['Salaire de base', formatCurrency(bulletin.salaireBase)]);
  if (bulletin.heuresSupplementaires > 0) gainsBody.push(['Heures supplémentaires', formatCurrency(bulletin.heuresSupplementaires)]);
  if (bulletin.primeTrajet > 0) gainsBody.push(['Prime de trajet', formatCurrency(bulletin.primeTrajet)]);
  if (bulletin.primeRendement > 0) gainsBody.push(['Prime de rendement', formatCurrency(bulletin.primeRendement)]);
  if (bulletin.indemniteDeplacement > 0) gainsBody.push(['Indemnité de déplacement', formatCurrency(bulletin.indemniteDeplacement)]);
  if (bulletin.indemnitePanier > 0) gainsBody.push(['Indemnité panier', formatCurrency(bulletin.indemnitePanier)]);
  if (bulletin.autresPrimes > 0) gainsBody.push(['Autres primes', formatCurrency(bulletin.autresPrimes)]);
  
  gainsBody.push([
    { content: 'Salaire Brut', styles: { fillColor: [240, 247, 255], textColor: [0, 102, 204], fontStyle: 'bold' } },
    { content: formatCurrency(bulletin.salaireBrut), styles: { fillColor: [240, 247, 255], textColor: [0, 102, 204], fontStyle: 'bold' } }
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Montant (DH)']],
    body: gainsBody,
    theme: 'grid',
    headStyles: { fillColor: [232, 244, 248], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Retenues table
  let currentY = (doc as any).lastAutoTable.finalY + 12;
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Retenues', 20, currentY);

  currentY += 5;
  const retenuesBody: any[][] = [];
  
  if (bulletin.cnss > 0) retenuesBody.push(['CNSS', formatCurrency(bulletin.cnss)]);
  if (bulletin.amo > 0) retenuesBody.push(['AMO', formatCurrency(bulletin.amo)]);
  if (bulletin.ir > 0) retenuesBody.push(['IR', formatCurrency(bulletin.ir)]);
  if (bulletin.avanceSalaire > 0) retenuesBody.push(['Avance sur salaire', formatCurrency(bulletin.avanceSalaire)]);
  if (bulletin.autresRetenues > 0) retenuesBody.push(['Autres retenues', formatCurrency(bulletin.autresRetenues)]);
  
  retenuesBody.push([
    { content: 'Total Retenues', styles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' } },
    { content: formatCurrency(bulletin.totalRetenues), styles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' } }
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Montant (DH)']],
    body: retenuesBody,
    theme: 'grid',
    headStyles: { fillColor: [254, 242, 242], textColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // Net à payer
  currentY = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFillColor(0, 102, 204);
  doc.rect(20, currentY, 170, 18, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET À PAYER', 25, currentY + 12);
  doc.setFontSize(16);
  doc.text(formatCurrency(bulletin.salaireNet), 185, currentY + 12, { align: 'right' });

  // Signatures
  currentY += 35;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("Signature de l'employeur", 50, currentY, { align: 'center' });
  doc.text("Signature du salarié", 160, currentY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text('(Cachet et signature)', 50, currentY + 40, { align: 'center' });
  doc.text('(Lu et approuvé)', 160, currentY + 40, { align: 'center' });
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(15, currentY + 35, 85, currentY + 35);
  doc.line(115, currentY + 35, 185, currentY + 35);

  return Buffer.from(doc.output('arraybuffer'));
}

// Server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // Attestation endpoint
    if (url.pathname === '/attestation' && req.method === 'POST') {
      try {
        const { chauffeur, company } = await req.json();
        
        console.log('[PDF Service] Generating attestation for:', chauffeur?.nom, chauffeur?.prenom);
        
        const pdfBuffer = generateAttestationPDF(chauffeur, company);
        
        console.log('[PDF Service] PDF generated, size:', pdfBuffer.length);
        
        return new Response(pdfBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Attestation_Travail_${chauffeur.nom}_${chauffeur.prenom}.pdf"`,
          },
        });
      } catch (error) {
        console.error('[PDF Service] Error:', error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Bulletin de paie endpoint
    if (url.pathname === '/bulletin-paie' && req.method === 'POST') {
      try {
        const data = await req.json();
        
        console.log('[PDF Service] Generating bulletin de paie for:', data?.chauffeur?.nom, data?.chauffeur?.prenom);
        
        const pdfBuffer = generateBulletinPaiePDF(data);
        
        console.log('[PDF Service] PDF generated, size:', pdfBuffer.length);
        
        return new Response(pdfBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Bulletin_Paie_${data.chauffeur.nom}_${data.chauffeur.prenom}_${data.salaire.mois}_${data.salaire.annee}.pdf"`,
          },
        });
      } catch (error) {
        console.error('[PDF Service] Error:', error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Bulletin de paie détaillé endpoint (from BulletinPaie table)
    if (url.pathname === '/bulletin-paie-detail' && req.method === 'POST') {
      try {
        const data = await req.json();
        
        console.log('[PDF Service] Generating detailed bulletin de paie for:', data?.chauffeur?.nom, data?.chauffeur?.prenom);
        
        const pdfBuffer = generateBulletinPaieDetailPDF(data);
        
        console.log('[PDF Service] PDF generated, size:', pdfBuffer.length);
        
        const MONTHS = [
          "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
          "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
        ];
        
        return new Response(pdfBuffer, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Bulletin_Paie_${data.chauffeur.nom}_${data.chauffeur.prenom}_${MONTHS[data.bulletin.mois - 1]}_${data.bulletin.annee}.pdf"`,
          },
        });
      } catch (error) {
        console.error('[PDF Service] Error:', error);
        return Response.json(
          { success: false, error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  },
});

console.log(`[PDF Service] Running on port ${PORT} (Using jsPDF)`);
