"use client";

import { useEffect, useRef } from "react";
import { useCheckDocumentAlerts } from "@/hooks/use-queries";

// Component that checks alerts on app startup
export function AlertChecker() {
  const { mutate: checkAlerts } = useCheckDocumentAlerts();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only check alerts once on mount
    if (!hasChecked.current) {
      hasChecked.current = true;
      checkAlerts(undefined, {
        onSuccess: (result) => {
          if (result.total > 0) {
            console.log(`[Alertes] ${result.total} alerte(s) vérifiée(s) au démarrage`);
          }
        },
        onError: (error) => {
          console.error("[Alertes] Erreur lors de la vérification:", error);
        },
      });
    }
  }, [checkAlerts]);

  return null;
}
