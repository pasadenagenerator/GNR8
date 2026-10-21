# Stacki — deduplicirana hramba, lokalni in gostovani dokaz, 21. 10. 2026

## Produkcijska izdaja — 21. 10. 2026 (pripravljena, namestitev še ni potrjena)

Obseg: ena konsolidirana izdaja `gnr8-platform` na obstoječi produkciji
`app.pasadenagenerator.com`, iz preverjene produkcijske osnove `2f64d82f`.
Produkcija prej nima nobenega Stacki modula. Izdaja zato vključuje minimalno celoto:
pripravo izvorov, draft/session store in poti, Save bridge, runtime adapter ter panel.
Obe produkcijski kompoziciji uporabljata isti deduplicirani `SupabaseStackiDraftStore`.
GitHub eksperiment in nepovezane lokalne spremembe niso del izdaje.

- Skupna pilotna avtorizacija pokriva tudi neposredni GET/POST/PREPARE, ne samo sej.
  Obstoječe lastništvo se preveri pred pilotnim ID in ponovno pred potrditvijo Save.
  Edini dovoljeni uporabnik ostaja `2c7ca7da-3f95-4a36-a385-7d5270eaaea7`.
- Dodatna neobvezna GET parametra `revision=1..64` in `verify=1` omogočata omejeno
  zgodovinsko branje in majhno potrdilo vseh preverjenih SHA/velikosti. Privzeti
  GET in Save odzivi ostanejo enaki. Verify prebere vse trajne odvisnosti; ne zaupa
  samo manifestu in ne pošilja velikih base64 payloadov skozi serverless odziv.
- Preflight: zasebni bucket, brez neposrednih client/anon storage politik, usklajeni
  auth/database/storage projekti; head **8**, legacy **5**, oba pričakovana SHA;
  ni aktivnih sej, 7/10 mesečnih rezervacij. Snapshot je veljaven do
  **2026-10-22 07:26 UTC / 09:26 Ljubljana**. Ni samodejne plačljive obnove.
- Ohrani se trenutna produkcijska priprava javnega izhoda, nastavitve prejemnikov,
  native kontakt in vse objavljene vsebine. Pred/po primerjava zajame aktivne
  kazalce, domenske vezave, site-version state in manifest hashe Logatčana.
- Lokalno: **58/58** testov Stacki/izvorov/eligibility/lastništva PASS; focused
  TypeScript/ESLint in route exports PASS. Izolirani production build: compilation,
  lint, build typecheck in vseh 97 statičnih strani PASS. Končni bundle vsebuje
  dual reader, v2 writer, pilotno preverjanje in vse tri Stacki poti. Prvi testni zagon je okolje ustavilo pri
  localhost listenerjih; dovoljen lokalni zagon je uspešen. Širši predhodni
  TypeScript ima 174 nepovezanih diagnostik; ni označen kot uspešen.
- Nova produkcijska Save/reopen mutacija ni dovoljena s prejšnjim porabljenim
  Preview testom. Za izdajo uporabimo preverjeni hosted Save 6/7, restore 8 in
  novo read-only produkcijsko preverjanje legacy/v2. To ni nov produkcijski UI Save.

Rollback: po prvem v2 se ne vračaj na old-only reader. Ohraniti je treba to
izdajo z dual readerjem; za nujen varen stop nastavitev
`GNR8_STACKI_SESSIONS_ENABLED=0` ustavi nove editor akcije, za vse draft mutacije
pa tudi `GNR8_STACKI_DRAFTS_ENABLED=0`. Sprememba Vercel nastavitev potrebuje novo
izdajo za uveljavitev; ni takojšnji kill switch za že ustvarjene namestitve.
Ob že odprtih sejah najprej ohrani potrjeno delo in jih zapri po obstoječem toku.
Zgodovina/objekti se nikoli ne brišejo ali preštevilčijo. Prejšnja produkcija nima
Stackija; vračanje nanjo bi urednik odstranilo, zato ni rollback za nadaljnje urejanje.
Nadaljnji release ali zagon canaryja zahteva svoj jasno določen obseg.

---

**Lokalno in na enem odobrenem protected Previewu preverjeno.**
Gostovani Save A/B je potrdil 6/7; revizija **8** povrne vseh 118 izhodiščnih
datotek iz revizije 5. Obe seji sta ustavljeni. [Gostovani rezultati](hosted-evidence.json).
GitHub ostane odložen. Ni migracije, brisanja zgodovine, objave ali nove infrastrukture.
Isti uporabniški tok Save → nadaljevanje urejanja → Save → Shrani in zapri → sveže
odprtje deluje skozi dejanski Studio, React panel, session handlers in novi store.

## Rezultat in ohranjeni vhod

Vhod je zasebni `.gnr8/stacki-github-proof/input.json`: dejanska ohranjena revizija
**5**, SHA-256 `4957be4767153e0f0099d7668516929fe852fb930a4ac1f83d5d6323ddc95c88`.
Parser, ohranjeni provenance in [gostovano dokazilo](../stacki-save-hosted/README.md)
se ujemajo. Poznejši odobreni preflight 21. 10. ob 07:10 UTC je neodvisno potrdil
isti hosted head 5 in hash. Izvirni lokalni vhod je po dokazilu nespremenjen.

Vseh **118 datotek / 7.649.623 dekodiranih B** vključuje 102 sredstva, 13 izvornih
datotek in tri datoteke `.studio-state`. Preslikava poti in bajtov iz preverjenega
checkpointa ostaja avtoritativna. Ni ponovnega zajema spletne strani ali ugibanja URL-jev.
Zasebni payloadi in celotni hashi ostanejo v ignoriranem `.gnr8/` oziroma začasnem
lokalnem imeniku; spodnji JSON vsebuje samo meritve in dokazne identitete.

- Dejanski lokalni Save A je iz legacy 5 ustvaril manifest **6**. Po namenoma
  izgubljenem odgovoru je UI pokazal nepotrjen Save; ponovitev iste operationId je
  vrnila 6. Save B je ustvaril **7**, urejanje je ostalo odprto.
- Shrani in zapri je uporabil potrjeno operacijo B: head je ostal 7, brez revizije 8.
  Prvi delovni imenik je odstranjen. Nov SDK/store in nov lokalni runtime sta
  obnovila vseh 118 datotek pred zagonom Studia; naslov B je bil viden.
- Sveži readback revizij **5/6/7** preveri vsak SHA, source/Yjs skladnost in vseh
  102 nespremenjenih sredstev ter deset drugih strani, vključno s kontaktom.
  Legacy 5 ostane bajtno enak. Druga seja je zaprta brez Save; oba imenika odstranjena.
- Ločen obnovitveni ogled je iz nove objektne shrambe obnovil tudi starejši A
  primerjalnega zaporedja (revizija 2); dejanski Stacki je prikazal njegov naslov
  in slike. Beseda »GitHub« v tem naslovu je iz ohranjenega primerjalnega vhoda,
  ne iz nove integracije. Ta ogled ima Save onemogočen in je ustavljen.
- Podedovane rdeče podlage, slab kontrast in oblikovne posebnosti niso popravljene.
  To je dokaz zvestobe shranjevanja/obnove, ne nova oblikovna odobritev.
  Kontaktnega obrazca nismo poslali; vsebina in konfiguracija kontakta sta nespremenjeni.

Dokazi: [meritve](evidence.json), [seje in preverjene revizije](session-evidence.json),
[saved-b.png](saved-b.png), [closed.png](closed.png), [restored-b.png](restored-b.png),
[restored-earlier-a.png](restored-earlier-a.png).

## Hramba, celovitost in združljivost

- Nespremenljivi binarni objekti imajo ključ SHA-256 pod
  `stacki-file-objects/v1/{agency}/{client}/{site}/{version}/{sha256}`.
  Ponovna uporaba je omejena na to celotno lastniško območje; ni globalnega
  preverjanja obstoja ali uporabe objektov drugega tenanta.
- Manifest vsebuje vse poti, SHA-256 in velikosti, scope, actor, revizijo,
  prvotni javni checkpoint hash in lasten hash. Zunanji v1 zapis z `files/base64`
  in HTTP/session/UI pogodbe ostanejo enaki. Base64 je samo transportna pogodba,
  ne novi format hrambe datotek.
- **Ista** zaporedna pot `stacki-checkpoints/v1/.../NNNN.json` in `upsert:false`
  ostaneta edina avtoriteta revizij. Legacy JSON in novi manifesti se ne zapisujejo
  v dve ločeni zaporedji. Ni mutable latest kazalca ali nove tabele/bucketa.
- Nov objekt se pred manifestom prebere in preveri po SHA-256 in velikosti.
  Obstoječi objekt se brez ponovnega prenosa uporabi samo ob preverjenem trenutnem
  manifestu in ujemanju svežih scoped metapodatkov `size/eTag`. ETag/MD5 je
  detektor spremembe standardnega provider objekta, **ne** naslov objekta ali
  nadomestilo za SHA-256 pri obnovi. Pred prvim v2 commitom se preverijo tudi
  metapodatki vseh novih objektov. Manjkajoči/nezdružljivi metapodatki zavrnejo Save.
- Vsi podatkovni prenosi imajo največ šest vzporednih zahtevkov. Seznam metapodatkov
  uporablja strani po 1.000 objektov in največ 17 strani; prekoračitev varno zavrne
  Save. Orphan ali ponovno uveden starejši objekt se prebere in preveri po SHA-256,
  preden se uporabi; pomnilniški cache ni avtoriteta.
- Manifest se naloži šele po objektih, nato se ponovno prebere in preveri. Izgubljen
  odgovor se uskladi z istim immutable ključem. Isti actor/payload vrne isto revizijo;
  drugačen stale payload vrne konflikt. Pravice se ponovno preverijo pred commitom
  in pred potrditvijo; preklic med objektnim prenosom ne ustvari manifesta.
- Stari zapisovalnik novega manifesta ne more prebrati, zato varno odpove. Sočasno
  tekmovanje starega/novega writerja za isti ključ lahko potrdi le en zapis.
  Rollback po prvem v2 zapisu zahteva ohranitev dual readerja ali izklop urejanja;
  vrnitev samo starega readerja pomeni nedostopen Save/odpiranje za to zgodovino.
  Brisanje, preštevilčenje ali obhod manifesta niso dovoljeni.
- Prvotni limiti ostanejo: 64 revizij, 8 MiB dekodiranega projekta, 1 MiB/datoteko,
  do 256 datotek in 12 MiB kodiranega checkpointa. Runtime capture še vedno zajame
  celoten projekt in stanje urejevalnika; prihranek se nanaša na persistence I/O.

## Izmerjeno — popolnoma isti izhodišče/A/B/ponovitev B

Primerjava uporablja nespremenjene ohranjene `capture-initial/A/B.json` iz prejšnjega
poskusa, skupaj z vsem stanjem in sredstvi. B poleg besedila zamenja eno referenco
na že obstoječo sliko; **bajti sredstev se v primerjavi ne spreminjajo**. Legacy
kontrola je zamrznjena kopija dejanskega prejšnjega store, oba uporabljata isti pravi
Supabase SDK in lokalni filesystem transport. Nov shranjeni objekt in metadata I/O
sta izmerjena; brez HTTP/TLS glav in provider indeksov/replikacije/obračuna prostora.
Tabela meri draft store, ne nespremenjenih session receiptov, preverjanja članstva
ali runtime capture. Vključuje vse datoteke, potrebne za obnovo, tudi `.studio-state`.

| Meritev | Polni checkpointi | Tri nove deduplicirane revizije | Legacy izhodišče + novi A/B |
|---|---:|---:|---:|
| Vsi shranjeni payloadi | 30.657.707 B | **7.943.813 B** | 17.945.511 B |
| Prihranek | — | **74,09 %** | **41,47 %** |
| Naloženi payloadi | 30.657.707 B | 7.943.813 B | 17.945.511 B |
| Prebrani payloadi med Save/retry | 71.534.715 B | 8.030.144 B | 28.222.274 B |
| SDK klici Save/retry | 22 | 262 | 257 |
| Upload / download / metadata klici | 3 / 7 / 12 | 122 / 125 / 15 | 120 / 123 / 14 |
| Metadata request / response bajti | 980 / 853 | 2.716 / 104.090 | 2.220 / 69.063 |
| Lokalni časi izhodišče / A / B / retry | 230 / 316 / 334 / 328 ms | 188 / 136 / 135 / 101 ms | 206 / 271 / 134 / 102 ms |
| Sveža obnova: payload | 10.219.301 B | 7.508.802 B | 7.508.802 B |
| Sveža obnova: klici / čas | 3 / 128 ms | 118 / 94 ms | 118 / 91 ms |

Pri novem formatu izhodišče potrebuje 236 klicev, A in B po **11**, retry 4.
B prenese **217.579 B**: dve spremenjeni datoteki (Astro in usklajeno Yjs stanje)
ter 28.777 B manifesta. Ni prenosa nespremenjenih slik v nobeno smer med B Save.
115 različnih hashov predstavlja 118 poti; identični bajti so shranjeni samo enkrat.

**74,09 % ni prihranek po brisanju starih podatkov.** Velja za tri nove revizije
v novem formatu. Izmerjena mešana zgodovina staro polno izhodišče ohrani in doseže
41,47 %. Obstoječe gostovane revizije 1–5 niso pretvorjene ali odstranjene.

Ločena zamenjava slike doda veljaven JPEG z novimi bajti (380.778 B), nov hash in
manifest: **409.555 B** dodatne hrambe/uploada, 9 zahtevkov, 134 ms lokalno.
Stara revizija 3 in nova 4 se obnovita v celoti; star objekt ostane. Ta primer ni
vključen v zgornji prihranek. Celoten runtime capture je ločen od teh meritev.

**Ni trditve o hitrejšem gostovanem Save.** Začetni zapis in obnova imata bistveno
več zahtevkov kot polni checkpoint; meja šest hkratnih zahtevkov omeji pritisk,
ne odpravi omrežne zakasnitve. Lokalni OS cache ni izpraznjen. V primerjavi s
prejšnjimi 523 objektnimi klici smo odpravili serijsko ponovno branje nespremenjenih
sredstev na vsak Save, a začetni strošek in 115 objektnih branj pri obnovi ostajata.

## Spremenjene datoteke in preverjanje

Pod `apps/platform/gnr8/stacki/`:

- `stacki-draft-contract.ts`: interni manifest, strogo preverjanje poti/velikosti/hashov.
- `stacki-draft-store.ts`: binarni objekti, isti revision CAS, dual reader, scoped reuse,
  zgodovinska obnova, omejena sočasnost, ponovno preverjanje pravic.
- `stacki-draft-route-handlers.ts`, `stacki-session-routes.ts`: posredujeta obstoječe
  preverjanje lastništva tudi pred commitom/potrditvijo.
- `stacki-draft-composition.ts`: dokumentirana binarna/metadata in rollback meja;
  nobene spremembe nastavitev ali dovoljenj.
- `stacki-local-storage-transport.ts`: metadata/pagination in merjenje lokalnih bajtov.
- `stacki-drafts.test.ts`: pričakuje dodatni preverjanji pravic.
- `stacki-deduplicated-storage.test.ts`: mešana zgodovina, stari/novi writerji,
  reuse, asset replacement, manjkajoči/poškodovani objekti, prekinitev, metapodatki,
  paginacija, omejitve in preklic pravic med uploadom.
- `stacki-legacy-store.fixture.ts`: zamrznjen stari store samo za teste/primerjavo;
  aplikacija ga ne uvaža.
- `run-stacki-deduplicated-proof.ts`: omejen lokalni ponovljiv dokaz in starejši ogled.
- `run-stacki-session-proof.ts`: razširjen obstoječi dokaz z ohranjenim legacy vhodom
  in svežim SDK/store kontekstom, preverjanjem vseh datotek pred runtime zagonom.

Dodano je to dokazilo z dvema JSON zapisoma in štirimi posnetki. Nobene spremembe
panela, runtime capture, originalnih izvorov ali nepovezanega uporabnikovega dela.

Preverjanje:

- `TSX_TSCONFIG_PATH=apps/platform/tsconfig.json node --conditions=react-server
  --import tsx --test` za `stacki-deduplicated-storage`, `stacki-drafts`,
  `stacki-session`, `stacki-runtime-files`, `stacki-runtime-checkpoint` in
  `stacki-draft-composition`: **25/25 PASS**.
- `node --import tsx apps/platform/gnr8/stacki/run-stacki-deduplicated-proof.ts`:
  PASS, legacy/new/mixed primerjava, vsak file hash, zamenjava sredstva in restore.
  `--editor` omogoča samo lokalni ogled starejše revizije z obstoječimi odvisnostmi.
- Obstoječi `run-stacki-session-proof.ts` s pinned lokalnim runtime, ohranjenim
  Logatčan projektom in opcijskim `input.json`: dejanski UI tok PASS.
  Naknadni metadata precommit in reauthorization preverjanji sta pokriti s končnimi
  testi in ponovljenim store dokazom; UI/bridge/capture se po ogledu niso spreminjali.
- Osredotočeni TypeScript in ESLint: PASS; le obstoječe ESLintRC opozorilo.
- Širši Platform TypeScript: **174 obstoječih napak izven Stackija/panela**, enako
  predhodnemu dokazu. Ta gate ni zelen; napak nismo odpravljali ali skrili.
  Prva napačna nastavitev zagona (composite/incremental) je popravljena pred tem
  dejanskim preverjanjem. `make check`/deploy build ni izveden.
- `git diff --check` in pregled novih datotek: PASS. Začetni lokalni listener je
  sandbox zavrnil; dovoljen localhost zagon je nato uspel. Ni zavrnjene gostovane akcije.

## Preostala tveganja in meja aktivacije

**Lokalna faza: nič gostovanih klicev, zapisov, deployev, plačanih izvajanj, snapshot obnovitev,
DNS ali objav.** Vsi lokalni editorji so ustavljeni. Pravi uporabnikov osnutek,
izvorni artefakti, objavljene različice, odobritve, kontaktne nastavitve, domene in
live pointers ostanejo nespremenjeni. Product behavior changed: **da v lokalni
implementaciji hrambe; v poznejši gostovani fazi tudi na odobrenem Previewu. Save vmesnik ostaja enak**.

Shramba mora biti zasebna, njeni objekti nespremenljivi za uporabniške odjemalce,
`metadata.size/eTag` pa zanesljiva metapodatka standardnega uploada. To je pogoj
ponovne uporabe brez prenosa; SHA-256 obnova se vedno preveri. Lokalni transport ni
gostovani Supabase in ne dokazuje njegovih dovoljenj, consistency ali zakasnitev.
Zapis ali brisanje s privilegiranim zunanjim odjemalcem lahko krši predpostavko
nespremenljivosti; ta naloga ne uvaja novega mehanizma upravljanja administratorjev.

Prekinjen Save lahko pusti nereferencirane objekte: največ velikost veljavnega
zajema na poskus, ponovitve identičnih bajtov ne ustvarjajo kopij. Več različnih
neuspešnih poskusov lahko kopičenje poveča; ni globalne nove kvote ali GC. Limit
inventory ustavi nadaljnji Save ob prevelikem številu objektov, ne briše podatkov.
Dolga zgodovina, množična uporaba in hosted latency niso preverjeni.

### En omejen gostovani sprejem — odobren 2026-10-21

Cilj je **en protected pilot Preview**, obstoječi pilot
`2c7ca7da-3f95-4a36-a385-7d5270eaaea7`, zasebni Logatčan draft z agency
`00000000-0000-4000-8000-000000000001`, client
`9251b11f-3539-43ee-9a24-834c6a237852`, site
`8c6eb062-8697-4f19-98a3-7539a274d916`, version
`cc5b8ffe-9cd9-47fa-aa38-2efe35592329`, bucket `gnr8-astro-candidate-routes`.
To je izolacija od objave in drugih scopeov, **ne kopija realnega osnutka**;
Uporabnik je z »Da, dovolim« izrecno dovolil spodnje append-only testne revizije v tem draftu.

1. Read-only preveri trenutni head/hashe, članstvo, zasebnost, mime tipe,
   metadata, razpoložljive revizije/start rezervacije, snapshot in vključeni kredit.
   Ohrani točni trenutni checkpoint zasebno. Če se je head od dokazila spremenil,
   ne uporabi starega vhoda. Ne zvišuj limitov in ne spreminjaj bucket politik.
2. En Preview z dual readerjem in istim CAS; ohrani pilot allowlist. Zahtevaj,
   da ni drugih aktivnih pilot sej/Save; ob njih se ustavi in ohrani uporabniško delo. Starega writerja ne
   usmerjaj v drug namespace. Pred prvim manifestom zahtevaj uspešen binary readback
   in metadata test; ob neuspehu se ustavi brez potrditve novega formata.
3. Največ en pripravljalni Sandbox (2 vCPU, 10 min) in en čist 24-urni snapshot,
   samo če obstoječi hook-v2 runtime ni več veljaven; največ dva editor SandBoxa
   (2 vCPU, 20 min vsak), ena Preview namestitev. Predlog je **največ $1 dodatne
   porabe iz obstoječega kredita**, ob predhodnem preverjanju cen in rezervacij.
   Časovni/resource limiti so trdi; ni realnočasovnega dolarskega cutoffa.
4. Največ **tri** nove potrjene draft revizije: A, B, nato vrnitev točnih vhodnih
   datotek kot nova revizija. A/B se preverita z odprtim editorjem, Save-and-close
   brez duplikata in svežo obnovo B. V drugi seji nato obnovi izhodiščne datoteke
   skozi isto avtoriteto; vsak hash mora ustrezati preflight vhodu. Manifesti,
   file objects in obstoječi session/operation/reservation receipts so edini
   dovoljeni zapisi. Brez fault injection, brisanja ali asset testov v realnem draftu.
5. Ustavi oba editorja/builder, preveri končni head in da se zadnje datoteke ujemajo
   z izhodiščem. Ob konfliktu ali nejasnem odgovoru najprej readback iste operacije;
   brez novega operationId za obhod napake. Ne povoziti sočasne spremembe. Ob blokadi
   ohrani zasebni baseline in vse potrjene revizije, ustavi pisanje ter poročaj.
   Rollback ohrani dual reader ali izklopi pilot editing; ničesar ne odstrani.

Ta predlog ne dovoljuje produkcijskega deploya, migracije, nove tabele/bucketa,
GitHuba, Generate, objave, kontaktnega pošiljanja, spremembe dovoljenj ali live pointerjev.
Če predpogoji zahtevajo drugačne pravice ali večji obseg, se ta načrt ustavi.

### Gostovana izvedba po odobritvi — PASS

- Preflight 2026-10-21 07:10 UTC: head **5**, 118 datotek / 102 asseta, isti SHA
  kot lokalni vhod. Lastništvo, obstoječi superadmin/pilot dostop in zasebni bucket
  potrjeni. MIME neomejen; `metadata.size/eTag` potrjena. Ni drugih aktivnih sej.
- Ena protected Preview namestitev **`dpl_GK8zt8aFGmJwYUFdrYV6ndXgo4RU`**,
  [odpri novi Preview](https://gnr8-platform-ctrdz07sh-pasadena-generators-projects.vercel.app/gnr8/agency/clients/9251b11f-3539-43ee-9a24-834c6a237852/sites/8c6eb062-8697-4f19-98a3-7539a274d916/design?agency=00000000-0000-4000-8000-000000000001&variant=760cdc7f-712f-486b-9a2f-06a0715fcb91).
  Protection `all_except_custom_domains`; isti pilot. Compilation, lint, build
  typecheck in 97 statičnih strani PASS. Ločeni širši TypeScript še ima 174
  predhodnih napak. Pet produktnih modulov in SHA so v gostovanem dokazilu.
- Prvi dejanski UI Save: **A → 6**, nato **B → 7**, vmes urejanje ostane odprto.
  V2 manifest in uspešna obnova dokazujeta uporabo novega modula v nameščenem
  bundleu. Prvi Save pred potrditvijo preveri binarni readback in metadata.
  B doda **2 objekta / 188.793 B + manifest 28.777 B**; vseh 115 objektov A
  ostane z enakimi metadata, vseh 102 javnih sredstev z enakimi SHA. Spremenjena
  sta samo `src/pages/index.astro` in pripadajoča Yjs datoteka. To so izmerjene
  velikosti novih shranjenih objektov, ne omrežni wire-byte števec.
- **Shrani in zapri → še vedno 7**, isti checkpoint SHA, prvi Sandbox ustavljen.
  Drugi, sveži Sandbox obnovi B: **118/118 SHA se ujema**, naslov B viden.
- Natančna povrnitev začetnih datotek kot **8** prek istega
  `SupabaseStackiDraftStore`, istega scope/CAS in ponovne pilot/ownership
  avtorizacije. To je neposredna povrnitev hranjenega checkpointa, ne dodatni UI
  Save, zato zajem v živem editorju ne spremeni izhodiščnih Yjs bajtov. Popolni
  readback potrdi **118/118 začetnih datotek**. Nato druga seja zaprta brez Save.
- Končno ob 07:29 UTC: head **8**, legacy **5** nespremenjen, isti izvorni
  artifact ID in manifest SHA. Obe session closed potrdili obstajata in oba
  Sandboxa sta `stopped`. Mesečne rezervacije 5 → 7; ostanejo 3. Noben builder
  ali nov snapshot ni ustvarjen; ponovna uporaba je samodejno podaljšala TTL
  obstoječega snapshot-a do 22. 10. 07:26 UTC.
- Prikazana ekipna poraba vključenega kredita **$2,35 → $2,52**, razlika **$0,17**;
  on-demand $0. Prikaz lahko zamuja in ni končni račun. Ni nakupa, novih limitov
  ali produkcijskega deploya. Uporabljeni sta natanko dve 2-vCPU seji z obstoječima
  20-minutnima omejitvama in natanko tri nove revizije.
- Vercel CLI je običajno osvežil poteklo prijavo; uporabnik se je prijavil v novi
  Preview. Avtomatizacija brskalniškega confirm dialoga je imela težavo s fokusom;
  potrditev v aktivnem Chromovem oknu je zaključila drugo sejo brez dodatnega Save.
  Gostovanih neuspelih Save/deploy poskusov ni bilo.

Dokazi: [hosted-evidence.json](hosted-evidence.json), [potrjeni B](hosted-saved-b.png),
[zaprta prva seja](hosted-closed.png), [sveže obnovljeni B](hosted-restored-b.png),
[končno zaprta seja](hosted-final-closed.png). Zasebni baseline in podrobni hashi
ostanejo v ignoriranem `.gnr8/stacki-dedup-hosted/`.

**Product behavior changed: da**, deduplicirana hramba je aktivna na novem pilotnem
Previewu; ni produkcijske objave. Stari writer/reader novega v2 heada ne podpira in
se zapre z napako; za nadaljnje urejanje uporabi novi Preview. Rollback mora
ohraniti dual reader ali izklopiti pilot editing. Zgodovina in file objects se ne
brišejo. GitHub, DNS, Generate, objava, kontaktno pošiljanje in live pointerji niso
bili spremenjeni. Obnova/preizkus dolgih zgodovin in množična uporaba ostajata izven
tega dokaza. Veljavnost runtime snapshot-a je časovno omejena; ni dodan monitor.
