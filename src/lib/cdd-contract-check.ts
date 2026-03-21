// CDD Contract Check - Separate file to avoid Turbopack cache issues
import { db } from '@/lib/db';
import { TypeAlerte, PrioriteAlerte } from '@prisma/client';

interface NotificationSettings {
  alertContratCDD: boolean;
  alertContratCDDDays: number;
}

// Check CDD contracts for expiration alerts and deactivate expired chauffeurs
export async function checkContratCDDAlerts(settings: NotificationSettings): Promise<{
  alertsCreated: number;
  chauffeursDesactivated: number;
}> {
  // If CDD contract alerts are disabled, resolve all existing contract alerts
  if (!settings.alertContratCDD) {
    await db.alerte.updateMany({
      where: {
        type: TypeAlerte.CONTRAT_FIN_PROCHE,
        resolute: false,
      },
      data: {
        resolute: true,
      },
    });
    return { alertsCreated: 0, chauffeursDesactivated: 0 };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Get ALL active chauffeurs with CDD contracts using raw query
  const chauffeursCDD = await db.$queryRaw<Array<{
    id: string;
    nom: string;
    prenom: string;
    dateFinContrat: Date | null;
  }>>`
    SELECT id, nom, prenom, dateFinContrat 
    FROM Chauffeur 
    WHERE typeContrat = 'CDD' AND actif = 1 AND dateFinContrat IS NOT NULL
  `;

  let alertsCreated = 0;
  let chauffeursDesactivated = 0;

  for (const chauffeur of chauffeursCDD) {
    if (!chauffeur.dateFinContrat) continue;

    const dateFin = new Date(chauffeur.dateFinContrat);
    dateFin.setHours(0, 0, 0, 0);

    const daysUntilExpiration = Math.ceil(
      (dateFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if contract has EXPIRED - deactivate chauffeur
    if (daysUntilExpiration < 0) {
      // Deactivate the chauffeur using raw query
      await db.$executeRaw`
        UPDATE Chauffeur SET actif = 0 WHERE id = ${chauffeur.id}
      `;

      // Resolve any existing contract alert
      await db.alerte.updateMany({
        where: {
          referenceId: chauffeur.id,
          type: TypeAlerte.CONTRAT_FIN_PROCHE,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });

      // Create a notification about the deactivation
      await db.alerte.create({
        data: {
          type: TypeAlerte.CONTRAT_FIN_PROCHE,
          titre: `Contrat CDD expiré: ${chauffeur.prenom} ${chauffeur.nom}`,
          message: `Le contrat CDD de ${chauffeur.prenom} ${chauffeur.nom} a expiré le ${dateFin.toLocaleDateString('fr-FR')}. Le chauffeur a été automatiquement désactivé.`,
          priority: PrioriteAlerte.HAUTE,
          referenceId: chauffeur.id,
        },
      });

      chauffeursDesactivated++;
    }
    // Check if contract is within alert threshold - create alert
    else if (daysUntilExpiration <= settings.alertContratCDDDays) {
      // Check if alert already exists
      const existingAlert = await db.alerte.findFirst({
        where: {
          referenceId: chauffeur.id,
          type: TypeAlerte.CONTRAT_FIN_PROCHE,
          resolute: false,
        },
      });

      let priority: PrioriteAlerte;
      let titre: string;
      let message: string;

      if (daysUntilExpiration <= 7) {
        priority = PrioriteAlerte.HAUTE;
        titre = `Contrat CDD expire bientôt: ${chauffeur.prenom} ${chauffeur.nom}`;
        message = `Le contrat CDD de ${chauffeur.prenom} ${chauffeur.nom} expire dans ${daysUntilExpiration} jour(s) (le ${dateFin.toLocaleDateString('fr-FR')}).`;
      } else {
        priority = PrioriteAlerte.MOYENNE;
        titre = `Contrat CDD expire dans ${daysUntilExpiration} jours: ${chauffeur.prenom} ${chauffeur.nom}`;
        message = `Le contrat CDD de ${chauffeur.prenom} ${chauffeur.nom} expire le ${dateFin.toLocaleDateString('fr-FR')}.`;
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
            type: TypeAlerte.CONTRAT_FIN_PROCHE,
            titre,
            message,
            priority,
            referenceId: chauffeur.id,
          },
        });

        alertsCreated++;
      }
    } else {
      // Contract is outside threshold - resolve any existing alert
      await db.alerte.updateMany({
        where: {
          referenceId: chauffeur.id,
          type: TypeAlerte.CONTRAT_FIN_PROCHE,
          resolute: false,
        },
        data: {
          resolute: true,
        },
      });
    }
  }

  return { alertsCreated, chauffeursDesactivated };
}
