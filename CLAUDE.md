# Klockowo — wskazówki dla Claude Code

Spokojna gra w budowanie dla dzieci w wieku 5–9 lat, alternatywa dla Minecrafta. Działa w przeglądarce,
offline, jako **jeden plik HTML**. Nie ma reklam, kont ani połączeń z siecią. Głównym graczem jest 6-latek,
więc wszystko oceniaj jego oczami: duże przyciski, mało tekstu, wszystko czytane na głos, brak przegranej
i presji czasu.

## Komendy

```bash
npm install            # esbuild + three (tylko do budowania)
npm run build          # → dist/klockowo.html (+ kontrola składni całego skryptu)
npm run serve          # gra pod http://localhost:8080 i pod adresem w sieci domowej (tablet, telefon)
npm test               # wszystkie testy Playwright (kilkanaście minut)
npm run test:quick     # smoke + menu
python tests/run_all.py missions --no-build    # wybrane testy, bez budowania
python tests/test_menu.py                      # pojedynczy test z pełnym wypisem
```

Testy wymagają Pythona 3 i `pip install playwright && python -m playwright install chromium`.

## Jak to jest zbudowane

`scripts/build.mjs` skleja pliki z `src/` w kolejności:
`world3d.js → inf.js → prefabs.js → build3.js → tools.js → missions.js`,
wstawia je w znacznik `/*@@WORLD3D@@*/` w `src/game.html`, a przed głównym skryptem dokleja three.js
jako IIFE (globalne `THREE`, zbudowane z `src/three-entry.js` do `build/three.iife.js`).

**Wszystkie pliki dzielą jeden zasięg.** Każda nazwa najwyższego poziomu (`const`, `function`, `class`)
musi być unikalna we wszystkich plikach `src/*.js` i w `src/game.html`. Build zgłasza duplikat jako błąd
składni z numerem linii w `dist/main-check.js`. Przykład kolizji, która już wystąpiła: `ANIMALS`
(game.html, tryb 2D) i `ANIMAL_ITEMS` (world3d.js).

| Plik | Co zawiera |
|---|---|
| `src/game.html` | Ekrany (menu, sloty światów, budowanie, zagadki 2D „kopiuj” i „kod z jeżykiem”), CSS z układem telefonu, `Store` (localStorage), `Snd`, `Voice` (synteza mowy), `settings`, panel rodzica z bramką, `Session` (przypomnienie o przerwie), pętla `frame()`, `window.__klockowo` (eksport dla testów). |
| `src/world3d.js` | Silnik 3D: tekstury, materiały, wiatr, definicje klocków `BL`/`BK` (`defB`), modele (`buildModel`), postacie i kreator (`LOOK`, `HEROES`, `buildPerson`), zwierzęta, siatki kształtów (sześcian, schodki, dach, łuk), `Cam`, `Player`, `Icons`, grupy menu (`CATS`, `NATURE`, `GROUPS`, `groupOf`). |
| `src/inf.js` | Nieskończony świat: generator terenu, chunki 32×32×64 (`InfWorld`, `Chunk4`, `ChunkView`), strumieniowanie z LOD, zapis chunków w IndexedDB (`IDB`), kształty klocków `PIECES`. |
| `src/prefabs.js` | Gotowe budowle (dom, wieża, most, zagroda, ogród, plac zabaw, farma, stragan, zamek): `PREFABS`, `prefabCells`. |
| `src/build3.js` | `Build3`, czyli kontroler trybu 3D: spacer/budowanie, mysz, dotyk, joystick, gesty, kamera, podgląd i stawianie, przeciąganie rzędów i murów, Zabierz (też drzewa), Maluj, cofanie, HUD i dolny pasek, samouczek `TUT`, pomoc, garderoba, zapis i wczytanie świata, szyna zdarzeń. |
| `src/tools.js` | Przyroda: sadzenie (drzewo, choinka, krzak, kwiatki), łopata, górka, wyrównanie, woda, pędzle, animacje rośnięcia i padania drzew. Dopisuje metody do `Build3` przez `Object.assign`. |
| `src/missions.js` | Mieszkańcy i misje: 8 postaci (`RESIDENTS`), szablony (`defM`), losowanie bez powtórek, pojawianie się na trasie spaceru, kroki misji, plany do zbudowania, księga misji, pasek misji z przyciskiem „weź”. |

## Zasady, których nie wolno złamać

1. **Zapisy dziecka są święte.** Każda zmiana musi wczytać stare światy.
   - Numery klocków (`BL`) trafiają do zapisów. Nowy typ klocka dopisuj **tylko na końcu** listy `defB(...)`. Nigdy nie zmieniaj kolejności ani nie usuwaj wpisów.
   - Meta klocka (bity): 0–1 obrót, 2–4 kształt (0 sześcian, 1 połówka, 2 schodki, 3 skos/dach, 4 słupek, 5 sfazowany, 6 pół płytki, 7 łuk), 5–10 połączenia z sąsiadami, 11 `LOW` (obniżony o pół kratki).
   - Gdzie jest zapis:
     - meta świata: `localStorage['klockowo.w4_<slot>']` = `{v, P, home, look, p, cam, a, mis}`;
     - chunki: IndexedDB `klockowo/chunks`, klucz `<slot>|cx,cz`;
     - postęp: `klockowo.progress`;
     - ustawienia: `klockowo.settings`.
   - Misje (`mis`) zapisują `{idx, hist, used, mcount, lastDone, npcs, active}`. Nowe pola dodawaj z wartością domyślną w `Missions.load`.
2. **Bez sieci.** Żadnych `fetch`, CDN-ów, fontów z zewnątrz, analityki ani linków dla dziecka. Wszystko musi być w pliku.
3. **Język i ton.** Cały interfejs po polsku, krótkie zdania, które `Voice.say()` czyta na głos. Dla 5–6 lat polecenie musi się dać zrozumieć z ikonki. Liczebniki odmieniaj: `plw(n, 'klocek', 'klocki', 'klocków')` i `kloc(n)`. Bez kar, punktów ujemnych i odliczania czasu.
4. **Wiek.** `settings.age` przyjmuje 0 (5–6 lat), 1 (7–8) albo 2 (9+). W treściach używaj `byAge(a, b, c)`.
5. **Telefon to pełnoprawny cel.** Po każdej zmianie interfejsu sprawdź układ pionowy (390×844) i poziomy (844×390). Media query kompaktowe: `(max-height:520px),(max-width:700px)`. Klasa `html.touch` oznacza dotyk. Przewijane listy potrzebują `min-height:0` / `overflow` i `dragScroll(el)`.
6. **Wydajność.** Na dotyku domyślnie działa `lowGfx` (mniejszy zasięg widoku). Pamiętaj o LOD chunków. `update()` powinno trwać poniżej 2 ms, a ciężkie rzeczy rób co 1–1,5 s, nie w każdej klatce.

## Przedmioty, grupy i zdarzenia

- **Klucze przedmiotów:**
  - zwykły klucz = klocek z `BL`;
  - `@kind` = zwierzę;
  - `!name` = gotowa budowla;
  - `~tool` = narzędzie Przyrody;
  - `#erase` (tylko w misjach) = przycisk Zabierz.
  - `isBlock(k)` odrzuca `@ ! ~`.
- **Dolny pasek** (`GROUPS`): Buduj (zakładki `CATS`: Klocki, Kolory, Dom, Gotowe), Przyroda (`NATURE`), Zwierzaki, Maluj (`PAINTS`), Zabierz.
  - `Build3.setGroup(g)` zmienia grupę i narzędzie (`tool`: build/paint/erase).
  - `Build3.selectItem(k)` sam przełącza na grupę przedmiotu (`groupOf`). Wyjątek: Maluj zostaje, jeśli wybrano kolor albo materiał.
- **Zdarzenia** `Build3.on(name, fn)` / `emit`:
  - `place`: `[{id, cells, m}]`;
  - `prefab`: `{name, x, y, z}`;
  - `tool`: `{tool, n}`. Wycięcie drzewa przez Zabierz emituje `tool` z `tool: 'axe'`;
  - `paint`: `{id, n}`;
  - `erase`: liczba zabranych;
  - `pet`: zwierzę;
  - `animal`: rodzaj postawionego zwierzaka.
- **Odblokowania:** `unlocked3(k)` sprawdza gwiazdki z zagadek (`unlock` w definicji), `settings.unlockAll` i to, czy przedmiot jest potrzebny do bieżącej misji (`Missions.needs(k)`).

## Misje (`src/missions.js`)

- Nowa misja to `defM('id', ['npc1', 'npc2'], () => ({ title, text, steps: [...] }))`. Generator może losować materiał, kolor, liczbę i kształt. Wynik jest kopiowany przez JSON, więc nie wkładaj tam funkcji.
- **Typy kroków:**
  - `place {ids|null, shape?, cells?, goal}`;
  - `tower`, `prefab`, `tool`, `animal`, `pet {distinct}`, `paint {ids|null}`, `overwater`;
  - `quiz {q, choices, answer}`;
  - `blueprint {bp, memory}` (plany w `BP_FOR`);
  - `find {kind, dist, back}`, `chests {n, dist}`;
  - `collect {kind, n, rad}`, `reach {dist}`.
  - Nowy typ kroku wymaga obsługi w:
    - `onEvent` albo `update`;
    - `startStep`, `restoreActive`, `cleanupStep`;
    - `stepText`, `target` (kompas);
    - `needs` / `needItem` / `holds` (przycisk „weź”).
- **Teksty:** `DIR` i `DIST` w tekście dla 9+ zastępuje `dirFill`, który liczy kierunek od mieszkańca.
- **Pierwsze spotkanie:** czterej pierwsi mieszkańcy dają wtedy powitalną misję `MS[id][0]`. Później losowanie z `poolFor(id)` pomija 12 ostatnio użytych szablonów (`hist`).
- **Pojawianie się mieszkańców** (`spawnTick`, co 1,5 s): najwyżej 4 naraz i ok. 2 dostępnych w promieniu 70 kratek. Nowi pojawiają się 16–34 kratki przed graczem, tylko w trybie spaceru. Znikają dalej niż 95 kratek. Mieszkaniec z aktywną misją zostaje.
- **Testy:** `tests/test_missions.py` generuje każdy szablon dla każdego wieku i wyłapuje `undefined`, `NaN` i niepodmienione `DIR`.

## Jednostki

1 kratka (voxel) = 0,5 m, więc dla 9+ „wieża 3 m” to 6 klocków. Chunk ma 32×32×64 kratki, zasięg widoku to `VIEW_R=3` chunki (`R=2` przy `lowGfx`).

## Testy: jak działają i na co uważać

- **Uruchamianie:** testy otwierają `dist/klockowo.html` w Chromium z grafiką programową (SwiftShader). Jedna klatka trwa ~1 s, więc testy:
  - wstrzymują rysowanie: `E._r = E.render; E.render = () => {}` (przywróć przed zrzutem);
  - same wołają `Build3.update(1/60, t)` w pętli (`SIM`);
  - nie martwią się wolnymi klatkami przy myszy i dotyku: gra rozpoznaje przytrzymanie po znaczniku czasu zdarzenia, nie po zegarze.
- **Dostęp do gry:** `window.__klockowo` daje dostęp do `Build3`, `Missions`, `Cam`, `Engine`, `BL`, `BK`, `settings`, `PREFABS`, `IDB` itd. `INIT` z `tests/common.py` tworzy świat „łąka” (ziarno 4242) w slocie 1.
- **Wyniki:** testy wypisują pomiary i zapisują zrzuty w `tests/shots/`. Po zmianie interfejsu **obejrzyj zrzuty** (Read na pliku PNG). `run_all.py` uznaje test za nieudany przy wyjątku albo błędzie JS w konsoli, ale liczby trzeba ocenić samemu.
- **Opóźnienia w grze:** część akcji gry dzieje się w `setTimeout` (np. przejście do następnego kroku misji po 0,5 s). W testach odczekaj `wait_for_timeout(700)` przed sprawdzeniem.
- **Dotyk:** testy dotykowe używają `new_context(is_mobile=True, has_touch=True)` i CDP `Input.dispatchTouchEvent`.

## Typowy cykl pracy

1. Zmień `src/…`.
2. `npm run build`. Musi wypisać `OK`. Błąd składni podaje linię w `dist/main-check.js`.
3. Uruchom test najbliższy zmianie (np. `python tests/test_menu.py`) i obejrzyj zrzuty.
4. Przy zmianach interfejsu sprawdź też `test_touch` i `test_scroll` (telefon).
5. Na prawdziwym tablecie: `npm run serve` i adres z sieci domowej.

## Publikacja

`dist/klockowo.html` to cała gra. Można ją wrzucić na dowolny hosting jako `index.html`.
`.github/workflows/pages.yml` publikuje ją na GitHub Pages po pushu do `main`. W ustawieniach repozytorium
wybierz Pages → Source: GitHub Actions.
