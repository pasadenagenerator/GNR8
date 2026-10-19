# GNR8 native contact: lokalna integracija in meja aktivacije

## Odobrena trajna dostava — 2026-10-19

Aktualni obseg ohranja dejanski Logatčanov obrazec iz `21dd28b7`, vključno z zadevo, sporočilom in obveznim izvornim soglasjem. Potrjeni prejemnik je `info@logatcan.si`, vedno v strežniški konfiguraciji tega spletnega mesta. Podpora obrazcu ne pomeni dovoljenja za objavo njegovega artefakta.

Dodana je migracija `20261019090000_native_contact_delivery.sql`: obstoječa tabela dobi nullable idempotency ključ in stanje, unikaten indeks, trajno omejitev 20 novih oddaj na 15 minut na spletno mesto ter strežniške operacije resolve/claim/finish/readiness. Claim serializira oddaje po spletnem mestu, ponovno preveri aktivni artefakt, lastništvo, gostitelja in potrjenega prejemnika. Potrditev in čas oddaje se shranita iz strežniške sheme in podatkovne ure. Za nove zapise je vključena zaščita vrstic; anon/authenticated nimata dostopa do novih oddaj ali RPC. Legacy vrstice z NULL ključem ohranijo dosedanje pravice.

Platform uporablja stateless service-role PostgREST, brez raw pg ali implicitnega ustvarjanja tabel v kontaktni poti. Resend adapter pošilja navadno besedilo iz `GNR8 <forms@notify.pasadenagenerator.com>`; obiskovalčev validirani naslov je samo Reply-To. Domena je v nadzorni plošči Verified in nima konfiguriranega sledenja. API uporablja isti idempotency ključ, brez samodejnih ponovitev. Pending in nejasen izid ostaneta zadržana; sprejeto sporočilo shrani ID ponudnika. Sprejem ponudnika ni dokaz dostave v nabiralnik. Napake, ključi in vsebina oddaj se ne beležijo.

Aktivacija zahteva Production okolje, točen `GNR8_CONTACT_FROM`, prisoten `RESEND_API_KEY` in pripravljeno shemo. Ostali pogoji za lastništvo, pregled, poreklo in objavo ostajajo. GET `/api/gnr8/runtime/contact` vrne samo konfiguracijsko pripravljenost, brez pošiljanja ali poskusne oddaje; ne preverja veljavnosti ključa pri ponudniku. Preview ne pošilja. Pri pripravi te spremembe je bil v živi zbirki za Logatčan ugotovljen manjkajoč aktivni pointer; ta naloga ga ne ustvarja.

Po zadnji uporabnikovi zahtevi ni novih testnih sklopov, replayev ali testnih sporočil. Preverijo se uporabljena shema, pravice, dovoljeni izvozi poti, diff in build ob izdaji. Prejšnji lokalni dokazi spodaj ostajajo zgodovinski. Spodnji predlog migracije je bil pozneje izrecno odobren in ga nadomesti ta implementacija; zgodovinske omejitve dovoljenj niso aktualna prepoved te ozke uvedbe.

Migracija je uporabljena in zabeležena; readback potrjuje različico v1, RLS, dve politiki, RPC samo za service_role in nič novih oddaj. Prvi release build je ustavil lint, drugi tip praznega tekstovnega vozlišča. Po popravkih sta celotna lokalna grafa tipov Platform/Worker uspešna (z `composite: false`, enako kot Next build), prav tako osredotočeni lint in route-export gate. Worker potrebuje isto izdajo zaradi skupnega parserja in normalizatorja: zadnja živa izdaja 16. oktobra predhodi kontaktni pogodbi iz 18. oktobra. Ponovna sinhronizacija Inngest in Generate nista del te uvedbe. Za Logatčan so v živi zbirki potrjeni nič shranjenih Astro kandidatov, nič novih kontaktnih artefaktov in nič aktivnih pointerjev.

## Zgodovinsko lokalno stanje

Stanje 2026-10-18: dejanski Logatčanov `/kontakt` je lokalno podprt, vključno z neobvezno zadevo in obvezno potrditvijo. To nadomesti prejšnjo odločitev o blokadi posebnih polj iz commita `1f14d8df`. Produkcijska dostava in objava ostajata blokirani. Zgodovinski zajem ni spremenjen.

## Običajni postopek in podprta oblika

SiteActionsPanel uporablja skupni `createRetainedPresentationSettings`; obstoječi API in Worker neodvisno validirata isto pogodbo. Uporabnik izbere predstavitvene zamenjave, točne izključene poti za svoje spletno mesto, kontaktni modul in potrjenega prejemnika. Sprememba naslova prekliče potrditveno kljukico. Ni globalnega prejemnika ali trdo kodirane konfiguracije za Logatčan. Stari mailto način ostaja ločen in združljiv.

Podprt je en običajen CF7 kontaktni obrazec na pot: ime, e-pošta, sporočilo ter neobvezna telefon in zadeva. Dodana je le preverjena oblika enega obveznega potrditvenega polja: izvorno ime `dovoljenje[]`, točna CF7 struktura ovojev, ena oznaka in ujemanje izvorne vrednosti z njenim besedilom. Ni splošnega dovoljenja za poljubna checkbox polja. Neznana, podvojena, vnaprej označena ali neobvezna potrditvena polja ostajajo blokirana. Nobeno pomembno polje se ne odstrani.

Izvorni razredi, oznake, postavitev, pojasnilo in pravne povezave ostanejo. Besedilo potrditve se prebere iz vira; ni sestavljeno na novo ali zapisano kot konstanta za določenega gostitelja. Ime/e-pošta sta obvezna. Pri dejanskem viru sta zadeva in sporočilo neobvezna. Potrditev je obvezna in privzeto neoznačena. To ni pravno mnenje ali dokaz pravne skladnosti.

## Strežniška pogodba

Nova pot `/api/gnr8/runtime/contact` uporablja aktivno lastništvo, gostitelja, točno pot, različico in identiteto/hash artefakta. Prejemnika ter shemo obrazca pridobi iz strežniškega zapisa generiranega artefakta. Ne uporablja WordPress cilja. Predogled in neznane/tuje identitete zavrne; stara pot forms/submit se ne spreminja.

Omejitve so ime 120, e-pošta 254, telefon 40, zadeva 200 in sporočilo 5000 znakov; celo telo največ 24.000 bajtov. Zadeva je navadno besedilo. CR/LF, kontrolni znaki in Unicode ločila vrstic so zavrnjeni pred uporabo v glavi. Zadeva/vsebina ne moreta spremeniti sender/to/reply-to. Nepričakovani/podvojeni ključi, napačno kodiranje, tuji izvori ter honeypot so zavrnjeni. Vsebina sporočil in napake ponudnika se ne beležijo.

Strežnik zahteva točno `acceptance=accepted` in pravilen `formVersion`, tudi pri navadnem POST brez JavaScripta. Različico ponovno izračuna iz svojega obrazca; ignorira samo Astro atributne oznake in nebistveno zamikanje. Sprememba izjave, pojasnila ali strukture razveljavi staro potrditev. Besedilo, hash izjave, hash točnega končnega obrazca ter ID/hash artefakta pridejo iz strežniške sheme, ne iz POST. Dokaz vsebuje izrecno pritrditev. Browserjev čas ali pravno besedilo nista dovoljena ključa. Prihodnji trajni `claim` mora ob prvem zapisu dodeliti čas potrditve iz strežniške/podatkovne ure; ponovitev ne sme ustvariti nove potrditve.

`ContactDelivery` ostaja tanka obvezna meja za atomsko trajno rezervacijo, omejevanje zahtev, stanje in pošiljanje s preverjenim pošiljateljem. Ključ ponovitve je vezan tudi na artefakt. Konfliktna vsebina je zavrnjena; negotov izid se ne pošlje znova samodejno. Uspeh pomeni shranjeno in sprejeto v pošiljanje, ne prejem v nabiralnik.

## Dejanski vir in lokalni dokazi

Prejemnik je potrjen v pogovoru in uporabljen kot lokalna site-scoped konfiguracija; ni v programski kodi ali Git fixture. Zgodovinski vir je `d9a1ec68-132e-4f41-af80-d2d3214ade31`. Od 16 zajetih poti je izključenih točno pet: `/home`, `/about-us`, `/contact`, `/locations`, `/wp-content/plugins/smart-cookie-kit/res/empty.html`.

Vseh 11 ciljnih poti, vključno z `/`, `/o-nas` in `/kontakt`, je prestalo normalizacijo, dejanski Astro 5.18.2 build/izvoz, bridge ter javni renderer. Pravi obrazec ni bil izbrisan ali zamenjan s sintetičnim. Preverjeno je nespremenjeno besedilo potrditve in pojasnila, štirje domači diapozitivi ter izključno točne GNR8 skripte. Astro dodaja svoje atribute in oblikuje whitespace; primerjava pravnega besedila tega ne zamenjuje s spremembo vsebine.

Dokazi ostajajo zunaj Git v `/private/tmp/gnr8-logatcan/contact-real-proof/`:

- `source-evidence.json`, `result.json`, `contact-evidence.json`: 16/5/11, normalen UI builder → skupna API validacija → Worker parser, build/izvoz, javni renderer, nič testnih odstranitev.
- `submission-evidence.json`: shema dejanskega izvoza, izpuščeno sporočilo, točna potrditev, zavrnjen star formVersion, podvajanja in injekcije; navaden POST brez JS ter simulirana idempotentna dostava.
- `desktop.png`, `unchecked-validation.png`, `submitting.png`, `completion.png`, `error.png`, `mobile-form.png`, `mobile-acceptance.png`, `mobile-menu.png`: pregled dejanskega `/kontakt` v vgrajenem brskalniku. Mobilna širina 390 px v okvirju, oznake, tipkovnica/checkbox, meni, pravno pojasnilo in stanja so pregledani. Vseh 11 strani je bilo renderiranih; to ni vizualni pregled vsake strani na vsaki širini.

Resolucija gostitelja, shramba in dostava so v lokalnem replayu nadomeščene na testnih mejah. Ni izveden prijavljen hosted UI/API tok ali dejanska dostava. Lokalni strežnik blokira zunanje vire. Resnično poslanih e-poštnih sporočil: nič.

`contact-supplement-final-tests.log`: 61 uspešnih osredotočenih testov. `contact-core-types.log`: uspešen pregled tipov kontaktne sheme, obdelave in skupnih pogodb z dostopnimi dejanskimi odvisnostmi. Popravljena je tudi diskriminirana unija rezultatov claim, odkrita s tem pregledom. `contact-bundles.json`: Platform API, kontaktna pot, panel in Worker vsebujejo module. `check-next-route-exports` in pregled razlik sta uspešna.

Širši integrirani TypeScript pregled Platform grafa je bil po 30 sekundah ustavljen brez zaključka ali TypeScript diagnostike. Zadnja sled je bila razreševanje standardnih TypeScript knjižnic; posamezna manjkajoča odvisnost ni dokazana. Ta gate ostaja nerešen. Celotni Next build ni bil ponavljan.

## Zgodovinski predlog za trajno dostavo — pred odobritvijo 2026-10-19

Obstoječa `gnr8_runtime_form_submissions` in `saveFormSubmission` shranjujeta podatke, vendar nimata atomskega claim/idempotence, trajnega omejevanja in statusa dostave. Resend v registru je placeholder. Konfiguracijskih skrivnosti, ponudniških API in nadzornih plošč nismo odpirali.

Predlog za ločeno odločitev, brez nove tabele ali storitve:

1. V obstoječo tabelo dodati nullable `idempotency_key` in `delivery_status`, omejitev dovoljenih stanj, delni unikaten indeks za site/version/form/key ter indeks site/created_at za omejevanje. Obstoječi legacy vstavljalnik novih stolpcev ne nastavlja. Samo klientovo `actor` ali JSON payload ne smeta biti dokaz rezerviranega novega protokola.
2. Dodati omejeni strežniški RPC operaciji claim/finalize. Claim v eni transakciji ponovno preveri aktivno lastništvo/različico, zaklene omejitev za spletno mesto, primerja ključ/hash, preveri trajni števec ter shrani pending, dokaz potrditve in čas iz DB. Predlagani začetni prag za odobritev: 20 novih oddaj na 15 minut na spletno mesto, skupaj med instancami. Finalize loči accepted/failed/unknown. Nejasen timeout ostane blokiran za samodejno ponovitev do uskladitve. Dovoljenja RPC samo strežniški vlogi; migracija in njena uporaba potrebujeta posebno odobritev.
3. Določiti transakcijskega ponudnika, dejansko preverjeni naslov/domain From ter strežniško referenco poverilnic. Potrditi podporo ponudnika istemu idempotency ključu in obravnavo negotovega izida. Prejemnik ostane že potrjena konfiguracija tega spletnega mesta. V tej dopolnitvi ni izvedbe novega ponudnika, migracije, env spremembe ali računa.

Produkcijski `delivery: null` zato še vedno vrne 503 brez shranjevanja/pošiljanja. `native_contact_delivery_unconfigured` še vedno blokira canary/production objavo novega kontaktnega kandidata. Po ločeni odobritvi in izvedbi zgornjega predloga ter uspešnem integriranem gateu sledi en usklajen Platform/Worker release iz istega pregledanega commita. Resničen omejen testni mail zahteva posebno odobritev cilja in pošiljanja. Ta zapis ni dovoljenje za deploy, merge, push ali objavo.
