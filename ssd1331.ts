/**
 * Treiber für das Farb-OLED SSD1331 (0,95", 96x64, SPI).
 *
 * Verkabelung (Standard):
 *   SCL → C13 (SCK), SDA → C15 (MOSI), RES → P3, DC → C8, CS → C9
 *   C14 bleibt frei (MISO, vom SPI belegt)
 */

//% color=#1971C2 icon="" block="Farb-OLED"
namespace ssd1331 {
    export const WIDTH = 96
    export const HEIGHT = 64

    let _cs = DigitalPin.C9
    let _dc = DigitalPin.C8
    let _res = DigitalPin.P3
    let _mosi = DigitalPin.C15
    let _miso = DigitalPin.C14
    let _sck = DigitalPin.C13
    let _ready = false

    const INIT = [
        0xAE,        // Display aus
        0xA0, 0x72,  // Remap: 65k Farben, RGB
        0xA1, 0x00,  // Startzeile
        0xA2, 0x00,  // Offset
        0xA4,        // normale Anzeige
        0xA8, 0x3F,  // Multiplex 1/64
        0xAD, 0x8E,  // Master-Konfiguration
        0xB0, 0x0B,  // Stromsparen aus
        0xB1, 0x31,  // Phasenlänge
        0xB3, 0xF0,  // Taktteiler
        0x8A, 0x64,  // Precharge A
        0x8B, 0x78,  // Precharge B
        0x8C, 0x64,  // Precharge C
        0xBB, 0x3A,  // Precharge-Spannung
        0xBE, 0x3E,  // VCOMH
        0x87, 0x06,  // Master-Strom
        0x81, 0x91,  // Kontrast A (blau)
        0x82, 0x50,  // Kontrast B (grün)
        0x83, 0x7D,  // Kontrast C (rot)
        0xAF         // Display an
    ]

    /**
     * Stellt die SPI-Pins ein. Nur nötig, wenn nicht C15/C14/C13 verwendet werden.
     * Muss vor "initialisiere Farb-OLED" stehen.
     */
    //% blockId=ssd1331_spi_pins block="Farb-OLED SPI-Pins MOSI (SDA) %mosi|MISO %miso|SCK (SCL) %sck"
    //% mosi.defl=DigitalPin.C15 miso.defl=DigitalPin.C14 sck.defl=DigitalPin.C13
    //% advanced=true
    export function setSpiPins(mosi: DigitalPin, miso: DigitalPin, sck: DigitalPin): void {
        _mosi = mosi
        _miso = miso
        _sck = sck
        _ready = false
    }

    /**
     * Initialisiert das Farb-OLED und löscht es.
     */
    //% blockId=ssd1331_init block="initialisiere Farb-OLED CS %cs|DC %dc|RES %res"
    //% cs.defl=DigitalPin.C9 dc.defl=DigitalPin.C8 res.defl=DigitalPin.P3
    //% weight=100
    export function init(cs: DigitalPin, dc: DigitalPin, res: DigitalPin): void {
        _cs = cs
        _dc = dc
        _res = res
        pins.spiPins(_mosi, _miso, _sck)
        pins.spiFormat(8, 0)
        pins.spiFrequency(4000000)
        pins.digitalWritePin(_cs, 1)
        pins.digitalWritePin(_res, 1)
        basic.pause(5)
        pins.digitalWritePin(_res, 0)
        basic.pause(10)
        pins.digitalWritePin(_res, 1)
        basic.pause(10)
        for (const c of INIT) command([c])
        _ready = true
        clear(0)
    }

    /**
     * Initialisiert mit den Standard-Pins, falls noch nicht geschehen.
     */
    export function ensureInit(): void {
        if (!_ready) init(_cs, _dc, _res)
    }

    /**
     * Sendet Befehlsbytes (beim SSD1331 auch die Parameter).
     */
    export function command(bytes: number[]): void {
        const buf = pins.createBuffer(bytes.length)
        for (let i = 0; i < bytes.length; i++) buf[i] = bytes[i]
        pins.digitalWritePin(_dc, 0)
        pins.digitalWritePin(_cs, 0)
        pins.spiTransfer(buf, null)
        pins.digitalWritePin(_cs, 1)
    }

    /**
     * Setzt das Schreibfenster und sendet Pixeldaten (RGB565, 2 Bytes pro Pixel, zeilenweise).
     */
    export function writeWindow(x: number, y: number, w: number, h: number, data: Buffer): void {
        ensureInit()
        command([0x15, x, x + w - 1, 0x75, y, y + h - 1])
        pins.digitalWritePin(_dc, 1)
        pins.digitalWritePin(_cs, 0)
        pins.spiTransfer(data, null)
        pins.digitalWritePin(_cs, 1)
    }

    /**
     * Wandelt eine Farbe 0xRRGGBB in das 16-Bit-Format des Displays.
     */
    export function to565(color: number): number {
        const r = (color >> 16) & 0xFF
        const g = (color >> 8) & 0xFF
        const b = color & 0xFF
        return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
    }

    /**
     * Füllt ein Rechteck mit einer Farbe.
     */
    //% blockId=ssd1331_fill_rect block="Farb-OLED Rechteck x %x|y %y|Breite %w|Höhe %h|Farbe %color"
    //% color.shadow=colorNumberPicker
    //% x.min=0 x.max=95 y.min=0 y.max=63 w.defl=10 h.defl=10
    //% weight=80
    export function fillRect(x: number, y: number, w: number, h: number, color: number): void {
        if (x < 0) { w += x; x = 0 }
        if (y < 0) { h += y; y = 0 }
        if (x + w > WIDTH) w = WIDTH - x
        if (y + h > HEIGHT) h = HEIGHT - y
        if (w <= 0 || h <= 0) return
        const c = to565(color)
        // zeilenweise senden, damit der Puffer klein bleibt
        const rows = Math.max(1, Math.min(h, Math.idiv(512, w)))
        const buf = pins.createBuffer(w * rows * 2)
        for (let i = 0; i < w * rows; i++) {
            buf[2 * i] = c >> 8
            buf[2 * i + 1] = c & 0xFF
        }
        let yy = y
        while (yy < y + h) {
            const n = Math.min(rows, y + h - yy)
            writeWindow(x, yy, w, n, n == rows ? buf : buf.slice(0, w * n * 2))
            yy += n
        }
    }

    /**
     * Löscht das Display mit einer Farbe.
     */
    //% blockId=ssd1331_clear block="lösche Farb-OLED mit Farbe %color"
    //% color.shadow=colorNumberPicker
    //% weight=90
    export function clear(color: number): void {
        fillRect(0, 0, WIDTH, HEIGHT, color)
    }

    /**
     * Setzt einen einzelnen Pixel.
     */
    //% blockId=ssd1331_pixel block="Farb-OLED Pixel x %x|y %y|Farbe %color"
    //% color.shadow=colorNumberPicker
    //% x.min=0 x.max=95 y.min=0 y.max=63
    //% weight=70
    export function setPixel(x: number, y: number, color: number): void {
        if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return
        const c = to565(color)
        const buf = pins.createBuffer(2)
        buf[0] = c >> 8
        buf[1] = c & 0xFF
        writeWindow(x, y, 1, 1, buf)
    }

    /**
     * Schreibt Text (6x8 Pixel pro Zeichen, mit Umlauten) an Position x/y.
     */
    //% blockId=ssd1331_text block="Farb-OLED schreibe %text|x %x|y %y|Farbe %color|Hintergrund %bg"
    //% color.shadow=colorNumberPicker color.defl=0xffffff
    //% bg.shadow=colorNumberPicker bg.defl=0x000000
    //% x.min=0 x.max=95 y.min=0 y.max=63
    //% inlineInputMode=inline
    //% weight=60
    export function writeString(text: string, x: number, y: number, color: number, bg: number): void {
        const fg = to565(color)
        const bk = to565(bg)
        const buf = pins.createBuffer(6 * 8 * 2)
        for (const ch of text) {
            if (x + 6 > WIDTH || y + 8 > HEIGHT) return
            const g = oledssd1306.glyph(ch)
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 6; col++) {
                    const on = (g.charCodeAt(col + 1) >> row) & 1
                    const c = on ? fg : bk
                    const i = (row * 6 + col) * 2
                    buf[i] = c >> 8
                    buf[i + 1] = c & 0xFF
                }
            }
            writeWindow(x, y, 6, 8, buf)
            x += 6
        }
    }

    /**
     * Schreibt eine Zahl an Position x/y.
     */
    //% blockId=ssd1331_number block="Farb-OLED schreibe Zahl %n|x %x|y %y|Farbe %color|Hintergrund %bg"
    //% color.shadow=colorNumberPicker color.defl=0xffffff
    //% bg.shadow=colorNumberPicker bg.defl=0x000000
    //% inlineInputMode=inline
    //% weight=59
    export function writeNumber(n: number, x: number, y: number, color: number, bg: number): void {
        writeString("" + n, x, y, color, bg)
    }

    /**
     * Schaltet das Display aus.
     */
    //% blockId=ssd1331_off block="Farb-OLED ausschalten"
    //% advanced=true
    export function turnOff(): void {
        ensureInit()
        command([0xAE])
    }

    /**
     * Schaltet das Display an.
     */
    //% blockId=ssd1331_on block="Farb-OLED anschalten"
    //% advanced=true
    export function turnOn(): void {
        ensureInit()
        command([0xAF])
    }
}
