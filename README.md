# thermal-camera

Wärmebildkamera für den **Calliope mini** mit dem 8×8-Wärmebildsensor **AMG8833** und
* einem **0,96″-OLED (SSD1306, 128×64, I²C, schwarz-weiß)** oder
* einem **0,95″-Farb-OLED (SSD1331, 96×64, SPI)**.

Der OLED-Treiber [pxt-OLED-SSD1306](https://github.com/MKleinSB/pxt-OLED-SSD1306) von Michael Klein ist enthalten und muss nicht zusätzlich geladen werden.

## Anschluss

Beide Module an den I²C-Grove-Anschluss **A0** (z. B. über einen Grove-Hub).

| Modul    | I²C-Adresse        |
|----------|--------------------|
| AMG8833  | `0x69` (oder `0x68`) |
| SSD1306  | `0x3C`             |

### Farb-OLED SSD1331

Die Pins SCL/SDA am Display sind **SPI**, nicht I²C.

| Display | Calliope mini |
|---------|---------------|
| GND     | GND           |
| VCC     | 3V            |
| SCL     | C13 (SCK)     |
| SDA     | C15 (MOSI)    |
| RES     | P3            |
| DC      | C8            |
| CS      | C9            |

C14 frei lassen (wird als MISO vom SPI belegt). Andere Pins lassen sich mit `initialisiere Farb-OLED` und `Farb-OLED SPI-Pins` einstellen.

## Anzeige

### Farb-OLED

Links das Wärmebild (64×64 Pixel) in Farbe, daneben höchste und niedrigste Temperatur, ganz rechts die Farbskala. Farbskalen: Regenbogen (blau → rot, Standard), Eisen (schwarz → lila → gelb → weiß), Graustufen.

### Schwarz-Weiß-OLED

Links das Wärmebild (64×64 Pixel, 8×8 Blöcke, 17 Graustufen als Punktraster), rechts daneben höchste und niedrigste Temperatur und ganz rechts eine Skala (oben heiß, unten kalt).

## Beispiel

Farb-OLED:

```blocks
basic.forever(function () {
    thermalCamera.showColor()
})
```

Schwarz-Weiß-OLED:

```blocks
basic.forever(function () {
    thermalCamera.show()
})
```

## Blöcke

### Wärmebildkamera
* `zeige Wärmebild auf Farb-OLED` – liest ein Bild und zeigt es auf dem SSD1331 an
* `zeige Wärmebild auf OLED` – liest ein Bild und zeigt es auf dem SSD1306 an
* `Farbskala Regenbogen / Eisen / Graustufen` – nur Farb-OLED
* `Skala automatisch` – kälteste Stelle schwarz, wärmste weiß (Standard)
* `Skala fest von … °C bis … °C` – feste Grenzen
* `spiegle Bild waagerecht … senkrecht …` – falls der Sensor anders eingebaut ist

### AMG8833
* `lese Wärmebild`
* `Temperatur bei x … y …`
* `höchste / niedrigste / mittlere Temperatur`
* Erweitert: `setze AMG8833-Adresse`, `Sensortemperatur`, `alle Temperaturen`

### Farb-OLED (SSD1331)
* `initialisiere Farb-OLED CS … DC … RES …` – optional, Standard C9 / C8 / P3
* `lösche Farb-OLED mit Farbe …`
* `Farb-OLED Rechteck x … y … Breite … Höhe … Farbe …`
* `Farb-OLED Pixel x … y … Farbe …`
* `Farb-OLED schreibe … x … y … Farbe … Hintergrund …` – 6×8-Schrift mit Umlauten
* `Farb-OLED schreibe Zahl …`
* Erweitert: `Farb-OLED SPI-Pins`, `Farb-OLED ausschalten / anschalten`

### SSD1306 OLED
Alle Blöcke der Original-Erweiterung (Text, Cursor, Invertieren, Drehen …).

## Änderungen am OLED-Treiber

* Zeichen werden in einer I²C-Übertragung gesendet (schnellerer Text)
* interne Konstanten liegen im Namespace `oledssd1306`
* `drehe Display` schaltet jetzt zwischen gedreht und normal um
* neue Funktion `oledssd1306.glyph()`, damit das Farb-OLED dieselbe Schrift nutzt

## Lizenz

MIT, siehe [LICENSE](LICENSE).

## Supported targets

* for PXT/calliope
