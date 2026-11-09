---
description: Zbuduj grę, uruchom testy związane z ostatnią zmianą i obejrzyj zrzuty ekranu
---
Sprawdź ostatnią zmianę w Klockowie:

1. Uruchom `npm run build`. Jeśli jest błąd składni, napraw go (linia dotyczy `dist/main-check.js`, znajdź ją w `src/`).
2. Na podstawie `git diff` wybierz testy z `tests/`, które dotyczą zmiany. Zmiany w interfejsie: zawsze `menu`, `touch` i `scroll`. Uruchom je: `python tests/run_all.py <nazwy> --no-build`.
3. Obejrzyj najważniejsze zrzuty z `tests/shots/` (desktop i telefon) i oceń je oczami 6-latka: czy widać, co nacisnąć, czy nic się nie zasłania.
4. Krótko podsumuj: co działa, co nie, co poprawić. $ARGUMENTS
