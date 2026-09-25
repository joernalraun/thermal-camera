/**
 * Wärmebildkamera: AMG8833 + SSD1306-OLED (128x64) am Calliope mini.
 */

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

        let lo = _lo
        let hi = _hi
        if (_auto) {
            lo = tMin
            hi = Math.max(tMax, tMin + 2)   // Rauschen nicht aufblasen
        }

        for (let row = 0; row < 8; row++) {
            const sy = _flipY ? 7 - row : row
            for (let col = 0; col < 8; col++) {
                const sx = _flipX ? 7 - col : col
                let L = Math.round((t[sy * 8 + sx] - lo) * 16 / (hi - lo))
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

    /**
     * Kälteste Stelle wird schwarz, wärmste weiß.
     */
    //% blockId=thermal_auto block="Skala automatisch"
    //% weight=90
    export function autoScale(): void {
        _auto = true
    }

    /**
     * Feste Temperaturgrenzen für Schwarz und Weiß.
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
