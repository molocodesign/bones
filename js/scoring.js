// Reguły arkusza. Czyste funkcje, bez DOM — patrz ZASADY.md.
// Punkty za układ liczy gracz w głowie; apka pilnuje sum, premii, kary
// i tego, w który wiersz wolno dziś pisać.

export const SZKOLKA = [1, 2, 3, 4, 5, 6];

export const FIGURY = [
  { key: 'para', label: 'Para' },
  { key: 'dwiePary', label: 'Dwie pary' },
  { key: 'trojka', label: 'Trójka' },
  { key: 'malyStrit', label: 'Mały strit' },
  { key: 'duzyStrit', label: 'Duży strit' },
  { key: 'kareta', label: 'Kareta' },
  { key: 'full', label: 'Full' },
  { key: 'poker', label: 'Poker' },
  { key: 'parzyste', label: 'Parzyste' },
  { key: 'nieparzyste', label: 'Nieparzyste' },
  { key: 'szansa', label: 'Szansa' },
];

export const WIERSZE = [
  ...SZKOLKA.map((n) => `s${n}`),
  ...FIGURY.map((f) => f.key),
];

export const LICZBA_WIERSZY = WIERSZE.length; // 17
export const TURY_NA_WYJSCIE = 3;
export const PREMIA_PROG = 15;
export const PREMIA = 50;
export const KARA = -50;

const NAZWY_SZKOLKI = ['Jedynki', 'Dwójki', 'Trójki', 'Czwórki', 'Piątki', 'Szóstki'];

export const zeSzkolki = (wiersz) => wiersz[0] === 's' && wiersz.length === 2;

export const etykieta = (wiersz) => (zeSzkolki(wiersz)
  ? NAZWY_SZKOLKI[Number(wiersz[1]) - 1]
  : FIGURY.find((f) => f.key === wiersz).label);

// `arkusz` to obiekt { s1: -3, para: 12, ... } — brak klucza znaczy wiersz pusty.
export function podsumowanie(arkusz) {
  let szkolka = 0;
  let figury = 0;
  let wypelnione = 0;

  for (const w of WIERSZE) {
    const v = arkusz[w];
    if (typeof v !== 'number') continue;
    wypelnione += 1;
    if (zeSzkolki(w)) szkolka += v;
    else figury += v;
  }

  // Modyfikator liczymy z bieżącej sumy, nie dopiero po wypełnieniu szkółki.
  // Na koniec gry wychodzi to samo, a w trakcie gracz od razu widzi,
  // że wisi mu kara — i ma szansę to odkręcić.
  const szkolkaKomplet = SZKOLKA.every((n) => typeof arkusz[`s${n}`] === 'number');
  let modyfikator = 0;
  if (szkolka >= PREMIA_PROG) modyfikator = PREMIA;
  else if (szkolka < 0) modyfikator = KARA;

  return {
    szkolka,
    figury,
    modyfikator,
    szkolkaKomplet,
    wypelnione,
    komplet: wypelnione === LICZBA_WIERSZY,
    razem: szkolka + modyfikator + figury,
  };
}

export const wypelnioneWSzkolce = (arkusz) => SZKOLKA
  .filter((n) => typeof arkusz[`s${n}`] === 'number').length;

export const poWyjsciuZeSzkolki = (arkusz) => wypelnioneWSzkolce(arkusz) >= TURY_NA_WYJSCIE;

// Czy w tej turze wolno wpisać wynik w ten wiersz.
export function wierszDostepny(wiersz, arkusz) {
  if (typeof arkusz[wiersz] === 'number') return false;
  if (zeSzkolki(wiersz)) return true;
  return poWyjsciuZeSzkolki(arkusz);
}
