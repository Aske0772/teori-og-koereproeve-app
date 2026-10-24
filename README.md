# Køreprøven — træning af beslutninger

Et spil til telefonen, der træner de beslutninger, sensoren bedømmer til den praktiske køreprøve (kategori B). Teoriprøve-apps er der nok af. Den praktiske prøve, hvor de fleste dumper, dækker ingen af dem.

**Spil det:** https://aske0772.github.io/teori-og-koereproeve-app/

Ingen backend, ingen konto, ingen data forlader telefonen. Ren HTML, CSS og JavaScript-moduler — åbn `index.html` fra en hvilken som helst webserver (GitHub Pages her).

## Hvad der er i spillet

| Modul | Hvad det træner | Bedømmelse |
|---|---|---|
| **Beslutningskørsel** | Bilen kører selv i en stiliseret forrude-scene. Billedet fryser ved hvert beslutningspunkt, og du har 2,2 sekunder til at vælge. | Faste regler efter Færdselsstyrelsens fire fejlniveauer (mindre fejl, fejl, alvorlig, meget alvorlig). Replay af hver fejl med sensorens kommentar. |
| **Skulderblik-rytme** | Orienteringsrutinen spejl, spejl, blink, skulderblik i rigtig rækkefølge — tempoet stiger. | Rutiner uden fejl / 12. |
| **Fareopfattelse** | Tryk i det øjeblik faren begynder at udvikle sig. Bygget efter den britiske hazard perception-test: 5-4-3-2-1 point i et vindue, mønster-tryk giver 0. | Point / maks. |
| **Kontrolspørgsmål** | Alle seks afsnit fra kontrolprøven som kort: spørgsmål, krav og *sådan viser du det*. Du bedømmer selv. De kort, du ikke kunne, kommer oftere. | Kunne / trukket. |
| **Find det på bilen** | Skattejagt-tjekliste til en rigtig bil (TWI-mærke, bremsevæske, reflekser …). | Afkrydsning. |
| **Passagertilstand** | Sid ved siden af én, der kører, og tæl de ting, sensoren ville notere. | Tælling. |
| **Prøvedagen** | Hele ritualet som ét level: venteværelse med åndedræt og hvis-så-plan, papirer, opgavekort med tre kontrolnumre + spejle, 12 beslutninger, dom med bedømmelsesskema. | Samlet. |
| **Skiltet på dagen** | Ét spørgsmål om dagen. | — |

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
js/scene.js                SVG-renderer til forrude-scener (pseudo-3D)
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

Tilføj et beslutningspunkt: tilføj et objekt i `js/data/scenarios.js`. Scenen beskrives som data (`env`, `junction`, `zebra`, `roundabout`, `objects` med `type`, `lane`, `d`), og `scene.js` tegner den.

## Kør lokalt

```
npx serve .        # eller python3 -m http.server
```

Modulerne kræver en webserver (ikke `file://`).

## Udgivelse

Push til `main` udgiver via `.github/workflows/pages.yml` til GitHub Pages.
