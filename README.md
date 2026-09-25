# thermal-camera

Wärmebildkamera für den **Calliope mini** mit dem 8×8-Wärmebildsensor **AMG8833** und einem **0,96″-OLED (SSD1306, 128×64, I²C)**.

Der OLED-Treiber [pxt-OLED-SSD1306](https://github.com/MKleinSB/pxt-OLED-SSD1306) von Michael Klein ist enthalten und muss nicht zusätzlich geladen werden.

## Anschluss

Beide Module an den I²C-Grove-Anschluss **A0** (z. B. über einen Grove-Hub).

| Modul    | I²C-Adresse        |
|----------|--------------------|
| AMG8833  | `0x69` (oder `0x68`) |
| SSD1306  | `0x3C`             |

## Anzeige

Links das Wärmebild (64×64 Pixel, 8×8 Blöcke, 17 Graustufen als Punktraster), rechts daneben höchste und niedrigste Temperatur und ganz rechts eine Skala (oben heiß, unten kalt).

## Beispiel

```blocks
basic.forever(function () {
    thermalCamera.show()
})
```

## Blöcke

### Wärmebildkamera
* `zeige Wärmebild auf OLED` – liest ein Bild und zeigt es an
* `Skala automatisch` – kälteste Stelle schwarz, wärmste weiß (Standard)
* `Skala fest von … °C bis … °C` – feste Grenzen
* `spiegle Bild waagerecht … senkrecht …` – falls der Sensor anders eingebaut ist

### AMG8833
* `lese Wärmebild`
* `Temperatur bei x … y …`
* `höchste / niedrigste / mittlere Temperatur`
* Erweitert: `setze AMG8833-Adresse`, `Sensortemperatur`, `alle Temperaturen`

### SSD1306 OLED
Alle Blöcke der Original-Erweiterung (Text, Cursor, Invertieren, Drehen …).

## Änderungen am OLED-Treiber

* Zeichen werden in einer I²C-Übertragung gesendet (schnellerer Text)
* interne Konstanten liegen im Namespace `oledssd1306`
* `drehe Display` schaltet jetzt zwischen gedreht und normal um

## Lizenz

MIT, siehe [LICENSE](LICENSE).

## Supported targets

* for PXT/calliope
