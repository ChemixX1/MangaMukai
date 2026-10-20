import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EmergencyScreen } from './EmergencyScreen';

type MaintenanceFlag = { activo?: boolean; mensaje?: string };

export const MaintenanceGate = () => {
  const forced = new URLSearchParams(useLocation().search).get('mantenimiento') === '1';
  const [flag, setFlag] = useState<MaintenanceFlag | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}mantenimiento.json`, { cache: 'no-store', signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<MaintenanceFlag>) : null))
      .then((data) => { if (data?.activo) setFlag(data); })
      .catch(() => {                                                           });
    return () => controller.abort();
  }, []);

  if (!forced && !flag?.activo) return null;
  return <EmergencyScreen message={flag?.mensaje} />;
};
