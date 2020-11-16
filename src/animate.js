"use strict";

//glCreateProgram
//glCreateShader
//glShaderSource
//glCompileShader
//glAttachShader
//glLinkProgram <- after this line opengl got everything it needs, 
//                 you can free shader resources
//glDetachShader
//glDeleteShader
//for{//render loop
//   glUseProgram
//   //...drawing operations
//   glUseProgram(0);
//}
//glDeleteProgram

/* from mapbox-gl-js - BSD licensed? */
const _now = (function () {
    if (window.performance &&
        window.performance.now) {
        return window.performance.now.bind(window.performance);
    }
    else {
        return Date.now.bind(Date);
    }
}());
export { _now as now };

const frame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

const _frame = function (fn) {
    return frame(fn);
};
export { _frame as frame };

const cancel = window.cancelAnimationFrame ||
    window.mozCancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.msCancelAnimationFrame;

export function cancelFrame(id) {
    cancel(id);
}

//var count = 0


//For example,
//fn is one of the interpolating functions defined in map.js
//dur is the duration in seconds
//ctx is this, which is the Map class itself
export function timed(fn, dur, ctx) {
    if (!dur) {
        fn.call(ctx, 1);
        return null;
    }

    let abort = false;
    const start = _now();
    const durms = dur * 1000 // duration in milliseconds

    //console.log('animate.js durms:', durms)

    //the tick method runs about 60 times per second
    //see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
    function tick(now) {
        if (abort) {
            return;
        }
        now = _now();
        //console.log("animate.js now:", now)

        if (now >= (start + durms)) {
            //count += 1
            //console.log("animate.js count:", count)
            //count = 0
            fn.call(ctx, 1);
        } else {
            //count += 1
            let k = (now - start) / durms
            fn.call(ctx, k);
            _frame(tick);
        }
    }

    _frame(tick);

    return function () { abort = true; };
}

