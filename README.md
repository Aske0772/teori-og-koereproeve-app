# Køreprøven — træning af beslutninger

Et kørespil til telefonen, hvor du selv kører rundt i en 3D-by med rigtige kryds og trafikanter, mens sensoren giver anvisninger og bedømmer efter Færdselsstyrelsens fire fejlniveauer. Teoriprøve-apps er der nok af. Den praktiske prøve, hvor flest dumper, dækker ingen af dem.

**Spil det:** https://aske0772.github.io/teori-og-koereproeve-app/

Ingen backend, ingen konto, ingen data forlader telefonen. Ren HTML, CSS og JavaScript-moduler plus Three.js (lagt ind i repoet). Åbn `index.html` fra en hvilken som helst webserver (GitHub Pages her).

## Hvad der er i spillet

| Modul | Hvad det træner | Bedømmelse |
|---|---|---|
| **Kørselstræning** | Bilen kører selv prøveruten og stopper ca. 30 gange: udkørsel fra kantsten, før sving, før kryds, rundkørsel, fodgængerfelt, nye hastighedsgrænser og standsning ved postkassen. Du trykker på det, du ville gøre (spejle, skulderblik, blink), og vælger, om du kører eller holder tilbage. Svaret rettes ud fra den trafik, der er der lige nu, og du får forklaringen med det samme. Den gamle version uden denne tilstand ligger i grenen `backup-bykoersel-v1`. | Orientering, tegngivning, vigepligt, hastighedsgrænser. |
| **Bykørsel** (kernen) | En by med 20 kryds, vejnavne, 30/50/60-zoner, hovedveje med cykelsti, lyskryds, stopskilt, rundkørsel og fodgængerfelter. Du kører frit i 3D fra førersædet: rat, gas, bremse, gear D/R, blinklys, tre spejle og skulderblik. Biler, cyklister og fodgængere følger de samme vigepligtsregler som du. Prøvetilstand: sensoren navigerer en 2,7 km prøverute og slutter med standsning ved en postkasse. Fri kørsel: kør hvor du vil, med kort. | Vigepligt (højre vigepligt, ubetinget vigepligt, stop, lys, rundkørsel, venstresving, fodgængere, cyklister), hastighed, afstand, tegngivning, orientering, placering, påkørsel. Se `docs/SIMULATION.md`. |
| **Hurtige beslutninger** | Stiliseret scene, billedet fryser, 2,2 sekunder til at vælge. | Samme fire niveauer, replay med forklaring. |
| **Skulderblik-rytme** | Orienteringsrutinen spejl, spejl, blink, skulderblik i rigtig rækkefølge — tempoet stiger. | Rutiner uden fejl / 12. |
| **Fareopfattelse** | Tryk i det øjeblik faren begynder at udvikle sig. Bygget efter den britiske hazard perception-test: 5-4-3-2-1 point i et vindue, mønster-tryk giver 0. | Point / maks. |
| **Kontrolspørgsmål** | Alle seks afsnit fra kontrolprøven som kort: spørgsmål, krav og *sådan viser du det*. Du bedømmer selv. De kort, du ikke kunne, kommer oftere. | Kunne / trukket. |
| **Find det på bilen** | Skattejagt-tjekliste til en rigtig bil (TWI-mærke, bremsevæske, reflekser …). | Afkrydsning. |
| **Passagertilstand** | Sid ved siden af én, der kører, og tæl de ting, sensoren ville notere. | Tælling. |
| **Prøvedagen** | Hele ritualet som ét level: venteværelse med åndedræt og hvis-så-plan, papirer, opgavekort med tre kontrolnumre + spejle, prøveruten i bykørslen med fejlene skjult som i virkeligheden, dom med bedømmelsesskema. | Samlet. |
| **Skiltet på dagen** | Ét spørgsmål om dagen. | — |

Tastatur på computer: piletaster/WASD, Q/E blink, Z/C skulderblik, 1/2/3 spejle, R gear, V kamera.

Progression er et lyserødt træningskørekort, der fyldes ud med stempler (ét pr. disciplin ved 80 point). "Klar til prøven"-måleren trækkes hårdt ned af den svageste disciplin, så den kun rykker, hvis alt er med.

Tre sensorer med forskellig tone (den tavse, den venlige, den utålmodige) giver samme anvisninger og samme bedømmelse. Pointen er at vænne sig til ikke at læse humøret. Hvis telefonen har en dansk stemme, taler sensoren (Web Speech API, kan slås fra).

## Hvad spillet ikke er

Det er ikke køreundervisning og erstatter ikke køretimer, manøvrebane eller glatbane. Det lover ikke, at nogen består. Til den rigtige prøve er dommen et skøn ud fra fejlniveauerne; her er den en fast regel, og det står der.

## Struktur

```
index.html                 skal
css/style.css              tokens og komponenter (se docs/DESIGN.md)
js/app.js                  router, hjem, træn, indstillinger
js/state.js                localStorage, stempler, klar-måler
js/sim/network.js          vejnettet: kryds, vognbaner, baner gennem kryds, regler for vigepligt, lyskryds
js/sim/traffic.js          biler (IDM + vigepligt), cyklister, fodgængere
js/sim/player.js           din bil (cykelmodel, gear, blinklys)
js/sim/examiner.js         sensoren: rute, anvisninger, bedømmelse
js/sim/rules.js            fejlniveauer og dom
js/sim/sim.js              samler det hele med fast tidsskridt (60 Hz)
js/sim/autopilot.js        kører efter reglerne (forsiden og test)
js/sim/view3d.js           Three.js-visning: by, trafik, kabine, spejle
js/vendor/three.module.min.js  Three.js r160 (MIT)
js/games/bykoersel.js      skærmen: styring, HUD, kort
js/scene.js                SVG-renderer til frysebilleder
js/voice.js                sensorens stemme (Web Speech API)
js/ui.js                   små hjælpere
js/data/scenarios.js       beslutningspunkter + fejlniveauer + dom-regel
js/data/hazards.js         fareopfattelses-klip (nøglepunkter over tid)
js/data/kontrol.js         kontrolspørgsmål i seks afsnit + opgavekort
js/data/sensors.js         de tre sensorer
js/games/*.js              ét modul pr. spil
docs/PLAN.md               plan, brugerbehov, MVP-afgrænsning, næste skridt
docs/RESEARCH.md           research med kilder
docs/DESIGN.md             designplan
docs/SIMULATION.md         plan og regler for bykørslen
```

Ændr byen i `js/sim/network.js` (gitter, fjernede vejstykker, lyskryds, rundkørsler, stopskilte, fodgængerfelter, prøverute); alt andet beregnes. Tilføj et frysebillede: et objekt i `js/data/scenarios.js`. Scenen beskrives som data (`env`, `junction`, `zebra`, `roundabout`, `objects` med `type`, `lane`, `d`), og `scene.js` tegner den.

## Kør lokalt

```
npx serve .        # eller python3 -m http.server
```

Modulerne kræver en webserver (ikke `file://`).

## Udgivelse

Push til `main` udgiver via `.github/workflows/pages.yml` til GitHub Pages.
