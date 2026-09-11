import {
  SZKOLKA, FIGURY, LICZBA_WIERSZY, TURY_NA_WYJSCIE,
  podsumowanie, wierszDostepny, wypelnioneWSzkolce, etykieta, zeSzkolki, WIERSZE,
} from './scoring.js';
import * as gra from './state.js';

const $ = (id) => document.getElementById(id);

// Ikony Lucide wklejone jako ścieżki — apka ma działać bez sieci.
const SVG_NS = 'http://www.w3.org/2000/svg';
const IKONY_SVG = {
  cofnij: { d: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'] },
  wyjscie: { d: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'] },
  slonce: {
    circle: [12, 12, 4],
    d: ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41',
      'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  },
  ksiezyc: { d: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'] },
  ekran: { rect: [2, 3, 20, 14, 2], d: ['M8 21h8', 'M12 17v4'] },
  backspace: { d: ['M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z', 'm12 9 6 6', 'm18 9-6 6'] },
  minus: { d: ['M5 12h14'] },
  krzyzyk: { d: ['M18 6 6 18', 'm6 6 12 12'] },
  kosci: {
    rect: [2, 10, 12, 12, 2],
    d: ['m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6',
      'M6 18h.01', 'M10 14h.01', 'M15 6h.01', 'M18 9h.01'],
  },
};

function ikona(nazwa) {
  const spec = IKONY_SVG[nazwa];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ikona');
  if (spec.circle) {
    const c = document.createElementNS(SVG_NS, 'circle');
    const [cx, cy, r] = spec.circle;
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', r);
    svg.append(c);
  }
  if (spec.rect) {
    const el = document.createElementNS(SVG_NS, 'rect');
    const [x, y, w, hh, rx] = spec.rect;
    el.setAttribute('x', x);
    el.setAttribute('y', y);
    el.setAttribute('width', w);
    el.setAttribute('height', hh);
    el.setAttribute('rx', rx);
    svg.append(el);
  }
  for (const d of spec.d) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

const wstawIkone = (el, nazwa) => {
  el.textContent = '';
  el.append(ikona(nazwa));
};

let partia = null;
// Otwarty bottom sheet: { graczId, wiersz, tekst, nowyWpis }
let wpis = null;

const format = (v) => (v > 0 ? `+${v}` : String(v));

// Polska odmiana: 1 turę, 2–4 tury, 5+ tur.
const tury = (n) => {
  if (n === 1) return 'turę';
  return n >= 2 && n <= 4 ? 'tury' : 'tur';
};

// 6 wierszy szkółki + suma + premia/kara + 11 figur.
const WIERSZY_W_TABELI = SZKOLKA.length + 2 + FIGURY.length;

function pokazEkran(nazwa) {
  for (const e of ['setup', 'gra', 'koniec']) $(`ekran-${e}`).hidden = e !== nazwa;
}

// — setup —

function wierszGracza(imie = '') {
  const li = document.createElement('li');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Imię';
  input.value = imie;
  input.autocomplete = 'off';
  const usun = document.createElement('button');
  usun.type = 'button';
  usun.className = 'usun';
  usun.append(ikona('krzyzyk'));
  usun.setAttribute('aria-label', 'Usuń gracza');
  usun.onclick = () => {
    li.remove();
    odswiezSetup();
  };
  li.append(input, usun);
  return li;
}

function odswiezSetup() {
  const wiersze = [...$('lista-graczy').children];
  for (const li of wiersze) li.querySelector('.usun').hidden = wiersze.length <= 2;
  $('start').disabled = wiersze.length < 2;
}

const imionaZFormularza = () => [...$('lista-graczy').querySelectorAll('input')]
  .map((i, idx) => i.value.trim() || `Gracz ${idx + 1}`);

// — tabela —
function komorka(gracz, wiersz, teraz) {
  const td = document.createElement('td');
  const v = partia.arkusze[gracz.id][wiersz];
  const jest = typeof v === 'number';
  const doWpisania = teraz && !jest && wierszDostepny(wiersz, partia.arkusze[gracz.id]);

  td.className = 'komorka';
  if (teraz) td.classList.add('kol-teraz');
  if (jest) {
    td.textContent = format(v);
    if (v > 0) td.classList.add('dodatnia');
    if (v < 0) td.classList.add('ujemna');
    // Poprawki są zawsze dozwolone — inaczej pomyłkę sprzed kilku tur
    // dałoby się naprawić tylko cofaniem wszystkiego po drodze.
    td.classList.add('klikalna');
    td.onclick = () => otworzSheet(gracz, wiersz, false);
  } else if (doWpisania) {
    td.textContent = '+';
    td.classList.add('czeka', 'klikalna');
    td.setAttribute('aria-label', `Wpisz ${etykieta(wiersz)}`);
    td.onclick = () => otworzSheet(gracz, wiersz, true);
  }
  return td;
}

function komorkaEtykiety(tekst, naglowek = false) {
  const el = document.createElement(naglowek ? 'th' : 'td');
  el.className = 'etykieta';
  el.textContent = tekst;
  return el;
}

// Obrócony podpis sekcji, wpięty w pierwszy wiersz grupy przez rowspan.
function komorkaPionowa(nazwa, wysokosc, { granica = false, wyrozniony = false } = {}) {
  const td = document.createElement('td');
  td.className = `pion${granica ? ' pion-granica' : ''}`;
  td.rowSpan = wysokosc;
  const napis = document.createElement('span');
  napis.className = `pion-tekst${wyrozniony ? ' pion-blokada' : ''}`;
  napis.textContent = nazwa;
  td.append(napis);
  return td;
}

function wierszTabeli(wiersz, teraz, pion, klasa) {
  const tr = document.createElement('tr');
  if (klasa) tr.className = klasa;
  if (pion) tr.append(komorkaPionowa(pion.nazwa, pion.wysokosc, pion));
  tr.append(komorkaEtykiety(etykieta(wiersz)));
  partia.gracze.forEach((g, i) => tr.append(komorka(g, wiersz, i === teraz)));
  return tr;
}

function wierszProsty(nazwa, wartosci, klasa, teraz, { koloruj = false } = {}) {
  const tr = document.createElement('tr');
  if (klasa) tr.className = klasa;
  tr.append(komorkaEtykiety(nazwa));
  wartosci.forEach((v, i) => {
    const c = document.createElement('td');
    c.textContent = v;
    if (i === teraz) c.classList.add('kol-teraz');
    if (koloruj && typeof v === 'string' && v.startsWith('+')) c.classList.add('dodatnia');
    if (koloruj && typeof v === 'string' && v.startsWith('-')) c.classList.add('ujemna');
    tr.append(c);
  });
  return tr;
}

const plotno = document.createElement('canvas').getContext('2d');

const MIN_KOLUMNY = 56;

// Kolumna z nazwami wierszy ma być dokładnie tak szeroka, jak najdłuższa
// etykieta — bez zapasu na oko. Ograniczeniem bywa też numer rundy w rogu,
// który dzieli szerokość z kolumną podpisów sekcji.
function minimalnaEtykieta(szerPionu, pad) {
  const rodzina = getComputedStyle(document.body).fontFamily;

  plotno.font = `400 16px ${rodzina}`;
  let potrzeba = Math.max(...WIERSZE.map((w) => plotno.measureText(etykieta(w)).width));
  plotno.font = `600 16px ${rodzina}`;
  potrzeba = Math.max(potrzeba, ...['Suma', 'Bonus', 'Razem'].map((t) => plotno.measureText(t).width));

  plotno.font = `500 11px ${rodzina}`;
  const rog = plotno.measureText(`RUNDA ${LICZBA_WIERSZY} Z ${LICZBA_WIERSZY}`).width
    + LICZBA_WIERSZY * 0.3 // letter-spacing w rogu
    + 2 * pad - szerPionu;

  return Math.ceil(Math.max(potrzeba + 2 * pad, rog));
}

// Kolumny graczy mają być równe co do piksela, niezależnie od tego,
// że ostatnia ma szerszy padding przy krawędzi ekranu. Resztę z dzielenia
// oddajemy kolumnie z nazwami wierszy, żeby tabela wypełniła szerokość.
function policzKolumny() {
  const styl = getComputedStyle(document.documentElement);
  const pion = parseInt(styl.getPropertyValue('--w-pionu'), 10);
  const pad = parseInt(styl.getPropertyValue('--pad-boczny'), 10);
  const n = partia.gracze.length;

  const etykietaMin = minimalnaEtykieta(pion, pad);
  const dostepne = $('tabela-wrap').clientWidth - pion - etykietaMin;
  const gracz = Math.max(MIN_KOLUMNY, Math.floor(dostepne / n));
  const reszta = Math.max(0, $('tabela-wrap').clientWidth - pion - etykietaMin - n * gracz);
  const etykieta = etykietaMin + reszta;

  document.documentElement.style.setProperty('--w-etykiety', `${etykieta}px`);
  return { pion, etykieta, gracz };
}

// Przy table-layout: fixed szerokość auto każe przeglądarce ścisnąć
// kolumny do kontenera. Podajemy sumę wprost, żeby przy wielu graczach
// tabela wyszła poza ekran i dała się przewinąć w bok.
function kolumny({ pion, etykieta: szerEtykiety, gracz }) {
  $('tabela').style.width = `${pion + szerEtykiety + partia.gracze.length * gracz}px`;
  const cg = document.createElement('colgroup');
  const dodaj = (px) => {
    const col = document.createElement('col');
    col.style.width = `${px}px`;
    cg.append(col);
  };
  dodaj(pion);
  dodaj(szerEtykiety);
  partia.gracze.forEach(() => dodaj(gracz));
  return cg;
}

// Wysokość wiersza dobrana tak, żeby wszystkie zmieściły się między
// przyklejonymi imionami a przyklejonym wierszem RAZEM. Gdy się nie da
// (bardzo niski ekran), środek po prostu się przewija.
function dopasujWysokosc() {
  const styl = getComputedStyle(document.documentElement);
  const naglowki = parseInt(styl.getPropertyValue('--h-imiona'), 10)
    + parseInt(styl.getPropertyValue('--h-razem'), 10);
  const wolne = $('tabela-wrap').clientHeight - naglowki;
  const h = Math.max(24, Math.min(40, Math.floor(wolne / WIERSZY_W_TABELI)));
  document.documentElement.style.setProperty('--h-wiersz', `${h}px`);
}

function rysujTabele() {
  const t = $('tabela');
  t.textContent = '';
  t.append(kolumny(policzKolumny()));
  const teraz = gra.koniec(partia) ? -1 : partia.tura % partia.gracze.length;
  const p = partia.gracze.map((g) => podsumowanie(partia.arkusze[g.id]));

  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  // Numer rundy w rogu, na całą szerokość przyklejonej części —
  // kolumna z podpisem sekcji nie może go przycinać.
  const rog = document.createElement('th');
  rog.className = 'rog';
  rog.colSpan = 2;
  rog.textContent = `Runda ${gra.runda(partia)} z ${LICZBA_WIERSZY}`;
  tr.append(rog);
  partia.gracze.forEach((g, i) => {
    const th = document.createElement('th');
    th.textContent = g.imie;
    th.className = i === teraz ? 'teraz kol-teraz' : '';
    tr.append(th);
  });
  thead.append(tr);
  t.append(thead);

  const tbody = document.createElement('tbody');
  // Mocniejsza linia oddziela oczka szkółki od jej podsumowania.
  SZKOLKA.forEach((n, i) => tbody.append(wierszTabeli(
    `s${n}`, teraz,
    i === 0 ? { nazwa: 'Szkółka', wysokosc: SZKOLKA.length + 2, granica: true } : null,
    i === SZKOLKA.length - 1 ? 'granica' : null,
  )));
  tbody.append(wierszProsty('Suma', p.map((x) => x.szkolka), 'suma', teraz));
  // Nazwa jest stała, bo wiersz jest wspólny dla wszystkich kolumn,
  // a gracze bywają jednocześnie z karą i z premią. Znak niesie kolor.
  tbody.append(wierszProsty(
    'Bonus',
    p.map((x) => (x.modyfikator === 0 ? '' : format(x.modyfikator))),
    'granica',
    teraz,
    { koloruj: true },
  ));
  // Blokada figur wisi przy pionowym podpisie sekcji, której dotyczy.
  const brakuje = gra.koniec(partia)
    ? 0
    : TURY_NA_WYJSCIE - wypelnioneWSzkolce(gra.aktywnyArkusz(partia));
  const podpisFigur = brakuje > 0 ? `Figury · za ${brakuje} ${tury(brakuje)}` : 'Figury';
  FIGURY.forEach((f, i) => tbody.append(wierszTabeli(
    f.key, teraz,
    i === 0 ? { nazwa: podpisFigur, wysokosc: FIGURY.length, wyrozniony: brakuje > 0 } : null,
  )));
  t.append(tbody);

  // Stopka ma jedną komórkę na obie przyklejone kolumny, tak jak róg
  // u góry — dzięki temu „Razem" stoi w jednej linii z tytułem i rundą.
  const tfoot = document.createElement('tfoot');
  const stopka = document.createElement('tr');
  const podpis = document.createElement('td');
  podpis.className = 'stopka-rog';
  podpis.colSpan = 2;
  podpis.textContent = 'Razem';
  stopka.append(podpis);
  p.forEach((x, i) => {
    const c = document.createElement('td');
    c.textContent = x.razem;
    if (i === teraz) c.className = 'kol-teraz';
    stopka.append(c);
  });
  tfoot.append(stopka);
  t.append(tfoot);

  dopasujWysokosc();
}

// — bottom sheet z klawiaturą —

function rysujKlawiature() {
  const box = $('klawiatura');
  box.textContent = '';
  const klawisze = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '−', '0', '⌫'];
  for (const znak of klawisze) {
    const b = document.createElement('button');
    b.type = 'button';
    const pomocniczy = znak === '−' || znak === '⌫';
    b.className = `klawisz${pomocniczy ? ' pomocniczy' : ''}`;
    if (znak === '−') {
      b.id = 'klawisz-minus';
      b.setAttribute('aria-label', 'Zmień znak');
      b.append(ikona('minus'));
    } else if (znak === '⌫') {
      b.setAttribute('aria-label', 'Skasuj cyfrę');
      b.append(ikona('backspace'));
    } else {
      b.textContent = znak;
    }
    b.onclick = () => nacisnij(znak);
    box.append(b);
  }
}

// Minus ma sens tylko w szkółce — figury zawsze punktują na plus albo zero.
const wolnoMinus = () => wpis !== null && zeSzkolki(wpis.wiersz);

function nacisnij(znak) {
  if (!wpis) return;
  if (znak === '⌫') wpis.tekst = wpis.tekst.slice(0, -1);
  else if (znak === '−') {
    if (!wolnoMinus()) return;
    wpis.tekst = wpis.tekst.startsWith('-') ? wpis.tekst.slice(1) : `-${wpis.tekst}`;
  }
  else if (wpis.tekst.replace('-', '').length < 3) wpis.tekst += znak;
  odswiezWyswietlacz();
}

function wartoscWpisu() {
  const cyfry = wpis.tekst.replace('-', '');
  if (!cyfry.length) return null;
  return Number(wpis.tekst.startsWith('-') ? `-${cyfry}` : cyfry);
}

function odswiezWyswietlacz() {
  const v = wartoscWpisu();
  $('sheet-wartosc').textContent = v === null ? '' : String(v);
  $('sheet-zapisz').disabled = v === null;
}

function otworzSheet(gracz, wiersz, nowyWpis) {
  const obecna = partia.arkusze[gracz.id][wiersz];
  wpis = { graczId: gracz.id, wiersz, tekst: '', nowyWpis };

  $('sheet-tytul').textContent = etykieta(wiersz);
  $('sheet-podpis').textContent = nowyWpis
    ? `${gracz.imie} — nowy wpis`
    : `${gracz.imie} — poprawka, obecnie ${format(obecna)}`;
  $('sheet-usun').hidden = nowyWpis;
  $('klawisz-minus').disabled = !wolnoMinus();
  $('sheet').hidden = false;
  odswiezWyswietlacz();
}

function zamknijSheet() {
  wpis = null;
  $('sheet').hidden = true;
}

function zapiszWpis() {
  const v = wartoscWpisu();
  if (v === null) return;
  // Tura przesuwa się tylko przy nowym wpisie; poprawka nie zabiera kolejki.
  gra.zapisz(partia, wpis.graczId, wpis.wiersz, v, { ruszTure: wpis.nowyWpis });
  zamknijSheet();
  rysujGre();
}

function usunWpis() {
  gra.wyczysc(partia, wpis.graczId, wpis.wiersz);
  zamknijSheet();
  rysujGre();
}

// — motyw —

const MOTYWY = ['auto', 'jasny', 'ciemny'];
const IKONY = { auto: 'ekran', jasny: 'slonce', ciemny: 'ksiezyc' };
const OPISY = { auto: 'Motyw: jak w systemie', jasny: 'Motyw: jasny', ciemny: 'Motyw: ciemny' };
const systemowyCiemny = window.matchMedia('(prefers-color-scheme: dark)');

let motyw = localStorage.getItem('kosci.motyw') || 'auto';

function zastosujMotyw() {
  const ciemny = motyw === 'ciemny' || (motyw === 'auto' && systemowyCiemny.matches);
  document.documentElement.classList.toggle('ciemny', ciemny);
  document.documentElement.style.colorScheme = ciemny ? 'dark' : 'light';
  $('meta-motyw').setAttribute('content', ciemny ? '#000000' : '#f2f2f7');
  wstawIkone($('motyw'), IKONY[motyw]);
  $('motyw').setAttribute('aria-label', OPISY[motyw]);
  $('motyw').title = OPISY[motyw];
}

function przelaczMotyw() {
  motyw = MOTYWY[(MOTYWY.indexOf(motyw) + 1) % MOTYWY.length];
  try {
    localStorage.setItem('kosci.motyw', motyw);
  } catch {
    // Prywatne okno — motyw zadziała do końca sesji.
  }
  zastosujMotyw();
}

// — potwierdzenia —

function potwierdz(tytul, tresc, etykietaTak, akcja) {
  const d = $('dialog-potwierdz');
  $('potwierdz-tytul').textContent = tytul;
  $('potwierdz-tresc').textContent = tresc;
  $('potwierdz-tak').textContent = etykietaTak;
  d.onclose = () => {
    if (d.returnValue === 'tak') akcja();
  };
  d.showModal();
}

function porzucPartie() {
  gra.skasuj();
  partia = null;
  zamknijSheet();
  $('wznow-info').hidden = true;
  pokazEkran('setup');
}

// — pętla główna —

function rysujGre() {
  if (gra.koniec(partia)) {
    rysujKoniec();
    return;
  }
  pokazEkran('gra');
  $('cofnij').disabled = partia.historia.length === 0;
  rysujTabele();
}

function rysujKoniec() {
  pokazEkran('koniec');
  const tabela = gra.ranking(partia);
  const najlepszy = tabela[0].razem;
  const zwyciezcy = tabela.filter((g) => g.razem === najlepszy);
  $('zwyciezca').textContent = zwyciezcy.length === 1
    ? `Wygrywa ${zwyciezcy[0].imie}`
    : `Remis: ${zwyciezcy.map((g) => g.imie).join(', ')}`;

  const lista = $('wyniki');
  lista.textContent = '';
  tabela.forEach((g, i) => {
    const li = document.createElement('li');
    if (g.razem === najlepszy) li.className = 'zwyciezca';
    const m = document.createElement('span');
    m.className = 'miejsce';
    m.textContent = `${i + 1}.`;
    const imie = document.createElement('span');
    imie.className = 'imie';
    imie.textContent = g.imie;
    const pkt = document.createElement('span');
    pkt.className = 'punkty';
    pkt.textContent = g.razem;
    li.append(m, imie, pkt);
    lista.append(li);
  });
}

// — podpięcie —

$('dodaj-gracza').onclick = () => {
  $('lista-graczy').append(wierszGracza());
  odswiezSetup();
};
$('start').onclick = () => {
  partia = gra.nowaPartia(imionaZFormularza());
  gra.utrwal(partia);
  rysujGre();
};
$('motyw').onclick = przelaczMotyw;
$('cofnij').onclick = () => {
  if (gra.cofnij(partia)) rysujGre();
};
$('wyjscie').onclick = () => potwierdz(
  'Zakończyć partię?',
  'Wyniki tej gry przepadną bezpowrotnie.',
  'Zakończ',
  porzucPartie,
);
$('sheet-anuluj').onclick = zamknijSheet;
$('sheet-tlo').onclick = zamknijSheet;
$('sheet-zapisz').onclick = zapiszWpis;
$('sheet-usun').onclick = usunWpis;
$('nowa-gra').onclick = porzucPartie;
$('podejrzyj').onclick = () => {
  pokazEkran('gra');
  rysujTabele();
};

document.addEventListener('keydown', (e) => {
  if (!wpis) return;
  if (e.key >= '0' && e.key <= '9') nacisnij(e.key);
  else if (e.key === 'Backspace') nacisnij('⌫');
  else if (e.key === '-') nacisnij('−');
  else if (e.key === 'Enter') zapiszWpis();
  else if (e.key === 'Escape') zamknijSheet();
});

window.addEventListener('resize', () => {
  if (partia && !gra.koniec(partia)) dopasujWysokosc();
});

wstawIkone($('cofnij'), 'cofnij');
wstawIkone($('wyjscie'), 'wyjscie');
systemowyCiemny.addEventListener('change', zastosujMotyw);
zastosujMotyw();

$('lista-graczy').append(wierszGracza(), wierszGracza());
odswiezSetup();
for (const id of ['logo', 'logo-gra', 'logo-koniec']) wstawIkone($(id), 'kosci');
rysujKlawiature();
pokazEkran('setup');

const zapisana = gra.wczytaj();
if (zapisana) {
  $('wznow-info').hidden = false;
  $('wznow').onclick = () => {
    partia = zapisana;
    rysujGre();
  };
}

// Na localhoście service worker tylko przeszkadza — serwowałby z cache'u
// kod sprzed ostatniej zmiany. Na produkcji odpowiada za tryb offline.
const lokalnie = ['localhost', '127.0.0.1'].includes(location.hostname);

if ('serviceWorker' in navigator && !lokalnie) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
}
