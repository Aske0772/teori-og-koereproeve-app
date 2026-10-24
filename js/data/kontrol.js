// Kontrolprøven. Afsnittene følger Færdselsstyrelsens retningslinjer (2026):
// tre kontrolnumre fra tre forskellige afsnit, og spejlene kontrolleres altid.
// q = hvad sensoren beder om, a = kravet, how = hvordan du viser det på bilen (uden værktøj).

export const SECTIONS = {
  styr: 'Styreapparat',
  bremser: 'Bremser',
  lys: 'Lygter, reflekser og horn',
  motor: 'Motor, udstødning og transmission',
  baerende: 'Bærende dele',
  udstyr: 'Særligt udstyr',
  spejle: 'Spejle (kontrolleres altid)',
};

export const KONTROL = [
  // ---- styreapparat ----
  { id: 'ratsloer', section: 'styr', q: 'Kontrollér, om der er slør i styretøjet', a: 'Der må ikke være nævneværdigt slør i rattet. Hjulene skal følge med, så snart du drejer.', how: 'Med motoren i gang: drej rattet lidt frem og tilbage, mens du eller en hjælper kigger på forhjulet. Det skal bevæge sig med det samme.' },
  { id: 'servo', section: 'styr', q: 'Kontrollér servostyringen', a: 'Rattet skal være let at dreje, når motoren kører. Er servoen hydraulisk, skal væskestanden ligge mellem min og max.', how: 'Start motoren og drej rattet med holdende bil — det skal gå let. Vis beholderen med servovæske i motorrummet, hvis bilen har en (mange nyere biler har elektrisk servo uden væske).' },
  { id: 'styr-yderstilling', section: 'styr', q: 'Kontrollér, at hjulene kan drejes fra yderstilling til yderstilling', a: 'Hjulene skal kunne drejes let, ubesværet og uden mislyde hele vejen fra side til side.', how: 'Drej rattet helt til den ene side og helt til den anden, mens motoren kører. Lyt efter skrab og mærk efter hak.' },

  // ---- bremser ----
  { id: 'driftsbremse', section: 'bremser', q: 'Kontrollér driftsbremsen (fodbremsen)', a: 'Pedalen skal have fast modstand, må ikke kunne trædes i bund og må ikke synke, når du holder trykket.', how: 'Træd bremsen hårdt ned og hold den i nogle sekunder. Pedalen skal stå fast. Synker den, er der en utæthed.' },
  { id: 'bremseforstaerker', section: 'bremser', q: 'Kontrollér bremseforstærkeren (vakuumforstærkeren)', a: 'Forstærkeren skal hjælpe, når motoren kører. Uden den bliver pedalen hård.', how: 'Med motoren slukket: pump pedalen 4–5 gange, til den bliver hård. Hold trykket og start motoren — pedalen skal synke lidt under foden. Så virker forstærkeren.' },
  { id: 'parkeringsbremse', section: 'bremser', q: 'Kontrollér parkeringsbremsen', a: 'Parkeringsbremsen skal kunne holde bilen på en skråning. Et håndtag må ikke kunne trækkes helt i top — typisk holder den efter nogle hak. Elektronisk bremse: kontrollampen skal lyse, når den er trukket.', how: 'Træk håndbremsen (eller aktivér knappen) og prøv forsigtigt at trille bilen i 1. gear eller frigear. Den skal stå stille. Vis kontrollampen i instrumentbrættet.' },
  { id: 'bremsevaeske', section: 'bremser', q: 'Kontrollér bremsevæsken', a: 'Væskestanden skal ligge mellem min og max i beholderen. Bremsevæske optager vand og skal skiftes jævnligt (typisk hvert andet år ifølge fabrikanten).', how: 'Vis beholderen i motorrummet (ofte foran føreren, bag motoren) og peg på min/max-mærkerne. Åbn den ikke.' },
  { id: 'abs', section: 'bremser', q: 'Kontrollér ABS-systemet', a: 'ABS-kontrollampen skal tænde, når tændingen slås til, og slukke kort efter start. Lyser den under kørsel, er der fejl, og bilen bremser uden ABS.', how: 'Slå tændingen til og vis, at lampen tænder og slukker igen. Forklar, at den ikke må lyse under kørsel.' },

  // ---- lygter, reflekser og horn ----
  { id: 'naerlys', section: 'lys', q: 'Kontrollér nærlyset', a: 'Nærlyset skal lyse hvidt eller gulligt, mindst 30 meter frem, og må ikke blænde. Lyset er asymmetrisk: det lyser længere i højre side.', how: 'Tænd nærlyset og vis det foran bilen. Peg på, at det skal være ens i begge lygter og ikke pege opad.' },
  { id: 'fjernlys', section: 'lys', q: 'Kontrollér fjernlyset', a: 'Fjernlyset skal lyse mindst 100 meter frem, og der skal være en blå kontrollampe i instrumentbrættet. Det må ikke bruges, så det blænder andre.', how: 'Tænd fjernlyset, vis den blå lampe, og vis at begge lygter lyser.' },
  { id: 'positionslys', section: 'lys', q: 'Kontrollér positionslys og baglygter', a: 'Positionslys foran skal være hvidt, baglygter røde og synlige på mindst 300 meters afstand. Nummerpladelyset skal være hvidt og lyse nummerpladen op.', how: 'Tænd positionslyset og gå rundt om bilen: hvidt foran, rødt bag, nummerpladen oplyst.' },
  { id: 'stoplygter', section: 'lys', q: 'Kontrollér stoplygterne', a: 'Stoplygterne skal lyse rødt og klart kraftigere end baglygterne. Bilen har mindst to, de fleste også en tredje i midten.', how: 'Få en hjælper til at træde på bremsen, eller brug en rude eller garageport som spejl. Alle stoplygter skal lyse.' },
  { id: 'blinklys', section: 'lys', q: 'Kontrollér blinklysene', a: 'Blinklys skal være gule og blinke 60–120 gange i minuttet. Går en pære i stykker, blinker kontrollampen typisk hurtigere.', how: 'Tænd blink til hver side og vis foran og bag. Tænd havariblinket: alle blinklys skal blinke samtidig.' },
  { id: 'taagelygter', section: 'lys', q: 'Kontrollér tågelygterne', a: 'Tågeforlygter lyser hvidt eller gult; tågebaglygten er rød og må kun bruges, når sigtbarheden er under 50 meter, fordi den ellers blænder.', how: 'Tænd dem og vis kontrollampen for tågebaglygten. Forklar 50-meter-reglen.' },
  { id: 'baklygter', section: 'lys', q: 'Kontrollér baklygterne', a: 'Baklygterne skal lyse hvidt, og bilen må højst have to. De tænder, når bakgearet sættes i.', how: 'Sæt bilen i bakgear med tændingen slået til og vis det hvide lys bagpå.' },
  { id: 'reflekser', section: 'lys', q: 'Kontrollér reflekserne', a: 'Bilen skal have to røde reflekser bagpå. De må ikke være trekantede — trekantede reflekser er til påhængsvogne.', how: 'Peg på de røde reflekser i baglygterne eller kofangeren. Forklar, hvorfor de ikke må være trekantede.' },
  { id: 'horn', section: 'lys', q: 'Kontrollér hornet', a: 'Hornet skal have en jævn, ensartet tone. Det må kun bruges for at afværge fare.', how: 'Tryk kort på hornet.' },

  // ---- motor, udstødning og transmission ----
  { id: 'motorolie', section: 'motor', q: 'Kontrollér motoroliestanden', a: 'Oliestanden skal ligge mellem min og max på pinden, målt med slukket motor på vandret underlag. For lidt olie ødelægger motoren; for meget kan skade katalysatoren og tætninger.', how: 'Træk oliepinden op, tør af, stik den i igen, træk op og aflæs. Nyere biler viser det på skærmen — vis så det i menuen.' },
  { id: 'koelervaeske', section: 'motor', q: 'Kontrollér kølervæsken', a: 'Kølervæsken skal stå mellem min og max i ekspansionsbeholderen, aflæst på kold motor. Den skal være frostsikret. Åbn aldrig dækslet på varm motor.', how: 'Vis ekspansionsbeholderen og min/max-mærkerne. Forklar, hvorfor dækslet ikke må åbnes, når motoren er varm.' },
  { id: 'sprinklervaeske', section: 'motor', q: 'Kontrollér sprinklervæsken', a: 'Der skal være sprinklervæske på, og om vinteren skal den være frostsikret. Uden sprinkler kan du ikke holde ruden ren og kører blindt i sjap.', how: 'Vis beholderen (ofte med et symbol af en forrude) og prøv sprinkleren.' },
  { id: 'udstoedning', section: 'motor', q: 'Kontrollér udstødningen', a: 'Udstødningen må ikke være utæt, må ikke støje unormalt og må ikke udlede for meget røg. Blå røg er olie, sort røg er for meget brændstof, hvid røg på varm motor kan være kølervæske.', how: 'Lyt med motoren i gang og kig under bilen bagfra. Forklar farverne på røg.' },
  { id: 'kobling', section: 'motor', q: 'Kontrollér koblingen', a: 'Koblingen skal kunne skilles helt, så gearene kan skiftes uden skraben, og den må ikke slure, når den slippes.', how: 'Træd koblingen helt ned og skift gear — det skal gå uden lyd. Forklar, at en slurende kobling mærkes ved, at omdrejningerne stiger uden at farten gør.' },
  { id: 'motorlampe', section: 'motor', q: 'Kontrollér kontrollamperne for motor og udstødning', a: 'Motorkontrollampen (gul motor) skal slukke efter start. Lyser den, kan katalysator eller partikelfilter være påvirket, og bilen skal på værksted.', how: 'Slå tændingen til og vis, at lampen tænder og slukker efter start.' },

  // ---- bærende dele ----
  { id: 'daek-moenster', section: 'baerende', q: 'Kontrollér dækkenes mønsterdybde', a: 'Hovedmønsteret skal være mindst 1,6 mm dybt hele vejen rundt. Dækket har slidindikatorer (små forhøjninger i rillerne, markeret TWI på siden) — når mønsteret er nede ved dem, er dækket slidt op.', how: 'Find TWI-mærket på dæksiden, følg det ind til rillen og peg på indikatoren. Du må ikke bruge værktøj — vis det med fingrene.' },
  { id: 'daek-tryk', section: 'baerende', q: 'Kontrollér dæktrykket', a: 'Dæktrykket skal følge fabrikantens anvisning. Det står på en mærkat i dørstolpen eller tankklappen og afhænger af last.', how: 'Vis mærkaten og forklar, at trykket måles på kolde dæk. Forkert tryk slider dækket skævt og forlænger bremselængden.' },
  { id: 'daek-skader', section: 'baerende', q: 'Kontrollér dækkene for skader og type', a: 'Dækkene må ikke have revner, buler eller blottet lærred. Dæk på samme aksel skal være af samme type og dimension.', how: 'Gå rundt om bilen og kig på dæksiderne. Læs dimensionen af på dæksiden (fx 205/55 R16) og vis, at den er ens på begge forhjul.' },
  { id: 'stoeddaempere', section: 'baerende', q: 'Kontrollér støddæmperne', a: 'Støddæmperne skal dæmpe, så bilen ikke gynger. En utæt støddæmper (olie på huset) er slidt op.', how: 'Tryk et hjørne af bilen hårdt ned og slip. Den skal rette sig op med det samme uden at gynge videre.' },
  { id: 'hjulophaeng', section: 'baerende', q: 'Kontrollér hjul og hjulophæng', a: 'Hjulboltene skal være spændt, fælgene uden revner, og der må ikke være slør i hjullejer eller ophæng.', how: 'Vis, at alle hjulbolte sidder, og at fælgene er hele. Forklar, at slør mærkes som rysten i rattet ved bestemte hastigheder.' },

  // ---- særligt udstyr ----
  { id: 'seler', section: 'udstyr', q: 'Kontrollér sikkerhedsselerne', a: 'Selerne skal kunne trækkes ud og rulle sig op af sig selv, låse ved et hurtigt ryk, og de må ikke være flossede eller beskadigede. Låsen skal klikke.', how: 'Træk selen ud og slip — den skal rulle op. Ryk hårdt i den — den skal låse. Vis at låsen klikker, og at der ikke er slid.' },
  { id: 'nakkestoetter', section: 'udstyr', q: 'Kontrollér nakkestøtterne', a: 'Nakkestøttens overkant skal være i højde med toppen af hovedet, mindst i højde med øjnene, og tæt på baghovedet. Den beskytter mod piskesmæld.', how: 'Indstil din egen nakkestøtte og forklar højden.' },
  { id: 'airbag', section: 'udstyr', q: 'Kontrollér airbags', a: 'Airbag-kontrollampen skal tænde ved tænding og slukke igen. Lyser den, er systemet ude af drift. Passagerairbag skal slås fra ved bagudvendt barnestol foran.', how: 'Vis kontrollampen og kontakten til passagerairbag (ofte i handskerummet eller dørstolpen).' },
  { id: 'viskere', section: 'udstyr', q: 'Kontrollér vinduesviskere og -vaskere', a: 'Viskerne skal virke i alle trin og viske rent uden striber; viskerbladene må ikke være slidte eller revnede. Vaskeren skal ramme ruden.', how: 'Kør viskerne og vis sprinkleren. Løft et viskerblad og vis gummikanten.' },
  { id: 'advarselstrekant', section: 'udstyr', q: 'Kontrollér advarselstrekanten', a: 'Advarselstrekanten er lovpligtig i bilen. Ved havari sættes den mindst 50 meter bag bilen — på motorvej mindst 100 meter.', how: 'Vis, hvor den ligger (ofte i bagagerummet eller under bagsædet), og forklar afstandene.' },
  { id: 'saede-rat', section: 'udstyr', q: 'Vis, hvordan du indstiller sæde og rat', a: 'Du skal kunne træde koblingen i bund med let bøjet knæ, og med strakt arm skal håndleddet kunne hvile på toppen af rattet. Ryglænet så lige, at skuldrene har kontakt, når du drejer.', how: 'Sæt dig ind, indstil sæde og rat, og forklar de to tjek.' },

  // ---- spejle ----
  { id: 'spejle', section: 'spejle', q: 'Kontrollér og indstil spejlene', a: 'Spejlene skal være rene, hele og indstillet, så du ser mest muligt bagud. Bakspejlet skal vise hele bagruden. Sidespejlene skal vise en smule af bilens egen side ved den inderste kant og horisonten midt i spejlet.', how: 'Sid i normal kørestilling, indstil alle tre spejle og forklar, hvad du skal kunne se i hvert.' },
];

export const BY_SECTION = KONTROL.reduce((acc, k) => { (acc[k.section] ||= []).push(k); return acc; }, {});

// Træk et opgavekort som til prøven: tre kontrolnumre fra tre forskellige afsnit + spejle.
export function drawCard() {
  const secs = ['styr', 'bremser', 'lys', 'motor', 'baerende', 'udstyr'].sort(() => Math.random() - 0.5).slice(0, 3);
  const picks = secs.map(s => { const arr = BY_SECTION[s]; return arr[Math.floor(Math.random() * arr.length)]; });
  return [...picks, KONTROL.find(k => k.id === 'spejle')];
}
