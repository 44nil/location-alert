# KonumAlarm (Location Alert)

KonumAlarm, otobüs veya tren yolculuklarınızda hedefinize (durağınıza veya herhangi bir noktaya) yaklaştığınızda sizi uyaran, konum tabanlı (GPS) akıllı bir web uygulaması prototipidir. 

## 📍 Özellikler

* **Canlı Konum Takibi:** Hedefinize olan mesafenizi anlık olarak harita üzerinde görün ve ilerleme çubuğuyla takip edin.
* **Akıllı Uyarı Sistemi:** Ayarladığınız mesafeye (örn. 200m - 800m arası) geldiğinizde sesli ve görsel bildirim alın.
* **Geniş Arama Kapsamı (Nominatim):** Sadece hazır durakları değil, arama çubuğunu kullanarak Türkiye'nin veya dünyanın herhangi bir yerini arayıp hedef olarak belirleyebilirsiniz (Örn: "Kızılay", "Hacettepe Üniversitesi").
* **Haritadan Hızlı Seçim:** Harita üzerinde herhangi bir noktaya tıklayıp anında orası için alarm başlatabilirsiniz.
* **Gelişmiş Ayarlar:** 
  * Alarmın sadece kulaklık takılıyken çalması (Headphone Only modu).
  * Sessiz veya titreşimli uyarılar.
  * Farklı alarm sesi seçenekleri (Melodi, Bip, Çan).
* **Gece Modu Uyumlu Tasarım:** Gece yolculuklarında göz yormayan, premium "Navy and White" arayüz paleti.
* **Favoriler listesi:** Sık gittiğiniz durakları veya özel konumları yıldızlayıp tek tıkla alarm kurun.

## 🛠️ Kullanılan Teknolojiler

* **HTML5, CSS3, Vanilla JavaScript (ES6+)** - Herhangi bir framework'e bağımlı olmadan saf ve hızlı geliştirme.
* **Leaflet.js:** Harita render işlemleri ve interaktif işaretçiler.
* **OpenStreetMap (Nominatim API):** Yer arama ve Ters Geocoding (koordinatı adrese çevirme) işlemleri.
* **Geolocation API:** Tarayıcı üzerinden anlık konum takibi ve Haversine formülü ile mesafe hesaplama.

## 🚀 Hızlı Başlangıç

Proje tamamen istemci tarafında (client-side) çalışır, herhangi bir derleme aracına (Node.js, Webpack vs.) veya sunucuya ihtiyaç duymaz.

1. Repoyu bilgisayarınıza indirin veya klonlayın:
   ```bash
   git clone https://github.com/44nil/location-alert.git
   ```
2. Klasörün içindeki `index.html` dosyasını modern çevrimiçi bir tarayıcıda (Chrome, Safari vs.) açın.
3. Tarayıcının isteyeceği **"Konum İzri"**ne onay verin.
4. Haritadan bir yer seçin, arama yapın veya `Demo Başlat` butonu ile uygulamanın nasıl çalıştığını simüle edin!

## 📱 Mobil ve Arka Plan Kullanımı
Proje duyarlı (responsive) olarak tasarlanmıştır ve telefonda bir mobil uygulama hissiyatı verir (Bottom Sheet vb. yapılar içerir). 

*(Gelecek Geliştirmeler: PWA (Progressive Web App) haline getirilip veya Capacitor/Cordova gibi araçlarla paketlenerek arka planda gerçek (Native) konum takibi yapabilmesi hedeflenmektedir.)*
