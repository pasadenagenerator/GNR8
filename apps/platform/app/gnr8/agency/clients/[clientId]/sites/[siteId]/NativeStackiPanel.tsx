'use client';

import { useRef, useState } from 'react';

type Props = { url: string | null; firstOpen: boolean; canEdit: boolean; reservationEnabled: boolean;
  agencyId: string; clientId: string; siteId: string };

export default function NativeStackiPanel({ url, firstOpen, canEdit, reservationEnabled,
  agencyId, clientId, siteId }: Props) {
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  async function resume() {
    if (pending.current || queued || !reservationEnabled || !canEdit || url) return;
    pending.current = true;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(
        `/api/gnr8/agency/clients/${encodeURIComponent(clientId)}/sites/${encodeURIComponent(siteId)}/native-studio/resources`,
        { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ agencyId }) },
      );
      if (!response.ok) throw Error('Priprave ni bilo mogoče nadaljevati.');
      setQueued(true);
      setNotice('Nadaljevanje je v čakalni vrsti. Po zaključku osvežite stran.');
    } catch {
      setNotice('Priprave ni bilo mogoče nadaljevati. Poskusite znova.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
    <h2 style={{ margin: 0, fontSize: 18 }}>Stacki</h2>
    <p>Urejajte stran z gradnikom ali umetno inteligenco v Stackiju. Osnutek se shranjuje samodejno.
      V meniju Publish uporabite »Push to GitHub« za shranjevanje v GitHub ali objavo na gostovanju.</p>
    {!canEdit ? <p>Za urejanje strani potrebujete pravice lastnika ali skrbnika.</p>
      : url ? <><a href={url} target="_blank" rel="noopener noreferrer">{firstOpen ? 'Odpri Stacki za prvo prijavo' : 'Odpri v Stackiju'}</a>
        {firstOpen ? <p>Prijavite se v Stackiju. Po prvi prijavi je treba še potrditi delovanje urednika.</p> : null}</>
      : <>
        <p>Povezava te strani s Stackijem še ni pripravljena.</p>
        {reservationEnabled && <button type="button" disabled={busy || queued}
          onClick={() => void resume()}>Nadaljuj pripravo Stackija</button>}
        {notice && <p role="status">{notice}</p>}
      </>}
  </section>;
}
