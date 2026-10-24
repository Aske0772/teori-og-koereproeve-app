# Designplan

## Hvem og hvad
Elever på 17–25 (og en del voksne), der har 1–6 uger til den praktiske køreprøve. De sidder med telefonen i bussen, i sengen, i venteværelset. Spillet skal træne *beslutninger under tidspres* og *prøvedagens ritual* — ikke lære dem at køre.

## Visuel idé: forruden og køreskolens papirer
Alt i spillet findes i virkeligheden: forruden, sensorens kuglepen og bedømmelsesskema, det lyserøde kørekort, vejens skiltefarver. Ingen "gamer"-neon, ingen quiz-app-blå.

Det ene element der skal huskes: **frysebilledet gennem forruden**. Vejen tegnes som stiliseret pseudo-3D (trapez-vej, horisont, flade figurer), og i det øjeblik spillet fryser, trækker sensorens kuglepen en linje over bunden af skærmen — det er din betænkningstid.

## Tokens
Farver
- `--asfalt` #2A2E33 — vejbane, mørke paneler
- `--overskyet` #E6E9EC — sidens baggrund (dansk himmel i oktober)
- `--kridt` #FFFFFF — kort, vejstriber
- `--blaek` #1D3A9E — sensorens kuglepen, primære handlinger
- `--stempel` #C8322B — fejl, dumpet, stempler
- `--koerekort` #F2B8B5 — det lyserøde kørekort (kun på kortet)
- `--graes` #4E8A3E, `--himmel` #BFD4E6 — kun i scener

Typografi
- Barlow Condensed 600/700 til overskrifter, tal og sensorens anvisninger (vejskilte-følelse)
- Barlow 400/500 til brødtekst
- Skala 14 / 16 / 20 / 28 / 40 / 64, linjelængde under 70 tegn

Layout
```
┌──────────────────────┐
│  scene (full-bleed)  │  16:10, forruden
│                      │
├──────────────────────┤
│ ━━━━━━━━━━━━         │  kuglepennens tidslinje
│ [Spejl] [Skulder]    │  store knapper, pedal-store
│ [Vig]   [Fortsæt]    │
└──────────────────────┘
│ Hjem · Træn · Prøve  │  bundfane, konventionel
```
Venstrestillet tekst. Hjemmeskærmen er kørekortet selv: et lyserødt kort i fuld bredde, hvor stemplerne fyldes ud.

## Principper
1. Frys, vælg, forklar. Hver fejl får sensorens kommentar og et replay — aldrig kun "forkert".
2. Faste regler, ingen AI i bedømmelsen. Alvorlig fejl = dumpet, som i virkeligheden.
3. Ritualet er indholdet. Prøvedagen spilles fra venteværelset til dommen.
4. Ingen løfter. Vi kalder det "træning af beslutninger".

## Det vi fravælger
Ikonkort i grid, store-bogstavs-etiketter, pile på knapper, mørk baggrund med syregrøn, fade-in på hver sektion.
