// ============================================================
// stops.js — Türkiye Tüm İller Durak Verileri & Favori Yönetimi
// ============================================================

const CITIES = {
  "Adana": { lat: 37.0000, lng: 35.3213 },
  "Adıyaman": { lat: 37.7648, lng: 38.2786 },
  "Afyonkarahisar": { lat: 38.7507, lng: 30.5567 },
  "Ağrı": { lat: 39.7191, lng: 43.0503 },
  "Amasya": { lat: 40.6499, lng: 35.8353 },
  "Ankara": { lat: 39.9334, lng: 32.8597 },
  "Antalya": { lat: 36.8969, lng: 30.7133 },
  "Artvin": { lat: 41.1828, lng: 41.8183 },
  "Aydın": { lat: 37.8560, lng: 27.8416 },
  "Balıkesir": { lat: 39.6484, lng: 27.8826 },
  "Bilecik": { lat: 40.0567, lng: 30.0665 },
  "Bingöl": { lat: 38.8854, lng: 40.4966 },
  "Bitlis": { lat: 38.4004, lng: 42.1095 },
  "Bolu": { lat: 40.7350, lng: 31.6061 },
  "Burdur": { lat: 37.7203, lng: 30.2903 },
  "Bursa": { lat: 40.1826, lng: 29.0665 },
  "Çanakkale": { lat: 40.1553, lng: 26.4142 },
  "Çankırı": { lat: 40.6013, lng: 33.6134 },
  "Çorum": { lat: 40.5506, lng: 34.9556 },
  "Denizli": { lat: 37.7765, lng: 29.0864 },
  "Diyarbakır": { lat: 37.9144, lng: 40.2306 },
  "Edirne": { lat: 41.6818, lng: 26.5623 },
  "Elazığ": { lat: 38.6810, lng: 39.2264 },
  "Erzincan": { lat: 39.7500, lng: 39.5000 },
  "Erzurum": { lat: 39.9000, lng: 41.2700 },
  "Eskişehir": { lat: 39.7767, lng: 30.5206 },
  "Gaziantep": { lat: 37.0662, lng: 37.3833 },
  "Giresun": { lat: 40.9128, lng: 38.3895 },
  "Gümüşhane": { lat: 40.4386, lng: 39.5086 },
  "Hakkari": { lat: 37.5744, lng: 43.7408 },
  "Hatay": { lat: 36.4018, lng: 36.3498 },
  "Isparta": { lat: 37.7648, lng: 30.5566 },
  "Mersin": { lat: 36.8121, lng: 34.6415 },
  "İstanbul": { lat: 41.0082, lng: 28.9784 },
  "İzmir": { lat: 38.4189, lng: 27.1287 },
  "Kars": { lat: 40.6167, lng: 43.1000 },
  "Kastamonu": { lat: 41.3887, lng: 33.7827 },
  "Kayseri": { lat: 38.7312, lng: 35.4787 },
  "Kırklareli": { lat: 41.7333, lng: 27.2167 },
  "Kırşehir": { lat: 39.1425, lng: 34.1709 },
  "Kocaeli": { lat: 40.8533, lng: 29.8815 },
  "Konya": { lat: 37.8746, lng: 32.4932 },
  "Kütahya": { lat: 39.4167, lng: 29.9833 },
  "Malatya": { lat: 38.3552, lng: 38.3095 },
  "Manisa": { lat: 38.6191, lng: 27.4289 },
  "Kahramanmaraş": { lat: 37.5858, lng: 36.9371 },
  "Mardin": { lat: 37.3212, lng: 40.7245 },
  "Muğla": { lat: 37.2153, lng: 28.3636 },
  "Muş": { lat: 38.9462, lng: 41.7539 },
  "Nevşehir": { lat: 38.6939, lng: 34.6857 },
  "Niğde": { lat: 37.9667, lng: 34.6833 },
  "Ordu": { lat: 40.9839, lng: 37.8764 },
  "Rize": { lat: 41.0201, lng: 40.5234 },
  "Sakarya": { lat: 40.6940, lng: 30.4358 },
  "Samsun": { lat: 41.2928, lng: 36.3313 },
  "Siirt": { lat: 37.9333, lng: 41.9500 },
  "Sinop": { lat: 42.0231, lng: 35.1531 },
  "Sivas": { lat: 39.7477, lng: 37.0179 },
  "Tekirdağ": { lat: 40.9833, lng: 27.5167 },
  "Tokat": { lat: 40.3167, lng: 36.5500 },
  "Trabzon": { lat: 41.0027, lng: 39.7168 },
  "Tunceli": { lat: 39.1079, lng: 39.5401 },
  "Şanlıurfa": { lat: 37.1591, lng: 38.7969 },
  "Uşak": { lat: 38.6823, lng: 29.4082 },
  "Van": { lat: 38.5012, lng: 43.3730 },
  "Yozgat": { lat: 39.8181, lng: 34.8147 },
  "Zonguldak": { lat: 41.4564, lng: 31.7987 },
  "Aksaray": { lat: 38.3687, lng: 34.0370 },
  "Bayburt": { lat: 40.2552, lng: 40.2249 },
  "Karaman": { lat: 37.1759, lng: 33.2287 },
  "Kırıkkale": { lat: 39.8468, lng: 33.5153 },
  "Batman": { lat: 37.8812, lng: 41.1351 },
  "Şırnak": { lat: 37.5164, lng: 42.4611 },
  "Bartın": { lat: 41.6344, lng: 32.3375 },
  "Ardahan": { lat: 41.1105, lng: 42.7022 },
  "Iğdır": { lat: 39.9167, lng: 44.0500 },
  "Yalova": { lat: 40.6500, lng: 29.2667 },
  "Karabük": { lat: 41.2061, lng: 32.6204 },
  "Kilis": { lat: 36.7184, lng: 37.1212 },
  "Osmaniye": { lat: 37.0746, lng: 36.2464 },
  "Düzce": { lat: 40.8438, lng: 31.1565 },
};

let STOPS = []; // Will hold the currently active session POIs

// ============================================================
// Favori Hedef Yönetimi (LocalStorage)
// Artık sadece ID değil, adres ve koordinat içeren objeler saklanıyor
// ============================================================

class FavoriteManager {
  constructor() { this.STORAGE_KEY = 'durak_alarm_destination_favorites_v2'; }

  getAll() {
    const d = localStorage.getItem(this.STORAGE_KEY);
    const parsed = d ? JSON.parse(d) : [];
    // Geriye dönük uyumluluk ve bozuk verileri filtreleme (önceki bug'dan kalan sadece ID olan veriler)
    return parsed.filter(item => item && typeof item === 'object' && item.id);
  }

  add(poiObj) {
    const f = this.getAll();
    if (!f.find(item => item.id === poiObj.id)) {
      f.push(poiObj);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(f));
    }
  }

  remove(poiId) {
    const f = this.getAll().filter(item => item.id !== poiId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(f));
  }

  isFavorite(poiId) {
    return this.getAll().some(item => item.id === poiId);
  }

  getFavoriteStops() {
    return this.getAll();
  }
}

function getStopById(id) {
  // Önce aktif STOPS listesine bak, yoksa favorilerde ara
  const found = STOPS.find(s => s.id === id);
  if (found) return found;

  const fm = new FavoriteManager();
  return fm.getAll().find(s => s.id === id);
}

function getCityList() { return Object.keys(CITIES).sort((a, b) => a.localeCompare(b, 'tr')); }
