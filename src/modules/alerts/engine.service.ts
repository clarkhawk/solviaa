import type { AlertType } from "@prisma/client";
import { prisma } from "@/shared/db/prisma";
import { invoiceRepository } from "@/modules/factures/repository";
import { clientRepository } from "@/modules/clients/repository";
import { formatMoney } from "@/shared/currencies";
import type { AlertNotificationPayload } from "./types";
import { InAppNotifier } from "./notifiers/in-app.notifier";
import { EmailNotifier } from "./notifiers/email.notifier";
import { WhatsAppNotifier } from "./notifiers/whatsapp.notifier";

function getAlertType(dueAt: Date, today: Date): AlertType | null {
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - t.getTime()) / 86400000);

  // Plages plutôt qu'égalité stricte : si le cron saute un jour (déploiement,
  // panne), le palier n'est pas perdu, il est rattrapé au run suivant.
  // Chaque palier n'est de toute façon envoyé qu'une seule fois par facture,
  // via le statut "sent" de l'AlertEvent correspondant (voir runForOrganization).
  if (diffDays <= -7) return "overdue_7";
  if (diffDays <= 0) return "due_today";
  if (diffDays <= 7) return "due_in_7";
  return null;
}

const ALERT_LABELS: Record<AlertType, string> = {
  due_in_7: "Échéance dans 7 jours",
  due_today: "Échéance aujourd'hui",
  overdue_7: "Retard de 7 jours",
};

export class AlertEngineService {
  private inApp = new InAppNotifier();
  private email = new EmailNotifier();
  private whatsapp = new WhatsAppNotifier();

  async runForAllOrganizations(): Promise<{ processed: number; alerts: number }> {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    let totalAlerts = 0;

    for (const org of orgs) {
      const count = await this.runForOrganization(org.id);
      totalAlerts += count;
    }

    return { processed: orgs.length, alerts: totalAlerts };
  }

  async runForOrganization(organizationId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });
    const currency = organization?.currency ?? "EUR";

    const invoices = await invoiceRepository.findDueForAlerts(organizationId, today);
    let alertCount = 0;

    for (const invoice of invoices) {
      const alertType = getAlertType(invoice.dueAt, today);
      if (!alertType) continue;

      const existing = await prisma.alertEvent.findUnique({
        where: { invoiceId_alertType: { invoiceId: invoice.id, alertType } },
      });
      if (existing?.status === "sent") continue;

      if (existing) {
        await prisma.alertEvent.update({ where: { id: existing.id }, data: { status: "pending" } });
      } else {
        await prisma.alertEvent.create({
          data: {
            organizationId,
            invoiceId: invoice.id,
            alertType,
            status: "pending",
          },
        });
      }

      const client = await clientRepository.findById(organizationId, invoice.clientId);
      const payload: AlertNotificationPayload = {
        title: ALERT_LABELS[alertType],
        message: `Facture ${invoice.reference} — ${client?.identity.name ?? "Client"} — ${formatMoney(invoice.amountRemaining, currency)} restants`,
        invoiceReference: invoice.reference,
        clientName: client?.identity.name ?? "Client",
        dueAt: invoice.dueAt,
        alertType,
      };

      const delivered = await this.notifyTeam(organizationId, payload);
      alertCount++;

      await prisma.alertEvent.updateMany({
        where: { invoiceId: invoice.id, alertType },
        data: { status: delivered ? "sent" : "failed" },
      });
    }

    return alertCount;
  }

  private async notifyTeam(organizationId: string, payload: AlertNotificationPayload): Promise<boolean> {
    const users = await prisma.user.findMany({
      where: { organizationId, canReceiveAlerts: true },
      include: { notificationPreference: true },
    });

    const results = await Promise.allSettled(
      users.map(async (user) => {
        let delivered = false;
        const prefs = user.notificationPreference ?? { inApp: true, email: true, whatsapp: false };

        if (prefs.inApp) {
          await this.inApp.send(organizationId, user.id, payload);
          delivered = true;
        }
        if (prefs.email) {
          delivered = (await this.email.send(user.email, payload)) || delivered;
        }
        if (prefs.whatsapp && user.notificationPreference?.whatsappNumberEncrypted) {
          delivered = (await this.whatsapp.send(user.notificationPreference.whatsappNumberEncrypted, payload)) || delivered;
        }
        return delivered;
      }),
    );
    return results.some((result) => result.status === "fulfilled" && result.value);
  }
}

export const alertEngineService = new AlertEngineService();
