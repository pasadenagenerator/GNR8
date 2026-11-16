'use client';
import { useEffect, useState } from 'react';
import StandalonePublicationPanel from './StandalonePublicationPanel';
import ImportReviewPanel from './ImportReviewPanel';
import { isContactEmail } from '@gnr8/runtime-contracts';
import type { GeneratedOutputReviewModel } from '@/gnr8/output-adapters/generated-output-publication-composition';
import type { PublicOutputSelection } from '@/gnr8/output-adapters/public-output-service';

type Choice = PublicOutputSelection & { versionNo: number; state: string; host: string | null };
type Props = { agencyId: string; clientId: string; siteId: string; host: string; canPublish: boolean;
  onHost: (host: string) => void;
  onSelection: (selection: PublicOutputSelection | null, hasGenerated: boolean) => void };

export default function PublicOutputPanel(props: Props) {
  const endpoint = `/api/gnr8/agency/clients/${props.clientId}/sites/${props.siteId}/public-output`;
  const scope = `agencyId=${encodeURIComponent(props.agencyId)}`;
  const storageKey = `gnr8-public-output:${props.agencyId}:${props.siteId}`;
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selected, setSelected] = useState<PublicOutputSelection | null>(null);
  const [model, setModel] = useState<GeneratedOutputReviewModel | null>(null);
  const [recipient, setRecipient] = useState('');
  const [recipientConfirmed, setRecipientConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('Loading retained generated versions…');
  const [loaded, setLoaded] = useState(false);

  async function request(url: string, body?: unknown) {
    const response = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('The server did not finish this request. Do not repeat preparation yet; refresh the selected status to check for a retained result. Nothing is approved or published by preparation.');
    }
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(`${payload.error ?? 'Unable to load public version.'}${payload.reason ? ` (${payload.reason})` : ''}${payload.blockers?.length ? `: ${payload.blockers.join(', ')}` : ''}`);
    return payload.data;
  }
  function remember(input: PublicOutputSelection, host = props.host) {
    const value = { siteVersionId: input.siteVersionId, artifactId: input.artifactId, artifactBundleSha256: input.artifactBundleSha256 };
    // A resume hint only; every read/action revalidates ownership and exact hash.
    try { localStorage.setItem(storageKey, JSON.stringify({ ...value, host })); } catch { /* Storage is optional. */ }
    setSelected(value); setModel(null); setConfirmed(false); setRecipient(''); setRecipientConfirmed(false);
    props.onSelection(null, true);
  }
  useEffect(() => {
    let active = true;
    request(`${endpoint}?${scope}`).then((items: Choice[]) => {
      if (!active) return;
      setChoices(items); setLoaded(true); setNotice(''); props.onSelection(null, items.length > 0);
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        const choice = items.find(c => c.siteVersionId === saved?.siteVersionId && c.artifactId === saved?.artifactId && c.artifactBundleSha256 === saved?.artifactBundleSha256);
        if (choice) { const host = typeof saved.host === "string" ? saved.host : props.host; props.onHost(host); remember(choice, host); }
      } catch { /* Explicit selection remains available. */ }
    }).catch(e => { if (active) setNotice(e.message); });
    return () => { active = false; };
    // Scope identifies the complete data source; callbacks do not trigger reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, scope, storageKey]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setModel(null); setConfirmed(false);
    request(`${endpoint}?${scope}&${new URLSearchParams(selected)}`).then((value: GeneratedOutputReviewModel) => {
      if (active) { setModel(value); setNotice(''); props.onSelection(value.publicPreparation ? selected : null, true); }
    }).catch(e => { if (active) setNotice(e.message); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, endpoint, scope]);

  async function act(action: 'prepare' | 'approve' | 'publish' | 'change-recipient' | 'withdraw') {
    if (!selected || !model || busy) return;
    setBusy(true); setNotice('');
    try { localStorage.setItem(storageKey, JSON.stringify({ ...selected, host: props.host })); } catch { /* Resume hints are optional. */ }
    try {
      const next: GeneratedOutputReviewModel = await request(`${endpoint}?${scope}`, { ...selected, action,
        ...(action === 'withdraw' ? { confirmation: 'withdraw-exact-first-publication' } : {}),
        host: props.host.trim().toLowerCase(), ...(action === 'change-recipient' ? { recipient: recipient.trim(), confirmation: 'confirm-contact-recipient' } : {}), ...(action === 'approve' ? { confirmation: 'approve-exact-generated-output-artifact', technicalEvaluationSha256: model.decision.technical.evidenceSha256 } : {}) });
      const target = { siteVersionId: next.siteVersionId, artifactId: next.artifactId, artifactBundleSha256: next.artifactBundleSha256 };
      setChoices(await request(`${endpoint}?${scope}`));
      remember(target); setModel(next);
      setNotice(action === 'withdraw' ? 'First publication withdrawn. Saved source, candidate and approval remain retained. Verify the working domain again before republishing.' : action === 'publish' ? 'This exact version is published.' : action === 'prepare' || action === 'change-recipient' ? 'Public version saved. Open the preview before approving.' : 'Exact artifact approved. Domain readiness is checked separately by Publish.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Operation failed. Retry the same selection.'); }
    finally { setBusy(false); }
  }
  if (loaded && !choices.length) return null;
  const hostMatches = model?.publicPreparation?.host === props.host.trim().toLowerCase();
  const technicalPass = model?.decision.technical.status === 'PASS';
  const approved = model?.decision.review.status === 'APPROVED';
  const preview = selected ? `${endpoint}/preview?${scope}&${new URLSearchParams(selected)}` : '';
  return <section aria-label="Public generated website" style={{ padding: 16, border: '1px solid #cbd5e1', borderRadius: 8, display: 'grid', gap: 10, overflowWrap: 'anywhere' }}>
    <h3 style={{ margin: 0 }}>Prepare and publish a generated website</h3>
    <label>Retained version <select aria-label="Retained generated version" value={selected?.siteVersionId ?? ''} disabled={busy || !props.canPublish} onChange={e => {
      const choice = choices.find(c => c.siteVersionId === e.target.value);
      if (choice) { if (choice.host) props.onHost(choice.host); remember(choice, choice.host ?? props.host); } else { setSelected(null); setModel(null); setConfirmed(false); props.onSelection(null, true); }
    }}><option value="">Choose a version</option>{choices.map(c => <option key={c.siteVersionId} value={c.siteVersionId}>Version {c.versionNo} · {c.host ?? 'Generated source'} · {c.state}</option>)}</select></label>
    {model ? <>
      <div>Version: {model.siteVersionId}<br />Artifact: {model.artifactId}<br />SHA-256: {model.artifactBundleSha256}</div>
      {model.stackiRevision && <p>Saved Stacki revision: {model.stackiRevision.revision}<br />Draft SHA-256: {model.stackiRevision.sha256}<br />These source edits are retained in this artifact. Canonical content/design are not synchronized; regenerate only from the saved source.</p>}
      {model.state === 'PUBLISHED' && !model.activePublication && <p>This artifact is not currently serving on the working domain.</p>}
      {model.activePublication && model.publicPreparation?.expectedActivePointer === null && <button disabled={busy || !props.canPublish || !hostMatches} onClick={() => {
        if (window.confirm(`Withdraw this exact first publication from ${model.publicPreparation!.host}? Retained drafts and artifacts will be preserved.`)) void act('withdraw');
      }}>Withdraw first publication</button>}
      <div>Target host: {model.publicPreparation?.host ?? (props.host || 'Enter a domain above')}<br />Contact recipient: {model.contactRecipient ?? 'No native contact configured'}<br />State: {model.state} · Technical: {model.decision.technical.status} · Human approval: {model.decision.review.status}</div>
      {model.publicPreparation?.contactRecipientChange ? <p>Recipient change: {model.publicPreparation.contactRecipientChange.from} → {model.publicPreparation.contactRecipientChange.to}. {model.activePublication ? 'This recipient change is now active.' : 'The old recipient remains active until successful Publish.'}</p> : null}
      {model.activePublication && model.contactRecipient ? <fieldset disabled={busy || !props.canPublish}>
        <legend>Change contact recipient</legend>
        <p>One recipient applies to all supported contact forms on this site. The current recipient remains active until you review, approve and publish the new artifact.</p>
        <label>New recipient <input type="email" value={recipient} onChange={e => { setRecipient(e.target.value); setRecipientConfirmed(false); }} /></label>
        <p>{model.contactRecipient} → {recipient || '(enter email)'}</p>
        <label><input type="checkbox" checked={recipientConfirmed} onChange={e => setRecipientConfirmed(e.target.checked)} /> I confirm the new recipient: {recipient || '(enter email)'}</label>
        <button disabled={!recipientConfirmed || !isContactEmail(recipient.trim()) || recipient.trim() === model.contactRecipient || !hostMatches} onClick={() => act('change-recipient')}>Prepare recipient change</button>
      </fieldset> : null}
      {!model.publicPreparation ? <button disabled={busy || !props.canPublish || !technicalPass || !props.host.trim()} onClick={() => act('prepare')}>Prepare public version</button> : <>
        <div>{model.outputPaths.map(path => <a style={{ marginRight: 12 }} key={path} href={`${preview}&path=${encodeURIComponent(path)}`} target="_blank" rel="noreferrer">Preview {path}</a>)}</div>
        <p style={{ margin: 0 }}>Preview does not send email. Approval applies only to the artifact and hash shown here. Domain/TLS readiness and publication are separate checks. Mail acceptance does not prove inbox delivery.</p>
        {!hostMatches ? <p>Set the domain above to {model.publicPreparation.host} to approve or publish this target.</p> : null}
        <label><input type="checkbox" checked={confirmed} disabled={busy || approved} onChange={e => setConfirmed(e.target.checked)} /> I reviewed this exact artifact and approve publication at {model.publicPreparation.host}.</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={busy || !props.canPublish || !confirmed || !technicalPass || approved || !hostMatches || model.state !== 'READY_FOR_REVIEW'} onClick={() => act('approve')}>Approve exact artifact</button>
          <button disabled={busy || !props.canPublish || !approved || !technicalPass || !hostMatches} onClick={() => act('publish')}>Publish exact artifact</button>
        </div>
      </>}
      {model.decision.blockerReasons.length ? <ul>{model.decision.blockerReasons.map(b => <li key={b.code}>{b.message} ({b.code})</li>)}</ul> : null}
    </> : null}
    {selected && model ? <ImportReviewPanel agencyId={props.agencyId} clientId={props.clientId} siteId={props.siteId} selection={selected} canEdit={props.canPublish} preview={model.publicPreparation?preview:null} /> : null}
    {selected && model?.stackiRevision ? <StandalonePublicationPanel agencyId={props.agencyId} clientId={props.clientId} siteId={props.siteId} selection={selected} canPublish={props.canPublish} /> : null}
    {selected ? <button disabled={busy} onClick={() => setSelected({ ...selected })}>Refresh selected status</button> : null}
    <p role="status" style={{ margin: 0 }}>{busy ? 'Processing the selected version…' : notice}</p>
  </section>;
}
