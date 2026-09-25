// Testprogramm; wird nicht mitkompiliert, wenn die Erweiterung eingebunden ist
input.onButtonPressed(Button.A, function () {
    thermalCamera.autoScale()
})
input.onButtonPressed(Button.B, function () {
    thermalCamera.fixedScale(20, 35)
})
basic.forever(function () {
    thermalCamera.show()
})
