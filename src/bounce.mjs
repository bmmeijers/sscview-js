/** bounce tour */
function startTour(durationInMsec) {

    let i = 0
    let signal = null
    /** feeling lucky with the pdok geocoder? */
    let places = [
        { x: 210240.397, y: 541838.994, scaleDenominator: 24000 },
        { x: 104640.715, y: 488651.103, scaleDenominator: 48000 },
        { x: 133587.182, y: 455921.594, scaleDenominator: 48000 },
        { x: 237386.877, y: 582036.096, scaleDenominator: 48000 },
        { x: 78636.648, y: 438644.186, scaleDenominator: 48000 },
        { x: 122131.371, y: 487394.733, scaleDenominator: 48000 },
        { x: 79982.337, y: 454319.395, scaleDenominator: 48000 },
        { x: 189705.038, y: 445983.039, scaleDenominator: 48000 }
    ]
    function fly() {
        i %= places.length
        whereTo = places[i]
        console.log('jumping ' + whereTo)
        i += 1
        /* hmmm... dom content loaded <> window object ? */
        window.map.flyTo(whereTo.x, whereTo.y, whereTo.scaleDenominator)
        signal = setTimeout(fly, durationInMsec)
    }
    fly()
    
    function abort() {
        clearTimeout(signal)
    }

    return abort
}

startTour(7500)
