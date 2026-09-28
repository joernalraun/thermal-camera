// Testprogramm; wird nicht mitkompiliert, wenn die Erweiterung eingebunden ist
// Farb-OLED SSD1331: SCL→C13, SDA→C15, RES→P3, DC→C8, CS→C9; AMG8833 an Grove A0
let palette = 0
input.onButtonPressed(Button.A, function () {
    palette = (palette + 1) % 3
    thermalCamera.setPalette(palette)
})
input.onButtonPressed(Button.B, function () {
    thermalCamera.fixedScale(20, 35)
})
input.onButtonPressed(Button.AB, function () {
    thermalCamera.autoScale()
})
basic.forever(function () {
    thermalCamera.showColor()
})
