# Plan: Køreprøven som spil

Status 24. oktober 2026. Research ligger i `RESEARCH.md`, design i `DESIGN.md`. Denne fil er det, vi besluttede, og hvorfor.

## 1. Hvem bygger vi til

En elev på 17–25 år (plus en del voksne og tilflyttere), der har bestået teorien og har 1–6 uger til den praktiske prøve. Han har betalt 15–20.000 kr. for kørekortet, en omprøve koster tid og penge, og han ved godt, hvad der er svært: ikke reglerne, men *at gøre det rigtige i tide, mens en fremmed sidder og noterer*.

Det, han har brug for (observeret i research og køreskolernes egne råd):

1. **Automatisk orienteringsrutine.** Spejl, spejl, blink, skulderblik — uden at tænke. Det er det, sensoren ser efter ved hver manøvre, og det er der, "glemte skulderblik" samler sig til ikke bestået.
2. **At se farer, mens de udvikler sig.** Hazard perception er den eneste skærmtræning med dokumenteret effekt på rigtig kørsel (UK/Australien, se RESEARCH §1–2).
3. **Vigepligt og hastighed under tidspres.** Reglerne kan han. Det er beslutningen på to sekunder, der svigter.
4. **Kontrolprøven uden at ryste på hånden.** Tre kontrolnumre fra tre afsnit plus spejle. De fleste kan svaret; færre kan *vise* det på en fremmed bil.
5. **Ritualet.** Venteværelse, papirer, kontrolprøve, kørsel, dom. Nerverne falder, når forløbet er kendt. Den bedste dokumenterede intervention mod prøveangst er at øve selve prøven (RESEARCH §4).
6. **At vide, hvor han står.** Ikke "du har 73 %", men "din svageste disciplin er vigepligt ved rundkørsler".

Det, han *ikke* har brug for, og som vi fravalgte: endnu en teoriquiz, en kørselssimulator (dyr, og man lærer ikke at køre af den), AI der bedømmer (uforudsigeligt, dyrt og under AI-forordningen), og løfter om at bestå.

## 2. Hvad gør det sjovt, lærerigt og realistisk

**Sjovt:** tidspres og frysebilledet (2,2 sekunder giver puls), sensorer med personlighed, stempler på et kørekort i stedet for XP, "find fejlene i mors kørsel". Korte sessioner på 2–5 minutter, der kan tages i bussen.

**Lærerigt:** Hver fejl får *hvorfor*, ikke bare *forkert* — højinformations-feedback er den eneste feedback-type med stor effekt (d≈1,0 mod 0,24 for point alene). Replay af alle fejl til sidst. Kontrolkortene kommer oftere, jo flere gange de er fejlet (retrieval + spacing, d≈0,7–0,85). Fareklip scorer *hvornår* du så faren, ikke *om*.

**Realistisk:** Fejlniveauerne er Færdselsstyrelsens egne fire (mindre fejl, fejl, alvorlig, meget alvorlig). Kontrolprøven trækkes som et opgavekort: tre afsnit + spejle. Sensoren giver anvisninger i god tid med den rigtige ordlyd ("anden vej ud i rundkørslen"). Prøvedagen følger retningslinjernes rækkefølge og slutter med et bedømmelsesskema. Reglen i spillet er fast og siger selv, at den rigtige dom er et skøn.

## 3. Hvad vi byggede (MVP, live nu)

| Modul | Færdigt | Mangler |
|---|---|---|
| Bykørsel (3D) | By som vejnet med 20 kryds, alle krydstyper, trafikanter der følger reglerne, fri kørsel og prøverute med anvisninger, live-bedømmelse, spejle og skulderblik i 3D (se SIMULATION.md) | Bakmanøvrer og parkering, motorvej, mørke og regn, flere vognbaner, lyd, flere byer |
| Hurtige beslutninger | 26 frysebilleder i 4 bedømmelsesområder, 2,2 s, feedback, replay | Flere scenarier |
| Skulderblik-rytme | 8 manøvrer, 12 runder, stigende tempo | Variation i rutinen (fx dobbelt spejlcheck før hårdt stop) |
| Fareopfattelse | 10 klip, DVSA-scoring, mønster-detektion, frysebillede ved farens start | Rigtige dashcam-klip (eget optaget, slørede plader), flere "ingen fare"-klip |
| Kontrolspørgsmål | 35 kontrolnumre i 6 afsnit + spejle, opgavekort-træk, vægtet gentagelse | Billeder af motorrum/dæk; gennemgang af kørelærer |
| Find det på bilen | 20 punkter | — |
| Passagertilstand | 12 observationer med tælling | Gem ture over tid |
| Prøvedagen | 5 stadier, åndedræt, hvis-så-plan, opgavekort, 12 beslutninger, skema | Lokale prøvesteder, "dagen før"-tjekliste |
| Skiltet på dagen | 11 skilte, ét om dagen | Push-notifikation (kræver PWA/service worker) |
| Kørekort + klar-måler | 8 stempler ved 80 point, måler vægtet mod svageste disciplin | Deling, hold-ranglister |
| Sensorer | 3 personligheder, stemme via Web Speech | Rigtige indtalte stemmer |

Teknik: ren HTML/CSS/JS-moduler, ingen build, ingen backend, alt i `localStorage`. Kørespillet er en canvas-renderer i stil med klassiske pseudo-3D-racere (projicerede vejsegmenter, kurver som akkumuleret sideforskydning, sprites sorteret efter dybde) med en separat spilmotor, der kører fysik, aktører og sensorens regler. Ruter og situationer er data (`routes.js`); bedømmelsen af hver situationstype står ét sted (`game.js`).

Status 24/10 aften: hele spillet blev bygget om fra frysebilleder til et rigtigt kørespil efter første test ("virkelig dårlig UI, skal være et ægte spil man kører rundt i"). UI'et er samtidig lagt om til mørk kabine, én accentfarve og to skrifter.

## 4. Næste skridt, i rækkefølge

1. **Få to kørelærere til at læse scenarier og kontrolspørgsmål igennem.** Alt indhold er skrevet efter færdselsloven og retningslinjerne, men ikke læst af en prøvesagkyndig. Det er den billigste kvalitetssikring, der findes, og den giver samtidig den første distributionskanal.
2. **Test på 10 elever ugen før deres prøve.** Mål: forstår de frysebilledet, føles 2,2 sekunder rigtigt, hvor falder de fra. Spørg bagefter, om de bestod. Ingen har målt beståelsesprocent som endepunkt for skærmtræning — det kan vi.
3. **Scenariebank til 80+.** Prioriter det, kørelærerne siger folk dumper på: rundkørsler, højresving med cykelsti, hastighed ved byzone-skift, placering før venstresving, gult lys.
4. **Rigtige klip til fareopfattelse.** Film selv (vi ejer det), slør plader og ansigter, undgå prøvecentrene. 20 klip er nok til at starte.
5. **Lokale prøvesteder.** "Typiske fælder omkring Aarhus Nord" som tekst og kort, kun til forberedelse hjemmefra. Ingen ruter sælges som "den rute, du får".
6. **Socialt.** Duel på kontrolspørgsmål, hold-rangliste pr. køreskole. Kræver en lille backend og dermed konti — først når der er brugere, der beder om det.
7. **Køreskole-udgave.** Kørelæreren ser elevens svageste disciplin og kan sætte "lektier". Det er betalingsviljen: skolen, ikke eleven.

## 5. Forretning, kort

- Elev: engangskøb 79–129 kr. eller 4 uger for 99 kr. via App Store/Play, eller gratis web med køb af prøvedag-pakke. Betalingsvillighed findes (koreprove.dk sælger rutevideoer for 99–199 kr. uden feedback).
- Køreskole: 200+ skoler bruger Teoriundervisning.dk. En praktisk-prøve-pakke pr. elev er den samme salgskanal.
- Ingen GDPR-tyngde: ingen konti, ingen personoplysninger, før socialt bygges. Så er vi et værktøj, ikke en tjeneste med dataansvar.

## 6. Risici og det, vi ikke lover

- **Ingen beståelsesgaranti.** Vi kalder det "træning af beslutninger". Teorikortet kan love garanti på en quiz, fordi quizzen *er* prøven. Det er kørslen ikke.
- **Vi er ikke Færdselsstyrelsen.** Tydelig afsender, link til kilder, ingen officielle logoer.
- **Faste regler i spillet, skøn i virkeligheden.** Det står i dommen hver gang, så ingen tror, at "to alvorlige" er en lov.
- **Transfer.** Skærmtræning har dokumenteret effekt på fareopfattelse og delvist på kørsel, men ingen har vist effekt på beståelse. Vi måler det, før vi påstår det.
- **Køretimer er obligatoriske.** Manøvrebane og glatbane kan ikke øves på en telefon, og vi siger det i appen.
