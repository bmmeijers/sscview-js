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

export function timed(fn, dur, ctx) {
    if (!dur) {
        fn.call(ctx, 1);
        return null;
    }

    let abort = false;
    const start = _now();

    function tick(now) {
        if (abort) {
            return;
        }
        now = _now();

        if (now >= start + dur) {
            fn.call(ctx, 1);
        } else {
            let k = (now - start) / dur
            fn.call(ctx, k);
            _frame(tick);
        }
    }

    _frame(tick);

    return function () { abort = true; };
}

