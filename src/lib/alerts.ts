// Alert management utilities
import { db } from '@/lib/db';
import { TypeAlerte, PrioriteAlerte } from '@prisma/client';

// Document type labels for alerts (chauffeurs)
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PERMIS_CONDUIRE: 'Permis de conduire',
  ASSURANCE_CHAUFFEUR: 'Assurance chauffeur',
  VISITE_MEDICALE: 'Visite médicale',
  CIN: 'Carte d\'identité nationale',
};

// Document type labels for vehicules
const DOCUMENT_VEHICULE_TYPE_LABELS: Record<string, string> = {
  CARTE_GRISE: 'Carte grise',
  ASSURANCE: 'Assurance véhicule',
  VISITE_TECHNIQUE: 'Visite technique',
};

// Entretien type labels
const ENTRETIEN_TYPE_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  PNEUS: 'Pneus',
  FREINS: 'Freins',
  ASSURANCE_VEHICULE: 'Assurance véhicule',
  VISITE_TECHNIQUE: 'Visite technique',
  REPARATION: 'Réparation',
  AUTRE: 'Autre',
};

// Notification settings interface
interface NotificationSettings {
  alertDocumentExpiration: boolean;
  alertDocumentDays: number;
  alertFactureRetard: boolean;
  alertFactureDays: number;
  alertEntretien: boolean;
  alertEntretienDays: number;
  alertContratCDD: boolean;
  alertContratCDDDays: number;
  alertContratClient: boolean;
  alertContratClientDays: number;
  emailNotifications: boolean;
  emailRecipient: string;
  pushNotifications: boolean;
  soundEnabled: boolean;
}

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
  alertDocumentExpiration: true,
  alertDocumentDays: 30,
  alertFactureRetard: true,
  alertFactureDays: 7,
  alertEntretien: true,
  alertEntretienDays: 15,
  alertContratCDD: true,
  alertContratCDDDays: 30,
  alertContratClient: true,
  alertContratClientDays: 30,
  emailNotifications: false,
  emailRecipient: '',
  pushNotifications: true,
  soundEnabled: true,
};

// Get document type label
export function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

// Get entretien type label
export function getEntretienTypeLabel(type: string): string {
  return ENTRETIEN_TYPE_LABELS[type] || type;
}

// Get notification settings from database
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const parametres = await db.parametre.findMany({
      where: {
        cle: {
          startsWith: 'NOTIF_',
        },
      },
    });

    const settings = { ...DEFAULT_SETTINGS };

    for (const param of parametres) {
      switch (param.cle) {
        case 'NOTIF_DOCUMENT_EXPIRATION':
          settings.alertDocumentExpiration = param.valeur === 'true';
          break;
        case 'NOTIF_DOCUMENT_DAYS':
          settings.alertDocumentDays = parseInt(param.valeur) || DEFAULT_SETTINGS.alertDocumentDays;
          break;
        case 'NOTIF_FACTURE_RETARD':
          settings.alertFactureRetard = param.valeur === 'true';
          break;
        case 'NOTIF_FACTURE_DAYS':
          settings.alertFactureDays = parseInt(param.valeur) || DEFAULT_SETTINGS.alertFactureDays;
          break;
        case 'NOTIF_ENTRETIEN':
          settings.alertEntretien = param.valeur === 'true';
          break;
        case 'NOTIF_ENTRETIEN_DAYS':
          settings.alertEntretienDays = parseInt(param.valeur) || DEFAULT_SETTINGS.alertEntretienDays;
          break;
        case 'NOTIF_EMAIL_ENABLED':
          settings.emailNotifications = param.valeur === 'true';
          break;
        case 'NOTIF_EMAIL_RECIPIENT':
          settings.emailRecipient = param.valeur;
          break;
        case 'NOTIF_PUSH_ENABLED':
          settings.pushNotifications = param.valeur === 'true';
          break;
        case 'NOTIF_SOUND_ENABLED':
          settings.soundEnabled = param.valeur === 'true';
          break;
        case 'NOTIF_CONTRAT_CDD':
          settings.alertContratCDD = param.valeur === 'true';
          break;
        case 'NOTIF_CONTRAT_CDD_DAYS':
          settings.alertContratCDDDays = parseInt(param.valeur) || DEFAULT_SETTINGS.alertContratCDDDays;
          break;
        case 'NOTIF_CONTRAT_CLIENT':
          settings.alertContratClient = param.valeur === 'true';
          break;
        case 'NOTIF_CONTRAT_CLIENT_DAYS':
          settings.alertContratClientDays = parseInt(param.valeur) || DEFAULT_SETTINGS.alertContratClientDays;
          break;
      }
    }

    return settings;
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Create alert for expired or expiring document
export async function createDocumentAlert(
  documentId: string,
  chauffeurId: string,
  documentType: string,
  dateExpiration: Date,
  chauffeurNom: string,
  chauffeurPrenom: string,
  settings?: NotificationSettings
): Promise<boolean> {
  // Get notification settings if not provided
  if (!settings) {
    settings = await getNotificationSettings();
  }

  // Check if document alerts are enabled
  if (!settings.alertDocumentExpiration) {
    return false;
  }

  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (dateExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Don't create alert for documents expiring after the configured threshold
  if (daysUntilExpiration > settings.alertDocumentDays) {
    return false;
  }

  // Check if an alert already exists for this document
  const existingAlert = await db.alerte.findFirst({
    where: {
      referenceId: documentId,
      resolute: false,
    },
  });

  // Determine priority and messages based on days until expiration
  let priority: PrioriteAlerte;
  let titre: string;
  let message: string;

  if (daysUntilExpiration < 0) {
    priority = PrioriteAlerte.HAUTE;
    titre = `Document expiré: ${getDocumentTypeLabel(documentType)}`;
    message = `Le document "${getDocumentTypeLabel(documentType)}" de ${chauffeurPrenom} ${chauffeurNom} a expiré depuis ${Math.abs(daysUntilExpiration)} jour(s).`;
  } else if (daysUntilExpiration <= 7) {
    priority = PrioriteAlerte.HAUTE;
    titre = `Document expire bientôt: ${getDocumentTypeLabel(documentType)}`;
    message = `Le document "${getDocumentTypeLabel(documentType)}" de ${chauffeurPrenom} ${chauffeurNom} expire dans ${daysUntilExpiration} jour(s).`;
  } else {
    priority = PrioriteAlerte.MOYENNE;
    titre = `Document expire dans ${daysUntilExpiration} jours: ${getDocumentTypeLabel(documentType)}`;
    message = `Le document "${getDocumentTypeLabel(documentType)}" de ${chauffeurPrenom} ${chauffeurNom} expire le ${dateExpiration.toLocaleDateString('fr-FR')}.`;
  }

  // If alert exists and is not resolved, update it
  if (existingAlert) {
    await db.alerte.update({
      where: { id: existingAlert.id },
      data: {
        titre,
        message,
        priority,
      },
    });
    return false; // No new alert created
  }

  // Create new alert
  await db.alerte.create({
    data: {
      type: TypeAlerte.DOCUMENT_EXPIRE,
      titre,
      message,
      priority,
      referenceId: documentId,
    },
  });

  // Mark document as alert sent
  await db.documentChauffeur.update({
    where: { id: documentId },
    data: { alerteEnvoyee: true },
  });

  return true; // New alert created
}

// Check all chauffeur documents and create alerts if needed
export async function checkAllDocumentAlerts(): Promise<number> {
  // Get notification settings
  const settings = await getNotificationSettings();

  // If document alerts are disabled, resolve all existing document alerts
  if (!settings.alertDocumentExpiration) {
    await db.alerte.updateMany({
      where: {
        type: TypeAlerte.DOCUMENT_EXPIRE,
        resolute: false,
      },
      data: {
        resolute: true,
      },
    });
    return 0;
  }

  const now = new Date();
  const thresholdDate = new Date(now.getTime() + settings.alertDocumentDays * 24 * 60 * 60 * 1000);

  // Get ALL documents
  const documents = await db.documentChauffeur.findMany({
    include: {
      chauffeur: {
        select: {
          nom: true,
          prenom: true,
        },
      },
    },
  });

  let alertsCreated = 0;

  for (const doc of documents) {
    if (!doc.dateExpiration) continue;

    const daysUntilExpiration = Math.ceil(
      (doc.dateExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= settings.alertDocumentDays) {
      // Document is within threshold - create or update alert
      const created = await createDocumentAlert(
        doc.id,
        doc.chauffeurId,
        doc.type,
        doc.dateExpiration,
        doc.chauffeur.nom,
        doc.chauffeur.prenom,
        settings
      );

      if (created) {
        alertsCreated++;
      }
    } else {
      // Document is outside new threshold - resolve any existing alert
      await db.alerte.updateMany({
        where: {
          referenceId: doc.id,
          type: TypeAlerte.DOCUMENT_EXPIRE,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });
    }
  }

  return alertsCreated;
}

// Delete resolved alerts for documents that have been renewed
export async function resolveDocumentAlert(documentId: string): Promise<void> {
  await db.alerte.updateMany({
    where: {
      referenceId: documentId,
      resolute: false,
    },
    data: {
      resolute: true,
    },
  });
}

// Generic function to resolve all alerts by reference ID
export async function resolveAlertsByReference(referenceId: string): Promise<void> {
  await db.alerte.updateMany({
    where: {
      referenceId,
      resolute: false,
    },
    data: {
      resolute: true,
    },
  });
}

// Generic alert creation interface
export interface CreateAlertParams {
  type: TypeAlerte;
  titre: string;
  message: string;
  priority: PrioriteAlerte;
  referenceId?: string;
}

// Generic function to create an alert
export async function createAlert(params: CreateAlertParams): Promise<void> {
  await db.alerte.create({
    data: {
      type: params.type,
      titre: params.titre,
      message: params.message,
      priority: params.priority,
      referenceId: params.referenceId,
    },
  });
}

// Check factures for late payment alerts
export async function checkFactureAlerts(): Promise<number> {
  // Get notification settings
  const settings = await getNotificationSettings();

  // If facture alerts are disabled, resolve all existing facture alerts
  if (!settings.alertFactureRetard) {
    await db.alerte.updateMany({
      where: {
        type: TypeAlerte.FACTURE_IMPAYEE,
        resolute: false,
      },
      data: {
        resolute: true,
      },
    });
    return 0;
  }

  const now = new Date();

  // Get ALL unpaid factures
  const factures = await db.facture.findMany({
    where: {
      statut: 'EN_ATTENTE',
    },
    include: {
      client: {
        select: {
          nomEntreprise: true,
        },
      },
    },
  });

  // Get all facture IDs that are still pending
  const pendingFactureIds = new Set(factures.map(f => f.id));

  // Resolve alerts for factures that are no longer in EN_ATTENTE status
  // (paid factures should not have active alerts)
  await db.alerte.updateMany({
    where: {
      type: TypeAlerte.FACTURE_IMPAYEE,
      resolute: false,
      referenceId: { notIn: [...pendingFactureIds] },
    },
    data: {
      resolute: true,
    },
  });

  let alertsCreated = 0;

  for (const facture of factures) {
    const daysRetard = Math.ceil(
      (now.getTime() - facture.dateEcheance.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Facture is past due more than configured days
    if (daysRetard >= settings.alertFactureDays) {
      // Check if alert already exists
      const existingAlert = await db.alerte.findFirst({
        where: {
          referenceId: facture.id,
          type: TypeAlerte.FACTURE_IMPAYEE,
          resolute: false,
        },
      });

      if (existingAlert) {
        // Update existing alert with current days of delay
        await db.alerte.update({
          where: { id: existingAlert.id },
          data: {
            titre: `Facture impayée: ${facture.numero}`,
            message: `La facture ${facture.numero} de ${facture.client.nomEntreprise} est en retard de ${daysRetard} jour(s). Montant: ${facture.montantTTC.toFixed(2)} MAD`,
          },
        });
      } else {
        await db.alerte.create({
          data: {
            type: TypeAlerte.FACTURE_IMPAYEE,
            titre: `Facture impayée: ${facture.numero}`,
            message: `La facture ${facture.numero} de ${facture.client.nomEntreprise} est en retard de ${daysRetard} jour(s). Montant: ${facture.montantTTC.toFixed(2)} MAD`,
            priority: PrioriteAlerte.HAUTE,
            referenceId: facture.id,
          },
        });

        alertsCreated++;
      }
    } else {
      // Facture is no longer past the threshold - resolve any existing alert
      await db.alerte.updateMany({
        where: {
          referenceId: facture.id,
          type: TypeAlerte.FACTURE_IMPAYEE,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });
    }
  }

  return alertsCreated;
}

// Check entretiens for upcoming maintenance alerts
// For VIDANGE: alerts based on prochaineDate AND prochainKm (within 100km of current vehicle km)
export async function checkEntretienAlerts(): Promise<number> {
  // Get notification settings
  const settings = await getNotificationSettings();

  // If entretien alerts are disabled, resolve all existing entretien alerts
  if (!settings.alertEntretien) {
    await db.alerte.updateMany({
      where: {
        type: TypeAlerte.ENTRETIEN_A_VENIR,
        resolute: false,
      },
      data: {
        resolute: true,
      },
    });
    return 0;
  }

  const now = new Date();
  const KM_THRESHOLD = 100; // Alert when within 100km of prochainKm

  // Get ALL entretiens that have either prochaineDate or prochainKm (for VIDANGE)
  const entretiens = await db.entretien.findMany({
    where: {
      OR: [
        { prochaineDate: { not: null } },
        { 
          type: 'VIDANGE',
          prochainKm: { not: null }
        }
      ]
    },
    include: {
      vehicule: {
        select: {
          immatriculation: true,
          marque: true,
          modele: true,
          kilometrage: true,
        },
      },
    },
  });

  // Get all entretien IDs that have prochaineDate or prochainKm
  const entretienWithAlertIds = new Set(entretiens.map(e => e.id));

  // Resolve alerts for entretiens without prochaineDate or prochainKm
  await db.alerte.updateMany({
    where: {
      type: TypeAlerte.ENTRETIEN_A_VENIR,
      resolute: false,
      referenceId: { notIn: [...entretienWithAlertIds] },
    },
    data: {
      resolute: true,
    },
  });

  let alertsCreated = 0;

  for (const entretien of entretiens) {
    const vehiculeInfo = `${entretien.vehicule.marque} ${entretien.vehicule.modele} (${entretien.vehicule.immatriculation})`;
    const kmActuel = entretien.vehicule.kilometrage || 0;
    
    // Check if alert is needed
    let shouldAlert = false;
    let alertReason = '';
    let priority: PrioriteAlerte = PrioriteAlerte.MOYENNE;
    let titre: string;
    let message: string;

    // Check 1: prochaineDate (for all entretien types)
    if (entretien.prochaineDate) {
      const daysUntilEntretien = Math.ceil(
        (entretien.prochaineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilEntretien <= settings.alertEntretienDays) {
        shouldAlert = true;
        
        if (daysUntilEntretien < 0) {
          priority = PrioriteAlerte.HAUTE;
          alertReason = 'date_retard';
          titre = `Entretien en retard: ${getEntretienTypeLabel(entretien.type)}`;
          message = `L'entretien "${getEntretienTypeLabel(entretien.type)}" pour le véhicule ${vehiculeInfo} est en retard de ${Math.abs(daysUntilEntretien)} jour(s).`;
        } else if (daysUntilEntretien <= 7) {
          priority = PrioriteAlerte.HAUTE;
          alertReason = 'date_proche';
          titre = `Entretien proche: ${getEntretienTypeLabel(entretien.type)}`;
          message = `L'entretien "${getEntretienTypeLabel(entretien.type)}" pour le véhicule ${vehiculeInfo} est prévu dans ${daysUntilEntretien} jour(s).`;
        } else {
          priority = PrioriteAlerte.MOYENNE;
          alertReason = 'date_avenir';
          titre = `Entretien à venir: ${getEntretienTypeLabel(entretien.type)}`;
          message = `L'entretien "${getEntretienTypeLabel(entretien.type)}" pour le véhicule ${vehiculeInfo} est prévu le ${entretien.prochaineDate.toLocaleDateString('fr-FR')}.`;
        }
      }
    }

    // Check 2: prochainKm for VIDANGE type (within 100km threshold OR exceeded)
    if (entretien.type === 'VIDANGE' && entretien.prochainKm) {
      const kmRestants = entretien.prochainKm - kmActuel;
      
      // Alert if within 100km threshold OR if exceeded (kmRestants <= 0)
      if (kmRestants <= KM_THRESHOLD) {
        // Override alert if km-based alert is more urgent or same priority
        if (!shouldAlert || priority !== PrioriteAlerte.HAUTE) {
          shouldAlert = true;
          
          if (kmRestants <= 0) {
            // Kilométrage dépassé
            priority = PrioriteAlerte.HAUTE;
            alertReason = 'km_depasse';
            titre = `Vidange dépassée: ${vehiculeInfo}`;
            message = `La vidange pour le véhicule ${vehiculeInfo} est dépassée de ${Math.abs(kmRestants)} km. (Prochain km: ${entretien.prochainKm.toLocaleString('fr-FR')} km, Km actuel: ${kmActuel.toLocaleString('fr-FR')} km)`;
          } else {
            // Kilométrage proche
            priority = PrioriteAlerte.HAUTE;
            alertReason = 'km_proche';
            titre = `Vidange proche: ${vehiculeInfo}`;
            message = `La vidange pour le véhicule ${vehiculeInfo} est dans ${kmRestants} km. (Prochain km: ${entretien.prochainKm.toLocaleString('fr-FR')} km, Km actuel: ${kmActuel.toLocaleString('fr-FR')} km)`;
          }
        } else if (shouldAlert && alertReason.startsWith('date')) {
          // Append km info to existing date-based alert
          message += ` (Prochain km: ${entretien.prochainKm.toLocaleString('fr-FR')} km, Km actuel: ${kmActuel.toLocaleString('fr-FR')} km)`;
        }
      }
    }

    if (shouldAlert) {
      // Check if alert already exists
      const existingAlert = await db.alerte.findFirst({
        where: {
          referenceId: entretien.id,
          type: TypeAlerte.ENTRETIEN_A_VENIR,
          resolute: false,
        },
      });

      if (existingAlert) {
        // Update existing alert
        await db.alerte.update({
          where: { id: existingAlert.id },
          data: {
            titre,
            message,
            priority,
          },
        });
      } else {
        // Create new alert
        await db.alerte.create({
          data: {
            type: TypeAlerte.ENTRETIEN_A_VENIR,
            titre,
            message,
            priority,
            referenceId: entretien.id,
          },
        });

        alertsCreated++;

        // Mark entretien as alert sent
        await db.entretien.update({
          where: { id: entretien.id },
          data: { alerteEnvoyee: true },
        });
      }
    } else {
      // Entretien is outside all thresholds - resolve any existing alert
      await db.alerte.updateMany({
        where: {
          referenceId: entretien.id,
          type: TypeAlerte.ENTRETIEN_A_VENIR,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });
    }
  }

  return alertsCreated;
}

// Get document vehicule type label
export function getDocumentVehiculeTypeLabel(type: string): string {
  return DOCUMENT_VEHICULE_TYPE_LABELS[type] || type;
}

// Check all vehicule documents and create alerts if needed
export async function checkAllDocumentVehiculeAlerts(): Promise<number> {
  // Get notification settings
  const settings = await getNotificationSettings();

  // If document alerts are disabled, resolve all existing vehicule document alerts
  if (!settings.alertDocumentExpiration) {
    await db.alerte.updateMany({
      where: {
        type: TypeAlerte.DOCUMENT_EXPIRE,
        resolute: false,
      },
      data: {
        resolute: true,
      },
    });
    return 0;
  }

  const now = new Date();

  // Get ALL vehicule documents with expiration dates
  const documents = await db.documentVehicule.findMany({
    where: {
      dateExpiration: { not: null },
    },
    include: {
      vehicule: {
        select: {
          immatriculation: true,
          marque: true,
          modele: true,
        },
      },
    },
  });

  let alertsCreated = 0;

  for (const doc of documents) {
    if (!doc.dateExpiration) continue;

    const daysUntilExpiration = Math.ceil(
      (doc.dateExpiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= settings.alertDocumentDays) {
      // Check if alert already exists
      const existingAlert = await db.alerte.findFirst({
        where: {
          referenceId: doc.id,
          type: TypeAlerte.DOCUMENT_EXPIRE,
          resolute: false,
        },
      });

      // Determine priority and messages based on days until expiration
      let priority: PrioriteAlerte;
      let titre: string;
      let message: string;
      
      const vehiculeInfo = `${doc.vehicule.marque} ${doc.vehicule.modele} (${doc.vehicule.immatriculation})`;
      const docLabel = getDocumentVehiculeTypeLabel(doc.type);

      if (daysUntilExpiration < 0) {
        priority = PrioriteAlerte.HAUTE;
        titre = `Document véhicule expiré: ${docLabel}`;
        message = `Le document "${docLabel}" du véhicule ${vehiculeInfo} a expiré depuis ${Math.abs(daysUntilExpiration)} jour(s).`;
      } else if (daysUntilExpiration <= 7) {
        priority = PrioriteAlerte.HAUTE;
        titre = `Document véhicule expire bientôt: ${docLabel}`;
        message = `Le document "${docLabel}" du véhicule ${vehiculeInfo} expire dans ${daysUntilExpiration} jour(s).`;
      } else {
        priority = PrioriteAlerte.MOYENNE;
        titre = `Document véhicule expire dans ${daysUntilExpiration} jours: ${docLabel}`;
        message = `Le document "${docLabel}" du véhicule ${vehiculeInfo} expire le ${doc.dateExpiration.toLocaleDateString('fr-FR')}.`;
      }

      if (existingAlert) {
        // Update existing alert
        await db.alerte.update({
          where: { id: existingAlert.id },
          data: {
            titre,
            message,
            priority,
          },
        });
      } else {
        // Create new alert
        await db.alerte.create({
          data: {
            type: TypeAlerte.DOCUMENT_EXPIRE,
            titre,
            message,
            priority,
            referenceId: doc.id,
          },
        });

        alertsCreated++;

        // Mark document as alert sent
        await db.documentVehicule.update({
          where: { id: doc.id },
          data: { alerteEnvoyee: true },
        });
      }
    } else {
      // Document is outside threshold - resolve any existing alert
      await db.alerte.updateMany({
        where: {
          referenceId: doc.id,
          type: TypeAlerte.DOCUMENT_EXPIRE,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });
    }
  }

  return alertsCreated;
}

// Check client contract expiration alerts
export async function checkClientContratAlerts(): Promise<number> {
  // Get notification settings
  const settings = await getNotificationSettings();

  // If client contract alerts are disabled, resolve all existing client contract alerts
  if (!settings.alertContratClient) {
    await db.alerte.updateMany({
      where: {
        type: TypeAlerte.CONTRAT_CLIENT_EXPIRATION,
        resolute: false,
      },
      data: {
        resolute: true,
      },
    });
    return 0;
  }

  const now = new Date();

  // Get ALL clients with contract end dates
  const clients = await db.client.findMany({
    where: {
      dateFinContrat: { not: null },
      actif: true,
    },
  });

  // Get all client IDs that have dateFinContrat
  const clientWithAlertIds = new Set(clients.map(c => c.id));

  // Resolve alerts for clients without dateFinContrat
  await db.alerte.updateMany({
    where: {
      type: TypeAlerte.CONTRAT_CLIENT_EXPIRATION,
      resolute: false,
      referenceId: { notIn: [...clientWithAlertIds] },
    },
    data: {
      resolute: true,
    },
  });

  let alertsCreated = 0;

  for (const client of clients) {
    if (!client.dateFinContrat) continue;

    const daysUntilExpiration = Math.ceil(
      (client.dateFinContrat.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= settings.alertContratClientDays) {
      // Check if alert already exists
      const existingAlert = await db.alerte.findFirst({
        where: {
          referenceId: client.id,
          type: TypeAlerte.CONTRAT_CLIENT_EXPIRATION,
          resolute: false,
        },
      });

      let priority: PrioriteAlerte;
      let titre: string;
      let message: string;

      if (daysUntilExpiration < 0) {
        priority = PrioriteAlerte.HAUTE;
        titre = `Contrat client expiré: ${client.nomEntreprise}`;
        message = `Le contrat avec ${client.nomEntreprise} a expiré depuis ${Math.abs(daysUntilExpiration)} jour(s).`;
      } else if (daysUntilExpiration <= 7) {
        priority = PrioriteAlerte.HAUTE;
        titre = `Contrat client expire bientôt: ${client.nomEntreprise}`;
        message = `Le contrat avec ${client.nomEntreprise} expire dans ${daysUntilExpiration} jour(s).`;
      } else {
        priority = PrioriteAlerte.MOYENNE;
        titre = `Contrat client expire dans ${daysUntilExpiration} jours: ${client.nomEntreprise}`;
        message = `Le contrat avec ${client.nomEntreprise} expire le ${client.dateFinContrat.toLocaleDateString('fr-FR')}.`;
      }

      if (existingAlert) {
        // Update existing alert
        await db.alerte.update({
          where: { id: existingAlert.id },
          data: {
            titre,
            message,
            priority,
          },
        });
      } else {
        // Create new alert
        await db.alerte.create({
          data: {
            type: TypeAlerte.CONTRAT_CLIENT_EXPIRATION,
            titre,
            message,
            priority,
            referenceId: client.id,
          },
        });

        alertsCreated++;

        // Mark client as alert sent
        await db.client.update({
          where: { id: client.id },
          data: { alerteEnvoyee: true },
        });
      }
    } else {
      // Client contract is outside threshold - resolve any existing alert
      await db.alerte.updateMany({
        where: {
          referenceId: client.id,
          type: TypeAlerte.CONTRAT_CLIENT_EXPIRATION,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });

      // Reset alerteEnvoyee flag
      if (client.alerteEnvoyee) {
        await db.client.update({
          where: { id: client.id },
          data: { alerteEnvoyee: false },
        });
      }
    }
  }

  return alertsCreated;
}

// Check all alerts (documents, factures, entretiens, contrats CDD, documents véhicules, contrats clients)
export async function checkAllAlerts(): Promise<{
  documents: number;
  documentsVehicules: number;
  factures: number;
  entretiens: number;
  contratsCDD: number;
  contratsClients: number;
  chauffeursDesactivates: number;
  total: number;
}> {
  const documentAlerts = await checkAllDocumentAlerts();
  const documentVehiculeAlerts = await checkAllDocumentVehiculeAlerts();
  const factureAlerts = await checkFactureAlerts();
  const entretienAlerts = await checkEntretienAlerts();
  const clientContratAlerts = await checkClientContratAlerts();
  
  // CDD contract check - simplified for now
  // TODO: Implement full CDD contract expiration check
  let contratsCDD = 0;
  let chauffeursDesactivates = 0;

  return {
    documents: documentAlerts,
    documentsVehicules: documentVehiculeAlerts,
    factures: factureAlerts,
    entretiens: entretienAlerts,
    contratsCDD,
    contratsClients: clientContratAlerts,
    chauffeursDesactivates,
    total: documentAlerts + documentVehiculeAlerts + factureAlerts + entretienAlerts + contratsCDD + clientContratAlerts,
  };
}

