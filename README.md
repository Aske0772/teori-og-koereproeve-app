# Køreprøven — træning af beslutninger

Et kørespil til telefonen, hvor du selv kører en bytur, mens sensoren bedømmer live efter Færdselsstyrelsens fire fejlniveauer. Teoriprøve-apps er der nok af. Den praktiske prøve, hvor flest dumper, dækker ingen af dem.

**Spil det:** https://aske0772.github.io/teori-og-koereproeve-app/

Ingen backend, ingen konto, ingen data forlader telefonen. Ren HTML, CSS og JavaScript-moduler — åbn `index.html` fra en hvilken som helst webserver (GitHub Pages her).

## Hvad der er i spillet

| Modul | Hvad det træner | Bedømmelse |
|---|---|---|
| **Byturen** (kernen) | Du kører selv 3,2 km i en pseudo-3D-forrude: rat, gas, brems, blink, spejle og skulderblik. Igangsætning, fodgængerfelt, højresving med cyklist, skolevej, stopskilt med krydsende bil, venstresving med modkørende, gult lys, rundkørsel, bus fra stoppested, landevej med cyklist og modkørende, hajtænder, standsning ved kantsten. | Sensoren noterer live: tegngivning, orientering (spejle og skulderblik registreres som tryk), hastighed i zoner og før manøvrer, placering, vigepligt, afstand. Fire fejlniveauer, bedømmelsesskema og gennemgang i bilen til sidst. |
| **Hurtige beslutninger** | Stiliseret scene, billedet fryser, 2,2 sekunder til at vælge. | Samme fire niveauer, replay med forklaring. |
| **Skulderblik-rytme** | Orienteringsrutinen spejl, spejl, blink, skulderblik i rigtig rækkefølge — tempoet stiger. | Rutiner uden fejl / 12. |
| **Fareopfattelse** | Tryk i det øjeblik faren begynder at udvikle sig. Bygget efter den britiske hazard perception-test: 5-4-3-2-1 point i et vindue, mønster-tryk giver 0. | Point / maks. |
| **Kontrolspørgsmål** | Alle seks afsnit fra kontrolprøven som kort: spørgsmål, krav og *sådan viser du det*. Du bedømmer selv. De kort, du ikke kunne, kommer oftere. | Kunne / trukket. |
| **Find det på bilen** | Skattejagt-tjekliste til en rigtig bil (TWI-mærke, bremsevæske, reflekser …). | Afkrydsning. |
| **Passagertilstand** | Sid ved siden af én, der kører, og tæl de ting, sensoren ville notere. | Tælling. |
| **Prøvedagen** | Hele ritualet som ét level: venteværelse med åndedræt og hvis-så-plan, papirer, opgavekort med tre kontrolnumre + spejle, 12 beslutninger, dom med bedømmelsesskema. | Samlet. |
| **Skiltet på dagen** | Ét spørgsmål om dagen. | — |

Tastatur på computer: piletaster/WASD, Q/E blink, Z/C skulderblik, 1/2/3 spejle.

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
js/engine/world.js         rutebygger (segmenter, sprites, hændelser)
js/engine/render.js        canvas pseudo-3D-renderer (vej, kurver, sprites, spejle, skulderblik)
js/engine/game.js          fysik, aktører, hændelser og sensorens live-bedømmelse
js/data/routes.js          byturen som data
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
```

Tilføj en situation til byturen: en `r.event(...)` i `js/data/routes.js` og dens bedømmelse i `events()` i `js/engine/game.js`. Tilføj et frysebillede: et objekt i `js/data/scenarios.js`. Scenen beskrives som data (`env`, `junction`, `zebra`, `roundabout`, `objects` med `type`, `lane`, `d`), og `scene.js` tegner den.

## Kør lokalt

```
npx serve .        # eller python3 -m http.server
```

Modulerne kræver en webserver (ikke `file://`).

## Udgivelse

Push til `main` udgiver via `.github/workflows/pages.yml` til GitHub Pages.
