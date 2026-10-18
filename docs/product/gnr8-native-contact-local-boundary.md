# GNR8 native contact: lokalna integracija in meja aktivacije

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

## Najmanjši naslednji predlog za trajno dostavo — še ni odobren ali izveden

Obstoječa `gnr8_runtime_form_submissions` in `saveFormSubmission` shranjujeta podatke, vendar nimata atomskega claim/idempotence, trajnega omejevanja in statusa dostave. Resend v registru je placeholder. Konfiguracijskih skrivnosti, ponudniških API in nadzornih plošč nismo odpirali.

Predlog za ločeno odločitev, brez nove tabele ali storitve:

1. V obstoječo tabelo dodati nullable `idempotency_key` in `delivery_status`, omejitev dovoljenih stanj, delni unikaten indeks za site/version/form/key ter indeks site/created_at za omejevanje. Obstoječi legacy vstavljalnik novih stolpcev ne nastavlja. Samo klientovo `actor` ali JSON payload ne smeta biti dokaz rezerviranega novega protokola.
2. Dodati omejeni strežniški RPC operaciji claim/finalize. Claim v eni transakciji ponovno preveri aktivno lastništvo/različico, zaklene omejitev za spletno mesto, primerja ključ/hash, preveri trajni števec ter shrani pending, dokaz potrditve in čas iz DB. Predlagani začetni prag za odobritev: 20 novih oddaj na 15 minut na spletno mesto, skupaj med instancami. Finalize loči accepted/failed/unknown. Nejasen timeout ostane blokiran za samodejno ponovitev do uskladitve. Dovoljenja RPC samo strežniški vlogi; migracija in njena uporaba potrebujeta posebno odobritev.
3. Določiti transakcijskega ponudnika, dejansko preverjeni naslov/domain From ter strežniško referenco poverilnic. Potrditi podporo ponudnika istemu idempotency ključu in obravnavo negotovega izida. Prejemnik ostane že potrjena konfiguracija tega spletnega mesta. V tej dopolnitvi ni izvedbe novega ponudnika, migracije, env spremembe ali računa.

Produkcijski `delivery: null` zato še vedno vrne 503 brez shranjevanja/pošiljanja. `native_contact_delivery_unconfigured` še vedno blokira canary/production objavo novega kontaktnega kandidata. Po ločeni odobritvi in izvedbi zgornjega predloga ter uspešnem integriranem gateu sledi en usklajen Platform/Worker release iz istega pregledanega commita. Resničen omejen testni mail zahteva posebno odobritev cilja in pošiljanja. Ta zapis ni dovoljenje za deploy, merge, push ali objavo.
