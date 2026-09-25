/**
 * Treiber für den 8x8-Wärmebildsensor Panasonic AMG8833 (I2C).
 */

enum AmgAddress {
    //% block="0x69"
    A69 = 0x69,
    //% block="0x68"
    A68 = 0x68
}

//% color=#E8590C icon="" block="AMG8833"
namespace amg8833 {
    let _addr = 0x69
    let _pixels: number[] = []

    /**
     * Stellt die I2C-Adresse des Sensors ein (Standard 0x69).
     */
    //% blockId=amg8833_set_address block="setze AMG8833-Adresse auf %addr"
    //% advanced=true
    export function setAddress(addr: AmgAddress): void {
        _addr = addr
    }

    /**
     * Liest ein neues Wärmebild (8x8 Temperaturen) vom Sensor.
     */
    //% blockId=amg8833_read block="lese Wärmebild"
    //% weight=100
    export function readFrame(): void {
        pins.i2cWriteNumber(_addr, 0x80, NumberFormat.UInt8BE, true)
        const buf = pins.i2cReadBuffer(_addr, 128)
        const t: number[] = []
        for (let i = 0; i < 64; i++) {
            let raw = buf[2 * i] | (buf[2 * i + 1] << 8)
            if (raw & 0x800) raw -= 0x1000   // 12 Bit mit Vorzeichen
            t.push(raw * 0.25)
        }
        _pixels = t
    }

    function ensureFrame() {
        if (_pixels.length == 0) readFrame()
    }

    /**
     * Temperatur eines Pixels aus dem zuletzt gelesenen Bild in °C.
     */
    //% blockId=amg8833_pixel block="Temperatur bei x %x|y %y"
    //% x.min=0 x.max=7 y.min=0 y.max=7
    //% weight=90
    export function pixel(x: number, y: number): number {
        ensureFrame()
        x = Math.max(0, Math.min(7, x | 0))
        y = Math.max(0, Math.min(7, y | 0))
        return _pixels[y * 8 + x]
    }

    /**
     * Höchste Temperatur im zuletzt gelesenen Bild in °C.
     */
    //% blockId=amg8833_max block="höchste Temperatur"
    //% weight=80
    export function maxTemp(): number {
        ensureFrame()
        let m = _pixels[0]
        for (const v of _pixels) if (v > m) m = v
        return m
    }

    /**
     * Niedrigste Temperatur im zuletzt gelesenen Bild in °C.
     */
    //% blockId=amg8833_min block="niedrigste Temperatur"
    //% weight=79
    export function minTemp(): number {
        ensureFrame()
        let m = _pixels[0]
        for (const v of _pixels) if (v < m) m = v
        return m
    }

    /**
     * Mittlere Temperatur im zuletzt gelesenen Bild in °C.
     */
    //% blockId=amg8833_avg block="mittlere Temperatur"
    //% weight=78
    export function avgTemp(): number {
        ensureFrame()
        let s = 0
        for (const v of _pixels) s += v
        return s / 64
    }

    /**
     * Temperatur des Sensorgehäuses (Thermistor) in °C.
     */
    //% blockId=amg8833_thermistor block="Sensortemperatur"
    //% advanced=true
    export function thermistor(): number {
        pins.i2cWriteNumber(_addr, 0x0E, NumberFormat.UInt8BE, true)
        const raw = pins.i2cReadNumber(_addr, NumberFormat.UInt16LE)
        let v = raw & 0x7FF
        if (raw & 0x800) v = -v          // Vorzeichen + Betrag
        return v * 0.0625
    }

    /**
     * Alle 64 Temperaturen des zuletzt gelesenen Bildes (zeilenweise).
     */
    //% blockId=amg8833_pixels block="alle Temperaturen"
    //% advanced=true
    export function pixels(): number[] {
        ensureFrame()
        return _pixels.slice(0)
    }
}
