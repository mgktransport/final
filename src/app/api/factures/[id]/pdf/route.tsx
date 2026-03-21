// PDF Generation for Facture using @react-pdf/renderer
import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import { StatutFacture } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

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

// Group exploitations by service
function groupExploitationsByService(exploitations: any[]): Map<string, {
  service: any;
  exploitations: any[];
  count: number;
  totalAmount: number;
}> {
  const grouped = new Map<string, {
    service: any;
    exploitations: any[];
    count: number;
    totalAmount: number;
  }>();

  exploitations.forEach(exp => {
    const serviceId = exp.service?.id || 'unknown';
    const existing = grouped.get(serviceId);
    
    if (existing) {
      existing.exploitations.push(exp);
      existing.count++;
      existing.totalAmount += exp.service?.tarif || 0;
    } else {
      grouped.set(serviceId, {
        service: exp.service,
        exploitations: [exp],
        count: 1,
        totalAmount: exp.service?.tarif || 0,
      });
    }
  });

  return grouped;
}

// Enterprise info interface
interface EntrepriseInfo {
  nom: string;
  logo: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  ice: string | null;
  rc: string | null;
  ifFiscal: string | null;
  rib: string | null;
}

// Fetch entreprise info from Parametre table
async function getEntrepriseInfo(): Promise<EntrepriseInfo> {
  const keys = [
    'ENTREPRISE_NOM',
    'ENTREPRISE_LOGO',
    'ENTREPRISE_ADRESSE',
    'ENTREPRISE_VILLE',
    'ENTREPRISE_TELEPHONE',
    'ENTREPRISE_EMAIL',
    'ENTREPRISE_SITE_WEB',
    'ENTREPRISE_ICE',
    'ENTREPRISE_RC',
    'ENTREPRISE_IF',
    'ENTREPRISE_COMPTE_BANCAIRE',
  ];

  const parametres = await db.parametre.findMany({
    where: {
      cle: { in: keys },
    },
  });

  const getValue = (cle: string): string | null => {
    const param = parametres.find(p => p.cle === cle);
    return param?.valeur || null;
  };

  return {
    nom: getValue('ENTREPRISE_NOM') || 'MGK TRANSPORT',
    logo: getValue('ENTREPRISE_LOGO'),
    adresse: getValue('ENTREPRISE_ADRESSE'),
    ville: getValue('ENTREPRISE_VILLE'),
    telephone: getValue('ENTREPRISE_TELEPHONE'),
    email: getValue('ENTREPRISE_EMAIL'),
    siteWeb: getValue('ENTREPRISE_SITE_WEB'),
    ice: getValue('ENTREPRISE_ICE'),
    rc: getValue('ENTREPRISE_RC'),
    ifFiscal: getValue('ENTREPRISE_IF'),
    rib: getValue('ENTREPRISE_COMPTE_BANCAIRE'),
  };
}

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  logoSection: {
    width: '55%',
  },
  logoImage: {
    width: 120,
    height: 50,
    objectFit: 'contain',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  logoSubtext: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  companyInfo: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 6,
  },
  invoiceTitle: {
    width: '40%',
    alignItems: 'flex-end',
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#1f2937',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  clientBox: {
    width: '48%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  boxTitle: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  datesBox: {
    width: '48%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  dateValue: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: '500',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 9,
    color: '#1f2937',
  },
  tableCellSmall: {
    fontSize: 7,
    color: '#6b7280',
  },
  tableCellAmount: {
    fontSize: 10,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  countBadge: {
    fontSize: 9,
    color: '#ffffff',
    backgroundColor: '#0066cc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  colService: { width: '35%' },
  colRoute: { width: '25%' },
  colCount: { width: '10%', textAlign: 'center' },
  colUnitPrice: { width: '15%', textAlign: 'right' },
  colAmount: { width: '15%', textAlign: 'right' },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsBox: {
    width: '45%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: '500',
  },
  totalMain: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  paymentsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  footerMain: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footerInfo: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  footerLegal: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  footerRIB: {
    fontSize: 8,
    color: '#0066cc',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: 'bold',
  },
  noServices: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    alignItems: 'center',
  },
  noServicesText: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  summaryBox: {
    backgroundColor: '#e8f4fc',
    padding: 8,
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 9,
    color: '#0066cc',
    textAlign: 'center',
  },
});

// PDF Document Component
const FacturePDF = ({ facture, groupedServices, totalServices, entreprise }: { 
  facture: any; 
  groupedServices: Map<string, {
    service: any;
    exploitations: any[];
    count: number;
    totalAmount: number;
  }>;
  totalServices: number;
  entreprise: EntrepriseInfo;
}) => {
  const statusColor = getStatusColor(facture.statut);
  const groupedArray = Array.from(groupedServices.values());
  
  // Build address string
  const fullAddress = [entreprise.adresse, entreprise.ville].filter(Boolean).join(', ');
  
  // Build footer legal info
  const legalInfo = [
    entreprise.ice ? `ICE: ${entreprise.ice}` : null,
    entreprise.rc ? `RC: ${entreprise.rc}` : null,
    entreprise.ifFiscal ? `IF: ${entreprise.ifFiscal}` : null,
  ].filter(Boolean).join(' | ');
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            {entreprise.logo ? (
              <Image style={styles.logoImage} src={entreprise.logo} />
            ) : (
              <>
                <Text style={styles.logoText}>{entreprise.nom}</Text>
                <Text style={styles.logoSubtext}>Transport de personnel</Text>
              </>
            )}
            {entreprise.telephone && (
              <Text style={styles.companyInfo}>Tél: {entreprise.telephone}</Text>
            )}
            {entreprise.email && (
              <Text style={styles.companyInfo}>Email: {entreprise.email}</Text>
            )}
            {fullAddress && (
              <Text style={styles.companyInfo}>{fullAddress}</Text>
            )}
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.titleText}>FACTURE</Text>
            <Text style={styles.invoiceNumber}>{facture.numero}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{getStatusLabel(facture.statut)}</Text>
            </View>
          </View>
        </View>

        {/* Client & Dates */}
        <View style={styles.infoSection}>
          <View style={styles.clientBox}>
            <Text style={styles.boxTitle}>FACTURÉ À</Text>
            <Text style={styles.clientName}>{facture.client.nomEntreprise}</Text>
            {facture.client.telephone && (
              <Text style={styles.clientDetail}>Tél: {facture.client.telephone}</Text>
            )}
            {facture.client.email && (
              <Text style={styles.clientDetail}>Email: {facture.client.email}</Text>
            )}
            {facture.client.adresse && (
              <Text style={styles.clientDetail}>{facture.client.adresse}</Text>
            )}
          </View>
          <View style={styles.datesBox}>
            <Text style={styles.boxTitle}>DÉTAILS DE LA FACTURE</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Date d'émission:</Text>
              <Text style={styles.dateValue}>{formatDateFR(facture.dateEmission)}</Text>
            </View>
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Date d'échéance:</Text>
              <Text style={styles.dateValue}>{formatDateFR(facture.dateEcheance)}</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            Total: {totalServices} service{totalServices > 1 ? 's' : ''} effectué{totalServices > 1 ? 's' : ''} • {groupedArray.length} type{groupedArray.length > 1 ? 's' : ''} de service
          </Text>
        </View>

        {/* Services Table - Grouped */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colService]}>Service</Text>
            <Text style={[styles.tableHeaderText, styles.colRoute]}>Trajet</Text>
            <Text style={[styles.tableHeaderText, styles.colCount]}>Nb. fois</Text>
            <Text style={[styles.tableHeaderText, styles.colUnitPrice]}>Prix unit.</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Total</Text>
          </View>
          
          {groupedArray.length > 0 ? (
            groupedArray.map((group, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <View style={styles.colService}>
                  <Text style={styles.tableCell}>{group.service?.nomService || 'Service non défini'}</Text>
                </View>
                <Text style={[styles.tableCell, styles.colRoute]}>
                  {group.service?.lieuDepart && group.service?.lieuArrive 
                    ? `${group.service.lieuDepart} → ${group.service.lieuArrive}`
                    : '-'}
                </Text>
                <Text style={[styles.countBadge, styles.colCount]}>{group.count}</Text>
                <Text style={[styles.tableCell, styles.colUnitPrice]}>
                  {formatCurrency(group.service?.tarif || 0)}
                </Text>
                <Text style={[styles.tableCellAmount, styles.colAmount]}>
                  {formatCurrency(group.totalAmount)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.noServices}>
              <Text style={styles.noServicesText}>Aucun service associé à cette facture</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Montant HT</Text>
              <Text style={styles.totalValue}>{formatCurrency(facture.montantHT)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA ({facture.tauxTVA}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(facture.montantTVA)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalMain}>Total TTC</Text>
              <Text style={styles.totalAmount}>{formatCurrency(facture.montantTTC)}</Text>
            </View>
          </View>
        </View>

        {/* Payments History */}
        {facture.paiements && facture.paiements.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={styles.sectionTitle}>Historique des paiements</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: '20%' }]}>Date</Text>
                <Text style={[styles.tableHeaderText, { width: '20%' }]}>Mode</Text>
                <Text style={[styles.tableHeaderText, { width: '35%' }]}>Référence</Text>
                <Text style={[styles.tableHeaderText, { width: '25%', textAlign: 'right' }]}>Montant</Text>
              </View>
              {facture.paiements.map((paiement: any, index: number) => (
                <View key={paiement.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{formatDateFR(paiement.date)}</Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{paiement.mode}</Text>
                  <Text style={[styles.tableCell, { width: '35%' }]}>{paiement.reference || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'right', color: '#10B981' }]}>
                    {formatCurrency(paiement.montant)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerMain}>{entreprise.nom}</Text>
          {legalInfo && (
            <Text style={styles.footerLegal}>{legalInfo}</Text>
          )}
          {entreprise.rib && (
            <Text style={styles.footerRIB}>RIB: {entreprise.rib}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch entreprise info
    const entreprise = await getEntrepriseInfo();

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

    // Group exploitations by service
    const groupedServices = groupExploitationsByService(facture.exploitations || []);
    const totalServices = facture.exploitations?.length || 0;

    // Generate PDF using @react-pdf/renderer
    const pdfStream = await renderToStream(
      <FacturePDF 
        facture={facture} 
        groupedServices={groupedServices}
        totalServices={totalServices}
        entreprise={entreprise}
      />
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

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
