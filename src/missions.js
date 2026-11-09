/* =========================================================
   MISJE — mieszkańcy Klockowa dają zadania dopasowane do wieku (5–6 / 7–8 / 9+)
   ========================================================= */
const AGE_NAMES = ['5–6 lat', '7–8 lat', '9+ lat'];
const ageT = () => clamp(settings.age | 0, 0, 2);
const byAge = (a, b, c) => [a, b, c][ageT()];
const RESIDENTS = [
  { id: 'kazik', name: 'Pan Kazik', role: 'budowniczy', em: '👷',
    look: { kind: 'human', skin: '#e8b48f', hair: '#d6d0dc', style: 'cap', shirt: '#f2a65a', pattern: 'plain', pants: '#4d5f8f', eyes: 'happy', glasses: true } },
  { id: 'ola', name: 'Ola', role: 'ogrodniczka', em: '👩‍🌾',
    look: { kind: 'human', skin: '#f4cfae', hair: '#c8693b', style: 'tails', shirt: '#7fbf73', pattern: 'heart', pants: '#7a5a43', eyes: 'big', acc: 'flower' } },
  { id: 'feliks', name: 'Lisek Feliks', role: 'podróżnik', em: '🦊',
    look: { kind: 'fox', skin: '#f08a3c', shirt: '#6fa8dc', pattern: 'stripes', pants: '#5d636e', acc: 'backpack' } },
  { id: 'bolek', name: 'Robot Bolek', role: 'konstruktor', em: '🤖',
    look: { kind: 'robot', skin: '#b9c6d6', shirt: '#f2c14e', pattern: 'plain', pants: '#5d636e' } },
  { id: 'hela', name: 'Pani Hela', role: 'malarka', em: '👩‍🎨',
    look: { kind: 'human', skin: '#c98d68', hair: '#25222a', style: 'bun', shirt: '#b48ad8', pattern: 'star', pants: '#f6f2ea', eyes: 'round', acc: 'bow' } },
  { id: 'jozek', name: 'Pan Józek', role: 'rybak', em: '🎣',
    look: { kind: 'human', skin: '#e8b48f', hair: '#7a5236', style: 'curly', shirt: '#3f4a5f', pattern: 'stripes', pants: '#4f8a6a', eyes: 'happy' } },
  { id: 'bartek', name: 'Miś Bartek', role: 'leśniczy', em: '🐻',
    look: { kind: 'bear', skin: '#a8754b', shirt: '#4f8a6a', pattern: 'plain', pants: '#7a5a43', acc: 'backpack' } },
  { id: 'pola', name: 'Panda Pola', role: 'zbieraczka', em: '🐼',
    look: { kind: 'panda', skin: '#f7f5f0', shirt: '#f29bb8', pattern: 'heart', pants: '#3f4a5f', acc: 'flower' } },
];
const RES = Object.fromEntries(RESIDENTS.map(r => [r.id, r]));
const pickR = a => a[Math.floor(Math.random() * a.length)];
const DIRS8 = ['północ', 'północny wschód', 'wschód', 'południowy wschód', 'południe', 'południowy zachód', 'zachód', 'północny zachód'];
const dirName = (dx, dz) => DIRS8[(Math.round(Math.atan2(dx, -dz) / (PI / 4)) + 8) % 8];
const kloc = n => n + ' ' + klockiWord(n);
const BUILD_ANY = null;

/* ----- plany budowy (x w prawo, y w górę, z do przodu), materiał albo '?' do odgadnięcia ----- */
const BP = {
  stairs: () => [[0, 0, 0, 'planks'], [1, 0, 0, 'planks'], [1, 1, 0, 'planks'], [2, 0, 0, 'planks'], [2, 1, 0, 'planks'], [2, 2, 0, 'planks']],
  bench3: () => [[0, 0, 0, 'brick'], [1, 0, 0, 'plaster'], [2, 0, 0, 'brick']],
  rowAB: (a, b, n) => Array.from({ length: n }, (_, i) => [i, 0, 0, i % 2 ? b : a]),
  checker: (a, b, w, h) => { const o = []; for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) o.push([x, y, 0, (x + y) % 2 ? b : a]); return o; },
  seq: (mats, shown, total) => Array.from({ length: total }, (_, i) => [i, 0, 0, mats[i % mats.length], i >= shown]),
  mirror: () => {
    const half = [[0, 0, 'stoneB'], [0, 1, 'stoneB'], [0, 2, 'stoneB'], [0, 3, 'stoneB'], [1, 3, 'brick'], [1, 2, 'green'], [2, 3, 'brick'], [1, 0, 'planks']];
    const o = []; for (const [x, y, m] of half) { o.push([x, y, 0, m]); o.push([5 - x, y, 0, m, true]); } return o;
  },
  gate: () => { const o = []; for (let y = 0; y < 5; y++) { o.push([0, y, 0, 'stoneB']); o.push([5, y, 0, 'stoneB']); } for (let x = 0; x < 6; x++) o.push([x, 5, 0, x % 2 ? 'brick' : 'stoneB']); return o; },
  tower2: h => { const o = []; for (let y = 0; y < h; y++) for (const [x, z] of [[0, 0], [1, 0], [0, 1], [1, 1]]) o.push([x, y, z, y % 2 ? 'plaster' : 'brick']); return o; },
  house: () => {
    const o = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) for (const z of [0, 3]) if (!(z === 3 && x === 2 && y < 2)) o.push([x, y, z, 'planks']);
    for (let y = 0; y < 3; y++) for (let z = 1; z < 3; z++) for (const x of [0, 4]) o.push([x, y, z, 'planks']);
    for (let x = 0; x < 5; x++) for (let z = 0; z < 4; z++) o.push([x, 3, z, 'roofRed']);
    return o;
  },
};

/* ----- katalog misji: każda funkcja zwraca misję na teraz (wiek czytany przy przyjęciu) ----- */
const MS = {
  kazik: [
    () => byAge(
      { title: 'Pierwsze cegły', text: 'Cześć! Jestem Pan Kazik, budowniczy. Postaw trzy cegły, gdzie chcesz.', steps: [{ type: 'place', ids: ['brick'], goal: 3, short: 'Postaw 3 cegły', icons: ['brick', 3] }] },
      { title: 'Pierwsze cegły', text: 'Cześć! Jestem Pan Kazik. Rozgrzewka: postaw sześć klocków z cegły.', steps: [{ type: 'place', ids: ['brick'], goal: 6, short: 'Postaw 6 klocków z cegły' }] },
      { title: 'Pierwsze cegły', text: 'Dzień dobry! Jestem Pan Kazik. Postaw dziesięć klocków z cegły. Możesz używać różnych kształtów.', steps: [{ type: 'place', ids: ['brick'], goal: 10, short: 'Postaw 10 klocków z cegły' }] }),
    () => byAge(
      { title: 'Wieża', text: 'Zbuduj wieżę wysoką na cztery klocki. Stawiaj jeden na drugim.', steps: [{ type: 'tower', goal: 4, short: 'Wieża na 4 klocki', icons: ['stoneB', 4] }] },
      { title: 'Wysoka wieża', text: 'Zbuduj wieżę wysoką na osiem klocków.', steps: [{ type: 'tower', goal: 8, short: 'Wieża na 8 klocków' }] },
      { title: 'Wieża na 5 metrów', text: 'Zbuduj wieżę wysoką na pięć metrów. Pamiętaj, że jeden klocek ma pół metra wysokości.', steps: [{ type: 'tower', goal: 10, short: 'Wieża 5 m (ile klocków?)' }] }),
    () => byAge(
      { title: 'Domek', text: 'Postaw domek. Znajdziesz go w grupie Gotowe.', steps: [{ type: 'prefab', name: 'house', goal: 1, short: 'Postaw domek z Gotowych', icons: ['!house', 1] }] },
      { title: 'Własny domek', text: 'Zbuduj własny domek: postaw drzwi i dwa okna. Ściany zbuduj, jak chcesz.', steps: [{ type: 'place', ids: ['door'], goal: 1, short: 'Postaw drzwi' }, { type: 'place', ids: ['window'], goal: 2, short: 'Postaw 2 okna' }] },
      { title: 'Mur policzony', text: 'Mam zagadkę. Mur ma sześć kratek długości i trzy kratki wysokości.', steps: [
        { type: 'quiz', q: 'Ile kratek zajmie cały mur 6 na 3?', choices: [9, 12, 18, 24], answer: 18, short: 'Zagadka o murze' },
        { type: 'place', ids: null, cells: true, goal: 18, short: 'Zbuduj mur z 18 kratek' }] }),
    () => byAge(
      { title: 'Kolorowo', text: 'Postaw dwa zielone klocki i dwa pomarańczowe. Kolory znajdziesz w Buduj, w grupie Kolory.', steps: [{ type: 'place', ids: ['green'], goal: 2, short: '2 zielone', icons: ['green', 2] }, { type: 'place', ids: ['orange'], goal: 2, short: '2 pomarańczowe', icons: ['orange', 2] }] },
      { title: 'Most', text: 'Postaw mostek. Jeśli jeszcze go nie masz, zbuduj kładkę z sześciu desek nad wodą albo dołkiem.', steps: [{ type: 'place', ids: ['planks'], goal: 6, short: 'Kładka z 6 desek' }] },
      { title: 'Zamek', text: 'Zbuduj coś dużego: postaw zamek z Gotowych albo trzydzieści klocków z kamienia.', steps: [{ type: 'place', ids: ['stoneB'], goal: 30, short: '30 klocków z kamienia' }] }),
  ],
  ola: [
    () => byAge(
      { title: 'Drzewka', text: 'Cześć! Jestem Ola, ogrodniczka. Posadź trzy drzewka. Są na dole w Przyrodzie.', steps: [{ type: 'tool', tool: 'plant', goal: 3, short: 'Posadź 3 rośliny', icons: ['tree', 3] }] },
      { title: 'Ogród', text: 'Cześć! Jestem Ola. Posadź sześć roślin. Drzewa, krzaki i kwiatki są w Przyrodzie.', steps: [{ type: 'tool', tool: 'plant', goal: 6, short: 'Posadź 6 roślin' }] },
      { title: 'Mały las', text: 'Cześć! Jestem Ola. Posadź mały las: dwanaście roślin, najlepiej drzewa.', steps: [{ type: 'tool', tool: 'plant', goal: 12, short: 'Posadź 12 roślin' }] }),
    () => byAge(
      { title: 'Staw', text: 'Wykop dołek łopatą, a potem napełnij go wodą z wiadra.', steps: [{ type: 'tool', tool: 'dig', goal: 1, short: 'Wykop dołek' }, { type: 'tool', tool: 'water', goal: 1, short: 'Nalej wody' }] },
      { title: 'Staw', text: 'Zrób staw. Wykop dołek i napełnij go wodą. Woda musi zająć co najmniej dwadzieścia kratek.', steps: [{ type: 'tool', tool: 'water', goal: 20, short: 'Staw z 20 kratek wody' }] },
      { title: 'Staw i górka', text: 'Zrób staw z co najmniej czterdziestu kratek wody, a ziemię usyp obok w górkę.', steps: [{ type: 'tool', tool: 'water', goal: 40, short: 'Staw z 40 kratek wody' }, { type: 'tool', tool: 'raise', goal: 15, short: 'Usyp górkę' }] }),
    () => byAge(
      { title: 'Piesek', text: 'Pogłaszcz pieska. Kliknij w niego.', steps: [{ type: 'pet', kind: 'dog', goal: 1, short: 'Pogłaszcz pieska', icons: ['@dog', 1] }] },
      { title: 'Zwierzaki', text: 'Pogłaszcz trzy różne zwierzaki.', steps: [{ type: 'pet', distinct: true, goal: 3, short: 'Pogłaszcz 3 różne zwierzaki' }] },
      { title: 'Zagroda', text: 'Postaw dwie owieczki, a potem zagrodę z Gotowych.', steps: [{ type: 'animal', kind: 'sheep', goal: 2, short: 'Postaw 2 owieczki' }, { type: 'prefab', name: 'pen', goal: 1, short: 'Postaw zagrodę' }] }),
    () => byAge(
      { title: 'Wycinka', text: 'Wytnij jedno drzewo. Wybierz na dole Zabierz i dotknij drzewa, a się przewróci!', steps: [{ type: 'tool', tool: 'axe', goal: 1, short: 'Wytnij drzewo', icons: ['tree', 1] }] },
      { title: 'Polana', text: 'Zrób polanę: wytnij cztery drzewa, a potem posadź kwiatki.', steps: [{ type: 'tool', tool: 'axe', goal: 4, short: 'Wytnij 4 drzewa' }, { type: 'tool', tool: 'plant', goal: 3, short: 'Posadź 3 rośliny' }] },
      { title: 'Plac pod budowę', text: 'Przygotuj plac: wytnij pięć drzew i wyrównaj teren.', steps: [{ type: 'tool', tool: 'axe', goal: 5, short: 'Wytnij 5 drzew' }, { type: 'tool', tool: 'flat', goal: 20, short: 'Wyrównaj teren' }] }),
    () => byAge(
      { title: 'Marchewki', text: 'Posadź dwie grządki marchewek. Są w Przyrodzie.', steps: [{ type: 'place', ids: ['carrots'], goal: 2, short: '2 grządki marchewek', icons: ['carrots', 2] }] },
      { title: 'Warzywnik', text: 'Zrób warzywnik: cztery grządki marchewek i cztery zboża.', steps: [{ type: 'place', ids: ['carrots'], goal: 4, short: '4 grządki marchewek' }, { type: 'place', ids: ['wheat'], goal: 4, short: '4 zboża' }] },
      { title: 'Grządki', text: 'Zagadka ogrodniczki.', steps: [
        { type: 'quiz', q: 'Mam 4 rzędy grządek, w każdym po 3. Ile to grządek?', choices: [7, 10, 12, 16], answer: 12, short: 'Zagadka o grządkach' },
        { type: 'place', ids: ['carrots', 'wheat'], goal: 12, short: 'Posadź 12 grządek' }] }),
  ],
  feliks: [
    () => byAge(
      { title: 'Zgubiona owieczka', text: 'Cześć! Jestem Lisek Feliks. Zgubiła się owieczka. Idź za strzałką i ją znajdź!', steps: [{ type: 'find', kind: 'sheep', dist: 22, back: false, goal: 1, short: 'Znajdź owieczkę', icons: ['@sheep', 1] }] },
      { title: 'Zgubiona owieczka', text: 'Cześć! Jestem Lisek Feliks. Zgubiła się owieczka. Znajdź ją i przyprowadź do mnie.', steps: [{ type: 'find', kind: 'sheep', dist: 38, back: true, goal: 1, short: 'Przyprowadź owieczkę' }] },
      { title: 'Zgubiona owieczka', text: 'Cześć! Jestem Lisek Feliks. Owieczka uciekła daleko na DIR. Znajdź ją i przyprowadź do mnie.', steps: [{ type: 'find', kind: 'sheep', dist: 58, back: true, goal: 1, short: 'Owieczka na DIR' }] }),
    () => byAge(
      { title: 'Skrzynki', text: 'Ukryłem dwie skrzynki ze skarbami. Idź za strzałką i kliknij w skrzynkę.', steps: [{ type: 'chests', n: 2, dist: 18, goal: 2, short: 'Znajdź 2 skrzynki', icons: ['chest', 2] }] },
      { title: 'Skrzynki', text: 'Ukryłem trzy skrzynki ze skarbami. Znajdź je wszystkie.', steps: [{ type: 'chests', n: 3, dist: 32, goal: 3, short: 'Znajdź 3 skrzynki' }] },
      { title: 'Skarby', text: 'Ukryłem cztery skrzynki daleko od domu. Znajdź je wszystkie.', steps: [{ type: 'chests', n: 4, dist: 52, goal: 4, short: 'Znajdź 4 skrzynki' }] }),
    () => byAge(
      { title: 'Królik', text: 'Króliczek schował się w trawie. Znajdź go!', steps: [{ type: 'find', kind: 'bunny', dist: 20, back: false, goal: 1, short: 'Znajdź króliczka', icons: ['@bunny', 1] }] },
      { title: 'Kotek', text: 'Kotek poszedł na spacer i nie wrócił. Znajdź go i przyprowadź do mnie.', steps: [{ type: 'find', kind: 'cat', dist: 40, back: true, goal: 1, short: 'Przyprowadź kotka' }] },
      { title: 'Kurka', text: 'Kurka uciekła na DIR. Znajdź ją i przyprowadź.', steps: [{ type: 'find', kind: 'chicken', dist: 62, back: true, goal: 1, short: 'Kurka na DIR' }] }),
  ],
  bolek: [
    () => byAge(
      { title: 'Schodki', text: 'Bip bop! Jestem Robot Bolek. Zbuduj schodki dokładnie jak na moim planie. Przezroczyste klocki pokazują, gdzie stawiać.', steps: [{ type: 'blueprint', bp: 'stairs', short: 'Zbuduj schodki z planu' }] },
      { title: 'Szachownica', text: 'Bip bop! Jestem Robot Bolek. Zbuduj ścianę w szachownicę, jak na planie.', steps: [{ type: 'blueprint', bp: 'checker', short: 'Ściana w szachownicę' }] },
      { title: 'Brama z pamięci', text: 'Bip bop! Jestem Robot Bolek. Pokażę plan bramy tylko na chwilę. Zapamiętaj go i zbuduj. Plan możesz podejrzeć w księdze.', steps: [{ type: 'blueprint', bp: 'gate', memory: true, short: 'Brama z pamięci' }] }),
    () => byAge(
      { title: 'Liczenie', text: 'Bip! Zagadka liczenia.', steps: [
        { type: 'quiz', q: 'Dwa klocki i jeszcze jeden. Ile razem?', choices: [2, 3, 4], answer: 3, short: 'Zagadka' },
        { type: 'place', ids: null, goal: 3, short: 'Postaw 3 klocki', icons: ['planks', 3] }] },
      { title: 'Dokończ wzór', text: 'Bip! Dokończ wzór. Szare klocki to zagadka: jaki kolor powinien tam być?', steps: [{ type: 'blueprint', bp: 'seq3', short: 'Dokończ wzór' }] },
      { title: 'Lustro', text: 'Bip! Lewa połowa jest kolorowa. Prawa ma być jej lustrzanym odbiciem. Szare klocki to zagadka.', steps: [{ type: 'blueprint', bp: 'mirror', short: 'Zbuduj lustrzane odbicie' }] }),
    () => byAge(
      { title: 'Wzór', text: 'Ułóż wzór na planie: cegła, zielony, cegła, zielony.', steps: [{ type: 'blueprint', bp: 'rowAB', short: 'Ułóż wzór z planu' }] },
      { title: 'Wieża 2 na 2', text: 'Bip! Zagadka.', steps: [
        { type: 'quiz', q: 'Wieża ma 2 na 2 klocki w każdej warstwie i 3 warstwy. Ile ma klocków?', choices: [6, 8, 12, 16], answer: 12, short: 'Zagadka o wieży' },
        { type: 'blueprint', bp: 'tower3', short: 'Zbuduj wieżę z planu' }] },
      { title: 'Domek z planu', text: 'Bip! Zbuduj domek dokładnie według planu: ściany z desek i dach z dachówki.', steps: [{ type: 'blueprint', bp: 'house', short: 'Domek z planu' }] }),
  ],
};
const BP_FOR = {
  stairs: () => BP.stairs(), checker: () => { const [a, b] = shuffle(COLORS_OK).slice(0, 2); return BP.checker(a, b, 4, 3); }, gate: () => BP.gate(),
  seq3: () => BP.seq(shuffle(['brick', 'green', 'orange', 'purple']).slice(0, 3), 4, 7), mirror: () => BP.mirror(), rowAB: () => { const [a, b] = shuffle(COLORS_OK).slice(0, 2); return BP.rowAB(a, b, 4); },
  pyr3: () => [[0, 0, 0, 'sandstone'], [1, 0, 0, 'sandstone'], [2, 0, 0, 'sandstone'], [1, 1, 0, 'sandstone']],
  pyr5: () => { const o = []; for (let y = 0; y < 3; y++) for (let x = y; x < 5 - y; x++) o.push([x, y, 0, y === 2 ? 'orange' : 'sandstone']); return o; },
  arch: () => { const o = []; for (let y = 0; y < 3; y++) { o.push([0, y, 0, 'stoneB']); o.push([3, y, 0, 'stoneB']); } for (let x = 0; x < 4; x++) o.push([x, 3, 0, 'brick']); return o; },
  flag2: () => { const [a, b] = shuffle(COLORS_OK).slice(0, 2); const o = []; for (let x = 0; x < 3; x++) for (let y = 0; y < 2; y++) o.push([x, y, 0, y ? a : b]); return o; },
  flag3: () => { const cs = shuffle(COLORS_OK).slice(0, 3); const o = []; for (let x = 0; x < 4; x++) for (let y = 0; y < 3; y++) o.push([x, y, 0, cs[y]]); return o; },
  ring: () => { const o = []; for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) if (x === 0 || z === 0 || x === 3 || z === 3) for (let y = 0; y < 2; y++) o.push([x, y, z, y ? 'brick' : 'stoneB']); return o; },
  tower3: () => BP.tower2(3), house: () => BP.house(), bench3: () => BP.bench3(), seq2: () => BP.seq(shuffle(COLORS_OK).slice(0, 2), 3, 6),
};
/* ----- pula szablonów: misje losowane tak, żeby się nie powtarzały ----- */
const TPL = {};
const defM = (id, npcs, gen) => { TPL[id] = { id, npcs, gen }; };
for (const id in MS) MS[id].forEach((fn, i) => defM(id + i, [id], fn));
const MATS_OK = ['brick', 'planks', 'darkwood', 'plaster', 'stoneB', 'sandstone', 'cobble', 'log', 'hedge'];
const COLORS_OK = ['green', 'orange', 'purple', 'brick', 'plaster', 'darkwood'];
const PREFAB_OK = ['house', 'garden', 'pen', 'playground', 'farm', 'stall', 'bridge'];
const SHAPES_OK = [{ sh: 4, pk: 'slupek', one: 'słupek', many: 'słupki' }, { sh: 2, pk: 'schodki', one: 'schodki', many: 'schodków' }, { sh: 7, pk: 'luk', one: 'łuk', many: 'łuki' }, { sh: 3, pk: 'skos', one: 'skos', many: 'skosy' }];
const ANIM_OK = ['sheep', 'bunny', 'cat', 'chicken'];
const ANIM = { sheep: { nom: 'owieczka', acc: 'owieczkę', pl: 'owieczki', f: 1 }, bunny: { nom: 'króliczek', acc: 'króliczka', pl: 'króliczki' }, cat: { nom: 'kotek', acc: 'kotka', pl: 'kotki' }, chicken: { nom: 'kurka', acc: 'kurkę', pl: 'kurki', f: 1 } };
const mname = k => BL[BK[k]].name;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(v => v[1]);
const quizChoices = (ans, spread) => shuffle([...new Set([ans, ans + spread, Math.max(1, ans - spread), ans + 2 * spread])]).slice(0, 4).sort((p, q) => p - q);
// budowniczy
const plw = (n, a, b, c) => n === 1 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? b : c;
defM('k_mat', ['kazik'], () => { const m = pickR(MATS_OK), n = byAge(rnd(3, 5), rnd(6, 10), rnd(12, 18)); return { title: 'Zapas klocków', text: pickR([`Brakuje mi materiału: ${mname(m)}. Postaw ${kloc(n)}.`, `Buduję coś dużego. Postaw ${kloc(n)} z materiału: ${mname(m)}.`]), steps: [{ type: 'place', ids: [m], goal: n, short: `${n} × ${mname(m)}`, icons: [m, Math.min(n, 6)] }] }; });
defM('k_tower', ['kazik', 'bolek'], () => { const h = byAge(rnd(3, 5), rnd(6, 9), rnd(5, 7) * 2); return { title: 'Wieża', text: byAge(`Zbuduj wieżę wysoką na ${kloc(h)}. Stawiaj jeden na drugim.`, `Zbuduj wysoką wieżę: ${kloc(h)} jeden na drugim.`, `Zbuduj wieżę wysoką na ${h / 2} metrów. Jeden klocek ma pół metra.`), steps: [{ type: 'tower', goal: h, short: byAge(`Wieża na ${h}`, `Wieża na ${h}`, `Wieża ${h / 2} m`), icons: ['stoneB', h] }] }; });
defM('k_shape', ['kazik', 'bolek'], () => { const S = pickR(SHAPES_OK), n = byAge(2, 4, 6); return { title: 'Kształty', text: `Postaw ${kloc(n)} w kształcie: ${S.one}. Kształt wybierzesz nad paskiem klocków.`, steps: [{ type: 'place', ids: null, shape: S.sh, goal: n, short: `${n} × ${S.one}` }] }; });
defM('k_prefab', ['kazik'], () => { const pf = pickR(PREFAB_OK), nm = PREFABS[pf].name; return byAge(
  { title: 'Gotowe', text: `Postaw: ${nm}. Znajdziesz to w grupie Gotowe.`, steps: [{ type: 'prefab', name: pf, goal: 1, short: `Postaw: ${nm}`, icons: ['!' + pf, 1] }] },
  { title: 'Gotowe i więcej', text: `Postaw: ${nm} z Gotowych, a potem dobuduj coś swojego z sześciu klocków.`, steps: [{ type: 'prefab', name: pf, goal: 1, short: `Postaw: ${nm}` }, { type: 'place', ids: null, goal: 6, short: 'Dobuduj 6 klocków' }] },
  { title: 'Osiedle', text: `Postaw: ${nm}, a obok zbuduj własny dom z drzwiami i oknem.`, steps: [{ type: 'prefab', name: pf, goal: 1, short: `Postaw: ${nm}` }, { type: 'place', ids: ['door'], goal: 1, short: 'Postaw drzwi' }, { type: 'place', ids: ['window'], goal: 1, short: 'Postaw okno' }] }); });
defM('k_roof', ['kazik'], () => { const r = pickR(['roofRed', 'roofGreen', 'thatch']), n = byAge(2, 4, 8); return { title: 'Dach', text: `Postaw ${kloc(n)} dachu: ${mname(r)}.`, steps: [{ type: 'place', ids: [r], goal: n, short: `${n} × ${mname(r)}`, icons: [r, n] }] }; });
defM('k_furn', ['kazik', 'hela'], () => byAge(
  { title: 'Meble', text: 'Postaw stół i krzesło. Są w grupie Dom.', steps: [{ type: 'place', ids: ['table'], goal: 1, short: 'Postaw stół', icons: ['table', 1] }, { type: 'place', ids: ['chair'], goal: 1, short: 'Postaw krzesło', icons: ['chair', 1] }] },
  { title: 'Pokój', text: 'Urządź pokój: łóżko, stół i dwa krzesła.', steps: [{ type: 'place', ids: ['bed'], goal: 1, short: 'Postaw łóżko' }, { type: 'place', ids: ['table'], goal: 1, short: 'Postaw stół' }, { type: 'place', ids: ['chair'], goal: 2, short: 'Postaw 2 krzesła' }] },
  { title: 'Dom do mieszkania', text: 'Zbuduj dom z drzwiami i dwoma oknami, a w środku postaw łóżko i stół.', steps: [{ type: 'place', ids: ['door'], goal: 1, short: 'Drzwi' }, { type: 'place', ids: ['window'], goal: 2, short: '2 okna' }, { type: 'place', ids: ['bed', 'table'], goal: 2, short: 'Łóżko i stół' }] }));
// malarka
defM('h_paint', ['hela'], () => { const c = pickR(['green', 'orange', 'purple']), n = byAge(2, 5, 9); return { title: 'Malowanie', text: `Wybierz Maluj i kolor: ${mname(c)}. Potem pomaluj ${kloc(n)}, które już stoją.`, steps: [{ type: 'paint', ids: [c], goal: n, short: `Pomaluj ${n} na: ${mname(c)}`, icons: [c, n] }] }; });
defM('h_rainbow', ['hela', 'pola'], () => { const cs = shuffle(['green', 'orange', 'purple', 'brick']).slice(0, byAge(2, 3, 4)), n = byAge(1, 2, 3); return { title: 'Tęcza', text: `Zbuduj tęczę z kolorów: ${cs.map(mname).join(', ')}. Po ${n} z każdego.`, steps: cs.map(c => ({ type: 'place', ids: [c], goal: n, short: `${n} × ${mname(c)}`, icons: [c, n] })) }; });
defM('h_pattern', ['hela', 'bolek'], () => ({ title: 'Wzór', text: byAge('Ułóż kolorowy wzór dokładnie jak na planie.', 'Zbuduj kolorową ścianę według planu.', 'Dokończ wzór. Szare klocki to zagadka: jaki kolor tam pasuje?'), steps: [{ type: 'blueprint', bp: byAge(pickR(['rowAB', 'flag2']), pickR(['checker', 'flag3']), pickR(['seq3', 'seq2'])), short: 'Wzór z planu' }] }));
defM('h_paintany', ['hela'], () => { const n = byAge(3, 6, 10); return { title: 'Odnowa', text: `Odnów stare klocki: pomaluj ${kloc(n)} na dowolne kolory.`, steps: [{ type: 'paint', ids: null, goal: n, short: `Pomaluj ${kloc(n)}` }] }; });
// rybak
defM('j_pond', ['jozek'], () => { const n = byAge(4, 20, 40); return { title: 'Staw dla ryb', text: byAge('Wykop dołek łopatą i nalej do niego wody z wiadra.', `Zrób staw. Woda musi zająć co najmniej ${n} kratek.`, `Zrób duży staw: co najmniej ${n} kratek wody, a ziemię usyp obok w górkę.`), steps: byAge([{ type: 'tool', tool: 'dig', goal: 1, short: 'Wykop dołek' }, { type: 'tool', tool: 'water', goal: 1, short: 'Nalej wody' }], [{ type: 'tool', tool: 'water', goal: n, short: `Staw z ${n} kratek` }], [{ type: 'tool', tool: 'water', goal: n, short: `Staw z ${n} kratek` }, { type: 'tool', tool: 'raise', goal: 15, short: 'Usyp górkę' }]) }; });
defM('j_pier', ['jozek'], () => { const n = byAge(2, 4, 8); return { title: 'Pomost', text: `Zbuduj pomost: postaw ${n} ${plw(n, 'deskę', 'deski', 'desek')} nad wodą. Jeśli wody nie ma blisko, zrób najpierw staw.`, steps: [{ type: 'overwater', goal: n, short: `${n} ${plw(n, 'deska', 'deski', 'desek')} nad wodą`, icons: ['planks', n] }] }; });
defM('j_bridge', ['jozek', 'kazik', 'feliks'], () => ({ title: 'Mostek', text: 'Postaw mostek z grupy Gotowe. Najlepiej nad wodą!', steps: [{ type: 'prefab', name: 'bridge', goal: 1, short: 'Postaw mostek', icons: ['!bridge', 1] }] }));
defM('j_boat', ['jozek'], () => ({ title: 'Przystań', text: byAge('Postaw dwie beczki obok wody.', 'Zbuduj przystań: dwie beczki, skrzynię i latarnię.', 'Zbuduj przystań: pomost z sześciu desek nad wodą, dwie beczki i latarnię.'), steps: byAge(
  [{ type: 'place', ids: ['barrel'], goal: 2, short: '2 beczki', icons: ['barrel', 2] }],
  [{ type: 'place', ids: ['barrel'], goal: 2, short: '2 beczki' }, { type: 'place', ids: ['chest'], goal: 1, short: 'Skrzynia' }, { type: 'place', ids: ['lamp'], goal: 1, short: 'Latarnia' }],
  [{ type: 'overwater', goal: 6, short: '6 desek nad wodą' }, { type: 'place', ids: ['barrel'], goal: 2, short: '2 beczki' }, { type: 'place', ids: ['lamp'], goal: 1, short: 'Latarnia' }]) }));
// leśniczy i ogrodniczka
defM('m_plant', ['bartek', 'ola'], () => { const n = byAge(rnd(2, 4), rnd(5, 8), rnd(10, 15)); return { title: 'Sadzenie', text: pickR([`Las potrzebuje nowych drzew. Posadź ${n} ${plw(n, 'roślinę', 'rośliny', 'roślin')}.`, `Posadź ${n} ${plw(n, 'roślinę', 'rośliny', 'roślin')}. Drzewka są w Przyrodzie.`]), steps: [{ type: 'tool', tool: 'plant', goal: n, short: `Posadź ${n} ${plw(n, 'roślinę', 'rośliny', 'roślin')}`, icons: ['tree', Math.min(n, 6)] }] }; });
defM('m_axe', ['bartek'], () => { const a = byAge(1, 3, 5), b = byAge(2, 4, 8); return { title: 'Porządki w lesie', text: `Wytnij ${a} ${plw(a, 'drzewo', 'drzewa', 'drzew')} (Zabierz i dotknij drzewa), a potem posadź ${b} ${plw(b, 'nową roślinę', 'nowe rośliny', 'nowych roślin')}.`, steps: [{ type: 'tool', tool: 'axe', goal: a, short: `Wytnij ${a} ${plw(a, 'drzewo', 'drzewa', 'drzew')}` }, { type: 'tool', tool: 'plant', goal: b, short: `Posadź ${b} ${plw(b, 'roślinę', 'rośliny', 'roślin')}` }] }; });
defM('m_animals', ['bartek', 'pola'], () => { const k = pickR(ANIM_OK), A = ANIM[k], n = byAge(1, 2, 3); const what = n === 1 ? A.acc : `${n} ${A.pl}`; return { title: 'Zwierzaki', text: `Postaw ${what}. Wybierz na dole Zwierzaki.`, steps: [{ type: 'animal', kind: k, goal: n, short: `Postaw ${what}`, icons: ['@' + k, n] }] }; });
defM('m_pet', ['bartek', 'ola'], () => { const n = byAge(2, 2, 3); return { title: 'Głaskanie', text: `Postaw ${n === 2 ? 'zwierzaka' : 'dwa różne zwierzaki'}, a potem pogłaszcz ${n} różne. Kliknij w każdego.`, steps: [{ type: 'animal', kind: null, goal: n - 1, short: n === 2 ? 'Postaw zwierzaka' : 'Postaw 2 zwierzaki' }, { type: 'pet', distinct: true, goal: n, short: `Pogłaszcz ${n} różne` }] }; });
defM('m_mush', ['bartek'], () => { const n = byAge(2, 4, 6); return { title: 'Grzybki', text: `Postaw ${n} ${plw(n, 'grzybek', 'grzybki', 'grzybków')} pod drzewami.`, steps: [{ type: 'place', ids: ['mushroom'], goal: n, short: `${n} ${plw(n, 'grzybek', 'grzybki', 'grzybków')}`, icons: ['mushroom', n] }] }; });
defM('o_pots', ['ola'], () => { const n = byAge(2, 4, 6); return { title: 'Kwiatki', text: `Postaw ${n} ${plw(n, 'doniczkę', 'doniczki', 'doniczek')} z kwiatkami.`, steps: [{ type: 'place', ids: ['pot'], goal: n, short: `${n} ${plw(n, 'doniczka', 'doniczki', 'doniczek')}`, icons: ['pot', n] }] }; });
defM('o_farm', ['ola'], () => { const pf = pickR(['garden', 'farm']), nm = PREFABS[pf].name; return { title: 'Gospodarstwo', text: byAge(`Postaw: ${nm}. Znajdziesz to w Gotowych.`, `Postaw: ${nm}, a obok trzy grządki marchewek.`, `Postaw: ${nm}, a obok cztery grządki marchewek i cztery zboża.`), steps: [{ type: 'prefab', name: pf, goal: 1, short: `Postaw: ${nm}`, icons: ['!' + pf, 1] }].concat(byAge([], [{ type: 'place', ids: ['carrots'], goal: 3, short: '3 grządki marchewek' }], [{ type: 'place', ids: ['carrots'], goal: 4, short: '4 grządki marchewek' }, { type: 'place', ids: ['wheat'], goal: 4, short: '4 zboża' }])) }; });
// zbieraczka i podróżnik
const COLL = { star: ['gwiazdkę', 'gwiazdki', 'gwiazdek'], gem: ['kryształek', 'kryształki', 'kryształków'] };
defM('p_collect', ['pola', 'feliks', 'jozek'], () => { const k = pickR(['star', 'gem']), n = byAge(3, 5, 8), w = plw(n, ...COLL[k]); return { title: 'Zbieranie', text: `Gdzieś tu leży ${n} ${w}. Zbierz je wszystkie: wystarczy do nich podejść.`, steps: [{ type: 'collect', kind: k, n, rad: byAge(10, 18, 28), goal: n, short: `Zbierz ${n} ${w}` }] }; });
defM('p_reach', ['pola', 'feliks'], () => { const d = byAge(20, 36, 56); return { title: 'Wyprawa', text: byAge('Niedaleko stoi chorągiewka. Idź za strzałką i do niej dojdź!', 'Gdzieś stoi chorągiewka. Dojdź do niej!', 'Chorągiewka stoi około DIST metrów na DIR. Dojdź do niej.'), steps: [{ type: 'reach', dist: d, goal: 1, short: byAge('Dojdź do chorągiewki', 'Dojdź do chorągiewki', 'Chorągiewka na DIR') }] }; });
defM('p_chests', ['pola'], () => { const n = byAge(2, 3, 4); return { title: 'Skarby', text: `Gdzieś tu są ${n} skrzynki ze skarbami. Znajdź je!`, steps: [{ type: 'chests', n, dist: byAge(16, 30, 46), goal: n, short: `Znajdź ${n} skrzynki`, icons: ['chest', n] }] }; });
defM('p_picnic', ['pola', 'ola'], () => byAge(
  { title: 'Piknik', text: 'Zróbmy piknik! Postaw stół i doniczkę z kwiatkiem.', steps: [{ type: 'place', ids: ['table'], goal: 1, short: 'Postaw stół', icons: ['table', 1] }, { type: 'place', ids: ['pot'], goal: 1, short: 'Postaw doniczkę', icons: ['pot', 1] }] },
  { title: 'Piknik', text: 'Zróbmy piknik: stół, dwa krzesła i ławka.', steps: [{ type: 'place', ids: ['table'], goal: 1, short: 'Stół' }, { type: 'place', ids: ['chair'], goal: 2, short: '2 krzesła' }, { type: 'place', ids: ['bench'], goal: 1, short: 'Ławka' }] },
  { title: 'Piknik nad wodą', text: 'Zrób piknik nad wodą: staw z co najmniej dziesięciu kratek, obok stół, dwa krzesła i latarnia.', steps: [{ type: 'tool', tool: 'water', goal: 10, short: 'Staw z 10 kratek' }, { type: 'place', ids: ['table'], goal: 1, short: 'Stół' }, { type: 'place', ids: ['chair'], goal: 2, short: '2 krzesła' }, { type: 'place', ids: ['lamp'], goal: 1, short: 'Latarnia' }] }));
defM('f_find', ['feliks', 'bartek'], () => { const k = pickR(ANIM_OK), A = ANIM[k], back = ageT() > 0, d = byAge(rnd(18, 24), rnd(32, 40), rnd(50, 62)); const zg = A.f ? 'Zgubiła' : 'Zgubił', ja = A.f ? 'ją' : 'go'; return { title: 'Zguba', text: byAge(`${zg} się ${A.nom}. Idź za strzałką i ${ja} znajdź!`, `${zg} się ${A.nom}. Znajdź ${ja} i przyprowadź do mnie.`, `${A.f ? 'Uciekła' : 'Uciekł'} mi ${A.nom} na DIR. Znajdź ${ja} i przyprowadź.`), steps: [{ type: 'find', kind: k, dist: d, back, goal: 1, short: back ? `Przyprowadź: ${A.acc}` : `Znajdź: ${A.acc}`, icons: ['@' + k, 1] }] }; });
// konstruktor: plany i zagadki z losowymi liczbami
defM('b_plan', ['bolek'], () => { const k = pickR(byAge(['stairs', 'rowAB', 'bench3', 'pyr3', 'flag2'], ['checker', 'seq3', 'tower3', 'seq2', 'pyr5', 'arch', 'flag3'], ['gate', 'mirror', 'house', 'ring', 'arch'])); return { title: 'Plan', text: byAge('Bip bop! Zbuduj to dokładnie jak na planie. Strzałka pokazuje, gdzie postawić klocek.', 'Bip bop! Mam nowy plan. Zbuduj go dokładnie.', k === 'gate' ? 'Bip! Pokażę plan tylko na chwilę. Zapamiętaj go i zbuduj.' : 'Bip! Zbuduj według planu. Uważaj na kolory.'), steps: [{ type: 'blueprint', bp: k, memory: ageT() === 2 && k === 'gate', short: 'Zbuduj z planu' }] }; });
defM('b_quiz', ['bolek', 'kazik'], () => {
  let q, ans, sp = 2;
  if (ageT() === 0) { const a = rnd(1, 3), b = rnd(1, 2); q = `${a} ${plw(a, 'klocek', 'klocki', 'klocków')} i jeszcze ${b}. Ile razem?`; ans = a + b; sp = 1; }
  else if (ageT() === 1) { if (Math.random() < .5) { const a = rnd(2, 4), b = rnd(2, 4); q = `Mur ma ${a} rzędy po ${b} klocki. Ile to klocków?`; ans = a * b; } else { const a = rnd(5, 9), b = rnd(3, 6); q = `Wieża ma ${a} klocków. Dokładam jeszcze ${b}. Ile ma teraz?`; ans = a + b; } }
  else { const w = rnd(3, 6), h = rnd(2, 4), kind = pickR(['area', 'fence', 'm']); if (kind === 'area') { q = `Podłoga ma ${w} na ${h} kratki. Ile klocków ją przykryje?`; ans = w * h; } else if (kind === 'fence') { q = `Ogródek ma 4 boki, a na każdym boku stoi ${w} płotków. Ile płotków razem?`; ans = 4 * w; } else { const m = rnd(3, 6); q = `Ile klocków potrzeba na wieżę wysoką na ${m} metrów? Klocek ma pół metra.`; ans = 2 * m; } }
  return { title: 'Zagadka', text: 'Mam zagadkę!', steps: [{ type: 'quiz', q, choices: quizChoices(ans, sp), answer: ans, short: 'Zagadka' }, { type: 'place', ids: null, cells: true, goal: ans, short: `Postaw ${kloc(ans)}` }] };
});
// te szablony to powitania albo mają nowsze, losowane odpowiedniki
const INTRO_ONLY = new Set(['kazik0', 'kazik1', 'ola0', 'ola1', 'feliks0', 'feliks2', 'bolek0']);
const poolFor = id => Object.values(TPL).filter(t => t.npcs.includes(id) && !INTRO_ONLY.has(t.id));
const AGAIN = ['Znowu się spotykamy!', 'O, to ty! Dobrze cię widzieć.', 'Hej! Mam coś nowego.', 'Cieszę się, że cię widzę!', 'Dzień dobry!'];

/* =========================================================
   Moduł misji
   ========================================================= */
const Missions = {
  npcs: [], idx: {}, hist: [], used: {}, mcount: 0, lastDone: null, gone: [], active: null, chests: [], items: [], flag: null, bp: null, ghost: null, t: 0,
  get w() { return Build3.world; },
  init(scene) {
    this.scene = scene;
    this.g = new THREE.Group(); scene.add(this.g);
    Build3.on('place', list => this.onEvent('place', list));
    Build3.on('prefab', e => this.onEvent('prefab', e));
    Build3.on('tool', e => this.onEvent('tool', e));
    Build3.on('pet', a => this.onEvent('pet', a));
    Build3.on('animal', k => this.onEvent('animal', k));
    Build3.on('paint', e => this.onEvent('paint', e));
  },
  markerTex(ch, bg) {
    const key = 'mk' + ch + bg; if (TEX[key]) return TEX[key];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = bg; g.beginPath(); g.arc(64, 58, 46, 0, PI * 2); g.fill();
    g.beginPath(); g.moveTo(48, 96); g.lineTo(64, 122); g.lineTo(80, 96); g.fill();
    g.fillStyle = '#ffffff'; g.font = 'bold 72px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 62);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (TEX[key] = t);
  },
  reset() {
    this.g.clear(); this.npcs = []; this.chests = []; this.items = []; this.flag = null; this.clearGhost(); this.active = null;
    this.idx = {}; this.hist = []; this.used = {}; this.mcount = 0; this.lastDone = null; this.gone = []; this.lastP = null; this.spawnCD = 0; this.relT = 99;
  },
  // --- ładowanie i zapis ---
  load(data) {
    this.reset();
    if (data) {
      this.idx = data.idx || {}; this.active = data.active || null; this.hist = data.hist || []; this.used = data.used || {};
      this.mcount = data.mcount || 0; this.lastDone = data.lastDone || null;
    }
    if (this.active && !RES[this.active.npc]) this.active = null;
    const pp = Build3.player.pos;
    for (const q of (data && data.npcs) || []) {
      if (!RES[q.id] || !q.spot || this.npcOf(q.id) || Math.hypot(q.spot[0] - pp.x, q.spot[2] - pp.z) > 90) continue;
      this.addNpc(q.id, this.findSpot(q.spot[0], q.spot[2]));
    }
    if (this.active && !this.npcOf(this.active.npc)) this.addNpc(this.active.npc, this.spawnSpot(true) || this.findSpot(Math.floor(pp.x) + 6, Math.floor(pp.z)));
    if (this.active) this.restoreActive();
  },
  save() {
    const A = this.active;
    if (A) for (const s of A.steps) if (s.type === 'find' && s._a) s.pos = [s._a.cx, s._a.cy, s._a.cz];
    return {
      idx: this.idx, hist: this.hist, used: this.used, mcount: this.mcount, lastDone: this.lastDone,
      npcs: this.npcs.filter(N => !N.leaving).map(N => ({ id: N.R.id, spot: N.spot })),
      active: A ? JSON.parse(JSON.stringify(A, (k, v) => k[0] === '_' ? undefined : v)) : null,
    };
  },
  // wolne miejsce na naturalnym gruncie (strict: bez awaryjnego zwracania czegokolwiek)
  findSpot(x, z, strict) {
    const w = this.w, R = strict ? 3 : 8;
    for (let r = 0; r < R; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const cx = x + dx, cz = z + dz; if (!w.chunkAt(cx, cz)) w.ensureData(Math.floor(cx / CS4), Math.floor(cz / CS4));
      const y = surfaceY(w, cx, cz), g = w.get(cx, y - 1, cz);
      if (pCanStand(w, cx, y, cz) && g && BL[g].nat && g !== BK.water && !w.get(cx, y, cz)) return [cx, y, cz];
    }
    return strict ? null : [x, surfaceY(w, x, z), z];
  },
  npcOf(id) { return this.npcs.find(n => n.R.id === id); },
  // --- mieszkańcy pojawiają się tam, gdzie chodzi gracz ---
  addNpc(id, spot, poof) {
    const R = RES[id], obj = buildPerson(R.look); obj.scale.setScalar(PS);
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex('!', '#f2a93b'), depthTest: false })); mk.scale.set(1.3, 1.3, 1); mk.renderOrder = 20;
    obj.traverse(o => { if (o.isMesh) o.userData.npc = id; });
    this.g.add(obj); this.g.add(mk);
    const pp = Build3.player.pos, pos = new V3(spot[0] + .5, spot[1], spot[2] + .5);
    const N = { R, obj, mk, spot, pos, tgt: null, wait: 2 + Math.random() * 3, yaw: Math.atan2(pp.x - pos.x, pp.z - pos.z), phase: 0, act: poof ? 1.5 : 0, offer: null, leaving: 0 };
    obj.position.copy(pos); obj.rotation.y = N.yaw;
    this.npcs.push(N);
    if (poof) { this.poof(N); Snd.pop(); }
    return N;
  },
  removeNpc(N, poof) {
    if (poof) this.poof(N);
    this.g.remove(N.obj); this.g.remove(N.mk); this.npcs = this.npcs.filter(q => q !== N);
    this.gone = [N.R.id].concat(this.gone.filter(i => i !== N.R.id)).slice(0, 3);
  },
  poof(N) {
    for (let i = 0; i < 6; i++) Parts3.sparkle(N.pos.x - .5 + (Math.random() - .5) * 2, N.pos.y + .8 + Math.random() * 2.6, N.pos.z - .5 + (Math.random() - .5) * 2, 3, 1.5);
    Parts3.burst(N.pos.x - .5, N.pos.y + 1, N.pos.z - .5, '#ffffff', 12);
  },
  // miejsce przed graczem: w stronę, w którą idzie (albo patrzy kamera)
  spawnSpot(near) {
    const pp = Build3.player.pos, mv = this.lastP ? [pp.x - this.lastP[0], pp.z - this.lastP[1]] : [0, 0], ml = Math.hypot(mv[0], mv[1]);
    const fx = ml > 1.5 ? mv[0] / ml : -Math.sin(Cam.cy), fz = ml > 1.5 ? mv[1] / ml : -Math.cos(Cam.cy), base = Math.atan2(fz, fx);
    for (let k = 0; k < 16; k++) {
      const a = base + (Math.random() - .5) * (k < 10 ? 1.8 : 4), r = near ? 9 + Math.random() * 5 : 16 + Math.random() * 18;
      const q = this.findSpot(Math.floor(pp.x + Math.cos(a) * r), Math.floor(pp.z + Math.sin(a) * r), true);
      if (!q || Math.abs(q[1] - pp.y) > 12 || Math.hypot(q[0] + .5 - pp.x, q[2] + .5 - pp.z) < 6) continue;
      if (this.npcs.some(N => Math.hypot(N.spot[0] - q[0], N.spot[2] - q[2]) < 10)) continue;
      return q;
    }
    return null;
  },
  pickNpcId() {
    const here = new Set(this.npcs.map(N => N.R.id)), c = RESIDENTS.filter(R => !here.has(R.id) && R.id !== this.lastDone);
    if (!c.length) return null;
    const ws = c.map(R => (1 / (1 + (this.idx[R.id] || 0))) * (this.gone.includes(R.id) ? .3 : 1));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < c.length; i++) if ((r -= ws[i]) <= 0) return c[i].id;
    return c[c.length - 1].id;
  },
  spawnTick(dt) {
    const pp = Build3.player.pos, A = this.active, mine = N => A && A.npc === N.R.id, far = N => Math.hypot(N.pos.x - pp.x, N.pos.z - pp.z);
    for (const N of this.npcs.slice()) if (!N.leaving && !mine(N) && far(N) > 95) this.removeNpc(N);
    if (A && !this.npcOf(A.npc)) { const q = this.spawnSpot(true); if (q) this.addNpc(A.npc, q, true); }
    this.spawnCD -= dt;
    const avail = this.npcs.filter(N => !N.leaving && !mine(N) && far(N) < 70).length;
    const first = !Object.keys(this.idx).length && !this.npcs.length;
    if (this.npcs.length < 4 && avail < 2 && this.spawnCD <= 0 && (Build3.mode === 'walk' || first)) {
      const id = first ? 'kazik' : this.pickNpcId(), q = id && this.spawnSpot(first);
      if (q) { this.addNpc(id, q, !first); this.spawnCD = avail ? 20 : 4; }
    }
    this.lastP = [pp.x, pp.z];
  },
  // --- rozmowa ---
  talk(id) {
    const N = this.npcOf(id); if (!N) return;
    N.act = 1.2; Snd.pop();
    if (N.leaving) { this.say(N, 'Do zobaczenia! Spaceruj dalej, a spotkasz innych mieszkańców.', [{ label: 'Pa pa!', main: true }]); return; }
    const A = this.active;
    if (A && A.npc !== id) {
      const R = RES[A.npc]; this.say(N, `Najpierw dokończ misję u: ${R.name}. Potem przyjdź do mnie!`, [{ label: 'Dobrze', main: true }]); return;
    }
    if (A) { this.say(N, 'Jak ci idzie? ' + this.stepText(A), [{ label: 'Pokaż drogę', fn: () => this.showWay() }, { label: 'Dalej buduję!', main: true }], A); return; }
    const M = N.offer || (N.offer = this.next(id));
    if (M.steps[0].type === 'quiz') { this.quiz(N, M, 0); return; }
    this.say(N, M.text, [{ label: 'Później' }, { label: 'Zaczynam!', main: true, fn: () => this.accept(M) }], M);
  },
  // nowa misja: najpierw powitanie, potem losowo z puli, bez powtórek z ostatnich misji
  next(id) {
    const met = this.idx[id] || 0, R = RES[id];
    let tid;
    if (!met && MS[id]) tid = id + '0';
    else {
      const pool = poolFor(id), fresh = pool.filter(t => !this.hist.includes(t.id));
      const c = fresh.length ? fresh : pool.slice().sort((a, b) => (this.used[a.id] || 0) - (this.used[b.id] || 0)).slice(0, 2);
      tid = pickR(c).id;
    }
    const M = JSON.parse(JSON.stringify(TPL[tid].gen()));
    if (!met && !/Jestem/.test(M.text)) M.text = `Cześć! Jestem ${R.name}, ${R.role}. ` + M.text;
    else if (met) M.text = pickR(AGAIN) + ' ' + M.text;
    const out = { ...M, npc: id, tpl: tid, si: 0, n: met };
    this.dirFill(out);
    return out;
  },
  markUsed(M) {
    this.mcount++; if (M.tpl) { this.used[M.tpl] = this.mcount; this.hist = [M.tpl].concat(this.hist.filter(t => t !== M.tpl)).slice(0, 12); }
    const N = this.npcOf(M.npc); if (N) N.offer = null;
  },
  pickPos(ox, oz, dist) {
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * PI * 2, r = dist * (.85 + Math.random() * .3);
      const q = this.findSpot(Math.floor(ox + Math.cos(a) * r), Math.floor(oz + Math.sin(a) * r), true); if (q) return q;
    }
    return this.findSpot(Math.floor(ox) + dist, Math.floor(oz));
  },
  origin(M) { const N = this.npcOf((M || this.active).npc); return N ? N.pos : Build3.player.pos; },
  // kierunek i odległość w tekście (dla 9+) liczone od mieszkańca
  dirFill(M) {
    const o = this.origin(M), s = M.steps.find(s => s.type === 'find' || s.type === 'reach');
    if (s && !s.pos) { const p = this.pickPos(o.x, o.z, s.dist); s.pos = p; s.dirName = dirName(p[0] + .5 - o.x, p[2] + .5 - o.z); s.distM = Math.max(5, Math.round(Math.hypot(p[0] - o.x, p[2] - o.z) * .5 / 5) * 5); }
    const dn = (s && s.dirName) || 'północ', dm = String((s && s.distM) || 20);
    const fill = t => t && t.replace('DIR', dn).replace('DIST', dm);
    M.text = fill(M.text); M.steps.forEach(st => { st.short = fill(st.short); });
  },
  accept(M) {
    this.active = M; this.markUsed(M);
    this.startStep();
    Build3.dirty = true;
    Snd.success(); this.renderTracker();
  },
  quiz(N, M, si) {
    const s = M.steps[si];
    const intro = si === 0 ? M.text + ' ' : '';
    const m = this.say(N, intro + s.q, s.choices.map(c => ({ label: String(c), keep: true, fn: (mm, btn) => {
      if (c === s.answer) {
        Snd.success(); Parts3.sparkle(Build3.player.pos.x - .5, Build3.player.pos.y + 2, Build3.player.pos.z - .5, 6, 2);
        mm.close(); Voice.say('Tak! Dobrze!');
        if (si === 0 && !this.active) { M.si = 1; this.active = M; this.markUsed(M); this.startStep(); this.renderTracker(); setTimeout(() => this.say(N, 'Dobrze! A teraz: ' + this.stepText(M), [{ label: 'Zaczynam!', main: true }], M), 700); }
        else this.advance();
      } else { Snd.soft(); btn.classList.add('wrong'); btn.disabled = true; Voice.say('Jeszcze nie. Spróbuj inaczej.'); }
    } })), M, true);
    return m;
  },
  say(N, text, buttons, M, isQuiz) {
    const R = N.R, img = Icons.snap(buildPerson(R.look), new V3(.55, .35, 1.6), 1.35);
    const s = M && M.steps[M.si || 0], icons = s && s.icons && ageT() === 0 && !isQuiz ? s.icons : null;
    const m = modal(`<div class="dialog npc-dlg"><div class="npc-row"><img class="npc-face" src="${img}" alt=""><div class="npc-txt"><div class="npc-name">${R.em} ${R.name} <small>${R.role}</small></div>
      <div class="npc-say">${text}</div>${icons ? `<div class="npc-icons">${Array.from({ length: icons[1] }, () => `<img src="${Icons.item(icons[0])}" alt="">`).join('')}</div>` : ''}</div></div>
      <div class="row">${buttons.map((b, i) => `<button class="btn${b.main ? ' t-green' : ''}${isQuiz ? ' quiz-b' : ''}" data-b="${i}" style="font-size:${isQuiz ? 30 : 22}px">${b.label}</button>`).join('')}
      <button class="btn icon small" data-rep title="Powtórz">${ICON.speaker}</button></div></div>`);
    $$('[data-b]', m.el).forEach(el => el.onclick = () => { const b = buttons[+el.dataset.b]; if (!b.keep) m.close(); if (b.fn) b.fn(m, el); });
    $('[data-rep]', m.el).onclick = () => Voice.say(text, true);
    Voice.say(text);
    return m;
  },
  stepText(M) { const s = M.steps[M.si]; return s ? s.short + (s.goal > 1 ? ` (${Math.min(s.prog || 0, s.goal)} z ${s.goal})` : '') : ''; },
  // --- przebieg kroków ---
  startStep() {
    const A = this.active, s = A.steps[A.si]; if (!s) return;
    s.prog = s.prog || 0;
    if (s.type === 'blueprint') this.setupBlueprint(s);
    if (s.type === 'chests') this.spawnChests(s);
    if (s.type === 'find' && !s._a) this.spawnFind(s);
    if (s.type === 'collect') this.spawnCollect(s);
    if (s.type === 'reach') this.spawnFlag(s);
    if (s.type === 'quiz') { const N = this.npcOf(A.npc); setTimeout(() => this.quiz(N, A, A.si), 400); }
  },
  restoreActive() {
    const A = this.active, s = A.steps[A.si]; if (!s) { this.active = null; return; }
    if (s.type === 'blueprint') this.setupBlueprint(s, true);
    if (s.type === 'chests') this.spawnChests(s, true);
    if (s.type === 'find') this.spawnFind(s, true);
    if (s.type === 'collect') this.spawnCollect(s, true);
    if (s.type === 'reach') this.spawnFlag(s);
    this.renderTracker();
  },
  advance() {
    const A = this.active; if (!A) return;
    const s = A.steps[A.si]; this.cleanupStep(s);
    A.si++;
    if (A.si >= A.steps.length) { this.complete(); return; }
    Snd.success(); Voice.say('Super! Teraz: ' + A.steps[A.si].short);
    this.startStep(); this.renderTracker(); Build3.dirty = true;
  },
  // krok zaliczony: przejście dalej po chwili, tylko jeśli to wciąż ta sama misja i ten sam krok
  advanceLater(ms) { const A = this.active, si = A && A.si; setTimeout(() => { if (A && this.active === A && A.si === si) this.advance(); }, ms); },
  cleanupStep(s) {
    if (!s) return;
    if (s.type === 'blueprint') this.clearGhost();
    if (s.type === 'chests') { for (const c of this.chests) this.g.remove(c.obj); this.chests = []; }
    if (s.type === 'find' && s._a) { s._a.follow = false; }
    if (s.type === 'collect' || s.type === 'reach') this.clearItems();
  },
  complete() {
    const A = this.active, R = RES[A.npc], N = this.npcOf(A.npc);
    this.idx[A.npc] = (this.idx[A.npc] || 0) + 1;
    this.active = null;
    const before = stars();
    progress.mdone = (progress.mdone || 0) + 1; progress.mstars = (progress.mstars || 0) + 1; saveProgress();
    const unl = unlocksBetween(before, stars()), acc = LOOK.acc.find(a => a.need && a.need === progress.mdone);
    Build3.dirty = true; this.renderTracker();
    if (N) { N.act = 2.5; N.leaving = 7; N.offer = null; Parts3.heart(N.pos.x, N.pos.y + 4.4, N.pos.z, 3); }
    this.lastDone = A.npc; this.spawnCD = 6;
    const p = Build3.player.pos; for (let i = 0; i < 6; i++) Parts3.sparkle(p.x - .5 + (Math.random() - .5) * 3, p.y + 1 + Math.random() * 2, p.z - .5 + (Math.random() - .5) * 3, 3, 1.5);
    Snd.success();
    let speech = `Brawo! Misja wykonana! ${R.name} dziękuje.`;
    let extra = '';
    if (acc) { extra += `<div class="unlock"><span style="font-size:56px">${acc.em}</span>Nowy dodatek w szafie: ${acc.name}</div>`; speech += ` W szafie czeka nowy dodatek: ${acc.name}!`; }
    unl.forEach(k => { extra += `<div class="unlock"><img src="${Icons.item(k)}" style="width:64px;height:64px">Nowe: ${itemInfo(k).name}</div>`; speech += ` Nowa nagroda: ${itemInfo(k).name}!`; });
    const m = modal(`<div class="dialog"><div class="big-star">${STAR_SVG.replace('<svg', '<svg style="width:120px;height:120px"')}</div><h2>Misja wykonana!</h2>
      <p>${R.em} ${R.name}: dziękuję! Dostajesz gwiazdkę.</p>${extra}
      <div class="row"><button class="btn t-green" id="mc-ok" style="font-size:24px">Super!</button></div></div>`);
    $('#mc-ok', m.el).onclick = m.close;
    Voice.say(speech);
  },
  abandon() { const A = this.active; if (!A) return; this.cleanupStep(A.steps[A.si]); this.active = null; this.renderTracker(); Build3.dirty = true; },
  // --- zdarzenia z gry ---
  onEvent(ev, data) {
    const A = this.active; if (!A) return;
    const s = A.steps[A.si]; if (!s) return;
    let changed = false;
    if (ev === 'place' && s.type === 'place') {
      for (const p of data) {
        const key = BL[p.id].key;
        if (s.shape != null && (BL[p.id].kind !== 'mat' || ((p.m || 0) >> 2 & 7) !== s.shape)) continue;
        if (s.ids ? s.ids.includes(key) : (BL[p.id].kind === 'mat' && !BL[p.id].nat)) { s.prog += s.cells ? p.cells.length : 1; changed = true; }
      }
    }
    if (ev === 'place' && s.type === 'overwater') {
      for (const p of data) if (['planks', 'darkwood', 'log'].includes(BL[p.id].key)) for (const c of p.cells) if (this.w.get(c[0], c[1] - 1, c[2]) === BK.water) { s.prog++; changed = true; }
    }
    if (ev === 'paint' && s.type === 'paint' && data && (!s.ids || s.ids.includes(BL[data.id].key))) { s.prog += data.n; changed = true; }
    if (ev === 'place' && s.type === 'tower') {
      for (const p of data) for (const c of p.cells) { const h = this.stackAt(c[0], c[1], c[2]); if (h > s.prog) { s.prog = h; changed = true; } }
    }
    if (ev === 'prefab' && s.type === 'prefab' && (!s.name || s.name === data.name)) { s.prog++; changed = true; }
    if (ev === 'tool' && s.type === 'tool' && s.tool === data.tool) { s.prog += data.n; changed = true; }
    if (ev === 'animal' && s.type === 'animal' && (!s.kind || s.kind === data)) { s.prog++; changed = true; }
    if (ev === 'pet' && s.type === 'pet') {
      if (s.distinct) { s.seen = s.seen || []; if (!s.seen.includes(data.kind)) { s.seen.push(data.kind); s.prog = s.seen.length; changed = true; } }
      else if (!s.kind || s.kind === data.kind) { s.prog++; changed = true; }
    }
    if (ev === 'pet' && s.type === 'find' && data === s._a && !s.found) this.foundAnimal(s);
    if (changed) { Build3.dirty = true; this.renderTracker(); if (s.prog >= s.goal) this.advanceLater(500); else Snd.click(); }
  },
  stackAt(x, y, z) {
    const w = this.w, built = (yy) => { const t = w.get(x, yy, z); return t && BL[t].kind === 'mat' && !(BL[t].nat && !(w.meta(x, yy, z) & ~3 & ~LOW)); };
    let lo = y, hi = y; while (built(lo - 1)) lo--; while (built(hi + 1)) hi++;
    return hi - lo + 1;
  },
  // --- plan budowy ---
  setupBlueprint(s, restore) {
    if (!restore || !s.cells) {
      const raw = BP_FOR[s.bp](), N = this.npcOf(this.active.npc);
      let maxX = 0, maxZ = 0; for (const c of raw) { maxX = Math.max(maxX, c[0]); maxZ = Math.max(maxZ, c[2]); }
      const pp = Build3.player.pos, dx = Math.sign(N.spot[0] + .5 - pp.x) || 1, dz = Math.sign(N.spot[2] + .5 - pp.z) || 1;
      const ax = N.spot[0] + (dx > 0 ? 2 : -3 - maxX), az = N.spot[2] + (dz > 0 ? 2 : -3 - maxZ);
      const ay = this.prepSite(ax, az, maxX + 1, maxZ + 1, N.spot[1]);
      s.cells = raw.map(c => [ax + c[0], ay + c[1], az + c[2], BK[c[3]], c[4] ? 1 : 0]);
      s.goal = s.cells.length;
      s.showT = s.memory ? 12 : 1e9;
    }
    this.bpCheck(s, true);
  },
  // wyrównuje mały plac pod plan (bez cofania: to przygotowanie Robota)
  prepSite(x0, z0, w, d, y0) {
    const W = this.w;
    let sum = 0, n = 0; for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { const t = terrainTop(W, x, z); if (t !== null) { sum += t; n++; } }
    const top = n ? Math.round(sum / n) : y0;
    for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 1; z <= z0 + d; z++) {
      for (let y = top; y < top + 8; y++) { const t = W.get(x, y, z); if (t && (BL[t].nat || BL[t].kind === 'model' || t === BK.water)) W.set(x, y, z, 0, 0); }
      for (let y = top - 1; y >= top - 6; y--) { const t = W.get(x, y, z); if (t && t !== BK.water && !(BL[t].kind === 'model')) break; W.set(x, y, z, y === top - 1 ? BK.grass : BK.dirt, 0); }
      if (W.get(x, top - 1, z) === BK.dirt) W.set(x, top - 1, z, BK.grass, 0);
    }
    return top;
  },
  bpCheck(s, rebuild) {
    const w = this.w; let ok = 0; const miss = [], wrong = [], hit = [];
    for (const c of s.cells) {
      const t = w.get(c[0], c[1], c[2]);
      if (t === c[3]) { ok++; if (s._ok && !s._ok.has(c.join(','))) hit.push(c); }
      else { miss.push(c); if (t && !BL[t].nat && BL[t].kind !== 'model') wrong.push(c); }
    }
    s._ok = new Set(s.cells.filter(c => w.get(c[0], c[1], c[2]) === c[3]).map(c => c.join(',')));
    const changed = ok !== s.prog || wrong.length !== (s._wrong || 0);
    if (ok > s.prog && !rebuild) { Snd.place(BK.planks); hit.forEach(c => Parts3.sparkle(c[0], c[1], c[2], 3, 1)); }
    if (wrong.length > (s._wrong || 0) && !rebuild) {
      const c = wrong[wrong.length - 1];
      Snd.soft(); Voice.say(`Ups! Tu powinien być inny klocek: ${BL[c[3]].name}. Zabierz ten prawym przyciskiem.`);
    }
    s._wrong = wrong.length; s.prog = ok;
    // następne pole: najniżej, potem najbliżej początku planu
    this.bpNext = miss.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0] || p[2] - q[2])[0] || null;
    if (changed || rebuild) this.drawGhost(s, miss, wrong);
    if (changed || rebuild) { this.renderTracker(); Build3.dirty = true; if (ok >= s.goal) this.advanceLater(500); }
  },
  drawGhost(s, miss, wrong = []) {
    this.clearGhost();
    if (!miss.length) return;
    const show = (s.showT || 0) > 0;
    const list = [], unknown = [];
    for (const c of miss) { if (c[4]) unknown.push(c); else if (show) list.push([c[0], c[1], c[2], c[3], 5 << 2]); else if (!s.memory) unknown.push(c); }
    const G = new THREE.Group(); this.ghostMats = [];
    if (list.length) {
      const ox = list[0][0], oy = list[0][1], oz = list[0][2];
      const g = meshCells(list.map(c => [c[0] - ox, c[1] - oy, c[2] - oz, c[3], c[4]]));
      g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 6; o.material = Array.isArray(o.material) ? o.material.map(m => this.bpMat(m)) : this.bpMat(o.material); } });
      g.position.set(ox, oy, oz); G.add(g);
    }
    if (unknown.length) {
      const im = new THREE.InstancedMesh(Build3.boxGeo, this.qMat || (this.qMat = new THREE.MeshBasicMaterial({ color: 0xdfe4ee, transparent: true, opacity: .6, depthWrite: false })), unknown.length), mt = new THREE.Matrix4();
      unknown.forEach((c, i) => im.setMatrixAt(i, mt.makeTranslation(c[0] - .015, c[1] - .015, c[2] - .015))); im.renderOrder = 6; G.add(im);
      if (show) for (const c of unknown.filter(c => c[4])) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex('?', '#9aa3b5'), depthTest: false })); sp.position.set(c[0] + .5, c[1] + .6, c[2] + .5); sp.scale.set(.7, .7, 1); sp.renderOrder = 19; G.add(sp); }
    }
    // jaskrawy żółty obrys każdego brakującego klocka
    const outlineCells = show || !s.memory ? miss : [];
    if (outlineCells.length) {
      const base = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.06, 1.06)).attributes.position.array, pos = new Float32Array(base.length * outlineCells.length);
      outlineCells.forEach((c, k) => { for (let i = 0; i < base.length; i += 3) { pos[k * base.length + i] = base[i] + c[0] + .5; pos[k * base.length + i + 1] = base[i + 1] + c[1] + .5; pos[k * base.length + i + 2] = base[i + 2] + c[2] + .5; } });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.bpLines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 1 })); this.bpLines.renderOrder = 7; G.add(this.bpLines);
    }
    // źle postawione klocki: czerwone podświetlenie
    if (wrong.length) {
      const im = new THREE.InstancedMesh(Build3.boxGeo, this.wMat || (this.wMat = new THREE.MeshBasicMaterial({ color: 0xff6b5a, transparent: true, opacity: .45, depthWrite: false })), wrong.length), mt = new THREE.Matrix4();
      wrong.forEach((c, i) => im.setMatrixAt(i, mt.makeTranslation(c[0] - .015, c[1] - .015, c[2] - .015))); G.add(im);
    }
    // następny klocek: pulsujące pole i strzałka nad nim
    const nx = this.bpNext;
    if (nx && (show || !s.memory)) {
      this.bpHi = new THREE.Mesh(Build3.boxGeo, new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: .4, depthWrite: false }));
      this.bpHi.position.set(nx[0] - .015, nx[1] - .015, nx[2] - .015); this.bpHi.renderOrder = 8; G.add(this.bpHi);
      this.bpArrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex('▼', '#f2a93b'), depthTest: false })); this.bpArrow.scale.set(1.1, 1.1, 1); this.bpArrow.renderOrder = 20;
      this.bpArrow.userData.base = new V3(nx[0] + .5, nx[1] + 2, nx[2] + .5); G.add(this.bpArrow);
    } else { this.bpHi = null; this.bpArrow = null; }
    // duży znak nad planem, widoczny z daleka
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (const c of s.cells) { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); z0 = Math.min(z0, c[2]); x1 = Math.max(x1, c[0] + 1); y1 = Math.max(y1, c[1] + 1); z1 = Math.max(z1, c[2] + 1); }
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(x1 - x0 + .2, y1 - y0 + .2, z1 - z0 + .2)), new THREE.LineBasicMaterial({ color: 0x6fa8dc, transparent: true, opacity: .9 }));
    box.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); G.add(box);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex('📐', '#6fa8dc'), depthTest: false })); sign.scale.set(1.8, 1.8, 1); sign.renderOrder = 20;
    sign.position.set((x0 + x1) / 2, y1 + 3.2, (z0 + z1) / 2); sign.userData.base = sign.position.clone(); this.bpSign = sign; G.add(sign);
    this.ghost = G; this.scene.add(G);
  },
  bpMat(m) {
    const g = m.clone(); g.transparent = true; g.opacity = .62; g.depthWrite = false;
    if (g.emissive) g.emissive.setRGB(.3, .28, .2);
    (this.ghostMats || (this.ghostMats = [])).push(g); return g;
  },
  clearGhost() { if (this.ghost) { this.scene.remove(this.ghost); this.ghost = null; } this.bpHi = this.bpArrow = this.bpSign = this.bpLines = null; this.ghostMats = []; },
  // klocek potrzebny teraz (do wyboru jednym kliknięciem w pasek misji)
  // co trzeba wziąć do bieżącego kroku: przycisk "weź" przy misji sam przełącza dolny pasek
  needItem() {
    const A = this.active, s = A && A.steps[A.si]; if (!s) return null;
    if (s.type === 'blueprint') return this.bpNext && !(s.memory && s.showT <= 0 && !this.bpNext[4]) ? BL[this.bpNext[3]].key : null;
    if ((s.type === 'place' || s.type === 'paint') && s.ids) return s.ids[0];
    if (s.type === 'prefab') return '!' + s.name;
    if (s.type === 'tool') return s.tool === 'axe' ? '#erase' : s.tool === 'plant' ? '~tree' : '~' + s.tool;
    if (s.type === 'animal') return '@' + (s.kind || 'sheep');
    if (s.type === 'overwater') return 'planks';
    return null;
  },
  holds(k) {
    const B = Build3; if (B.mode !== 'build') return false;
    const s = this.active && this.active.steps[this.active.si];
    if (k === '#erase') return B.group === 'erase';
    if (s && s.type === 'paint') return B.group === 'paint' && B.item === k;
    if (s && s.type === 'tool' && s.tool === 'plant') return B.tool === 'build' && B.item[0] === '~' && !!TOOLS[B.item.slice(1)].plant;
    return B.tool === 'build' && B.item === k;
  },
  needIcon(k) { return k === '#erase' ? '<span class="q-need-em">✋</span>' : k[0] === '~' && !TOOLS[k.slice(1)].icon ? `<span class="q-need-em">${TOOLS[k.slice(1)].em}</span>` : `<img src="${Icons.item(k[0] === '~' ? TOOLS[k.slice(1)].icon : k)}" alt="">`; },
  needs(k) {
    const A = this.active, s = A && A.steps[A.si]; if (!s) return false;
    if (s.type === 'blueprint' && s.cells) return s.cells.some(c => c[3] === BK[k]);
    if ((s.type === 'place' || s.type === 'paint') && s.ids) return s.ids.includes(k);
    if (s.type === 'prefab') return k === '!' + s.name;
    if (s.type === 'tool') return s.tool === 'plant' ? k[0] === '~' && !!(TOOLS[k.slice(1)] || {}).plant : k === '~' + s.tool;
    if (s.type === 'animal') return s.kind ? k === '@' + s.kind : k[0] === '@';
    if (s.type === 'overwater') return k === 'planks';
    return false;
  },
  takeNeeded() {
    const k = this.needItem(); if (!k) return false;
    const A = this.active, s = A.steps[A.si];
    if (Build3.mode !== 'build') Build3.setMode('build');
    if (k === '#erase') Build3.setGroup('erase', true);
    else if (s.type === 'paint') { Build3.setGroup('paint', true); Build3.selectItem(k); }
    else { Build3.selectItem(k); if (s.type === 'blueprint' || s.type === 'overwater') { Build3.piece = 'kostka'; Build3.renderShapes(); } }
    return true;
  },
  peekPlan() { const A = this.active, s = A && A.steps[A.si]; if (s && s.type === 'blueprint') { s.showT = 6; this.bpCheck(s, true); } },
  // --- szukanie zwierzaka ---
  spawnFind(s, restore) {
    const w = this.w, o = this.origin();
    if (restore && s.pos) {
      let best = null, bd = 30;
      for (const a of w.animals) if (a.kind === s.kind) { const d = Math.hypot(a.cx - s.pos[0], a.cz - s.pos[2]); if (d < bd) { bd = d; best = a; } }
      if (best) { s._a = best; best.follow = !!s.found && s.back; return s.pos; }
    }
    let p = s.pos;
    if (!p) {
      p = s.pos = this.pickPos(o.x, o.z, s.dist);
    }
    const an = new Animal3(s.kind, p[0], p[1], p[2]); w.addAnimal(an); s._a = an; an.follow = !!s.found && s.back;
    return p;
  },
  foundAnimal(s) {
    s.found = true; const a = s._a; a.hop = 1; Snd.animal(a.kind); Parts3.heart(a.px, a.py + 1.6, a.pz, 3);
    if (!s.back) { s.prog = 1; this.renderTracker(); this.advanceLater(600); return; }
    a.follow = true; Voice.say('Znalazłeś! Teraz zaprowadź zwierzaka do ' + RES[this.active.npc].name + '.');
    s.short = 'Zaprowadź do: ' + RES[this.active.npc].name; this.renderTracker(); Build3.dirty = true;
  },
  // --- skrzynki ---
  spawnChests(s, restore) {
    const o = this.origin(), h = [o.x, 0, o.z];
    if (!restore || !s.list) {
      s.list = [];
      const a0 = Math.random() * PI * 2;
      for (let i = 0; i < s.n; i++) {
        const a = a0 + i * (PI * 2 / s.n) + (Math.random() - .5) * .6, r = s.dist * (.7 + Math.random() * .5);
        const p = this.findSpot(Math.floor(h[0] + Math.cos(a) * r), Math.floor(h[2] + Math.sin(a) * r));
        s.list.push([p[0], p[1], p[2], 0]);
      }
    }
    for (const c of this.chests) this.g.remove(c.obj);
    this.chests = [];
    s.list.forEach((c, i) => {
      if (c[3]) return;
      const g = new THREE.Group(), o = buildModel('chest', 0, 3); o.scale.setScalar(2); g.add(o);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 7; g.add(beam);
      g.position.set(c[0] + .5, c[1], c[2] + .5); g.traverse(m => { if (m.isMesh) m.userData.chest = i; });
      this.g.add(g); this.chests.push({ i, obj: g, beam });
    });
  },
  openChest(i) {
    const A = this.active, s = A && A.steps[A.si]; if (!s || s.type !== 'chests') return;
    const c = s.list[i]; if (!c || c[3]) return;
    const p = Build3.player.pos;
    if (Math.hypot(p.x - c[0] - .5, p.z - c[2] - .5) > 7) { Snd.soft(); Build3.toast('Podejdź bliżej do skrzynki'); return; }
    c[3] = 1; s.prog++;
    const ch = this.chests.find(q => q.i === i);
    if (ch) { this.g.remove(ch.obj); }
    Snd.success(); for (let k = 0; k < 4; k++) Parts3.sparkle(c[0], c[1] + 1, c[2], 4, 1.5); Parts3.burst(c[0], c[1] + 1, c[2], '#f3cf6b', 12);
    Voice.say(s.prog >= s.goal ? 'Wszystkie skrzynki znalezione!' : `Skrzynka! Zostało jeszcze ${s.goal - s.prog}.`);
    this.renderTracker(); Build3.dirty = true;
    if (s.prog >= s.goal) this.advanceLater(700);
  },
  // --- cel dla kompasu ---
  target() {
    if (!this.active) { const N = this.nearestNew(); return N ? [N.pos.x, N.pos.z, '❗'] : null; }
    const A = this.active, s = A && A.steps[A.si]; if (!s) return null;
    if (s.type === 'find' && s._a) { if (!s.found) return [s._a.px, s._a.pz, '🔎']; const N = this.npcOf(A.npc); return [N.pos.x, N.pos.z, RES[A.npc].em]; }
    if (s.type === 'chests') { const p = Build3.player.pos; let best = null, bd = 1e9; for (const c of s.list) if (!c[3]) { const d = Math.hypot(c[0] - p.x, c[2] - p.z); if (d < bd) { bd = d; best = c; } } return best ? [best[0] + .5, best[2] + .5, '🎁'] : null; }
    if (s.type === 'blueprint' && s.cells) return [s.cells[0][0] + .5, s.cells[0][2] + .5, '📐'];
    if (s.type === 'collect' && s.list) { const p = Build3.player.pos; let best = null, bd = 1e9; for (const c of s.list) if (!c[3]) { const d = Math.hypot(c[0] - p.x, c[2] - p.z); if (d < bd) { bd = d; best = c; } } return best ? [best[0] + .5, best[2] + .5, s.kind === 'gem' ? '💎' : '⭐'] : null; }
    if (s.type === 'reach' && s.pos) return [s.pos[0] + .5, s.pos[2] + .5, '🚩'];
    return null;
  },
  // bez misji kompas prowadzi do najbliższego mieszkańca z wykrzyknikiem
  nearestNew() {
    const p = Build3.player.pos; let best = null, bd = 1e9;
    for (const N of this.npcs) if (!N.leaving) { const d = Math.hypot(N.pos.x - p.x, N.pos.z - p.z); if (d < bd) { bd = d; best = N; } }
    return best;
  },
  showWay() {
    const t = this.target();
    if (t && !this.active) { Voice.say('Strzałka prowadzi do mieszkańca, który ma dla ciebie misję.'); return; }
    if (t) { Voice.say('Idź za strzałką w rogu ekranu.'); return; }
    const A = this.active; if (A) Voice.say(this.stepText(A));
  },
  pickables() { return this.npcs.filter(n => !n.leaving).map(n => n.obj).concat(this.chests.map(c => c.obj)); },
  // --- zbieranie błyszczących rzeczy i chorągiewka ---
  clearItems() { for (const it of this.items) this.g.remove(it.obj); this.items = []; if (this.flag) { this.g.remove(this.flag); this.flag = null; } },
  starGeo() {
    if (this._sg) return this._sg;
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? .22 : .5, a = i / 10 * PI * 2 + PI / 2, x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: .14, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 1 }); g.center();
    return (this._sg = g);
  },
  beam(h, col) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, h, 10, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .25, depthWrite: false, side: THREE.DoubleSide })); b.position.y = h / 2; return b; },
  collectObj(kind) {
    const g = new THREE.Group(), gem = kind === 'gem';
    const m = new THREE.Mesh(gem ? new THREE.OctahedronGeometry(.42) : this.starGeo(), new THREE.MeshStandardMaterial({ color: gem ? 0x6fd3ff : 0xffd23f, emissive: gem ? 0x1d5f8a : 0x8a6200, roughness: .35, metalness: .1 }));
    m.position.y = .9; m.scale.setScalar(1.35); if (gem) m.scale.y = 1.9; g.add(m); g.add(this.beam(7, gem ? 0xbfefff : 0xfff1a8));
    g.userData.spin = m; return g;
  },
  spawnCollect(s, restore) {
    const o = this.origin();
    if (!restore || !s.list) {
      s.list = [];
      for (let i = 0; i < s.n; i++) {
        let p = null;
        for (let k = 0; k < 12 && !p; k++) {
          const a = Math.random() * PI * 2, r = 4 + Math.random() * s.rad;
          const q = this.findSpot(Math.floor(o.x + Math.cos(a) * r), Math.floor(o.z + Math.sin(a) * r), true);
          if (q && !s.list.some(c => Math.hypot(c[0] - q[0], c[2] - q[2]) < 3)) p = q;
        }
        p = p || this.findSpot(Math.floor(o.x) + 3 + i * 2, Math.floor(o.z));
        s.list.push([p[0], p[1], p[2], 0]);
      }
    }
    this.clearItems();
    s.list.forEach((c, i) => { if (c[3]) return; const g = this.collectObj(s.kind); g.position.set(c[0] + .5, c[1], c[2] + .5); this.g.add(g); this.items.push({ i, obj: g, c }); });
  },
  takeItem(s, it) {
    it.c[3] = 1; s.prog++; this.g.remove(it.obj); this.items = this.items.filter(q => q !== it);
    const c = it.c; Snd.success(); Parts3.sparkle(c[0], c[1] + 1, c[2], 6, 1.2); Parts3.burst(c[0], c[1] + 1, c[2], s.kind === 'gem' ? '#8fdcff' : '#ffd23f', 10);
    const left = s.goal - s.prog; Voice.say(left > 0 ? `Mam! Zostało jeszcze ${left}.` : 'Wszystko zebrane!');
    this.renderTracker(); Build3.dirty = true;
    if (left <= 0) this.advanceLater(600);
  },
  spawnFlag(s) {
    if (!s.pos) { const o = this.origin(); s.pos = this.pickPos(o.x, o.z, s.dist); }
    this.clearItems();
    const g = new THREE.Group(), pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 3.6, 8), new THREE.MeshStandardMaterial({ color: 0xf6f2ea }));
    pole.position.y = 1.8; g.add(pole);
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 3.5, 0, 0, 2.5, 0, 1.4, 3, 0], 3)); tri.computeVertexNormals();
    const cloth = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: 0xff7a59, side: THREE.DoubleSide })); g.add(cloth); g.userData.cloth = cloth;
    g.add(this.beam(12, 0xffd0c0));
    g.position.set(s.pos[0] + .5, s.pos[1], s.pos[2] + .5); this.g.add(g); this.flag = g;
  },
  // --- pętla ---
  update(dt, time) {
    const w = this.w; if (!w) return;
    const pp = Build3.player.pos, A = this.active, s = A && A.steps[A.si];
    this.relT = (this.relT || 0) + dt;
    const recheck = this.relT > 1.5; if (recheck) { this.spawnTick(Math.min(this.relT, 3)); this.relT = 0; }
    for (const N of this.npcs.slice()) {
      if (N.leaving && (N.leaving -= dt) <= 0) { this.removeNpc(N, true); continue; }
      // gdy na miejscu mieszkańca stanęła budowla, mieszkaniec przechodzi obok
      if (recheck && surfaceY(w, N.spot[0], N.spot[2]) > N.spot[1] + 1) { N.spot = this.findSpot(N.spot[0], N.spot[2]); N.pos.set(N.spot[0] + .5, N.spot[1], N.spot[2] + .5); N.tgt = null; }
      const near = Math.hypot(pp.x - N.pos.x, pp.z - N.pos.z) < 7;
      if (!N.tgt && (N.wait -= dt) <= 0 && !near) {
        const a = Math.random() * PI * 2, r = Math.random() * 3;
        const tx = Math.floor(N.spot[0] + Math.cos(a) * r), tz = Math.floor(N.spot[2] + Math.sin(a) * r), ty = surfaceY(w, tx, tz);
        if (pCanStand(w, tx, ty, tz) && Math.abs(ty - N.pos.y) < 2 && w.get(tx, ty - 1, tz) !== BK.water) N.tgt = new V3(tx + .5, ty, tz + .5);
        N.wait = 3 + Math.random() * 5;
      }
      let moving = false;
      if (N.tgt) {
        const dx = N.tgt.x - N.pos.x, dz = N.tgt.z - N.pos.z, d = Math.hypot(dx, dz);
        if (d < .1 || near) N.tgt = null;
        else { const st = Math.min(d, dt * 1.6); N.pos.x += dx / d * st; N.pos.z += dz / d * st; N.yaw = angLerp(N.yaw, Math.atan2(dx, dz), Math.min(1, dt * 6)); moving = true; }
      }
      if (near) N.yaw = angLerp(N.yaw, Math.atan2(pp.x - N.pos.x, pp.z - N.pos.z), Math.min(1, dt * 4));
      const f = floorTop(w, Math.floor(N.pos.x), surfaceY(w, Math.floor(N.pos.x), Math.floor(N.pos.z)), Math.floor(N.pos.z));
      N.pos.y += (f - N.pos.y) * Math.min(1, dt * 8);
      N.phase += moving ? dt * 9 : 0; N.act = Math.max(0, N.act - dt);
      const hasNew = !A && !N.leaving, mine = A && A.npc === N.R.id;
      N.obj.position.copy(N.pos); N.obj.rotation.y = N.yaw;
      animPerson(N.obj.userData, N.phase, moving ? 1 : 0, 0, time, (hasNew && near) || N.act > 0 || N.leaving > 0);
      N.mk.visible = hasNew || mine;
      if (N.mk.visible) {
        const tex = mine ? this.markerTex('…', '#6fa8dc') : this.markerTex('!', '#f2a93b');
        if (N.mk.material.map !== tex) { N.mk.material.map = tex; N.mk.material.needsUpdate = true; }
        N.mk.position.set(N.pos.x, N.pos.y + 4.6 + Math.sin(time * 3 + N.spot[0]) * .15, N.pos.z);
      }
    }
    for (const c of this.chests) { c.obj.children[0].rotation.y = Math.sin(time * 1.5 + c.i) * .25; c.beam.material.opacity = .2 + Math.sin(time * 3 + c.i) * .08; }
    for (const it of this.items) { const m = it.obj.userData.spin; m.rotation.y = time * 2 + it.i; m.position.y = .9 + Math.sin(time * 3 + it.i) * .15; }
    if (this.flag) this.flag.userData.cloth.rotation.y = Math.sin(time * 2.4) * .35;
    if (s && s.type === 'collect') for (const it of this.items.slice()) if (Math.hypot(pp.x - it.c[0] - .5, pp.z - it.c[2] - .5) < 1.9 && Math.abs(pp.y - it.c[1]) < 3) this.takeItem(s, it);
    if (s && s.type === 'reach' && s.pos && !s.done && Math.hypot(pp.x - s.pos[0] - .5, pp.z - s.pos[2] - .5) < 3) {
      s.done = true; s.prog = 1; Snd.success(); Voice.say('Hura! Jesteś przy chorągiewce!');
      for (let k = 0; k < 5; k++) Parts3.sparkle(s.pos[0], s.pos[1] + 1 + k * .5, s.pos[2], 4, 1.5);
      this.renderTracker(); this.advanceLater(600);
    }
    if (s && s.type === 'find' && s._a) {
      const a = s._a;
      if (!s.found && Math.hypot(pp.x - a.px, pp.z - a.pz) < 4 && Build3.mode === 'walk') this.foundAnimal(s);
      if (s.found && s.back) { const N = this.npcOf(A.npc); if (Math.hypot(a.px - N.pos.x, a.pz - N.pos.z) < 6) { s.prog = 1; a.follow = false; this.advance(); } }
    }
    if (this.ghost) {
      const k = .5 + .5 * Math.sin(time * 4);
      for (const m of this.ghostMats) m.opacity = .5 + .3 * k;
      if (this.bpLines) this.bpLines.material.opacity = .6 + .4 * k;
      if (this.bpHi) this.bpHi.material.opacity = .25 + .35 * k;
      if (this.bpArrow) this.bpArrow.position.copy(this.bpArrow.userData.base).y += Math.abs(Math.sin(time * 3.2)) * .6;
      if (this.bpSign) this.bpSign.position.copy(this.bpSign.userData.base).y += Math.sin(time * 2) * .25;
    }
    if (s && s.type === 'blueprint' && s.cells) {
      this.t += dt;
      if (s.showT < 1e8 && s.showT > 0) { s.showT -= dt; if (s.showT <= 0) { this.bpCheck(s, true); Voice.say('Plan zniknął. Buduj z pamięci!'); } }
      if (this.t > .4) { this.t = 0; this.bpCheck(s); }
    }
  },
  // --- interfejs: śledzenie i księga ---
  renderTracker() {
    const el = $('#b3-quest'); if (!el) return;
    const A = this.active;
    if (!A) { el.classList.remove('on'); return; }
    const s = A.steps[A.si], R = RES[A.npc], g = s ? s.goal || 1 : 1, p = s ? Math.min(s.prog || 0, g) : g;
    const dots = ageT() === 0 && g <= 8 ? `<span class="q-dots">${Array.from({ length: g }, (_, i) => `<i class="${i < p ? 'on' : ''}"></i>`).join('')}</span>` : `<span class="q-num">${p} / ${g}</span>`;
    const need = this.needItem(), show = need && !this.holds(need);
    el.innerHTML = `<span class="q-em">${R.em}</span><span class="q-t"><b>${s ? s.short : ''}</b>${A.steps.length > 1 ? `<small>krok ${A.si + 1} z ${A.steps.length}</small>` : ''}</span>${s && s.type !== 'quiz' ? dots : ''}${show ? `<span class="q-need" title="Weź to, co potrzebne">${this.needIcon(need)}<small>weź</small></span>` : ''}`;
    el.classList.add('on');
  },
  book() {
    Snd.pop();
    const A = this.active, s = A && A.steps[A.si];
    const metN = RESIDENTS.filter(R => this.idx[R.id]).length;
    const rank = R => (A && A.npc === R.id ? 0 : this.npcs.some(N => N.R.id === R.id && !N.leaving) ? 1 : this.idx[R.id] ? 2 : 3);
    const rows = RESIDENTS.slice().sort((a, b) => rank(a) - rank(b)).map(R => {
      const n = this.idx[R.id] || 0, act = A && A.npc === R.id, here = this.npcs.some(N => N.R.id === R.id && !N.leaving);
      if (!n && !act && !here) return `<div class="bk-row unk"><span class="bk-em">❔</span><span class="bk-t"><b>Ktoś nowy</b><br>Jeszcze się nie znacie. Spaceruj, a może go spotkasz!</span></div>`;
      const txt = act ? 'Misja: ' + this.stepText(A) : here && !A ? 'Jest niedaleko i ma misję! Szukaj ❗ albo idź za strzałką.' : 'Spotkacie się znowu na spacerze.';
      return `<div class="bk-row${act ? ' act' : ''}"><span class="bk-em">${R.em}</span><span class="bk-t"><b>${R.name}</b> <small>${R.role}</small><br>${txt}</span><span class="bk-n">✔ ${n}</span></div>`;
    }).join('');
    const m = modal(`<div class="dialog book"><h2>📖 Księga misji</h2>
      <p class="bk-age">Poziom misji: <b>${AGE_NAMES[ageT()]}</b> · wykonane misje: <b>${progress.mdone || 0}</b> · poznani: <b>${metN} z ${RESIDENTS.length}</b></p>
      ${rows}
      <div class="row">${s && s.type === 'blueprint' ? '<button class="btn" id="bk-peek">👀 Pokaż plan</button>' : ''}${A ? '<button class="btn" id="bk-drop">Zrezygnuj z misji</button>' : ''}<button class="btn t-green" id="bk-ok" style="font-size:22px">Zamknij</button></div></div>`);
    $('#bk-ok', m.el).onclick = m.close;
    if ($('#bk-peek', m.el)) $('#bk-peek', m.el).onclick = () => { m.close(); this.peekPlan(); };
    if ($('#bk-drop', m.el)) $('#bk-drop', m.el).onclick = () => confirmBox('Zrezygnować z tej misji?', 'Tak', () => { this.abandon(); m.close(); });
    Voice.say(A ? 'Twoja misja: ' + this.stepText(A) : 'Spaceruj po świecie. Mieszkańcy z wykrzyknikiem nad głową mają dla ciebie misje.');
  },
};
Missions.TPL = TPL; Missions.BP_FOR = BP_FOR;
