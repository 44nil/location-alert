# Location Alert (KonumAlarm)

Location Alert is a smart, GPS-based web application prototype designed to notify you as you approach your destination (a bus/train stop or any custom location) during your journey. 

## 📍 Features

* **Live Location Tracking:** View your distance to the target in real-time on the map and track your progress via a dynamic progress bar.
* **Smart Alert System:** Receive both audio and visual notifications when you reach your preset distance threshold (e.g., 200m - 800m).
* **Broad Search Scope (Nominatim):** You are not limited to predefined stops. Search for any place in Turkey or the world (e.g., "Kızılay", "Hacettepe University") and set it as your destination.
* **Quick Map Selection:** Tap anywhere on the map to instantly set that coordinate as your destination and start an alarm.
* **Advanced Settings:** 
  * "Headphone Only" mode to ensure alarms don't disrupt others.
  * Silent or vibration-only alerts.
  * Multiple alert sound options (Melody, Beep, Chime).
* **Night Mode Optimization:** Features a premium "Navy and White" UI palette designed to reduce eye strain during night travel.
* **Favorites List:** Bookmark your frequently visited locations or stops to set an alarm with a single click.

## 🛠️ Technologies Used

* **HTML5, CSS3, Vanilla JavaScript (ES6+)** - Built for pure performance without heavy framework dependencies.
* **Leaflet.js:** Handles map rendering out-of-the-box with interactive markers.
* **OpenStreetMap (Nominatim API):** Powers location search and Reverse Geocoding queries.
* **Geolocation API:** Utilizes the browser's native location services and the Haversine formula for distance calculation.

## 🚀 Quick Start

The project runs entirely on the client-side and does not require any build tools (Node.js, Webpack, etc.) or a backend server.

1. Clone or download the repository to your local machine:
   ```bash
   git clone https://github.com/44nil/location-alert.git
   ```
2. Open the `index.html` file in any modern web browser.
3. Allow the "Location Permission" prompt requested by the browser.
4. Select a location on the map, search for an address, or simply hit the `Demo Başlat` (Start Demo) button to simulate how the app works!

## 📱 Mobile & Background Usage
The application is fully responsive and provides a native mobile app feel (featuring UI elements like a Bottom Sheet). 

*(Future Roadmap: Converting the project to a PWA (Progressive Web App) or bundling it with tools like Capacitor/Cordova to allow for true background location tracking.)*
