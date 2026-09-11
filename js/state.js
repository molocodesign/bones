// Stan partii i zapis w localStorage. Faza 1: jeden telefon, hot-seat.

import { LICZBA_WIERSZY, podsumowanie } from './scoring.js';

const KLUCZ = 'kosci.partia.v1';

export function nowaPartia(imiona) {
  return {
    gracze: imiona.map((imie, i) => ({ id: `g${i}`, imie })),
    arkusze: Object.fromEntries(imiona.map((_, i) => [`g${i}`, {}])),
    historia: [],
    tura: 0,
  };
}

export const aktywnyGracz = (p) => p.gracze[p.tura % p.gracze.length];
export const aktywnyArkusz = (p) => p.arkusze[aktywnyGracz(p).id];
export const runda = (p) => Math.floor(p.tura / p.gracze.length) + 1;
export const koniec = (p) => p.tura >= p.gracze.length * LICZBA_WIERSZY;

export function zapisz(p, graczId, wiersz, wartosc, { ruszTure = true } = {}) {
  const poprzednia = p.arkusze[graczId][wiersz];
  p.arkusze[graczId][wiersz] = wartosc;
  p.historia.push({ graczId, wiersz, poprzednia, ruszTure });
  if (ruszTure) p.tura += 1;
  utrwal(p);
}

export function wyczysc(p, graczId, wiersz) {
  const poprzednia = p.arkusze[graczId][wiersz];
  if (typeof poprzednia !== 'number') return;
  delete p.arkusze[graczId][wiersz];
  p.historia.push({ graczId, wiersz, poprzednia, ruszTure: false, usuniete: true });
  utrwal(p);
}

export function cofnij(p) {
  const ostatni = p.historia.pop();
  if (!ostatni) return false;
  if (typeof ostatni.poprzednia === 'number') p.arkusze[ostatni.graczId][ostatni.wiersz] = ostatni.poprzednia;
  else delete p.arkusze[ostatni.graczId][ostatni.wiersz];
  if (ostatni.ruszTure) p.tura -= 1;
  utrwal(p);
  return true;
}

export function ranking(p) {
  return p.gracze
    .map((g) => ({ ...g, ...podsumowanie(p.arkusze[g.id]) }))
    .sort((a, b) => b.razem - a.razem);
}

export function utrwal(p) {
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(p));
  } catch {
    // Prywatne okno albo pełny dysk — gra działa dalej, tylko bez zapisu.
  }
}

export function wczytaj() {
  try {
    const surowe = localStorage.getItem(KLUCZ);
    if (!surowe) return null;
    const p = JSON.parse(surowe);
    if (!Array.isArray(p?.gracze) || !p.gracze.length) return null;
    return p;
  } catch {
    return null;
  }
}

export function skasuj() {
  try {
    localStorage.removeItem(KLUCZ);
  } catch {
    // nic
  }
}
