import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EmergencyScreen } from './EmergencyScreen';

type MaintenanceFlag = { activo?: boolean; mensaje?: string };

/**
 * Interruptor manual de la pantalla "Volveremos pronto": con
 * `public/mantenimiento.json` en `{"activo": true}` se muestra en toda la web
 * sin recompilar (basta con cambiar ese archivo en el servidor). Con
 * `?mantenimiento=1` en la URL se fuerza solo para verla: en cuanto la URL
 * deja de llevarlo, desaparece. La caída automática del servidor la detecta la
 * portada por su cuenta.
 */
export const MaintenanceGate = () => {
  const forced = new URLSearchParams(useLocation().search).get('mantenimiento') === '1';
  const [flag, setFlag] = useState<MaintenanceFlag | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/mantenimiento.json', { cache: 'no-store', signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<MaintenanceFlag>) : null))
      .then((data) => { if (data?.activo) setFlag(data); })
      .catch(() => { /* Sin archivo o sin red: no hay mantenimiento manual. */ });
    return () => controller.abort();
  }, []);

  if (!forced && !flag?.activo) return null;
  return <EmergencyScreen message={flag?.mensaje} />;
};
