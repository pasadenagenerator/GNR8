'use client';

import { useEffect } from 'react';

type Props = { url: string | null; firstOpen: boolean; canEdit: boolean; reservationEnabled: boolean;
  agencyId: string; clientId: string; siteId: string };

export default function NativeStackiPanel({ url, firstOpen, canEdit, reservationEnabled,
  agencyId, clientId, siteId }: Props) {
  useEffect(() => {
    if (!reservationEnabled || !canEdit || url) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const enqueue = async () => {
      try {
        const response = await fetch(
          `/api/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/native-studio/resources`,
          { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ agencyId }), signal: controller.signal },
        );
        if (response.ok || response.status === 403 || response.status === 404) return;
      } catch { if (controller.signal.aborted) return; }
      if (++attempts < 3 && !controller.signal.aborted)
        timer = setTimeout(() => void enqueue(), attempts * 5_000);
    };
    void enqueue();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [agencyId, clientId, siteId, canEdit, reservationEnabled, url]);

  return <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
    <h2 style={{ margin: 0, fontSize: 18 }}>Stacki</h2>
    <p>Urejajte stran z gradnikom ali umetno inteligenco v Stackiju. Osnutek se shranjuje samodejno.
      V meniju Publish uporabite »Push to GitHub« za shranjevanje v GitHub ali objavo na gostovanju.</p>
    {!canEdit ? <p>Za urejanje strani potrebujete pravice lastnika ali skrbnika.</p>
      : url ? <><a href={url} target="_blank" rel="noopener noreferrer">{firstOpen ? 'Odpri Stacki za prvo prijavo' : 'Odpri v Stackiju'}</a>
        {firstOpen ? <p>Prijavite se v Stackiju. Po prvi prijavi je treba še potrditi delovanje urednika.</p> : null}</>
      : <p>Povezava te strani s Stackijem še ni pripravljena.</p>}
  </section>;
}
