export default function NativeStackiPanel({ url, canEdit }: { url: string | null; canEdit: boolean }) {
  return <section style={{ border: '1px solid #dbe6f1', borderRadius: 12, background: '#fff', padding: 14 }}>
    <h2 style={{ margin: 0, fontSize: 18 }}>Stacki</h2>
    <p>Urejajte stran z gradnikom ali umetno inteligenco v Stackiju. Osnutek se shranjuje samodejno.
      V meniju Publish uporabite »Push to GitHub« za shranjevanje v GitHub ali objavo na gostovanju.</p>
    {!canEdit ? <p>Za urejanje strani potrebujete pravice lastnika ali skrbnika.</p>
      : url ? <a href={url} target="_blank" rel="noopener noreferrer">Odpri v Stackiju</a>
      : <p>Povezava te strani s Stackijem še ni pripravljena.</p>}
  </section>;
}
