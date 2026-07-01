# Načrt GNR8

## Uvod

Načrt GNR8 je kanonična arhitekturna pripoved za GNR8.

To je priporočeni uvodni dokument pred branjem podrobnih specifikacij.
Pojasnjuje, kaj je GNR8, zakaj obstaja, kako njegove plasti delujejo skupaj
in kako platforma poslovno razumevanje pretvarja v vodene digitalne izkušnje.

Ta dokument ni nova specifikacija. Ne uvaja novih arhitekturnih konceptov,
shem, implementacijskih načrtov, izvajalnega vedenja, promptov, adapterskih
plasti za ponudnike, integracij AI, generacijskih sistemov, objavnih sistemov
ali uporabniških površin. Zaključene arhitekturne družine uskladi v eno
koherentno sistemsko pripoved.

Kanonične podrobne reference vključujejo:

- `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`
- `docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md`
- `docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`
- `docs/architecture/BUSINESS_DOMAIN_MODEL_SPECIFICATION.md`
- `docs/architecture/BUSINESS_INTENT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_UNDERSTANDING_REPORT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_ALIGNMENT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_JOURNEY_SPECIFICATION.md`
- `docs/architecture/DECISION_ARCHITECTURE_SPECIFICATION.md`
- `docs/architecture/DECISION_ARTIFACT_AUTHORIZATION_MATRIX.md`
- `docs/architecture/CANONICAL_ARTIFACT_GOVERNANCE_STATE_MODEL.md`
- `docs/architecture/CANONICAL_ARTIFACT_LINEAGE_AND_VERSIONING_MODEL.md`
- `docs/architecture/WEBSITE_DESIGN_BRIEF_SPECIFICATION.md`
- `docs/architecture/WEBSITE_GENERATION_PACKAGE_SPECIFICATION.md`
- `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_SPECIFICATION.md`
- `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REPORT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

## Vizija

GNR8 je AI Orchestrator z vodenim Digital Business Twin v svojem jedru.

GNR8 obstaja zato, da podjetja in njihove digitalne identitete razume dovolj
globoko, da lahko pripravi vodene, z viri utemeljene projekcije za zunanje AI
sisteme, validira rezultate, jih usmeri skozi Business Approval in objavi
samo rezultate z Business Approval.

GNR8 ni tradicionalni gradnik spletnih strani.

GNR8 ni CMS.

GNR8 ni generični urejevalnik strani.

Podjetje obstaja neodvisno od katerekoli spletne strani. Spletna stran je le
en izraz podjetja. Digital Business Twin predstavlja podjetje samo.

Dolgoročni namen GNR8 ni enkratna generacija spletne strani. Namen je skozi
čas ohranjati in izboljševati vodeno poslovno razumevanje, nato pa to
razumevanje uporabiti za pripravo, vrednotenje, odobritev, objavo in razvoj
digitalnih izkušenj.

## Osrednji Problem

Večina digitalnih orodij začne prepozno.

Tradicionalni CMS-i predpostavljajo, da podjetje že ve, kaj mora povedati,
kako mora to strukturirati, katere izkušnje so pomembne, katerim občinstvom
mora služiti in kateri poslovni rezultati morajo voditi spremembe. Shranjujejo
in objavljajo vsebino, vendar ne postanejo vodeno operativno razumevanje
podjetja.

Tradicionalni gradniki spletnih strani olajšajo izdelavo spletnih strani, a
so še vedno osredotočeni na strani, bloke, predloge, stiliranje in ročno
urejanje. Osebi lahko pomagajo ustvariti izraz podjetja, vendar podjetja
samega ne ohranijo kot vira resnice.

Generični AI gradniki lahko hitro generirajo, vendar hitrost ni razumevanje.
Generiranje, ki se začne s promptom, lahko dokaze, poslovno resnico, želene
rezultate, namero izkušnje, vedenje ponudnika in generirani rezultat združi v
eno nestabilno mejo. To ustvari impresivne osnutke brez trajnega odgovora na
to, kaj je bilo znano, zakaj se je v to verjelo, kdo je to odobril, katero
pogodbo naj bi rezultat izpolnil in ali je končni rezultat sprejemljiv za
podjetje.

GNR8 ta problem rešuje tako, da razumevanje postavi v središče produkta.

Generacija brez razumevanja je prepovedana.

Generirane spletne strani so rezultati, ne dolgoročni vir resnice.

## Temeljna Filozofija

GNR8 ločuje Business, Experience, Generation in Implementation.

Poslovno razumevanje definira namero.

Website Design Brief definira izkušnjo.

Website Generation Package definira generacijo.

GNR8 poseduje pogodbeni pomen.

External AI poseduje implementacijske predloge.

Compliance določa pogodbeno izpolnitev.

Generation Contract Compliance Report komunicira pogodbeno izpolnitev za
Business Approval.

GNR8 komunicira pogodbeno resnico pred objavo.

GNR8 objavlja šele po vodeni poslovni odobritvi.

AI predlaga; ljudje odobrijo.

Orkestrator poseduje nalogo; model jo izvede.

GNR8 mora ostati modelno agnostičen.

Vsak artefakt obstaja zato, da podpira človeško poslovno odločitev. Noben
artefakt ne obstaja brez pooblaščujoče poslovne odločitve. Artefakti so
pooblaščeni, nikoli predpostavljeni.

## Pet Arhitekturnih Plasti

Kanonična plastna arhitektura je:

```text
Reality
-> Knowledge
-> Decision
-> Experience
-> Execution
```

Teh pet plasti je uvodni pogled na obstoječi kanon. Ne nadomeščajo podrobnih
specifikacij, imen artefaktov, modelov vodenja ali korakov življenjskega
cikla.

### Reality Layer

Odgovornost: ohraniti razliko med dejanskim podjetjem in katerimkoli zapisom,
modelom, spletno stranjo, generiranim rezultatom ali objavo.

Reality je dejansko podjetje: njegovo poslovanje, identiteta, omejitve,
občinstva, kanali, izdelki, storitve, vsebina, odnosi ter javni ali zasebni
izrazi.

GNR8 lahko opazuje resničnost, jo modelira, validira trditve o njej in iz nje
ustvarja projekcije. GNR8 ne ustvari resničnosti s shranitvijo zapisa ali
generiranjem rezultata.

V tej plasti:

- podjetje obstaja neodvisno od katerekoli spletne strani;
- dokazi se zajemajo iz izvornega gradiva in človeškega vnosa;
- dokazi so nespremenljivi;
- izvorna opažanja ohranjajo provenienco, kakovost, omejitve in kontekst
  zajema;
- stari dokazi se ne prepišejo, ko se resničnost spremeni.

### Knowledge Layer

Odgovornost: opažene dokaze pretvoriti v vodeno razumevanje.

Kanonična hierarhija znanja je:

```text
Reality
-> Evidence
-> Facts
-> Interpretations
-> Knowledge
-> Understanding
-> Digital Business Twin
-> Projections
-> External AI
```

Evidence je nespremenljiv. Facts so podprti z dokazi. Interpretations so
izpeljane. Knowledge je validirana interpretacija. Understanding je
integrirano znanje.

Digital Business Twin je kanonično operativno razumevanje podjetja in njegove
digitalne identitete. Je determinističen, verzioniran, podprt z dokazi,
nevtralen do ponudnikov, neodvisen od modelov, neprekinjeno razvijajoč se in
človeško voden.

Business Domains so lastniki znanja. Business Intent je lastnik želenih
rezultatov. Experience Domains so lastniki manifestacij.

Knowledge Layer ne shranjuje generirane kode, promptov, payloadov ponudnikov,
objavljenih artefaktov, prehodnega stanja workerjev ali nepodprtih ugibanj kot
kanonične resnice.

### Decision Layer

Odgovornost: voditi, katere poslovne odločitve so dovoljene, kdaj so
dovoljene, kateri artefakti jih pooblaščajo in katere nove artefakte
pooblaščajo.

Decision Architecture vodi poslovne odločitve.

Nikoli ne vodi implementacije.

Decision Architecture je operativna hrbtenica GNR8. Je deterministični model
vodenja, ki opisuje, kako poslovne odločitve napredujejo skozi kanonične
artefakte, obenem pa ohranja lineage in človeško avtoriteto.

Zgoščen življenjski cikel odločanja je:

```text
Evidence
-> Understanding
-> Decision
-> Artifact
-> Next Decision
```

Decision Layer vključuje:

- Decision Architecture;
- Decision Artifact Authorization Matrix;
- Canonical Artifact Governance State Model;
- Canonical Artifact Lineage and Versioning Model;
- Business Approval kot zadnjo poslovno točko vodenja pred Publish.

Authorization ohranja zaupanje, lineage in vodenje. Governance State opisuje
zrelost artefakta in status odobritve. Lineage ohranja zgodovino. Versioning
ohranja razvoj.

### Experience Layer

Odgovornost: vodeno poslovno razumevanje prevesti v človeku berljivo namero
izkušnje, ne da bi se zrušila v implementacijo.

Business Journey je kanonična človeška izkušnja GNR8.

Business Journey ni UI flow.

Ni wizard.

Ni zaporedje zaslonov.

Je vodena človeška izkušnja, skozi katero podjetje postopoma pretvarja svoje
poslovno razumevanje v odobrene digitalne izkušnje.

Experience Layer vključuje človeško usmerjeno transformacijo in transformacijo
namere izkušnje od Business Understanding Report prek Business Alignment do
Website Design Brief.

Business Understanding Report je prva človeško usmerjena projekcija Digital
Business Twin. Trenutno razumevanje GNR8 naredi berljivo in pregledljivo za
ljudi pred nadaljnjim načrtovanjem.

Business Alignment potrdi ali izboljša Digital Business Twin, preden se začne
nadaljnje načrtovanje.

Website Design Brief je kanonični most med poslovanjem in izkušnjo. Definira
predvideni poslovni izraz spletne strani, ne da bi predpisoval implementacijo.

### Execution Layer

Odgovornost: odobreno namero izkušnje pretvoriti v generacijske pogodbe, ki
so nevtralne do ponudnikov, predloge zunanjega AI, dokaze o skladnosti,
poslovno odobritev in vodeno objavljanje.

Website Generation Package je kanonična generacijska pogodba. Ni prompt,
payload ponudnika, React, HTML, implementacija, objavljena spletna stran,
izvajalni artefakt, deployment artefakt ali runtime state.

Provider adapters serializirajo Website Generation Package za zunanji AI.
Nikoli ne redefinirajo pomena.

Zunanji AI sistemi so izvajalni mehanizmi. Lahko generirajo predloge,
osnutke, variante, razlage, layoute, besedila, kodo ali druge rezultate. Niso
viri poslovne resnice.

Generation Contract Compliance vrednoti, ali generirana spletna stran
izpolnjuje Website Generation Package. Vrednoti pogodbeno izpolnitev, ne
implementacijske tehnologije, kakovosti ponudnika, kakovosti prompta ali
subjektivne preference.

Business Approval sprejme ali zavrne poslovno posledico pogodbene izpolnitve.
Odobri poslovno namero. Nikoli ne odobri implementacijske tehnologije,
promptov ali ponudnikov.

Publish je vodena promocija odobrenih verzij v okolje. Objavljanje je
posledica Business Approval, ne dejanje generacije.

## Digital Business Twin

Digital Business Twin je središče GNR8, ker ohranja, kaj podjetje je, kaj je
znano, zakaj je znano, od kod prihaja znanje, kako samozavesten je GNR8, kaj
ostaja negotovo in katere odločitve so vodile digitalni razvoj podjetja.

DBT ni vreča zapisov connectorjev. Je vodena integracija validiranega znanja
Business Domain.

DBT ni prompt.

DBT ni generirana vsebina.

DBT ni objavljen artefakt.

DBT ni model spletne strani.

DBT omogoča, da GNR8 vsako digitalno izkušnjo obravnava kot manifestacijo
poslovnega razumevanja in ne kot vir resnice. Zato so lahko prihodnje spletne
strani, pristajalne strani, kampanje, portali, dokumentacija, chatboti,
prodajna gradiva, učna gradiva in prihodnje družine paketov projekcije istega
poslovnega razumevanja.

Ko se resničnost spremeni, se DBT razvija skozi nove dokaze, revidirana
dejstva, validirane interpretacije, posodobljeno znanje, izboljšano
razumevanje, človeško vodenje in ohranjen lineage. Zgodovine ne mutira tiho.

## Business Journey

Business Journey vodi Business Owner od prvega pogovora do odobrene digitalne
izkušnje.

Kanonične faze journeyja so:

```text
Welcome
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Generation
-> Compliance Review
-> Business Approval
-> Publishing
-> Continuous Evolution
```

Business Journey obstaja nad UI in aplikacijsko navigacijo. Opisuje poslovno
zaupanje, jasnost, zaporedje odločitev in pot vodenja.

Sistem vodi.

Človek odloča.

Zaradi tega GNR8 deluje manj kot upravljanje programske opreme in bolj kot
voden proces digitalne transformacije. Business Ownerju ni treba razmišljati
v kategorijah zaslonov, obrazcev, promptov, ponudnikov, frameworkov ali
implementacijskih mehanik. Business Owner pregleda razumevanje, popravi, kar
je napačno, odobri, kar je usklajeno, in odloči, ali je poslovna posledica
generiranega predloga sprejemljiva.

## Decision Architecture

Decision Architecture vodi razvoj tako, da vsak poslovni napredek naredi
izrecen, pooblaščen, lineage-aware in reverzibilen skozi vodenje, ne skozi
mutacijo.

Odgovarja na vprašanja:

- katere poslovne odločitve obstajajo;
- kdo jih lahko ima v lasti ali k njim prispeva;
- kateri artefakti zagotavljajo dokaze za vsako odločitev;
- kateri predpogoji morajo biti izpolnjeni, preden je odločitev dovoljena;
- katere nove artefakte lahko odločitev pooblasti;
- kako ponavljajoče se odločitve ohranjajo lineage;
- kako človeška avtoriteta ostane ločena od AI predlogov.

Decision Architecture je graph-based in ne linearna. Odločitve se lahko
ponavljajo, vejijo, vračajo k prejšnjemu razumevanju, pooblaščajo revidirane
verzije artefaktov ali blokirajo nadaljnji napredek.

Tako se GNR8 izogne temu, da bi postal slepi pipeline. Pomembno vprašanje ni
"katera naloga se izvede naslednja?", ampak "katera poslovna odločitev je
zdaj dovoljena in kakšen lineage ustvari?"

Arhitektura vodenja po Decision Architecture je:

```text
Decision Model
-> Authorization
-> Governance State
-> Lineage
-> Versioning
-> Canonical Artifacts
-> Business Journey
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

## Generation Architecture

Generacija v GNR8 je omejena s poslovnim razumevanjem, namero izkušnje in
pogodbeno skladnostjo.

Transformacija od razumevanja do generacije je:

```text
Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
```

Website Design Brief pretvori usklajeno poslovno razumevanje v namero
spletne izkušnje. Pojasni, kaj naj spletna stran izraža, komunicira,
prioritizira in omogoči uporabnikom.

Website Generation Package pretvori odobreno namero izkušnje v
deterministično, nespremenljivo, verzionirano, lineage-aware generacijsko
pogodbo, ki je nevtralna do ponudnikov. Opisuje natančno, kaj morajo zunanji
generacijski sistemi ustvariti, kateri poslovni pomen morajo ohraniti, katerih
omejitev ne smejo kršiti in kako bo GNR8 ocenil rezultat.

Provider adapters pretvorijo paket v provider-specific serializacijske
formate. Te serializacije so disposable adapter projections. Ne posedujejo
pomena.

Zunanji AI generira predloge. Ti predlogi se vrednotijo. Ne postanejo
kanonični samo zato, ker so bili generirani.

## Governance

Governance naredi GNR8 zaupanja vreden.

Načela vodenja so:

- vsak artefakt obstaja zato, da podpira človeško poslovno odločitev;
- noben artefakt ne obstaja brez pooblaščujoče poslovne odločitve;
- artefakti so pooblaščeni, nikoli predpostavljeni;
- vsak kanonični artefakt ima governance state;
- Governance State je neodvisen od ponudnika, implementacije, runtimea, UI,
  generacije in objavljanja;
- poslovna zgodovina je nespremenljiva;
- vsak vodeni artefakt ohranja lineage;
- Versioning izpopolnjuje razumevanje; lineage ohranja razvoj;
- AI predlaga; ljudje odobrijo;
- odobritev je pred objavo.

Governance velja skozi celotno verigo od dokazov do objave. To pomeni, da
generirana spletna stran ne more obiti DBT, Business Understanding Report,
Business Alignment, Website Design Brief, Website Generation Package,
Compliance Report ali Business Approval.

## External AI

Zunanji ponudniki AI so izvajalni mehanizmi in ne viri poslovne resnice.

GNR8 lahko delo usmeri v OpenAI, Claude, Gemini, Codex, Stitch, v0 ali
prihodnje ponudnike, vendar noben ponudnik ne postane kanoničen. Noben prompt
ne postane kanoničen. Noben izhod modela ne postane resnica zato, ker ga je
ustvaril model.

Orkestrator poseduje nalogo; model jo izvede.

Zunanji AI lahko generira implementacijske predloge. GNR8 poseduje pomen, ki
ga morajo ti predlogi izpolniti, lineage, ki pojasni, zakaj je bilo delo
zahtevano, proces skladnosti, ki vrednoti, ali je predlog izpolnil pogodbo,
in mejo Business Approval, ki odloča, ali se objava lahko nadaljuje.

Zato mora GNR8 ostati model-agnostic. Zmožnosti ponudnikov se lahko razvijajo,
ne da bi se spremenili poslovna resnica, veriga artefaktov, model vodenja ali
zahteve za odobritev.

## Publishing

Publishing je vodena promocija odobrenih verzij v okolje.

Publish ni neposredna mutacija.

Publish lahko deluje šele po tem, ko ga pooblasti Business Approval.

Business Approval odloči, ali je publishing dovoljen. Publishing izvede
odobreno promocijsko pot.

Kanonično publish governance sledi načelom:

- understand before change;
- proposal before mutation;
- approval before publish;
- version before overwrite;
- rollback before risk;
- observe before optimize.

Publishing generiranega rezultata ne naredi za kanonično resnico. Publishing
naredi odobreno manifestacijo dostopno skozi vodeno okolje, pri tem pa
ohrani njen upstream lineage, odobritev, dokaz skladnosti, generacijsko
pogodbo, namero izkušnje, Business Alignment in kontekst Digital Business
Twin.

## Kanonični Življenjski Cikel

Celoten kanonični življenjski cikel je:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
-> Continuous Evolution
```

### Reality

Dejansko podjetje obstaja, preden ga GNR8 modelira in preden ga katerakoli
spletna stran izrazi.

### Business Discovery

GNR8 zbira poslovni kontekst skozi voden pogovor in vodeno razumevanje virov.
Discovery identificira, kaj podjetje je, kaj ponuja, komu služi, kaj želi
doseči, kaj je znano, kaj je negotovo in kaj je treba razjasniti.

### Digital Business Twin

GNR8 integrira validirano znanje v kanonično operativno razumevanje podjetja
in njegove digitalne identitete.

### Business Understanding Report

GNR8 predstavi trenutno razumevanje v človeku berljivi, z dokazi podprti,
provider-neutral projekciji, da lahko ljudje razumevanje pregledajo, mu
zaupajo, ga popravijo ali zavrnejo pred načrtovanjem.

### Business Alignment

Ljudje potrdijo ali izboljšajo Digital Business Twin. Alignment validira
poslovno razumevanje, ne spletnih strani ali AI izhodov.

### Website Design Brief

GNR8 pretvori usklajeno poslovno razumevanje v namero spletne izkušnje. Brief
definira, kaj naj spletna stran izraža, komunicira, prioritizira in omogoča
uporabnikom.

### Website Generation Package

GNR8 pretvori odobreno namero izkušnje v kanonično generacijsko pogodbo, ki
je nevtralna do ponudnikov.

### Provider Adapter

Provider adapter serializira Website Generation Package za določenega
zunanjega AI ponudnika, ne da bi redefiniral pomen.

### External AI

External AI izvede serializacijo paketa in vrne implementacijski predlog.

### Generation Contract Compliance

GNR8 vrednoti generirani predlog glede na izvorni Website Generation Package.

### Generation Contract Compliance Report

GNR8 komunicira pogodbeno izpolnitev, odstopanja, tveganja, omejitve,
priporočila, lineage in pripravljenost za Business Approval.

### Business Approval

Podjetje sprejme, sprejme z omejitvami, zavrne, regenerira, vrne v alignment
ali blokira objavo na podlagi vodenih poslovnih posledic.

### Publish

GNR8 skozi vodeno objavljanje promovira samo rezultat z Business Approval.

### Continuous Evolution

Podjetje se še naprej spreminja. Novi dokazi, cilji, omejitve, performance
signali, tržne razmere, ponudbe, občinstva in človeške prioritete lahko
sistem vrnejo v discovery, understanding, alignment, briefing, generation,
compliance, approval, publishing ali prihodnji evolution.

## Continuous Evolution

GNR8 neprekinjeno razvija podjetja, ne spletnih strani, ker Digital Business
Twin ostaja dolgoročni vir resnice.

Spletna stran je lahko objavljena, zamenjana, regenerirana, revidirana ali
superseded. Poslovna zgodovina ostane. DBT ohranja, kaj je bilo znano, kaj se
je spremenilo, kdo je to odobril, kateri artefakti so bili superseded, kateri
generirani predlogi so bili sprejeti ali zavrnjeni in zakaj obstaja kasnejša
izkušnja.

Continuous evolution pomeni:

- reality je mogoče ponovno opazovati;
- evidence je mogoče dodati brez prepisovanja zgodovine;
- facts je mogoče potrditi, protisloviti ali supersede;
- interpretations je mogoče sprejeti, zavrniti ali revidirati;
- knowledge se lahko izboljša;
- understanding se lahko poglobi;
- Business Intent se lahko spremeni;
- Experience Domains se lahko premaknejo;
- Website Design Briefs se lahko revidirajo;
- Website Generation Packages se lahko regenerirajo;
- external AI proposals se lahko primerjajo;
- compliance lahko razkrije vrzeli;
- Business Approval lahko pooblasti objavo, regeneracijo ali vrnitev v
  alignment;
- published experiences so lahko superseded brez brisanja svoje zgodovine.

Rezultat produkta ni statična spletna stran. Rezultat produkta je vodeni
poslovni razvoj, izražen skozi digitalne izkušnje.

## Prihodnja Vizija

Prihodnja platforma GNR8 mora omogočati, da se katerakoli zgodovinska
digitalna izkušnja rekonstruira iz vodenega lineage brez dvoumnosti.

Ta prihodnost je odvisna od tukaj opisane arhitekture:

- Reality ostane ločena od modelov in izhodov.
- Knowledge ostane podprt z dokazi in voden.
- Decisions ostanejo človeško pooblaščene in lineage-aware.
- Experiences ostanejo projekcije usklajenega poslovnega razumevanja.
- Execution ostane provider-neutral, pogodbeno voden in model-agnostic.

Ko se pojavijo novi ponudniki, kanali, connectorji, artefakti in družine
digitalnih izkušenj, morajo obogatiti isto arhitekturo ali iz nje projicirati,
ne pa je nadomestiti.

## Dolgoročna Načela

Dolgoročna načela GNR8 so:

- GNR8 je AI Orchestrator z vodenim Digital Business Twin v svojem jedru.
- Digital Business Twin je kanonično operativno razumevanje podjetja in
  njegove digitalne identitete.
- Podjetje obstaja neodvisno od katerekoli spletne strani.
- Spletna stran je le en izraz podjetja.
- Digital Business Twin predstavlja podjetje samo.
- Business Domains so lastniki znanja.
- Business Intent je lastnik želenih rezultatov.
- Experience Domains so lastniki manifestacij.
- GNR8 vodi podjetja skozi razumevanje pred generacijo.
- Pogovor nadomesti nepotrebno kompleksnost programske opreme.
- Business Journey je kanonična človeška izkušnja GNR8.
- Business Journey ni UI flow.
- GNR8 vodijo odločitve, ne workflowi.
- Decision Architecture vodi poslovne odločitve.
- Decision Architecture nikoli ne vodi implementacije.
- Artefakti obstajajo zato, da podpirajo poslovne odločitve.
- Noben artefakt ne obstaja brez pooblaščujoče poslovne odločitve.
- Vsak kanonični artefakt ima governance state.
- Poslovna zgodovina je nespremenljiva.
- Vsak vodeni artefakt ohranja lineage.
- Versioning izpopolnjuje razumevanje; lineage ohranja razvoj.
- Generirane spletne strani so rezultati, ne dolgoročni vir resnice.
- Generacija brez razumevanja je prepovedana.
- GNR8 vedno validira razumevanje pred generacijo.
- GNR8 nikoli ne optimizira za hitrost generacije.
- GNR8 optimizira za kakovost poslovnega razumevanja.
- Poslovno razumevanje definira namero.
- Website Design Brief definira izkušnjo.
- Website Generation Package definira generacijo.
- Website Generation Package je kanonična generacijska pogodba.
- Prompti ponudnikov so disposable projections.
- GNR8 poseduje pomen.
- Ponudniki posedujejo implementacijo.
- GNR8 poseduje pogodbeni pomen.
- External AI poseduje implementacijske predloge.
- Compliance določa pogodbeno izpolnitev.
- Generation Contract Compliance Report komunicira pogodbeno izpolnitev za
  Business Approval.
- GNR8 objavlja šele po vodeni poslovni odobritvi.
- Business approval sprejme pogodbeno izpolnitev, ne implementacijske
  tehnologije.
- Kakovost generacije se meri s contract compliance, ne z implementacijsko
  tehnologijo.
- AI predlaga; ljudje odobrijo.
- Orkestrator poseduje nalogo; model jo izvede.
- GNR8 mora ostati modelno agnostičen.
- AI izhodi so predlogi.
- Objavljeni artefakti so odobrene manifestacije.
