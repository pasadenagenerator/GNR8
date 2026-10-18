# GNR8 native contact: lokalni modul in meja aktivacije

Stanje 2026-10-18: lokalni osnovni modul je implementiran. Produkcijska aktivacija ni implementirana in ni dovoljena. Logatčan ostaja blokiran po izrecni zadnji uporabnikovi odločitvi.

## Uporabniški postopek

SiteActionsPanel omogoča izrecno izbiro predstavitvenih zamenjav (odstranitev prepoznanega iskanja, zemljevid v naslov/povezavo OSM, skupna odstranitev prepoznanega sledenja in soglasnega pasu), točne izključene poti za trenutno spletno mesto ter potrjenega prejemnika osnovnega kontaktnega obrazca. Nastavitve potujejo po obstoječi poti site-actions API → pogodba dogodka → Worker → normalizacija → Astro. Sprememba naslova prekliče potrditveno kljukico. Stari način mailto ostaja ločen in združljiv.

Podprt je en običajen CF7 kontaktni obrazec na pot: ime, e-pošta, sporočilo in neobvezen telefon. Ohranjeni so razredi/postavitev, besedila in obveznost polj; dodani so dostopni nazivi in omejitve dolžine. Zadeva, soglasje, datoteke, posebna polja, drugi tipi obrazcev in neznana koda ostanejo blokirani. Nobeno posebno polje se tiho ne odstrani.

Nova pot `/api/gnr8/runtime/contact` ne uporablja starega WordPress cilja. Prejemnika pridobi iz strežniškega zapisa nastavitev generirane različice. Preveri aktivno lastništvo, gostitelja, različico, točno pot, produkcijski artefakt in shemo obrazca. Predogled in neznane/tuje identitete zavrne. Stara pot forms/submit se ne spreminja.

## Varnost in manjkajoča izvedba

Omejitve: ime 120, e-pošta 254, telefon 40, sporočilo 5000 znakov; celotno URL-encoded telo največ 24.000 bajtov. Nepričakovani/podvojeni ključi, napačni tipi vsebine, nepravilno kodiranje, krmilni znaki v glavah, tuji izvori in izpolnjen honeypot so zavrnjeni. Obiskovalčeva e-pošta se uporablja samo kot reply-to. Vsebina sporočil in napake ponudnika se ne beležijo.

`ContactDelivery` je tanka obvezna meja za atomsko trajno rezervacijo, omejevanje zahtev, shranjevanje stanja ter pošiljanje s preverjenim pošiljateljem. Testni pomnilniški nadomestek ni produkcijska omejitev zahtev. Ponovitev z istim ključem ne pošlje še enkrat; drugačna vsebina z istim ključem je konflikt. Negotov izid se ne pošlje ponovno samodejno. Brez JavaScripta se identična vsebina za isto različico obravnava kot ponovitev. Uspeh pomeni shranjeno sporočilo in ponudnikov sprejem, ne prejem v nabiralnik.

Pregled obstoječega sistema je našel `gnr8_runtime_form_submissions` in `saveFormSubmission`, ki vstavljata podatke brez atomskega zahtevka/idempotence, trajnega omejevanja ali statusa dostave. Resend v registru je placeholder. Konfiguracijskih skrivnosti in nadzornih plošč nismo odpirali. Produkcijski adapter zato ostane `delivery: null`: pravilna zahteva vrne 503, ničesar ne shrani ali pošlje. Objava novega kontaktnega kandidata na canary/production je dodatno blokirana z `native_contact_delivery_unconfigured`; pregled v shadow ostaja mogoč. Obstoječi objavljeni artefakti se ne spremenijo.

Najmanjša potrebna naslednja odločitev: odobriti atomsko trajno operacijo nad obstoječo shrambo (vključno z mejo pogostosti, statusom in obravnavo negotovih pošiljanj; morebitna SQL/RPC sprememba zahteva ločeno odobritev) ter določiti ponudnika, preverjeni naslov/domensko identiteto pošiljatelja in strežniško referenco poverilnic. Novih tabel, računov, infrastrukture ali migracij ta sprememba ne uvaja. Upravljavec mora posebej potrditi obstoječe pravno besedilo in pravila hrambe, če bo pozneje odobril posebna polja.

## Logatčan in dokazi

Prejemnik je bil potrjen neposredno v pogovoru; ni zapisan v programsko kodo ali sintetične teste. Nato je uporabnik izrecno izbral osnovni modul in blokado Logatčana. Dejanski `/kontakt` vsebuje zadevo in obvezno soglasje; obe polji in celotno besedilo ostajajo ohranjeni.

Ponovitev obstoječe lokalne poti nad zgodovinskim virom `d9a1ec68-132e-4f41-af80-d2d3214ade31` je obdelala vseh 16 poti. Odobrene izključitve so `/home`, `/about-us`, `/contact`, `/locations` in `/wp-content/plugins/smart-cookie-kit/res/empty.html`; preostalih 11 vključuje `/`, `/o-nas` in `/kontakt`. Edina preostala zmožnost, ki blokira normalizacijo, je `forms`. Testnega brisanja obrazca ni bilo. Za ta vir ni novega Astro izvoza ali kandidata za objavo; to je pričakovani rezultat zadnje odločitve, ne dokaz delujočega Logatčanovega obrazca.

Dokazi zunaj Git:

- `/private/tmp/gnr8-logatcan/contact-blocker-proof/result.json`: 16/5/11, nespremenjen obrazec, blokada.
- `/private/tmp/gnr8-logatcan/basic-contact-proof/result.json`: sintetični osnovni obrazec skozi normalizacijo, dejanski Astro 5.18.2 build/izvoz, bridge in javni renderer z lokalnimi nadomestki za resolucijo/shrambo.
- `basic-contact-proof/{submitting,completion,error,mobile}.png`: pregled v vgrajenem brskalniku. Mobilna širina je 390 px v okvirju. Tipkovnica, obvezna polja, stanja in CSP predogleda so bili pregledani. Dostava je simulirana; dejansko poslanih e-poštnih sporočil je nič.
- `contact-final-tests.log`: 69 uspešnih testov za pogodbo, Worker, pretvorbo, bridge in strežniško mejo. Dodatna osredotočena preverjanja aktivacijske blokade in native HTML odziva so v `contact-activation-tests.log` in `contact-core-final.log`.
- `contact-bundles.json`: dejanski paketi Platform API, nove kontaktne poti, uporabniškega panela in Workerja vsebujejo ustrezne module. To ni izvedba prijavljenega uporabniškega toka proti gostovanemu API.

`check-next-route-exports` je uspešen (199 poti), prav tako pregled razlik. Integrirani TypeScript pregled je bil ustavljen po zastoju brez diagnostike; ni uspešno opravljen. Celotni Next build ni bil ponavljan. Neposredni Playwright pregled je obstal pri nalaganju lokalne odvisnosti; vizualni pregled je zato uporabil vgrajeni brskalnik. Ni novih hosted Generate/import/capture poskusov, produkcijskih zapisov ali izvajanja ponudnikov.

## Enoten predlog izdaje

Po ločeni odobritvi in izvedbi trajne shrambe ter preverjenega pošiljatelja zaključiti integrirani pregled tipov v okolju z dostopnimi odvisnostmi. Nato izdati Platform in Worker iz istega pregledanega commita ter preveriti vsebino obeh paketov, preden se odpre aktivacijska blokada. Logatčan ostane izločen iz objave do ločene odločitve o zadevi/soglasju. Morebitno eno resnično testno sporočilo zahteva posebno odobritev cilja in pošiljanja. Ta načrt ni dovoljenje za deploy, merge, push ali objavo.
