# Bykørsel: plan og status

**Status 24. oktober 2026: bygget og udgivet.** Testet med en autopilot, der kører efter reglerne, gennem hele prøveruten i 15 forskellige trafikscenarier: alle 15 bestået, 13 helt uden noter, to med én note hver (én "alt for tæt på en cyklist", én "unødig venten"). Begge kan være rimelige, men er ikke efterprøvet af en kørelærer. Med autopiloten sat til at springe spejle, blink eller regler over finder sensoren fejlene. Trafikken alene kørte 15 simulerede minutter uden en eneste kørsel over for rødt, rullende stop eller kørsel gennem fodgængerfelt med en fodgænger i.

## Hvorfor den nuværende tur ikke rækker
Byturen er en pseudo-3D-"racerbane": én lang vej, hvor kryds og sving er tegnet ind som kurver. Du kan ikke dreje ind ad en sidevej, ingen andre trafikanter følger reglerne, og vigepligt bliver bedømt ud fra et manuskript. Det er en film med rat, ikke en by.

## Det nye: en by med et vejnet
- **Vejnet som graf.** 20 knudepunkter i et gitter (110 m mellem kryds), 29 vejstykker med navn, hastighedsgrænse, forkørselsret og cykelsti. Hvert vejstykke har en vognbane i hver retning (højrekørsel, 3,5 m), og hvert kryds har beregnede baner for hvert tilladt sving (Bézier-kurver; rundkørslen kører mod uret rundt om midterøen).
- **Rigtige kryds.** Hvert tilkørselsspor får sin regel ud fra vejnettet: højre vigepligt (ingen skilte), ubetinget vigepligt med hajtænder ved en hovedvej, stopskilt med stoplinje, lyskryds med rød/rødgul/grøn/gul i faste faser, rundkørsel med vigepligt for trafikken i den.
- **Trafikanter der følger reglerne.** Biler kører efter en afstandsmodel (Intelligent Driver Model), holder tilbage efter præcis de samme vigepligtsregler som du bedømmes efter, stopper for rødt, standser helt ved stop, venter på fodgængere ved fodgængerfeltet og på cyklister før højresving. Du er en af trafikanterne: har du forkørselsret, venter de på dig. Cyklister kører på cykelstierne og stopper for rødt. Fodgængere går ud i fodgængerfeltet, når der er plads, eller når bilerne holder.
- **Du kører frit.** 3D-forrude fra førersædet i venstre side (eller kamera bagfra), rat, gas, bremse, gear D/R, blinklys der selv slukker efter svinget, tre spejle der viser trafikken bag dig, og skulderblik, der faktisk drejer hovedet.
- **Sensoren som navigatør.** I prøvetilstand giver sensoren anvisninger i god tid, sådan som retningslinjerne beskriver ("I rundkørslen tager du 2. vej ud", "Ved stopskiltet drejer du til venstre"). Kører du forkert, er det vejledning, ikke en fejl: ruten lægges om. Turen slutter med, at du kører ind til siden og standser ved en postkasse.
- **Fri kørsel.** Samme by uden anvisninger, med kort, og fejlene vises med det samme.

## Prøveruten (ca. 2,7 km)
Igangsætning fra kantsten · ligeud i højre-vigepligtskryds · ubetinget vigepligt og højresving ud på Hovedgaden · fodgængerfelt · højresving i lyskryds med cyklister ligeud · rundkørsel, 2. vej ud · vigepligt ud mod hovedvej · 60-zone · venstresving i højre-vigepligtskryds med modkørende · 30-zone ved skolen med fodgængerfelt · krydsning af hovedvej · T-kryds · venstresving i 4-vejskryds · stopskilt og venstresving ud over begge spor på Hovedgaden · lyskryds ligeud · venstresving ved T-kryds · standsning ved kantsten.

## Hvad sensoren bedømmer
Fire fejlniveauer som i retningslinjerne. Spillets dom er en fast regel; den rigtige er et skøn.

| Område | Regler i spillet |
|---|---|
| Hastighed | Over grænsen i 1,5 s: under 10 % mindre fejl, 10–20 % fejl, 20–35 % alvorlig, over 35 % meget alvorlig. Unødig lav fart uden grund. Afstand under 1 s (under 0,6 s alvorlig). For hurtigt gennem sving og rundkørsel. |
| Vigepligt | Højre vigepligt, ubetinget vigepligt, stop, venstresving foran modkørende, rundkørsel, rødt og gult lys, fodgænger i eller ved feltet, cyklist ved højresving, træk ud fra kantsten foran trafik bagfra. Konflikt inden for 1,8 s eller en bil, der må bremse hårdt: meget alvorlig. |
| Orientering | Bakspejl og sidespejl inden for 8 s før sving, skulderblik inden for 6 s (alvorlig ved højresving med cykelsti), hård opbremsning uden blik i bakspejlet med bil bag dig, igangsætning og standsning. |
| Tegngivning | Ingen tegn, forkert tegn, for sent tegn, tegn ved ligeudkørsel, tegn ved udkørsel af rundkørsel, blink tændt længe uden grund. |
| Placering | Over midterstriben, i modkørende spor, på kantsten, fortov, cykelsti og midterø, placering før venstre- og højresving, standsning for langt fra kantsten. |
| Påkørsel | Bil, cyklist, fodgænger eller husmur: prøven afbrydes. |

## Teknik
- Three.js r160 lagt ind i repoet (`js/vendor/`), ingen CDN-afhængighed.
- Simulation og visning er adskilt: `js/sim/network.js` (vejnet, regler for hvem der holder tilbage), `traffic.js` (biler, cyklister, fodgængere, lys), `player.js` (bilmodel), `examiner.js` (sensor, rute, bedømmelse), `view3d.js` (3D). Simulationen kører med fast tidsskridt på 60 Hz.
- Ydelse: statiske ting tegnes som instanser (huse, træer, lygtepæle, skilte, vejstriber), biler som én flettet geometri hver. Omkring 80 draw calls pr. billede plus tre små spejle.

## Kørselstræning
Bilen kører selv (samme autopilot som bag forsiden) prøveruten, og simulationen fryser ved hvert stoppunkt (`js/sim/coach.js`). Spejlene og skulderblikket virker, mens den står stille, så du kan se trafikken bag dig. Stoppunkter: udkørsel fra kantsten, ca. 55 m før et sving (spejle og blink), lige før krydset (skulderblik og kør eller hold tilbage), udkørsel af rundkørsel, fodgænger ved fodgængerfelt, ny hastighedsgrænse og standsning ved postkassen. Om du skal holde tilbage, afgøres af den samme funktion, som autopiloten kører efter, i det øjeblik billedet fryser. Testet uden browser over 10 trafikscenarier: alle gennemført, 30 til 33 stop pr. tur, alle rigtige svar rettet som rigtige. I omkring 80 % af krydsene er det rigtige svar "Kører", fordi der er frit. Det er realistisk, men betyder at svaret ofte er det samme.

## Ikke med i denne omgang
Bakkemanøvrer og parkering i bås, motorvej, mørke og regn, flere vognbaner, lyd. Den gamle pseudo-3D-tur fjernes.
