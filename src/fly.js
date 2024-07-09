import { now } from './animate'

// from Leaflet, BSD-license copyright

/** hyperbolic sine function */
function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }

/** hyperbolic cosine function */
function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }

/** hyperbolic tangent function */
function tanh(n) { return sinh(n) / cosh(n); }

/** distance between two points */
function distance(from, to) {
    let dx = to[0] - from[0],
        dy = to[1] - from[1]
    return Math.sqrt(dx*dx + dy*dy)
}

/** subtract vector b from vector a */
function sub(a, b) {
    var result = [];
    for (let i = 0; i < a.length; i += 1) {
        result.push(a[i] - b[i]);
    }
    return result;
}

/** add vector a to vector b */
function add(a, b) {
    var result = [];
    for (let i = 0; i < a.length; i += 1) {
        result.push(a[i] + b[i]);
    }
    return result;
}

/** multiply vector a with scalar b */
function mul(a, b) {
    let result = [];
    for (let j = 0; j < a.length; j += 1) {
        result.push(a[j] * b);
    }
    return result;
}

/** Returns dot product of v1 and v2 */
function dot(v1, v2) {
    let dot_value = 0;
    for (let i = 0; i < v1.length; i++) {
        dot_value += v1[i] * v2[i];
    }
    return dot_value;
}

/** Returns the norm of v, *squared*. */
function norm2(v) {

    return dot(v, v);
}

/** L2 norm ~= euclidean length */
function norm(a) {
    return Math.sqrt(norm2(a));
}


/** flyTo interpolation, produces a function
that can interpolate for a fly to path, given the setup of
start - end position and scale and total duration */
export function doFlyTo(startCenter, startDenominator, size, targetCenter, targetDenominator, durationSecs) {

    console.log(startCenter)
    console.log(startDenominator)

    console.log(size)

    console.log(targetCenter)
    console.log(targetDenominator)

    console.log(durationSecs)

    let travelVector = sub(targetCenter, startCenter)
    console.log(`travel vec := ${travelVector} `)
    
    let travelDist = norm(travelVector)
    console.log (travelDist)
    // bail out -- no animation, just jump
    //    let options = options || {};
    //    if (options.animate === false || !Browser.any3d) {
    //        return this.setView(targetCenter, targetDenominator, options);
    //    }

    
    // this._stop();

    // get current center in pixel size
//    let from = [] this.project(this.getCenter()),
//        to = this.project(targetCenter),
//        size = {x: ___, y: ___},
//        startDenominator = this._zoom;

//    targetCenter = toLatLng(targetCenter);
//    targetDenominator = targetDenominator === undefined ? startDenominator : targetDenominator;

    let w0 = Math.max(size[0], size[1]),
        w1 = w0 * targetDenominator / startDenominator, // this.getZoomScale(startDenominator, targetDenominator),
        u1 = (distance(startCenter, targetCenter)) || 1,
        rho = Math.sqrt(2), // Parameter that we can use to influence the steepness of the arc
        rho2 = rho * rho;

//    console.log(`w0 ${w0}`)
//    console.log(`w1 ${w1}`)
//    console.log(`u1 ${u1}`)
//    console.log(`rho  ${rho}`)
//    console.log(`rho2 ${rho2}`)

    function r(i) {
        let s1 = i ? -1 : 1,
            s2 = i ? w1 : w0,
            t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1,
            b1 = 2.0 * s2 * rho2 * u1,
            b = t1 / b1,
            sq = Math.sqrt(b * b + 1) - b;
        // workaround for floating point precision bug when sq = 0, log = -Infinite,
        // thus triggering an infinite loop in flyTo
        let log = sq < 0.000000001 ? -18 : Math.log(sq);
        return log;
    }

    let r0 = r(0)
//    console.log(r0)

    function w(s) { return w0 * (cosh(r0) / cosh(r0 + rho * s)); }
    function u(s) { return w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2; }
    function easeOut(t) { return 1 - Math.pow(1 - t, 1.5); }

//    var start = Date.now(),
    let S = (r(1) - r0) / rho
    
//    console.log(S)
    
    let start = now()
    let factor = 1.0
    if (travelDist > 50000) {
        factor = 1.5
    }

    let duration = durationSecs * factor * 1000
    


        // duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;

    function interpolate(k)
    {
        let t = (now() - start) / duration, 
            s = easeOut(t) * S
//            s = t * S

//        console.log(u(s))
//        console.log(u1)
//        console.log( w0 / w(s) )
//        console.log( w(s) / w0 * startDenominator)
//        console.log("")

        if (t < 1) {
//            console.log(`under way ${t} -> ${s}`)
            let center = add(startCenter, mul(sub(targetCenter, startCenter), u(s) / u1))
//            console.log(`t: ${t}`)
//            let center = add(startCenter, mul(travelVector, t))
            let scale = w(s) / w0 * startDenominator
//            console.log(center)
//            console.log(scale)
            return [center, scale]
        } else {
//            console.log('destination reached')
//            console.log(targetCenter)
//            console.log(targetDenominator)
            return [targetCenter, targetDenominator]
        }

    }
    return [interpolate, duration / 1000.0]
}

//function test() {

//    let interpolator = doflyTo([76700.00, 438026], 48000, [730, 840], [74103.76, 445666.61], 48000.0, 3)

//    // animate
//    for (let time = 145000; time <= 145000+(6*1000); time += 500)
//    {
//        interpolator(time)
//    }
//}

//test()
