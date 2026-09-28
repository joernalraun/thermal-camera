/**
 * Wärmebildkamera: AMG8833 + SSD1306-OLED (128x64) oder SSD1331-Farb-OLED (96x64)
 * am Calliope mini.
 */

enum ThermalPalette {
    //% block="Regenbogen"
    Rainbow = 0,
    //% block="Eisen"
    Iron = 1,
    //% block="Graustufen"
    Gray = 2
}

//% color=#D6336C icon="" block="Wärmebildkamera"
namespace thermalCamera {
    const OLED = 0x3C

    // 4x4-Bayer-Raster → 17 Graustufen
    const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

    let _pat: number[] = null   // _pat[L*4 + (x&3)] = Byte für 8 senkrechte Pixel
    let _page: Buffer = null
    let _ready = false
    let _auto = true
    let _lo = 20
    let _hi = 35
    let _flipX = false
    let _flipY = false

    // Farb-OLED
    let _colorReady = false
    let _palette: number[] = null   // 64 Farben im RGB565-Format, kalt → heiß
    let _paletteKind = ThermalPalette.Rainbow

    const PALETTES = [
        [0x0000FF, 0x00FFFF, 0x00FF00, 0xFFFF00, 0xFF0000],
        [0x000000, 0x20008C, 0xB40096, 0xFF6400, 0xFFDC00, 0xFFFFFF],
        [0x000000, 0xFFFFFF]
    ]

    function buildPalette() {
        const keys = PALETTES[_paletteKind]
        const n = keys.length - 1
        _palette = []
        for (let i = 0; i < 64; i++) {
            const f = i * n / 63
            let k = Math.floor(f)
            if (k >= n) k = n - 1
            const t = f - k
            const a = keys[k]
            const b = keys[k + 1]
            let rgb = 0
            for (let sh = 16; sh >= 0; sh -= 8) {
                const ca = (a >> sh) & 0xFF
                const cb = (b >> sh) & 0xFF
                rgb |= Math.round(ca + (cb - ca) * t) << sh
            }
            _palette.push(ssd1331.to565(rgb))
        }
    }

    // Untere/obere Grenze der Skala für das aktuelle Bild
    function range(tMin: number, tMax: number): number[] {
        if (_auto) return [tMin, Math.max(tMax, tMin + 2)]   // Rauschen nicht aufblasen
        return [_lo, _hi]
    }

    // Temperatur einer Bildzelle unter Berücksichtigung der Spiegelung
    function cell(t: number[], row: number, col: number): number {
        const sy = _flipY ? 7 - row : row
        const sx = _flipX ? 7 - col : col
        return t[sy * 8 + sx]
    }

    function buildPatterns() {
        _pat = []
        for (let L = 0; L <= 16; L++) {
            for (let c = 0; c < 4; c++) {
                let b = 0
                for (let bit = 0; bit < 8; bit++) {
                    if (L > BAYER[bit & 3][c]) b |= 1 << bit
                }
                _pat.push(b)
            }
        }
    }

    // Eine Page (8 Pixel hoch) ab Spalte col am Stück senden
    function sendPage(page: number, col: number, len: number) {
        oledssd1306.cmd(0xB0 + page)
        oledssd1306.cmd(0x00 + (col & 0x0F))
        oledssd1306.cmd(0x10 + (col >> 4))
        pins.i2cWriteBuffer(OLED, _page.slice(0, len + 1))
    }

    function fmt(v: number): string {
        let s = (Math.round(v * 10) / 10) + "°C"
        while (s.length < 6) s += " "   // alte Ziffern überschreiben
        return s
    }

    function setup() {
        if (_ready) return
        _ready = true
        buildPatterns()
        _page = pins.createBuffer(65)
        _page[0] = 0x40
        oledssd1306.initDisplay()
        oledssd1306.setTextXY(0, 9)
        oledssd1306.writeString("max")
        oledssd1306.setTextXY(4, 9)
        oledssd1306.writeString("min")
        // Skala rechts (x = 120..127), oben heiß
        for (let p = 0; p < 8; p++) {
            const L = Math.round((7 - p) * 16 / 7)
            for (let i = 0; i < 8; i++) _page[1 + i] = _pat[L * 4 + ((120 + i) & 3)]
            sendPage(p, 120, 8)
        }
    }

    /**
     * Liest ein Wärmebild und zeigt es mit Min/Max-Temperatur auf dem OLED.
     * Am besten in "dauerhaft" verwenden.
     */
    //% blockId=thermal_show block="zeige Wärmebild auf OLED"
    //% weight=100
    export function show(): void {
        setup()
        amg8833.readFrame()
        const t = amg8833.pixels()
        const tMin = amg8833.minTemp()
        const tMax = amg8833.maxTemp()

        const r = range(tMin, tMax)
        const lo = r[0]
        const hi = r[1]

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let L = Math.round((cell(t, row, col) - lo) * 16 / (hi - lo))
                if (L < 0) L = 0
                if (L > 16) L = 16
                for (let dx = 0; dx < 8; dx++) {
                    const x = col * 8 + dx
                    _page[1 + x] = _pat[L * 4 + (x & 3)]
                }
            }
            sendPage(row, 0, 64)
        }

        oledssd1306.setTextXY(1, 9)
        oledssd1306.writeString(fmt(tMax))
        oledssd1306.setTextXY(5, 9)
        oledssd1306.writeString(fmt(tMin))
    }

    // Temperatur mit höchstens 4 Zeichen, z. B. "34.5" oder "-3.2"
    function fmt4(v: number): string {
        const r = Math.round(v * 10)
        const a = Math.abs(r)
        let s = (r < 0 ? "-" : "") + Math.idiv(a, 10) + "." + (a % 10)
        if (s.length > 4) s = "" + Math.round(v)
        while (s.length < 4) s += " "   // alte Ziffern überschreiben
        return s
    }

    function drawColorBar() {
        // Skala rechts (x = 89..95), oben heiß
        const buf = pins.createBuffer(7 * 64 * 2)
        for (let y = 0; y < 64; y++) {
            const c = _palette[63 - y]
            for (let x = 0; x < 7; x++) {
                const i = (y * 7 + x) * 2
                buf[i] = c >> 8
                buf[i + 1] = c & 0xFF
            }
        }
        ssd1331.writeWindow(89, 0, 7, 64, buf)
    }

    function setupColor() {
        if (_colorReady) return
        _colorReady = true
        ssd1331.ensureInit()
        if (!_palette) buildPalette()
        ssd1331.clear(0x000000)
        ssd1331.writeString("max", 64, 2, 0x999999, 0x000000)
        ssd1331.writeString("min", 64, 36, 0x999999, 0x000000)
        drawColorBar()
    }

    /**
     * Liest ein Wärmebild und zeigt es in Farbe mit Min/Max-Temperatur
     * auf dem SSD1331-Farb-OLED (96x64). Am besten in "dauerhaft" verwenden.
     */
    //% blockId=thermal_show_color block="zeige Wärmebild auf Farb-OLED"
    //% weight=99
    export function showColor(): void {
        setupColor()
        amg8833.readFrame()
        const t = amg8833.pixels()
        const tMin = amg8833.minTemp()
        const tMax = amg8833.maxTemp()
        const r = range(tMin, tMax)
        const lo = r[0]
        const hi = r[1]

        // Eine Sensorzeile = 64x8 Pixel: erste Zeile berechnen, 8x kopieren
        const line = pins.createBuffer(64 * 2)
        const band = pins.createBuffer(64 * 8 * 2)
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let i = Math.round((cell(t, row, col) - lo) * 63 / (hi - lo))
                if (i < 0) i = 0
                if (i > 63) i = 63
                const c = _palette[i]
                for (let dx = 0; dx < 8; dx++) {
                    const p = (col * 8 + dx) * 2
                    line[p] = c >> 8
                    line[p + 1] = c & 0xFF
                }
            }
            for (let y = 0; y < 8; y++) band.write(y * 128, line)
            ssd1331.writeWindow(0, row * 8, 64, 8, band)
        }

        ssd1331.writeString(fmt4(tMax), 64, 12, 0xFFFFFF, 0x000000)
        ssd1331.writeString(fmt4(tMin), 64, 46, 0xFFFFFF, 0x000000)
    }

    /**
     * Wählt die Farbskala für das Farb-OLED.
     */
    //% blockId=thermal_palette block="Farbskala %palette"
    //% weight=85
    export function setPalette(palette: ThermalPalette): void {
        _paletteKind = palette
        buildPalette()
        if (_colorReady) drawColorBar()
    }

    /**
     * Kälteste Stelle wird schwarz (bzw. kältester Farbwert), wärmste weiß (bzw. heißester Farbwert).
     */
    //% blockId=thermal_auto block="Skala automatisch"
    //% weight=90
    export function autoScale(): void {
        _auto = true
    }

    /**
     * Feste Temperaturgrenzen für die Skala.
     */
    //% blockId=thermal_fixed block="Skala fest von %min|°C bis %max|°C"
    //% min.defl=20 max.defl=35
    //% weight=89
    export function fixedScale(min: number, max: number): void {
        if (max < min) { const h = min; min = max; max = h }
        if (max - min < 1) max = min + 1
        _lo = min
        _hi = max
        _auto = false
    }

    /**
     * Spiegelt das Wärmebild, falls der Sensor anders herum eingebaut ist.
     */
    //% blockId=thermal_mirror block="spiegle Bild waagerecht %x|senkrecht %y"
    //% weight=80
    export function mirror(x: boolean, y: boolean): void {
        _flipX = x
        _flipY = y
    }
}
