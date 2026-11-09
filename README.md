# Klockowo

Spokojna gra w budowanie dla dzieci w wieku 5–9 lat. Działa w przeglądarce na komputerze, tablecie
i telefonie. Nie ma reklam, kont ani połączeń z internetem. Cała gra to jeden plik HTML.

- **Budowanie:** nieskończony świat z klocków, kolory, kształty (płytki, schodki, łuki, dachy), meble i gotowe budowle.
- **Przyroda:** sadzenie drzew, kopanie, górki, stawy z wodą.
- **Zwierzaki i postacie:** zwierzaki do głaskania, kreator postaci i gotowi bohaterowie.
- **Misje:** mieszkańcy pojawiają się podczas spaceru i dają misje dopasowane do wieku (5–6, 7–8, 9+).
- **Zagadki 2D:** „kopiuj budowlę” i „kod z jeżykiem” dają gwiazdki, które odblokowują nagrody.
- **Panel rodzica:** wiek misji, przerwy, jakość grafiki.

## Granie

Otwórz `dist/klockowo.html` w przeglądarce (najpierw `npm run build`) albo wrzuć ten plik na dowolny hosting
jako `index.html`. Światy zapisują się w przeglądarce danego urządzenia.

## Rozwój

```bash
npm install
npm run build        # → dist/klockowo.html
npm run serve        # http://localhost:8080 oraz adres w sieci domowej do testów na tablecie
npm test             # testy Playwright (Python): pip install playwright && python -m playwright install chromium
```

Źródła są w `src/`, skrypty w `scripts/`, testy w `tests/`. Architekturę, zasady (zgodność zapisów, brak sieci,
ton dla dzieci) i sposób testowania opisuje [CLAUDE.md](CLAUDE.md). Historia wersji jest w
[docs/HISTORIA.md](docs/HISTORIA.md), pomysły na dalszy rozwój w [docs/POMYSLY.md](docs/POMYSLY.md).

## Publikacja na GitHub Pages

Workflow `.github/workflows/pages.yml` buduje grę i publikuje ją po każdym pushu do `main`.
Wystarczy w ustawieniach repozytorium wybrać **Settings → Pages → Source: GitHub Actions**.

## Licencje

Gra używa biblioteki [three.js](https://threejs.org) na licencji MIT (zob. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
Licencja samego Klockowa nie została jeszcze wybrana. Do czasu jej dodania obowiązują domyślne prawa autorskie.
