(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.varioscale = factory());
}(this, (function () { 'use strict';

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
    var _now = (function () {
        if (window.performance &&
            window.performance.now) {
            return window.performance.now.bind(window.performance);
        }
        else {
            return Date.now.bind(Date);
        }
    }());

    var frame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.msRequestAnimationFrame;

    var _frame = function (fn) {
        return frame(fn);
    };

    //var count = 0


    //For example,
    //fn is one of the interpolating functions defined in map.js
    //dur is the duration in seconds
    //ctx is this, which is the Map class itself
    function timed(fn, dur, ctx) {
        if (!dur) {
            fn.call(ctx, 1);
            return null;
        }

        var abort = false;
        var start = _now();
        var durms = dur * 1000; // duration in milliseconds

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
                var k = (now - start) / durms;
                fn.call(ctx, k);
                _frame(tick);
            }
        }

        _frame(tick);

        return function () { abort = true; };
    }

    /**
    * Records the trace of the mouse
    */

    var Trace = function Trace(val)
    {
        this._trace = [];
        this.push(val);
    };

    Trace.prototype.shift = function shift (cutoff)  // value in msec
    {
        // remove old positions older than `cutoff` value (in milli seconds)
        var now = _now();
        while ((this._trace.length > 0) && (now - this._trace[0][0] > cutoff))
        {
            // remove at beginning of array
            this._trace.shift();
        }
    };

    Trace.prototype.push = function push (val)
    {
        var now = _now();
        this._trace.push([now, val]);
    };

    Trace.prototype.first = function first ()
    {
        return this._trace[0]
    };

    Trace.prototype.last = function last ()
    {
        return this._trace[this._trace.length - 1]
    };

    Trace.prototype.lastbutone = function lastbutone ()
    {
        return this._trace[this._trace.length - 2]
    };

    Trace.prototype.length = function length ()
    {
        return this._trace.length
    };

    function dragHandler(map) {

        var canvas = map.getCanvasContainer();
        canvas.addEventListener("mousedown", doMouseDown, { passive: false });
        // canvas.addEventListener("touchstart", doMouseDown, { passive: false });
        canvas.oncontextmenu = function (evt) {
            // prevent context menu from popping up
            evt.preventDefault();
        };

        var _trace = null;

        function doMouseDown(evt) {
            // prevent cursor to turn into text selection on chrome
            evt.preventDefault();
            canvas.removeEventListener("mousedown", doMouseDown, { passive: false });
            canvas.addEventListener("mousemove", doMouseDrag, { passive: false });
            canvas.addEventListener("mouseup", doMouseUp, { passive: false });
            

            // canvas.removeEventListener("touchstart", doMouseDown, { capture: true, passive: false });
            // canvas.addEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.addEventListener("touchend", doMouseUp, { capture: true, passive: false });

            var r = canvas.getBoundingClientRect();
            var e = evt.touches ? evt.touches[0] : evt;

            var x = e.clientX - r.left - canvas.clientLeft;
            var y = e.clientY - r.top - canvas.clientTop;

            //        console.log('doMouseDown');
            //        console.log([x,y]);

            _trace = new Trace([x, y]);
            map.panBy(0, 0); // to cancel on going animations
            
        }

        function doMouseDrag(evt) {
            evt.preventDefault();
            var r = canvas.getBoundingClientRect();

            //console.log('mouse.drag.js swiper.style.transform:', document.getElementById('swiper').style.transform)

            // for mouse use raw evt, for touches, use first touch location
            var e = evt.touches ? evt.touches[0] : evt;

            var x = e.clientX - r.left - canvas.clientLeft;
            var y = e.clientY - r.top - canvas.clientTop;

            // how much did the map move since last time?
            var prev = _trace.last()[1];
            var dx = x - prev[0];
            var dy = y - prev[1];
            _trace.shift(200);
            _trace.push([x, y]);

            //        console.log([x,y]);

            // pan the map
            map.panBy(dx, dy);
        }

        function doMouseUp(evt) {

            canvas.removeEventListener("mousemove", doMouseDrag, { passive: false });
            canvas.removeEventListener("mouseup", doMouseUp, { passive: false });
            canvas.addEventListener("mousedown", doMouseDown, { passive: false });

            // canvas.removeEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.removeEventListener("touchend", doMouseUp, { capture: true, passive: false });
            // canvas.addEventListener("touchstart", doMouseDown, { capture: true, passive: false });

            var r = canvas.getBoundingClientRect();
            // for mouse use raw evt, for touches, use first touch location
            var e = evt.changedTouches ? evt.changedTouches[0] : evt;

            var x = e.clientX - r.left - canvas.clientLeft;
            var y = e.clientY - r.top - canvas.clientTop;

            _trace.shift(200);
            _trace.push([x, y]);

            //        console.log('doMouseUp');
            //        console.log([x,y])

            // FIXME
            // if a user can influence the duration
            // then if the user did set duration = 0 we should not do any panning!
            //
            // furthermore, maybe more natural for moving is that the map slows down
            //
            // also: 
            // the map should move initially with the same speed (as the user was moving) and 
            // then slowly come to a halt
            var last = _trace.last();
            var first = _trace.first();
            // in seconds
            var time = (last[0] - first[0]) / 1000;

            // so then we can see given the desired duration
            // how far could the map travel with the same speed
            // then if we ease out, we travel a bit less far
            // so that it looks ok

            var start = first[1];
            var dx = (x - start[0]);
            var dy = (y - start[1]);

            // take percent of speed computed
            var percent = 1.0; // 0.7
            var vx = dx / time * percent;
            var vy = dy / time * percent;

            // const max_distance = 400 // 0.5 * screen size
            // var duration = parseFloat(document.getElementById('panduration').value);
            // // with combined speed  of departure and arrivale
            // // * departure (= speed of user action px/s) and
            // // * arrival (= 0 px /s)
            // // we can calcualte what will be the distance travelled
            // // we cap the distance moved at maximum of certain number of pixels
            // // (to prevent map moving too far: heuristic, half the window size)
            // var tx = Math.max(Math.min((vx * 0.5) * (duration / 1000), max_distance), -max_distance)
            // var ty = Math.max(Math.min((vy * 0.5) * (duration / 1000), max_distance), -max_distance)
            // map.panAnimated(tx, ty);

            // FIXME: settings
            var duration = parseFloat(map._interaction_settings.pan_duration);
            // var duration = 1000; // parseFloat(document.getElementById('panduration').value);
            var tx = (vx * 0.5) * duration;
            var ty = (vy * 0.5) * duration;
            _trace = null;
            map.panAnimated(tx, ty);
            // console.log('mouseup')
        }

    }

    function scrollHandler (map) {

        var _map = map;
        var _canvas = map.getCanvasContainer();

        _canvas.addEventListener("wheel", doMouseWheel, { passive: false });
        _canvas.addEventListener("mousewheel", doMouseWheel, { passive: false });

        var _trace = null;
        var _prev = null;

        function doMouseWheel(evt)
        {
            // prevent from also scrolling the page -- not allowed when passive: true
            evt.preventDefault();
            // return if previous evt is shorter than n msec ago
            var now = _now();
            if ((now - _prev) < 20)
            {
                return 
            }
            // find the wheel value (this is implemented differently per browser)
            var value = undefined;
            if (evt.type === 'wheel')
            {
                value = evt.deltaY;
                // Firefox doubles the values on retina screens...
                // if (firefox && e.deltaMode === window.WheelEvent.DOM_DELTA_PIXEL) value /= browser.devicePixelRatio;
                // if (e.deltaMode === window.WheelEvent.DOM_DELTA_LINE) value *= 40;
            }
            else if (evt.type === 'mousewheel')
            {
                value = -evt.wheelDeltaY;
                // if (safari) value = value / 3;
            }
            // sometimes, we see a value of 0 
            // i.e. undetermined y-direction, so skip evt
            if (value === 0)
            {
                return
            }
            _prev = now;

            // standard value for zoom scroll_factor
            var scroll_factor = 0.1;
            var direction = Math.max(-1, Math.min(1, -value));
            if (_trace === null)
            {
                _trace = new Trace(direction);
            }
            else
            {
                var prev = _trace.last();
                var delta = now - prev[0];
                _trace.push(direction);

                // FIXME: SETTINGS: 
                //var radios = document.getElementsByName('speed');
                //let speed = 1
                // FIXME: SETTINGS: 
                
                //for (var i = 0, length = radios.length; i < length; i++) {
                //    if (radios[i].checked) {
                //        // do whatever you want with the checked radio
                //        speed = parseFloat(radios[i].value)
                //        // only one radio can be logically checked, don't check the rest
                //        break;
                //    }
                //}
                
                //speed = getspeed()

                // make larger zoom scroll_factors if mousewheel went faster
                // FIXME: allow user to set multiplication scroll_factor, e.g.
                // (1, 2, 4) : (normal, fast, superfast) ?
                switch (true)
                {
                    case delta > 750:
                        scroll_factor = 0.0625;
                        break;
                    case delta > 500:
                        scroll_factor = 0.125;
                        break;
                    case delta > 50:
                        scroll_factor = 0.25;
                        break;
                    default:
                        scroll_factor = 0.5;
                        break;
                }
                scroll_factor *= getspeed();
                _trace.shift(2000);
    //            console.log(delta + " " + prev[1] + " " + scroll_factor);
            }

            //if the canvas has size 800 x 800, 
            //evt.clientX: x-coordinate in pixel, starting from the left of the canvas (800 x 800)
            //evt.clientY: y-coordinate in pixel, starting from the top of the canvas (800 x 800)        
            //r has size 800 x 760 because of the bar (with height 39.92) at the top
            //r.left = 0 and r.top = 39.92
            var r = _canvas.getBoundingClientRect();
            var x = evt.clientX - r.left - _canvas.clientLeft;  //_canvas.clientLeft is often 0
            var y = evt.clientY - r.top - _canvas.clientTop;  //_canvas.clientTop is often 0

            switch(direction) 
            {
                case 1:
                    _map.zoomInAnimated(x, y, scroll_factor);
                    break;
                case -1:
                    _map.zoomOutAnimated(x, y, scroll_factor);
                    break;
            }
    //        console.log(_trace._trace);
            // console.log(_trace.length())
        }
    }


    function getspeed() {
        var radios = document.getElementsByName('speed');
        var factor = 1;
        for (var i = 0, length = radios.length; i < length; i++) {
            if (radios[i].checked) {
                // do whatever you want with the checked radio
                factor = parseFloat(radios[i].value);
                // only one radio can be logically checked, don't check the rest
                break;
            }
        }

        return factor
    }



    function zoomButtonHandler(map) {
        var canvas = map.getCanvasContainer();

        document.getElementById("zoomInButton").addEventListener('click',
            function () {
                map.zoomInAnimated(canvas.width / 2, canvas.height / 2, getspeed());
            }
        );

        document.getElementById("zoomOutButton").addEventListener('click',
            function () {
                map.zoomOutAnimated(canvas.width / 2, canvas.height / 2, getspeed());
            }
        );
    }

    /**
    * Handler for touch events
    * zooms the map if two fingers are used and the distance between them changes.
    * 
    */

    function touchPinchHandler (map) {
        var canvas = map.getCanvasContainer();

        canvas.addEventListener("touchstart", doPinchStart, false);
        canvas.oncontextmenu = function (evt) {
            // prevent context menu from popping up
            evt.preventDefault();
        };

        function dist(points) {
            var ref = vec(points);
            var dx = ref[0];
            var dy = ref[1];
            return Math.sqrt(dx * dx, dy * dy);
        }

        function center(points) {
            var ref = vec(points);
            var dx = ref[0];
            var dy = ref[1];
            var p0 = points[0];
            return [p0[0] + dx / 2,
                    p0[1] + dy / 2];
        }

        function vec(points) {
            var dx = points[1][0] - points[0][0];
            var dy = points[1][1] - points[0][1];
            return [dx, dy];
        }

        function getTouchPoints(event) {
            var r = canvas.getBoundingClientRect();
            var touches = event.touches;
            var points = [];
            // note: length hardcoded as 2
            for (var j = 0; j < 2; j++) {
                var x = touches[j].clientX - r.left - canvas.clientLeft;
                var y = touches[j].clientY - r.top - canvas.clientTop;
                points.push([x, y]);
            }
            return points;
        }

        var _prevDist = null;
        var _startTime = null;
        var _trace = null;
        // var _startCenter = null;

        function doPinchStart(event) {
            if (!event.touches || event.touches.length !== 2) { return; }
            event.preventDefault();

            canvas.removeEventListener("touchstart", doPinchStart, false);
            canvas.addEventListener("touchmove", doPinchMove, { capture: true, passive: false });
            canvas.addEventListener("touchend", doPinchEnd, false);
            
            // let points = getTouchPoints(event);
            // console.log(points);
            // _startCenter = center(points);
            _prevDist = null;
            _startTime = _now();
            console.log('start touch with 2 fingers ' + _startTime);
            map.abortAndRender(); // to cancel on going animations
            var points = getTouchPoints(event);
            _trace = new Trace(points);
        }

        function doPinchMove(event) {
            if (!event.touches || event.touches.length !== 2 || (_now() - _startTime) < 30) { return; }
            console.log('time of touch ' + (_now() - _startTime));
            // we discard the first few movement events at the beginning (30 ms since start)
            // these seem to be 'unstable', are rapidly fired after placing the fingers on 
            // the screen and they lead to wildly varying positions
            event.preventDefault();
            var points = getTouchPoints(event);
            _trace.shift(200);
            _trace.push(points);
            // console.log(points);
            var curDist = dist(points);
            if (_prevDist !== null) {
                var scaleDelta = curDist / _prevDist;
                // console.log(scaleDelta);
                var ref = center(points);
                var x = ref[0];
                var y = ref[1];
                map.zoom(x, y, Math.max(Math.min(scaleDelta, 1.1), 0.9));
            }
            _prevDist = curDist;
        }

        function doPinchEnd(event) {
            if (event.touches.length !== 0) { return; }
            event.preventDefault();
            console.log('end');
            canvas.removeEventListener("touchmove", doPinchMove, { capture: true, passive: false });
            canvas.removeEventListener("touchend", doPinchEnd, false);
            canvas.addEventListener("touchstart", doPinchStart, false);
            _prevDist = null;
            _startTime = null;      
            console.log('trace for pinch end ' + _trace.length());
            if (_trace.length() > 1)
            {
                // FIXME:
                // should the intent of the user be derived from 
                // comparing the last two touch points only?
                // or, should we compare begin and end of the gesture
                // or, should we detect some pattern in the gesture points?
                // or, ... 
                var last = _trace.last();
                var lastbutone = _trace.lastbutone();
                var curDist = dist(last[1]);
                var prevDist = dist(lastbutone[1]);
                // let scaleDelta = curDist / prevDist;
                var ref = center(last[1]);
                var x = ref[0];
                var y = ref[1];
                var step = 0.5;
                if (curDist < prevDist)
                {
                    // distance between fingers has become smaller
                    // -> zoom out
                    map.zoomOutAnimated(x, y, step);
                } else {
                    // distance between fingers has become larger
                    // -> zoom in
                    map.zoomInAnimated(x, y, step);
                }

                // FIXME: 
                // should we take the zoom step preference of the
                // user into account here? e.g. large zoom step -> 
                // allows larger change of the clamped scaledelta?
                // map.zoomAnimated(x, y, Math.max(Math.min(scaleDelta, 1.2), 0.8));
            }
            _trace = null;       
        }
    }

    function touchDragHandler(map) {
        var canvas = map.getCanvasContainer();
        canvas.addEventListener("touchstart", doTouchDragStart, false);
        // canvas.addEventListener("touchstart", doMouseDown, { passive: false });
        canvas.oncontextmenu = function (evt) {
            // prevent context menu from popping up
            evt.preventDefault();
        };

        function getTouchPoint(event) {
            var r = canvas.getBoundingClientRect();
            var touches = event.touches;       
            var x = touches[0].clientX - r.left - canvas.clientLeft;
            var y = touches[0].clientY - r.top - canvas.clientTop;
                
            return [x, y];
        }

        var _trace = null;
        var _state = null;

        function doTouchDragStart(evt) {
            if (evt.touches.length > 1) {
                return;
            }
            // prevent cursor to turn into text selection on chrome
            evt.preventDefault();
            // map.abortAndRender(); // to cancel on going animations
            canvas.removeEventListener("touchstart", doTouchDragStart, false);
            canvas.addEventListener("touchmove", doTouchDragMove, { capture: true, passive: false });
            canvas.addEventListener("touchend", doTouchDragEnd, false);
            // canvas.removeEventListener("touchstart", doMouseDown, { capture: true, passive: false });
            // canvas.addEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.addEventListener("touchend", doMouseUp, { capture: true, passive: false });
            
            //        console.log('doMouseDown');
            //        console.log([x,y]);
            var point = getTouchPoint(evt);
            _trace = new Trace(point);
            _state = 'pending';
        }
        function doTouchDragMove(evt) {
            
            // when we detect more than 1 finger on the screen
            // we obviously do not want to pan, so we set the state to
            // pending (i.e. currently we do not handle events for panning)
            if (evt.touches.length > 1) 
            {
                _state = 'pending';
                return;
            }
            evt.preventDefault();
            var point = getTouchPoint(evt);
            
            // how much did the map move since last time?
            var prev = _trace.last()[1];
            var dx = point[0] - prev[0];
            var dy = point[1] - prev[1];
            _trace.shift(200);
            _trace.push(point);

            
            switch(_state)
            {
                case 'pending':
                    // enable the handler when:
                    // - we have moved our finger more than 3 pixels, or
                    // - we have 1 finger for more than 80ms on the screen
                    if (Math.sqrt(dx * dx, dy * dy) >= 3 || (_trace.last()[0] - _trace.first()[0])> 60) {
                        _state = 'active';
                    }
                    break;
                case 'active':
                    map.panBy(dx, dy);
                    break;
            }
        }
        function doTouchDragEnd(evt) {
            if (evt.touches.length !== 0) { return; }
            canvas.removeEventListener("touchmove", doTouchDragMove, { capture: true, passive: false });
            canvas.removeEventListener("touchend", doTouchDragEnd, false);
            canvas.addEventListener("touchstart", doTouchDragStart, false);
            // canvas.removeEventListener("touchmove", doMouseDrag, { capture: true, passive: false });
            // canvas.removeEventListener("touchend", doMouseUp, { capture: true, passive: false });
            // canvas.addEventListener("touchstart", doMouseDown, { capture: true, passive: false });
            // let point = getTouchPoint(evt);
            // _trace.shift(200);
            // _trace.push(point);
            //        console.log('doMouseUp');
            //        console.log([x,y])
            // FIXME
            // if a user can influence the duration
            // then if the user did set duration = 0 we should not do any panning!
            //
            // furthermore, maybe more natural for moving is that the map slows down
            //
            // also: 
            // the map should move initially with the same speed (as the user was moving) and 
            // then slowly come to a halt
            _trace.shift(200);
            if (_trace.length() <= 2)
            {
                _state = 'pending';
            }
            switch(_state)
            {
                case 'pending':
                {
                    console.log('touch drag end - SKIP');
                    break;
                }
                case 'active':
                {               
                    var last = _trace.last();   
                    var first = _trace.first();
                    // in seconds
                    var time = (last[0] - first[0]) / 1000;
                    // so then we can see given the desired duration
                    // how far could the map travel with the same speed
                    // then if we ease out, we travel a bit less far
                    // so that it looks ok
                    var start = first[1];
                    var dx = (last[1][0] - start[0]);
                    var dy = (last[1][1] - start[1]);
                    // take percent of speed computed
                    var percent = 1.0; // 0.7
                    var vx = dx / time * percent;
                    var vy = dy / time * percent;
                    // const max_distance = 400 // 0.5 * screen size
                    var duration = parseFloat(map._interaction_settings.pan_duration);
                    // var duration = parseFloat(document.getElementById('panduration').value);
                    // with combined speed  of departure and arrivale
                    // * departure (= speed of user action px/s) and
                    // * arrival (= 0 px /s)
                    // we can calcualte what will be the distance travelled
                    // we cap the distance moved at maximum of certain number of pixels
                    // (to prevent map moving too far: heuristic, half the window size)
                    // var tx = Math.max(Math.min((vx * 0.5) * (duration / 1000), max_distance), -max_distance)
                    // var ty = Math.max(Math.min((vy * 0.5) * (duration / 1000), max_distance), -max_distance)
                    var tx = (vx * 0.5) * duration;
                    var ty = (vy * 0.5) * duration;

                    console.log('touch drag end - ANIMATE');
                    console.log([tx, ty]);
                    map.panAnimated(tx, ty);

                    break;
                }
            }
            _state = 'pending';
            _trace = null;
            console.log('touchend');
        }
    }

    /**
     * @name mat4
     * @class 4x4 Matrix
     */

    //exports.___ = function 


    // vector funcs !!!
    function vec3transform (out, a, m) {
        var x = a[0], y = a[1], z = a[2],
            w = m[3] * x + m[7] * y + m[11] * z + m[15];
        w = w || 1.0; //if w == 0 or w == null, the result is 1.0; otherwise, the result is w
    //    console.log(m[0] + " " + x + " " + m[4]);
        out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
        out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    //    console.log(out[0]);
        return out;
    }

    function createvec3() {
        var out = new Float64Array(3);
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        return out;
    }


    /**
     * Creates a new identity mat4
     *
     * @returns {mat4} a new 4x4 matrix
     */
    function create() {
        var out = new Float64Array(16);
        out[0] = 1;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = 1;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = 1;
        out[11] = 0;
        out[12] = 0;
        out[13] = 0;
        out[14] = 0;
        out[15] = 1;
        return out;
    }

    /**
     * Inverts a mat4
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the source matrix
     * @returns {mat4} out
     */
    function invert(out, a) {
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
            a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
            a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
            a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            // Calculate the determinant
            det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        if (!det) {
            return null;
        }
        det = 1.0 / det;

        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

        return out;
    }

    /**
     * Multiplies two mat4's explicitly
     *
     * @param {mat4} out the receiving matrix
     * @param {mat4} a the first operand
     * @param {mat4} b the second operand
     * @returns {mat4} out
     */
    function multiply(out, a, b) {
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
            a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
            a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
            a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        // Cache only the current line of the second matrix
        var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return out;
    }

    /**
     * Alias for {@link mat4.multiply}
     * @function
     */
    var _multiply = multiply;








    ///**

    // * Generates a perspective projection matrix with the given bounds.

    // * Passing null/undefined/no value for far will generate infinite projection matrix.

    // *

    // * @param {mat4} out mat4 frustum matrix will be written into

    // * @param {number} fovy Vertical field of view in radians

    // * @param {number} aspect Aspect ratio. typically viewport width/height

    // * @param {number} near Near bound of the frustum

    // * @param {number} far Far bound of the frustum, can be null or Infinity

    // * @returns {mat4} out

    // */

    //export function perspective(out, fovy, aspect, near, far) {

    //  let f = 1.0 / Math.tan(fovy / 2), nf;

    //  out[0] = f / aspect;

    //  out[1] = 0;

    //  out[2] = 0;

    //  out[3] = 0;

    //  out[4] = 0;

    //  out[5] = f;

    //  out[6] = 0;

    //  out[7] = 0;

    //  out[8] = 0;

    //  out[9] = 0;

    //  out[11] = -1;

    //  out[12] = 0;

    //  out[13] = 0;

    //  out[15] = 0;

    //  if (far != null && far !== Infinity) {

    //    nf = 1 / (near - far);

    //    out[10] = (far + near) * nf;

    //    out[14] = (2 * far * near) * nf;

    //  } else {

    //    out[10] = -1;

    //    out[14] = -2 * near;

    //  }

    //  return out;

    //}

    ///**

    // * Generates a perspective projection matrix with the given field of view.

    // * This is primarily useful for generating projection matrices to be used

    // * with the still experiemental WebVR API.

    // *

    // * @param {mat4} out mat4 frustum matrix will be written into

    // * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees

    // * @param {number} near Near bound of the frustum

    // * @param {number} far Far bound of the frustum

    // * @returns {mat4} out

    // */

    //export function perspectiveFromFieldOfView(out, fov, near, far) {

    //  let upTan = Math.tan(fov.upDegrees * Math.PI/180.0);

    //  let downTan = Math.tan(fov.downDegrees * Math.PI/180.0);

    //  let leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);

    //  let rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);

    //  let xScale = 2.0 / (leftTan + rightTan);

    //  let yScale = 2.0 / (upTan + downTan);

    //  out[0] = xScale;

    //  out[1] = 0.0;

    //  out[2] = 0.0;

    //  out[3] = 0.0;

    //  out[4] = 0.0;

    //  out[5] = yScale;

    //  out[6] = 0.0;

    //  out[7] = 0.0;

    //  out[8] = -((leftTan - rightTan) * xScale * 0.5);

    //  out[9] = ((upTan - downTan) * yScale * 0.5);

    //  out[10] = far / (near - far);

    //  out[11] = -1.0;

    //  out[12] = 0.0;

    //  out[13] = 0.0;

    //  out[14] = (far * near) / (near - far);

    //  out[15] = 0.0;

    //  return out;

    //}

    ///**

    // * Generates a orthogonal projection matrix with the given bounds

    // *

    // * @param {mat4} out mat4 frustum matrix will be written into

    // * @param {number} left Left bound of the frustum

    // * @param {number} right Right bound of the frustum

    // * @param {number} bottom Bottom bound of the frustum

    // * @param {number} top Top bound of the frustum

    // * @param {number} near Near bound of the frustum

    // * @param {number} far Far bound of the frustum

    // * @returns {mat4} out

    // */

    //export function ortho(out, left, right, bottom, top, near, far) {

    //  let lr = 1 / (left - right);

    //  let bt = 1 / (bottom - top);

    //  let nf = 1 / (near - far);

    //  out[0] = -2 * lr;

    //  out[1] = 0;

    //  out[2] = 0;

    //  out[3] = 0;

    //  out[4] = 0;

    //  out[5] = -2 * bt;

    //  out[6] = 0;

    //  out[7] = 0;

    //  out[8] = 0;

    //  out[9] = 0;

    //  out[10] = 2 * nf;

    //  out[11] = 0;

    //  out[12] = (left + right) * lr;

    //  out[13] = (top + bottom) * bt;

    //  out[14] = (far + near) * nf;

    //  out[15] = 1;

    //  return out;

    //}

    var Rectangle = function Rectangle(xmin, ymin, xmax, ymax)
    {
        this.xmin = xmin;
        this.ymin = ymin;
        this.xmax = xmax;
        this.ymax = ymax;
    };

    Rectangle.prototype.width = function width ()
    {
        return this.xmax - this.xmin
    };

    Rectangle.prototype.height = function height ()
    {
        return this.ymax - this.ymin
    };

    Rectangle.prototype.toString = function toString ()
    {
        return ("new Rectangle(" + (this.xmin) + ", " + (this.ymin) + ", " + (this.xmax) + ", " + (this.ymax) + ")")
    };

    Rectangle.prototype.area = function area ()
    {
        return this.width() * this.height()
    };

    Rectangle.prototype.center = function center ()
    {
        return [this.xmin + this.width() * 0.5,
                this.ymin + this.height() * 0.5]
    };

    var meter_to_pixel = 3779.5275590551; // 1 meter equals 3779.5275590551 pixels


    //import { log } from 'util';

    // TODO
    // - Aspect ratio / resize of viewport --> update transform
    // - Take into account the z-value of the slice
    // - Remove duplication inside functions

    // let = block scoped
    // var = global / function scoped




    //function world_square_matrix(box, ar) {
    //    // Returns transform matrix to go from world to normalized square
    //    // FIXME: aspect ratio - is NOT taken into account ??? !!!
    //    let sx = 2. / ((box.xmax - box.xmin) * ar)
    //    let sy = 2. / (box.ymax - box.ymin)
    //    let tx = -(box.xmax + box.xmin) / (box.xmax - box.xmin)
    //    let ty = -(box.ymax + box.ymin) / (box.ymax - box.ymin)
    //    let m = create()
    //    m[0] = sx
    //    m[5] = sy
    //    m[12] = tx
    //    m[13] = ty
    //    return m
    //}


    function square_viewport_matrix(box) {
        // Returns transform matrix to go from normalized square to viewport
        // FIXME: can overflow? better to first multiply with 1/2?
        var sx = (box.xmax - box.xmin) * .5;
        var sy = (box.ymax - box.ymin) * .5;
        var tx = (box.xmax + box.xmin) * .5;
        var ty = (box.ymax + box.ymin) * .5;
        var m = create();
        m[0] = sx;
        m[5] = sy;
        m[12] = tx;
        m[13] = ty;
        return m
    }

    // FIXME
    //
    // Check handedness of the 3D system and get it right + consistent!
    // https://github.com/g-truc/glm/blob/master/glm/gtc/matrix_transform.inl
    //
    // OrthoLH
    // OrthoRH


    var Transform = function Transform(center_world, viewport_size, denominator) {

        this.viewport_world = create(); //matrix: to transform a point from a viewport to the realworld
        this.world_viewport = create(); //matrix: to transform a point from the realworld to a viewport 
        //
        this.world_square = null;
        this.square_viewport = null;
        //
        this.viewport = null; //e.g., xmin:0, ymin:0, xmax: 1200, ymax: 929

        // set up initial transformation
        this.initTransform(center_world, viewport_size, denominator);

        this.snapped_step = Number.MAX_SAFE_INTEGER;
        this.snapped_St = denominator;
        //this.current_step = Number.MAX_SAFE_INTEGER
    };

    // fixme: rename -> initTransform
    Transform.prototype.initTransform = function initTransform (center_world, viewport_size, denominator) {
        // compute from the center of the world, the viewport size and the scale
        // denominator how much of the world is visible
        var cx = center_world[0],
            cy = center_world[1];

        // get half visible screen size in world units,
        // when we look at it at this map scale (1:denominator)
        var half_visible_screen = [
            0.5 * viewport_size[0] / meter_to_pixel * denominator,
            0.5 * viewport_size[1] / meter_to_pixel * denominator
        ];
        var xmin = cx - half_visible_screen[0],
            xmax = cx + half_visible_screen[0],
            ymin = cy - half_visible_screen[1],
            ymax = cy + half_visible_screen[1];
        // the size of the viewport 
        this.viewport = new Rectangle(0, 0, viewport_size[0], viewport_size[1]);
        // we arrive at what part of the world then is visible
        // let visible_world = this.getVisibleWorld() //
        var visible_world = new Rectangle(xmin, ymin, xmax, ymax);
        // scaling/translating is then as follows:
        this.update_world_square_viewport(visible_world, cx, cy);
    };


    Transform.prototype.pan = function pan (dx, dy) {
        //console_log(this.square_viewport, 'this.square_viewport before')
        //console.log('dx, dy:', dx, dy)
        this.square_viewport[12] += dx;
        this.square_viewport[13] += dy;

        //console_log(this.square_viewport, 'this.square_viewport')
        //console_log(this.world_square, 'this.world_square')

        //e.g., viewport: 1200 x 929
        //e.g., this.square_viewport changed by moving dx == 100 and dy == 50:
        //  600     0   0   0
        //0 464.5   0   0
        //0     0   1   0
        //  700 514.5   0   1
        //e.g., this.world_square:
        //0.00006929133087396622  0                     0   0
        //0                       0.000089504479547031220   0
        //0                       0                     1   0
        //  -12.938166618347168     -27.96834945678711      0   1
        _multiply(this.world_viewport, this.square_viewport, this.world_square);
        //e.g., this.world_viewport:
        //  0.04157479852437973 0                   0   0
        //  0                   0.0415748320519924160   0
        //  0                   0                   1   0
        //  -7062.89990234375  -12476.7978515625        0   1


        //console_log(this.world_viewport, 'this.world_viewport')


        invert(this.viewport_world, this.world_viewport);

        // we arrive at what part of the world then is visible
        var visible_world = this.getVisibleWorld(); // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        var center = visible_world.center();
        // scaling/translating is then as follows:
        this.update_world_square_viewport(visible_world, center[0], center[1]);
    };

    Transform.prototype.compute_zoom_parameters = function compute_zoom_parameters (ssctree, zoom_factor, x, y, if_snap) {
        //console.log(' ')
        //let if_snap = true
        //console.log('transform.js St before:', this.getScaleDenominator())
        //console.log('transform.js factor:', zoom_factor)

        //console.log('transform.js zoom_factor:', zoom_factor)

        var St_current = this.getScaleDenominator();
        var current_step = ssctree.get_step_from_St(St_current); //current_step should be compute instantly because of aborting actions
        this.compute_matrix_parameters(zoom_factor, x, y);
        var time_factor = 1;


        if (if_snap == true) {

            var St_new = this.getScaleDenominator();


            //console.log('transform.js St_current:', St_current)
            //console.log('transform.js St:', St)
            //console.log('transform.js St_new:', St_new)
            //console.log('transform.js St_current / St:', St_current / St)
            //console.log('transform.js zoom_factor:', zoom_factor)

            //console.log('transform.js ----------------:')
            //console.log('transform.js St after:', this.getScaleDenominator())


            var snapped_step = ssctree.get_zoom_snappedstep_from_St(St_new, zoom_factor);
            //console.log('transform.js snapped_step:', snapped_step)
            time_factor = ssctree.get_time_factor(St_new, zoom_factor, current_step);
            var snapped_St = ssctree.get_St_from_step(snapped_step);
            this.snapped_step = snapped_step;
            this.snapped_St = snapped_St;

            //this.current_step = snapped_step

            //console.log('transform.js St_new:', St_new)
            //console.log('transform.js snapped_step:', snapped_step)
            //console.log('transform.js snapped_St:', snapped_St)
            //console.log('transform.js St / snapped_St:', St / snapped_St)
            this.compute_matrix_parameters(St_new / snapped_St, x, y);
            //let final_St = this.getScaleDenominator()
            //console.log('transform.js final St:', final_St)
            //console.log('transform.js final step:', ssctree.get_step_from_St(St, false))

        }
        return time_factor
    };

    Transform.prototype.compute_matrix_parameters = function compute_matrix_parameters (zoom_factor, x, y) {
    //zoom(ssctree, factor, x, y) {
        //console.log('transform.js test')

        var tmp = create();
        // 1. translate
        {
            var eye = create();
            eye[12] = -x;
            eye[13] = -y;
            _multiply(tmp, eye, this.square_viewport);
        }
        // 2. scale
        {
            var eye$1 = create();
            eye$1[0] = zoom_factor;
            eye$1[5] = zoom_factor;
            _multiply(tmp, eye$1, tmp);
        }
        // 3. translate back
        {
            var eye$2 = create();
            eye$2[12] = x;
            eye$2[13] = y;
            _multiply(tmp, eye$2, tmp);
        }
        //this.square_viewport = tmp;
        _multiply(this.world_viewport, tmp, this.world_square);
        invert(this.viewport_world, this.world_viewport);
        // we arrive at what part of the world then is visible
        var visible_world = this.getVisibleWorld(); // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        var center = visible_world.center();
        // scaling/translating is then as follows:
        this.update_world_square_viewport(visible_world, center[0], center[1]);
    };

    Transform.prototype.update_world_square_viewport = function update_world_square_viewport (visible_world, cx, cy) {

        var scale = [2. / visible_world.width(), 2. / visible_world.height()];
        var translate = [-scale[0] * cx, -scale[1] * cy];
        // by means of which we can calculate a world -> ndc square matrix
        var world_square = create();
        world_square[0] = scale[0];
        world_square[5] = scale[1];
        world_square[12] = translate[0];
        world_square[13] = translate[1];
        this.world_square = world_square;

        //console.log("INITIAL world square" + world_square);
        // and given the size of the viewport we can set up ndc square -> viewport matrix


        //console.log(this.viewport, 'this.viewport')

        //e.g., this.viewport:  xmin: 0, ymin: 0, xmax: 1200, ymax: 929
        //e.g., this.square_viewport obtained from function square_viewport_matrix:
        //  600     0   0   0
        //0 464.5   0   0
        //0     0   1   0
        //  600 464.5   0   1
        this.square_viewport = square_viewport_matrix(this.viewport);
        //console_log(this.square_viewport, 'this.square_viewport')

        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform();
        //console.log('ll: ' + ll + " " + this.viewport.xmin + " " + this.viewport.ymin);
        //console.log('tr: ' + tr + " " + this.viewport.xmax + " " + this.viewport.ymax);
    };



    Transform.prototype.backward = function backward (vec3) {
        var result = createvec3();
        vec3transform(result, vec3, this.viewport_world);
        return result
    };

    Transform.prototype.updateViewportTransform = function updateViewportTransform () {
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        //    console.log('square_viewport', this.square_viewport)
        //    console.log('world_square', this.world_square)

        _multiply(this.world_viewport, this.square_viewport, this.world_square);
        invert(this.viewport_world, this.world_viewport);
    };

    Transform.prototype.getVisibleWorld = function getVisibleWorld () {
        //console.log("visibleWorld in transform.js")
        var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]); //e.g., this.viewport.xmin == 0; ll[0] == 170625
        var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]); //e.g., this.viewport.xmax == 1200

        // we arrive at what part of the world then is visible
        return new Rectangle(ll[0], ll[1], tr[0], tr[1])
    };


    Transform.prototype.getCenterWorld = function getCenterWorld () { //return the center of the real world
        //console.log("getCenter in transform.js")
        var center = this.backward([
            this.viewport.xmin + (this.viewport.xmax - this.viewport.xmin) * 0.5,
            this.viewport.ymin + (this.viewport.ymax - this.viewport.ymin) * 0.5, 0.0]);
        return center
    };

    Transform.prototype.getScaleDenominator = function getScaleDenominator () {

        var viewport_width_meter = this.viewport.width() / meter_to_pixel;
        var world_width_meter = this.getVisibleWorld().width();
        var St = world_width_meter / viewport_width_meter;

        //let viewport_in_meter = new Rectangle(0, 0,
        //this.viewport.width() / meter_to_pixel,
        //this.viewport.height() / meter_to_pixel)
        //let world_in_meter = this.getVisibleWorld()
        //let St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area())
        //console.log('transform.js viewport_in_meter.area():', viewport_in_meter.area())
        //if (viewport_in_meter.area() > 0) {
        //St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area())
        //}  
            
        return St
    };

    var DrawProgram = function DrawProgram(gl, vertexShaderText, fragmentShaderText) {

        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderText);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // Create program: attach, link, validate, detach, delete
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.validateProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        this.shaderProgram = shaderProgram;
        this.gl = gl;

        // FIXME: when to call these detach/delete's? After succesful compilation?
        // gl.detachShader(this.shaderProgram, vertexShader);
        // gl.detachShader(this.shaderProgram, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            var shader = gl.createShader(type);
            gl.shaderSource(shader, source); // Send the source of the shader
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    };

    DrawProgram.prototype._specify_data_for_shaderProgram = function _specify_data_for_shaderProgram (gl, shaderProgram, attribute_name, itemSize, stride, offset) {

        var attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,// * Attribute location
            itemSize,       // * Number of components per vertex attribute. Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            stride,         // * stride 
            offset          // * Offset from the beginning of 
        );

    };




    var ImageTileDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function ImageTileDrawProgram(gl) {
            var vertexShaderText = "\nprecision highp float;\n\nattribute vec3 vertexPosition_modelspace;\nattribute vec2 aTextureCoord;\n\nuniform mat4 M;\n\nvarying highp vec2 vTextureCoord;\n\n\nvoid main()\n{\n    gl_Position = M * vec4(vertexPosition_modelspace, 1.0);\n    vTextureCoord = aTextureCoord;\n}\n";

            var fragmentShaderText = "\nprecision highp float;\n\nvarying highp vec2 vTextureCoord;\n\nuniform sampler2D uSampler;\nuniform float opacity;\n            \nvoid main()\n{\n    vec4 color = texture2D(uSampler, vTextureCoord);\n    color.a = opacity;\n    gl_FragColor = color;\n}\n";
            //uniform float opacity;
            //vec4 color = texture2D(u_tex, v_texCoord);
            //color.a = 0.5;

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);
        }

        if ( DrawProgram ) ImageTileDrawProgram.__proto__ = DrawProgram;
        ImageTileDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        ImageTileDrawProgram.prototype.constructor = ImageTileDrawProgram;

    //    draw(matrix, tilecontent)
        ImageTileDrawProgram.prototype.draw_tile = function draw_tile (matrix, tile, tree_setting) {
            if (tile.content.buffer === null)
            {
                return;
            }
            //console.log('drawprograms.js tree_setting.opacity 3:', tree_setting.opacity)
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            gl.useProgram(shaderProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.buffer); 

            // FIXME: better to store with bucket how the layout of the mesh is?
            var positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
            // gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
            gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionAttrib);

            {
                var M = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M, false, matrix);

                var opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
                
                gl.uniform1f(opacity_location, tree_setting.opacity);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.textureCoordBuffer);
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'aTextureCoord', 2, 0, 0);
            //console.log('test')
            //const textureAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
            //gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
            //gl.enableVertexAttribArray(textureAttrib);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tile.content.texture);

            var uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
            gl.uniform1i(uSampler, 0);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //        gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.drawArrays(gl.TRIANGLES, 0, tile.content.buffer.numItems); // FIXME!
        };

        return ImageTileDrawProgram;
    }(DrawProgram));

    var ImageFboDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function ImageFboDrawProgram(gl) {
            var vertexShaderText =
                'precision highp float;\n' +
                'attribute vec4 a_Position;\n' +
                'attribute vec2 a_TexCoord;\n' +
                'varying vec2 v_TexCoord;\n' +
                'void main() {\n' +
                '  gl_Position = a_Position;\n' +
                '  v_TexCoord = a_TexCoord;\n' +
                '}\n';

            var fragmentShaderText = "\n            precision highp float;       \n            uniform sampler2D uSampler;\n            uniform float opacity;\n            varying vec2 v_TexCoord;\n            void main() {\n              vec4 color = texture2D(uSampler, v_TexCoord);\n              if (color.a == 0.0) //when clearing the buffer of fbo, we used value 0.0 for opacity; see render.js\n                { discard; } \n              else \n                { color.a = opacity; } \n              gl_FragColor = color;\n            }";

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);
        }

        if ( DrawProgram ) ImageFboDrawProgram.__proto__ = DrawProgram;
        ImageFboDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        ImageFboDrawProgram.prototype.constructor = ImageFboDrawProgram;

        ImageFboDrawProgram.prototype.draw_fbo = function draw_fbo (fbo, opacity) {
            //console.log('drawprograms.js fbo:', fbo)
            if (fbo === null) {
                console.log('drawprograms.js fbo is null:', fbo);
                return;
            }
            //console.log('drawprograms.js tree_setting.opacity 3:', tree_setting.opacity)
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            gl.useProgram(shaderProgram);
            gl.program = shaderProgram;
            // Set the vertex information
            var n = initVertexBuffers(gl);
            if (n < 0) {
                console.log('Failed to set the vertex information');
                return;
            }

            {
                var opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
                gl.uniform1f(opacity_location, opacity);
            }


            //gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.buffer);

            //// FIXME: better to store with bucket how the layout of the mesh is?
            //const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
            //// gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
            //gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
            //gl.enableVertexAttribArray(positionAttrib);



            //gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.textureCoordBuffer)
            //const textureAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
            //gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
            //gl.enableVertexAttribArray(textureAttrib);

            gl.activeTexture(gl.TEXTURE0);
            //gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
            gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            var uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
            gl.uniform1i(uSampler, 0);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            //        gl.disable(gl.BLEND);
            //gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.DEPTH_TEST);

            //gl.clearColor(0.0, 0.0, 0.0, 1.0);
            //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer

            //gl.clearDepth(1.0);
            //gl.clear(gl.DEPTH_BUFFER_BIT);
            //gl.clearColor(1.0, 1.0, 1.0, 0.0);
            //gl.clear(gl.COLOR_BUFFER_BIT);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
            gl.bindTexture(gl.TEXTURE_2D, null);
            //gl.drawArrays(gl.TRIANGLES, 0, tile.content.buffer.numItems); // FIXME!
        };

        return ImageFboDrawProgram;
    }(DrawProgram));


    var LineDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function LineDrawProgram(gl) {

            var vertexShaderText = "\nprecision highp float;\n\nattribute vec2 displacement;\nattribute vec4 vertexPosition_modelspace;\nuniform mat4 M;\nuniform float near;\nuniform float half_width_reality;\n\nvoid main()\n{\n    vec4 pos = vertexPosition_modelspace;\n\n    if (pos.z <= near && pos.w > near)\n    {\n        pos.x +=  displacement.x * half_width_reality;\n        pos.y +=  displacement.y * half_width_reality;\n        gl_Position = M * vec4(pos.xyz, 1.0);\n\n    } else {\n        gl_Position = vec4(-10.0,-10.0,-10.0,1.0);\n        return;\n    }\n}\n";

            var fragmentShaderText = "\nprecision highp float;\nuniform vec4 uColor;\n\nvoid main()\n{\n    gl_FragColor = uColor; // color of the lines\n}\n";

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);

            this.colors = [[141, 211, 199]
                , [190, 186, 218]
                , [251, 128, 114]
                , [128, 177, 211]
                , [253, 180, 98]
                , [179, 222, 105]
                , [252, 205, 229]
                , [217, 217, 217]
                , [188, 128, 189]
                , [204, 235, 197]
            ].map(function (x) { return [x[0] / 255., x[1] / 255., x[2] / 255.]; });
        }

        if ( DrawProgram ) LineDrawProgram.__proto__ = DrawProgram;
        LineDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        LineDrawProgram.prototype.constructor = LineDrawProgram;


        LineDrawProgram.prototype.draw_tile = function draw_tile (matrix, tile, near_St, redering_settings, tree_setting) {
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            var triangleVertexPosBufr = tile.content.line_triangleVertexPosBufr;
            var displacementBuffer = tile.content.displacementBuffer;

            if (triangleVertexPosBufr === null) {
                return;
            }
            gl.useProgram(shaderProgram);

            // void vertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, GLintptr offset)
            // size is the number of components per attribute. For example, with RGB colors, it would be 3; and with an
            // alpha channel, RGBA, it would be 4. If we have location data with (x,y,z) attributes, it would be 3; and if we
            // had a fourth parameter w, (x,y,z,w), it would be 4. Texture parameters (s,t) would be 2. type is the datatype,
            // stride and offset can be set to the default of 0 for now and will be reexamined in Chapter 9 when we discuss
            // interleaved arrays.

            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'displacement', 2, 0, 0);

            // the unit of boundary_width is mm; 1 mm equals 3.7795275590551 pixels
            // FIXME: MM: at which amount of dots per inch has this been calculated?

             // FIXME: settings/view
    //        let boundary_width_screen = 0.2;
            //var boundary_width_screen = parseFloat(document.getElementById('boundary_width_slider').value);
            // The unit of the map must be meter!!!
            // redering_settings.boundary_width: the width on screen
            var half_width_reality = redering_settings.boundary_width * near_St[1] / 1000 / 2;
    //        if (width_increase > 0)
    //        {
    //            half_width_reality *= width_increase;
    //        }

            {
                var M_location = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M_location, false, matrix);

                var near_location = gl.getUniformLocation(shaderProgram, 'near');
                gl.uniform1f(near_location, near_St[0]);

                var half_width_reality_location = gl.getUniformLocation(shaderProgram, 'half_width_reality');
                gl.uniform1f(half_width_reality_location, half_width_reality);
                var c = [0.0, 0.0, 0.0]; // black
    //            if (width_increase <= 0)
    //            {
    //                // var c = this.colors[tile.id % this.colors.length];
    //                c = [1.0, 1.0, 1.0]; // white
    //            }
                var color_location = gl.getUniformLocation(shaderProgram, 'uColor');
                gl.uniform4f(color_location, c[0], c[1], c[2], tree_setting.opacity);
            }

            //// Set clear color to white, fully opaque
            //// gl.clearColor(1., 1., 1., 1.0);
            //// gl.clearDepth(1.0); // Clear everything

            //// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color
            //// gl.clear(gl.COLOR_BUFFER_BIT)

            //// gl.disable(gl.BLEND);
            ////gl.enable(gl.BLEND); // FIXME: needed?
            //gl.disable(gl.DEPTH_TEST);

            //// gl.enable(gl.CULL_FACE);
            // gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?

            //// gl.cullFace(gl.BACK);
            //// gl.cullFace(gl.FRONT);
            //// gl.cullFace(gl.FRONT_AND_BACK);

            //gl.drawArrays(
            //    gl.TRIANGLES, // kind of primitives to render; e.g., POINTS, LINES
            //    0,            // Specifies the starting index in the enabled arrays.
            //    triangleVertexPosBufr.numItems // Specifies the number of indices to be rendered.
            //);


            //gl.enable(gl.CULL_FACE);
            gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?



            //if (tree_setting.draw_cw_faces == true) {
            //    gl.cullFace(gl.BACK); //triangles from FME are clock wise
            //}
            //else {
            //    gl.cullFace(gl.FRONT); //triangles from SSC are counter-clock wise; 
            //}

            //gl.cullFace(gl.BACK);
            //gl.cullFace(gl.FRONT);

            //if (tree_setting.do_depth_test == true) {
            //    gl.enable(gl.DEPTH_TEST);
            //}
            //else {
            //    gl.disable(gl.DEPTH_TEST);
            //}
            gl.disable(gl.DEPTH_TEST);

            //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

            if (tree_setting.do_blend == true) {
                gl.enable(gl.BLEND);
            }
            else {
                gl.disable(gl.BLEND);
            }

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //make it transparent according to alpha value
            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
        };

        return LineDrawProgram;
    }(DrawProgram));



    var PolygonDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function PolygonDrawProgram(gl) {

            var vertexShaderText = "\nprecision highp float;\n\nattribute vec3 vertexPosition_modelspace;\nattribute vec3 vertexColor;\nuniform mat4 M;\nvarying vec4 fragColor;\nuniform float opacity;\n\nvoid main()\n{\n    fragColor = vec4(vertexColor, opacity);\n    gl_Position = M * vec4(vertexPosition_modelspace, 1);\n}\n";
            var fragmentShaderText = "\nprecision highp float;\n\nvarying vec4 fragColor;\nvoid main()\n{\n    gl_FragColor = vec4(fragColor);\n}\n";

            //        let vertexShaderText = `
    //precision highp float;

    //attribute vec3 vertexPosition_modelspace;
    //attribute vec3 vertexColor;
    //uniform mat4 M;
    //varying vec4 fragColor;
    //uniform float opacity;
    //varying vec3 vertexColor2;
    //varying float opacity2;

    //void main()
    //{
    //    vertexColor2 = vertexColor;
    //    opacity2 = opacity;

    //    gl_Position = M * vec4(vertexPosition_modelspace, 1);
    //}
    //`;
    //        let fragmentShaderText = `
    //precision mediump float;

    //uniform vec4 fragColor2;
    //varying vec3 vertexColor2;
    //varying float opacity2;

    //void main()
    //{
    //    gl_FragColor = vec4(vertexColor2,opacity2);
    //}
    //`;

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);
        }

        if ( DrawProgram ) PolygonDrawProgram.__proto__ = DrawProgram;
        PolygonDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        PolygonDrawProgram.prototype.constructor = PolygonDrawProgram;


        PolygonDrawProgram.prototype.draw_tile = function draw_tile (matrix, tile, tree_setting, width, height) {
            // guard: if no data in the tile, we will skip rendering
            var triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
            if (triangleVertexPosBufr === null) {
                //console.log('drawprograms.js draw_tile, triangleVertexPosBufr:', triangleVertexPosBufr)
                return;
            }
            // render
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            gl.useProgram(shaderProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);

            //var readout = new Uint8Array(4);
            //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
            //console.log('drawprograms.js color of the center before drawing:', readout)

            //stride = 24: each of the six values(x, y, z, r_frac, g_frac, b_frac) takes 4 bytes
            //itemSize = 3: x, y, z;   
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
            //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);

            {
                var M_location = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M_location, false, matrix);

                var opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
                //console.log('drawprograms.js tree_setting.opacity 2:', tree_setting.opacity)
                gl.uniform1f(opacity_location, tree_setting.opacity);
                //gl.uniform1f(opacity_location, 1);
            }


            gl.enable(gl.CULL_FACE); //must ENABLE       
            if (tree_setting.draw_cw_faces == true) {
                gl.cullFace(gl.BACK); //triangles from FME are clockwise
            }
            else {
                gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
            }
            //gl.cullFace(gl.BACK);
            //gl.cullFace(gl.FRONT);

            if (tree_setting.do_depth_test == true) {
                gl.enable(gl.DEPTH_TEST);
            }
            else {            
                gl.disable(gl.DEPTH_TEST);
            }
            //if a fragment is closer to the camera, then it has a smaller depth value
            gl.depthFunc(gl.LEQUAL); 


            //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

            if (tree_setting.do_blend == false || tree_setting.opacity == 1) {
                //After an area merges another area, we can see a thin sliver.
                //disable blending can avoid those slivers,
                //but the alpha value does not have influence anymore
                //when the opacity is 1, we do not need to blend
                gl.disable(gl.BLEND); 
            }
            else {
                gl.enable(gl.BLEND);
            }        
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //make it transparent according to alpha value
            //renderer._clearDepth()
            //gl.disable(gl.BLEND)
            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);

            //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
            //console.log('drawprograms.js color of the center before drawing:', readout)
        };


        PolygonDrawProgram.prototype.draw_tile_into_fbo = function draw_tile_into_fbo (matrix, tile, tree_setting, width, height) {
            // guard: if no data in the tile, we will skip rendering
            var triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
            if (triangleVertexPosBufr === null) {
                //console.log('drawprograms.js draw_tile, triangleVertexPosBufr:', triangleVertexPosBufr)
                return 0;
            }
            // render
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            gl.useProgram(shaderProgram);
            gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
            gl.viewport(0, 0, width, height);

            var readout = new Uint8Array(4);
            gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js width / 2, height / 2:', width / 2, height / 2)
            //console.log('drawprograms.js color of the center before drawing:', readout)

            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);

            //stride = 24: each of the six values(x, y, z, r_frac, g_frac, b_frac) takes 4 bytes
            //itemSize = 3: x, y, z;   
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
            //itemSize = 3: r_frac, g_frac, b_frac;   offset = 12: the first 12 bytes are for x, y, z
            this._specify_data_for_shaderProgram(gl, shaderProgram, 'vertexColor', 3, 24, 12);

            {
                var M_location = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M_location, false, matrix);

                var opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
                //console.log('drawprograms.js tree_setting.opacity 2:', tree_setting.opacity)
                //gl.uniform1f(opacity_location, tree_setting.opacity);
                gl.uniform1f(opacity_location, 1);
            }
            
            //gl.enable(gl.CULL_FACE); //must ENABLE 
            //console.log('')
            //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT:',
            //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT)
            //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK:',
            //    gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK)
            //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK:',
            //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK)

            //FIXME
            //To my understanding, we should enable face culling.
            //However, if face culling is enabled, color white is drawn to the screen, which is strange.
            //gl.enable(gl.CULL_FACE); //must ENABLE
            gl.disable(gl.CULL_FACE);


            //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT:',
            //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT)
            //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK:',
            //    gl.getParameter(gl.CULL_FACE_MODE) === gl.BACK)
            //console.log('drawprograms.js gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK:',
            //    gl.getParameter(gl.CULL_FACE_MODE) === gl.FRONT_AND_BACK)

            if (tree_setting.draw_cw_faces == true) {
                gl.cullFace(gl.BACK); //triangles from FME are clockwise
            }
            else {
                gl.cullFace(gl.FRONT); //triangles from SSC are counterclockwise; 
            }
            //gl.cullFace(gl.BACK);
            //gl.cullFace(gl.FRONT);
            //gl.cullFace(gl.FRONT_AND_BACK);

            if (tree_setting.do_depth_test == true) {
                gl.enable(gl.DEPTH_TEST);
            }
            else {
                gl.disable(gl.DEPTH_TEST);
            }
            //if a fragment is closer to the camera, then it has a smaller depth value
            //gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            //gl.depthFunc(gl.GEQUAL);
            //gl.depthFunc(gl.ALWAYS);



            //gl.disable(gl.BLEND) //we always opaquely draw into Fbo

            //gl.enable(gl.BLEND);
            //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);



            //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc

            if (tree_setting.do_blend == true) {
                gl.enable(gl.BLEND);
            }
            else {
                //After an area merges another area, we can see a thin sliver.
                //disable blending can avoid those slivers,
                //but the alpha value does not have influence anymore
                gl.disable(gl.BLEND);
            }
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); //make it transparent according to alpha value

            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);


            //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            ////gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js color of the center after drawing:', readout)

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            //gl.readPixels(width / 2, height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            ////gl.readPixels(0.5, 0.5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, readout);
            //console.log('drawprograms.js color of the center original:', readout)
            //return triangleVertexPosBufr.numItems
        };

        return PolygonDrawProgram;
    }(DrawProgram));

    //function Float64ArrayTo32(array64) {
    //    var array32 = new Float32Array(array64.length)
    //    for (var i = 0; i < array64.length; i++) {
    //        array32[i] = array64[i]
    //    }

    //    //console.log('drawprograms.js array64:', array64)

    //    return array64

    //}

    function initVertexBuffers(gl) {
        var verticesTexCoords = new Float32Array([
            // Vertex coordinates, texture coordinate
            -1, 1, 0.0, 1.0,
            -1, -1, 0.0, 0.0,
            1, 1, 1.0, 1.0,
            1, -1, 1.0, 0.0 ]);
        var n = 4; // The number of vertices

        // Create the buffer object
        var vertexTexCoordBuffer = gl.createBuffer();
        if (!vertexTexCoordBuffer) {
            console.log('Failed to create the buffer object');
            return -1;
        }

        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

        var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
        //console.log('drawprograms.js FSIZE:', FSIZE);
        //Get the storage location of a_Position, assign and enable buffer
        var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
        if (a_Position < 0) {
            console.log('Failed to get the storage location of a_Position');
            return -1;
        }
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
        gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

        // Get the storage location of a_TexCoord
        var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
        if (a_TexCoord < 0) {
            console.log('Failed to get the storage location of a_TexCoord');
            return -1;
        }
        // Assign the buffer object to a_TexCoord variable
        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
        gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

        return n;
    }


    function initFramebufferObject(gl, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT) {
        var framebuffer, texture, depthBuffer;

        // Define the error handling function
        var error = function () {
            if (framebuffer) { gl.deleteFramebuffer(framebuffer); }
            if (texture) { gl.deleteTexture(texture); }
            if (depthBuffer) { gl.deleteRenderbuffer(depthBuffer); }
            return null;
        };

        // Create a frame buffer object (FBO)
        framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            console.log('Failed to create frame buffer object');
            return error();
        }

        // Create a texture object and set its size and parameters
        texture = gl.createTexture(); // Create a texture object
        if (!texture) {
            console.log('Failed to create texture object');
            return error();
        }
        gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        framebuffer.texture = texture; // Store the texture object

        // Create a renderbuffer object and Set its size and parameters
        depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
        if (!depthBuffer) {
            console.log('Failed to create renderbuffer object');
            return error();
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); // Bind the object to target
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
        framebuffer.depthBuffer = depthBuffer;


        // Attach the texture and the renderbuffer object to the FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

        // Check if FBO is configured correctly
        var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (gl.FRAMEBUFFER_COMPLETE !== e) {
            console.log('Frame buffer object is incomplete: ' + e.toString());
            return error();
        }

        // Unbind the buffer object
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);

        gl.fbo = framebuffer; //fbo: frambuffer object
    }

    // from https://github.com/kelektiv/node-uuid
    // mit license

    // Lookup Table
    //let byteToHex = [];

    //for (let i = 0; i < 256; ++i) {
    //    byteToHex[i] = (i + 0x100).toString(16).substr(1);
    //}

    //function bytesToUuid(buf, offset) {
    //    let i = offset || 0;
    //    let bth = byteToHex;
    //    // join used to fix memory issue caused by concatenation: 
    //    // https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
    //    return ([bth[buf[i++]], bth[buf[i++]],
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]], '-',
    //    bth[buf[i++]], bth[buf[i++]],
    //    bth[buf[i++]], bth[buf[i++]],
    //    bth[buf[i++]], bth[buf[i++]]]).join('');
    //}

    //function mathRNG() {
    //    let rnds = new Array(16);
    //    for (let i = 0, r; i < 16; i++) {
    //        if ((i & 0x03) === 0) {
    //            r = Math.random() * 0x100000000;
    //        }
    //        rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    //    }
    //    return rnds;
    //}

    function getUuid() {
    //    let x = mathRNG();
    //    return bytesToUuid(x);
        return Math.round(Math.random() * 1e18).toString(36).substring(0, 10)
    }
    // end: from https://github.com/kelektiv/node-uuid


    var MessageBus = function MessageBus() {
        this._topics = {}; // {topic: [subscriberFn, ...], ...}
    };

    MessageBus.prototype.publish = function publish (topic, message, sender) {
        // console.log('publish invoked ' + topic + ' ' + sender + ' ' + message);
        if (sender === null) {
            sender = 0;
        }
        var subscribers = this._topics[topic];
        if (!subscribers) {
            return false;
        }
        subscribers.forEach(function (subscriberFn) {
            setTimeout(subscriberFn(topic, message, sender), 0);
        });

        return true;
    };

    MessageBus.prototype.subscribe = function subscribe (topic, func) {
            var this$1 = this;

        // if the topic list does not exist yet, make one
        if (!this._topics[topic]) {
            this._topics[topic] = [];
        }
        // add the topic to the list
        this._topics[topic].push(func);
        // return reference to arrow function that removes subscription, once invoked
        return {
            remove: (function () {
                // console.log('Invoking remove')
                // console.log(this._topics[topic])
                // console.log('old length ' + this._topics[topic].length)
                var index = this$1._topics[topic].indexOf(func);
                // console.log(index)
                this$1._topics[topic].splice(index, 1);
                // console.log('new length ' + this._topics[topic].length)
                if (this$1._topics[topic].length === 0) {
                    delete this$1._topics[topic];
                }
            })
        }
    };

    var instance = new MessageBus();
    Object.freeze(instance);

    //all the different MessageBusConnectors share the same MessageBus (same topics)
    var MessageBusConnector = function MessageBusConnector() {
        this.id = getUuid();
    };

    MessageBusConnector.prototype.publish = function publish (topic, message) {
        return instance.publish(topic, message, this.id)
    };

    MessageBusConnector.prototype.subscribe = function subscribe (topic, func) {
        return instance.subscribe(topic, func)
    };

    // FIXME: rename draw to renderFunc ?




    var Renderer = function Renderer(gl, canvas, ssctrees) {
        this.gl = gl;
        this.ssctrees = ssctrees;
        this.settings = {
            boundary_width: 0.2,
            //backdrop_opacity: 1,
            //foreground_opacity: 0.5,
            //layer_opacity: 0.5
        };

        // construct programs once, at init time
        this.programs = [
            new PolygonDrawProgram(gl),
            new LineDrawProgram(gl),
            new ImageTileDrawProgram(gl)
            //new ForegroundDrawProgram(gl)
        ];
        this.canvas = canvas;
        this.setViewport(canvas.width, canvas.height);
        //this.fbo = gl.createFramebuffer();
        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    };

    // addBucket(mesh)
    // {
    // console.log('making new mesh')
    // let b = new Bucket(this.gl, mesh)
    // this.buckets.push(b)
    // // setTimeout(() => {
    // // this.buckets.map(bucket => {
    // //     bucket.destroy()
    // // })
    // // }, 15000)
    // }


    Renderer.prototype.render_ssctrees = function render_ssctrees (steps, transform, St, local_statelows, local_statehighs) {
            var this$1 = this;


        this._clearColor();
            
        //draw from the last layer to the first layer; first layer will be on top
        var loop = function ( i ) {
            var ssctree = this$1.ssctrees[i];
            var tree_setting = ssctree.tree_setting;

            //If both low_scale and high_scale do not exist, the map will be drawn
            //If low_scale or high_scale exists, we will check if we should draw the map
            var low_scale = tree_setting.low_scale;
            var high_scale = tree_setting.high_scale;
            if ((low_scale != null && low_scale > St) ||
                (high_scale != null && high_scale < St) ||
                ssctree.tree == null ||  //before the tree is loaded, ssctree.tree == null
                tree_setting.do_draw == false ||
                tree_setting.opacity <= 0) {

                return
            }

            //console.log('render.js steps[i]:', steps[i])

            //let step = steps[i] - 0.01 

            //to compensate with the rounding problems; default value is 0.001
            var default_comp = tree_setting['state_compensation']; //default compsensation number            

            var step = steps[i] - default_comp; 

                
            //console.log('render.js step:', step)

            //let last_step = ssctree.tree.metadata.no_of_steps_Ns
            var last_step = Number.MAX_SAFE_INTEGER;
            if (ssctree.tree != null) { //the tree is null when the tree hasn't been loaded yet. 
                last_step = ssctree.tree.metadata.no_of_steps_Ns;
                //last_step = this.ssctrees[i].tree.metadata.no_of_steps_Ns
            }




            if (step < 0) {
                //so that the slicing plane will intersect with the SSC, 
                //this is also related how to decide whether they intersect; see function overlaps3d in ssctree.js
                step = 0;
                //step = 0.000001
            }
            else if (step >= last_step) {
                step = last_step - 0.000001;
            }

            //***********************************************//
            //A better solution would be like the following
            //because the displaced surface is below the slicing plane with z-coordinate step.
            //However, this requires that the top box's height is larger than 0; 
            //otherwise, no intersection at the top of the ssc; see function overlaps3d in ssctree.js
            //if (step < 0) {
            ////so that the slicing plane will intersect with the SSC, 
            ////this is also related how to decide whether they intersect; see function overlaps3d in ssctree.js
            ////step = 0.000001
            //}
            //else if (step >= last_step) {
            //step = last_step 
            //}



            //steps[i] = step
            //console.log('render.js, step after snapping:', step)

            //console.log('render.js, step after snapping:', step)



            var inputopacity = tree_setting.opacity;
            var opacity1 = inputopacity;
            var opacity2 = 0; //the layer will not be drawn if opacity is 0
            var local_statehigh = 0;
            if (tree_setting.do_color_adapt == true) {
                if (local_statelows[i] == local_statehighs[i]) ;
                else {
                    //if step == local_statelows[i], then local_statehighs[i] == local_statelows[i] because of snapping in map.js
                    var step_progress = (step - local_statelows[i]) / (local_statehighs[i] - local_statelows[i]);
                    opacity2 = step_progress * inputopacity;
                    opacity1 = (inputopacity - opacity2) / (1 - opacity2);

                    local_statehigh = local_statehighs[i] - default_comp;
                }
            }

            //get relevant tiles
            var box2d = transform.getVisibleWorld();
            var box3d = [box2d.xmin, box2d.ymin, step, box2d.xmax, box2d.ymax, step];
            var tiles = ssctree.get_relevant_tiles(box3d, this$1.gl);

            //draw the layer according to the slicing plane
            //console.log()
            var matrix = ssctree.prepare_matrix(step, transform);
            this$1.render_relevant_tiles(ssctree, tiles, matrix, opacity1);


            if (tree_setting.do_color_adapt == true && opacity2 > 0) {
                //console.log('render.js step:', step)
                //console.log('render.js opacity1:', opacity1)
                //console.log('render.js opacity2:', opacity2)
                var matrix2 = ssctree.prepare_matrix(local_statehigh, transform);

                this$1.render_relevant_tiles(ssctree, tiles, matrix2, opacity2);
            }

            // If we want to draw lines twice -> thick line under / small line over
            // we need to do this twice + move the code for determining line width here...
            if (this$1.settings.boundary_width > 0 && tree_setting.datatype == 'polygon') {
                var line_draw_program = this$1.programs[1];
                tiles.forEach(function (tile) {
                    // FIXME: would be nice to specify width here in pixels.
                    // bottom lines (black)
                    // line_draw_program.draw_tile(matrix, tile, near_St, 2.0);
                    // interior (color)
                    line_draw_program.draw_tile(matrix, tile, [step, St], this$1.settings, tree_setting);
                });
            }
        };

            for (var i = steps.length - 1; i >= 0; i--) loop( i );
    };

    Renderer.prototype.render_relevant_tiles = function render_relevant_tiles (ssctree, tiles, matrix, opacity) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?

        //clear the depth before drawing the new layer 
        //so that the new layer will not be discarded by the depth test
        this._clearDepth();
        this._clearDepthFbo();
        //the image in Fbo has been drawn to the screen, so it is safe to clear the color in Fbo
        //On the other hand, we must clear the color in Fbo; otherwise, the next drawing will be influenced
        //because the strategy of the fragmentShaderText in ImageFboDrawProgram
        this._clearColorFbo();



        var gl = this.gl;
        var tree_setting = ssctree.tree_setting;
        var canvas = this.canvas;
            
        if (tiles.length > 0 && opacity > 0) {

            if (tree_setting.datatype == 'polygon') {
                var polygon_draw_program = this.programs[0];

                if (opacity == 1) {
                    tiles.forEach(function (tile) { // .filter(tile => {tile.}) // FIXME tile should only have polygon data
                        polygon_draw_program.draw_tile(matrix, tile, tree_setting, canvas.width, canvas.height);
                    });
                }
                else { 
                    //drawing first into offline fbo and second on screen 
                    //will result in flickering on some poor computers (e.g., Dongliang's HP 15-bs183nd)
                    tiles.forEach(function (tile) { // .filter(tile => {tile.}) // FIXME tile should only have polygon data
                        polygon_draw_program.draw_tile_into_fbo(matrix, tile, tree_setting, canvas.width, canvas.height);
                    });

                    var image_fbo_program = new ImageFboDrawProgram(gl);
                    image_fbo_program.draw_fbo(gl.fbo, opacity);
                }
            }
            else if (tree_setting.datatype == 'image') {
                var image_tile_draw_program = this.programs[2];
                tiles.filter(function (tile) { // tile should have image data                    
                    return tile.texture !== null
                }).forEach(function (tile) {
                    image_tile_draw_program.draw_tile(matrix, tile, tree_setting);
                });
            }

        }

        //return tiles
        // this.buckets.forEach(bucket => {
        // this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()

    };

    Renderer.prototype._clearDepth = function _clearDepth () {
        var gl = this.gl;
        // gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0); // Clear everything
        //    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear both color and depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);  // clear depth buffer
    };

    Renderer.prototype._clearDepthFbo = function _clearDepthFbo () {
        var gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
        // gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0); // Clear everything
        //    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear both color and depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);  // clear depth buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    Renderer.prototype._clearColor = function _clearColor (r, b, g, a) {
            if ( r === void 0 ) r = 1.0;
            if ( b === void 0 ) b = 1.0;
            if ( g === void 0 ) g = 1.0;
            if ( a === void 0 ) a = 0.0;

    //_clearColor(r = 0.0, g = 0, b = 0, a = 0.0) {
        var gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer
    };

    Renderer.prototype._clearColorFbo = function _clearColorFbo () {
        var gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
        this._clearColor(1.0, 1.0, 1.0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    Renderer.prototype.setViewport = function setViewport (width, height) {
        this.gl.viewport(0, 0, width, height);
    };

    var LayerControl = function LayerControl(map, map_setting) {
        this.map = map;
        this.map_setting = map_setting;
        this.tree_settings = map_setting.tree_settings;
    };

    LayerControl.prototype.add_layercontrols = function add_layercontrols () {
            var this$1 = this;


        // var container_close = document.getElementById("container-close");
        // container_close.parentNode.insertBefore(newheader, container_close)
        // var newcontainer = document.createElement("div");
        // newcontainer.class = 'w3-container w3-padding'
        var msgbus = this.map.msgbus;


        var canvas_nm = '';
        var canvas_nm_bar = '';
        var fs_div_width = '100%';
        var map_description = '';
        // this.map.canvasnm_in_cbnm: if we want to display the canvas name as part of the check box name
        if ('canvas_nm' in this.map_setting && this.map.canvasnm_in_cbnm == true) {
            canvas_nm = this.map_setting.canvas_nm;
            canvas_nm_bar = canvas_nm + '-';
            fs_div_width = '50%';

            if (canvas_nm == 'lcanvas') {
                map_description = 'left map';
            }
            else if (canvas_nm == 'rcanvas') {
                map_description = 'right map';
            }
            else {
                map_description = 'the map';
                console.log('The map name is not as expected (see layercontrol.js)!');
            }
        }

            

        //The hierarchy of the elements of controlling layers
        //modal_content
        //  fs_div (one lyr_setting_div for each map)
        //lyr_fs
        //  fs_legend
        //  lyr_setting_div (one lyr_setting_div for each layer)
        //    cb_lyrnm
        //    opacity_div
        //      opacitytext_span
        //      slider
        var modal_content = document.getElementById('modal-content');


        // make a division of fieldsets
        var fs_div = document.createElement('div');
        modal_content.append(fs_div);
        fs_div.className = 'w3-container w3-padding w3-show-inline-block';
        fs_div.style.width = fs_div_width;

        // make and append a fieldset of layers
        var lyr_fs = document.createElement('fieldset');  //The <fieldset> tag draws a box around the related elements.
        fs_div.append(lyr_fs);
        lyr_fs.className = "w3-white";
        lyr_fs.id = canvas_nm_bar + 'fieldset-layers';  //e.g., lcanvas-fieldset-layers

        // make and append a legend of the fieldset
        var fs_legend = document.createElement('legend');
        lyr_fs.append(fs_legend);
        fs_legend.innerHTML = 'Layers';
        if (map_description != '') {
            fs_legend.innerHTML = 'Layers of ' + map_description;
        }

        this.tree_settings.forEach(function (tree_setting) {
            //we save the initial values so that we can go to the start status
            var initial_tree_setting = Object.assign({}, tree_setting); 

            var lyrnm = tree_setting.layer_nm;
            //console.log('map.js layer_nm:', layer_nm)
            // create a new div element 
            //var newfieldset = document.createElement("fieldset");
            //fieldset_layers.append(newfieldset)

            var lyr_setting_div = document.createElement("div");

            lyr_fs.append(lyr_setting_div);
            lyr_setting_div.className = 'w3-margin-bottom margin-right-32 w3-show-inline-block';
            //make the legend of the layer
            var cb_lyrnm = document.createElement("div"); //checkbox and layer name
            lyr_setting_div.append(cb_lyrnm); //must append at the beginning so that the content of innerHTML is effective immediately



            var canvaslyrnm = canvas_nm_bar + lyrnm;
            var id_cb = canvaslyrnm + '-cb';
            var topic_cb = 'setting.layer.' + id_cb;
            cb_lyrnm.innerHTML = "<input type=\"checkbox\" id=" + id_cb + " onclick=\"toggleLayer(this)\"> " + lyrnm;
            var cb = document.getElementById(id_cb);
            cb.checked = tree_setting.do_draw;
            cb.value = topic_cb;


            msgbus.subscribe(topic_cb, function (topic, message, sender) {                
                tree_setting.do_draw = message; //if we want to draw the layer or not                
                this$1.map.abortAndRender();
            });


            var opacity_div = document.createElement("div");
            lyr_setting_div.append(opacity_div);

            var opacitytext_div = document.createElement("span");
            opacity_div.appendChild(opacitytext_div);
            opacitytext_div.className = 'w3-show-inline-block';
            opacitytext_div.innerHTML = 'opacity: ';

            //make the slider for the opacity
            var opacitytext_span = document.createElement("span");
            opacity_div.appendChild(opacitytext_span);
            opacitytext_span.id = canvaslyrnm + '-opacity-value';
            opacitytext_span.className = 'span-40';
            opacitytext_span.innerHTML = tree_setting.opacity;

            var slider = document.createElement("input");
            opacity_div.appendChild(slider);
            slider.className = 'w3-show-inline-block';
            // slider.id = layer_nm + '_opacity-slider';

            slider.type = 'range';
            slider.min = 0;
            slider.max = 1;
            slider.step = 0.05;
            //we must set the value after setting slider.step; otherwise, uneffective
            slider.value = tree_setting.opacity;

            var topic_opacity = 'setting.layer.' + canvaslyrnm + '_opacity-slider';

            //subscription of the tree_setting opacity value
            msgbus.subscribe(topic_opacity, function (topic, message, sender) {
                opacitytext_span.innerHTML = message;
                tree_setting.opacity = parseFloat(message);
                this$1.map.abortAndRender();
            });

            //publish new opacity value
            slider.addEventListener('input', function () {
                msgbus.publish(topic_opacity, parseFloat(slider.value));
            });
                
            msgbus.subscribe('go-to-start', function (topic, message, sender) {
                //opacity value of a layer
                slider.value = initial_tree_setting.opacity;
                msgbus.publish(topic_opacity, parseFloat(slider.value));
                //if a layer should be displayed or not
                cb.checked = initial_tree_setting.do_draw;
                msgbus.publish(topic_cb, initial_tree_setting.do_draw);
            });
        });
    };

    // Make function toggleLayer globally accessible so that it can be used in the innerHTML of an HTML element
    // see https://stackoverflow.com/questions/14769158/making-js-local-function-globally-accessible
    window.toggleLayer = function(cb) {
        var msgbus = new varioscale.MessageBusConnector();
        var topic = cb.value;

        //this topic is subscribed in method add_layercontrols of class LayerControl
        msgbus.publish(topic, cb.checked);
    };

    // FIXME: UNIFY TileContent and ImageTileContent by branching inside load()-method
    // on the file extension to be retrieved... (not super elegant)

    // This makes TileContent quite big class -> split in subclasses?


    var isPowerOf2 = (function (value) { return (value & (value - 1)) == 0 });

    var TileContent = function TileContent(msgbus, texture_root_href, worker_helper) {
        this.msgbus = msgbus;
        this.worker_helper = worker_helper;

        // image tiles
        this.texture_root_href = texture_root_href;
        this.buffer = null;
        this.texture = null;
        this.textureCoordBuffer = null;

        // ssc tiles
        this.polygon_triangleVertexPosBufr = null;
        this.line_triangleVertexPosBufr = null;
        this.displacementBuffer = null;
        //this.foreground_triangleVertexPosBufr = null;


    };

    TileContent.prototype.load = function load (url, gl) {
        if (url.endsWith('obj') || url.endsWith('obj?raw=true') == true) {
            this.load_ssc_tile(url, gl);
        }
        else if (url.endsWith('json') == true) {
            this.load_image_tile(url, gl);
        }
        //else if (url.endsWith('geojson') == true) {
        //this.load_geojson_tile(url, gl)
        //}
        else {
            console.error('unknown url type: ' + url);
        }
    };

    TileContent.prototype.load_ssc_tile = function load_ssc_tile (url, gl) {
            var this$1 = this;

        this.worker_helper.send( //send is a function of class WorkerHelper (see ssctree.js)
            url, //e.g. /gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj
            function (data) { //I call the function makeBuffers, this is a function used as a parameter
                //console.log('')
                //console.log('tilecontent.js load_ssc_tile, url:', url)
                // upload received data to GPU

                // buffer for triangles of polygons
                // itemSize = 6: x, y, z, r_frac, g_frac, b_frac (see parse.js)
                //console.log('tilecontent.js data[0]:', data[0])
                gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo); //FIXME: could we remove this line?
                this$1.polygon_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[0]), 6);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);  //FIXME: could we remove this line?
                //console.log('tilecontent.js load_ssc_tile, this.polygon_triangleVertexPosBufr:', this.polygon_triangleVertexPosBufr)
                //if (this.polygon_triangleVertexPosBufr == null) {
                //console.log('tilecontent.js load_ssc_tile, url:', url)
                //console.log('tilecontent.js load_ssc_tile, polygon_triangleVertexPosBufr:', polygon_triangleVertexPosBufr)
                //console.log('tilecontent.js load_ssc_tile, data[0]:', data[0])
                //}
                //console.log('tiles.js url2:', url)


                // buffer for triangles of boundaries
                // itemSize = 4: x, y, z (step_low), w (step_high); e.g., start (see parse.js)
                this$1.line_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[1]), 4);

                // buffer for displacements of boundaries
                // itemSize = 2: x and y; e.g., startl (see parse.js)
                this$1.displacementBuffer = create_data_buffer(gl, new Float32Array(data[2]), 2);

                //var foreground_data_array = new Float32Array([
                //186500, 312600, 0, 1, 0, 0, 0.5,
                //186700, 311800, 0, 0, 0, 1, 0.5,
                //186200, 311800, 0, 0, 1, 0, 0.5]) //clockwise
                //this.foreground_triangleVertexPosBufr = create_data_buffer(gl, foreground_data_array, 7)


                // notify we are ready
                this$1.msgbus.publish('data.tile.loaded', 'tile.ready');

                function create_data_buffer(gl, data_array, itemSize) {
                    var data_buffer = gl.createBuffer();
                    //Unfortunately, the data that is buffered must be with type Float32Array (not Float64Array)
                    gl.bindBuffer(gl.ARRAY_BUFFER, data_buffer); 
                    gl.bufferData(gl.ARRAY_BUFFER, data_array, gl.STATIC_DRAW);
                    data_buffer.itemSize = itemSize; //x, y, z, r_frac, g_frac, b_frac
                    //console.log('tiles.js data_array.length:', data_array.length)
                    data_buffer.numItems = data_array.length / itemSize;
                    return data_buffer;
                }

            }
        );
    };

    TileContent.prototype.load_image_tile = function load_image_tile (href, gl) {
            var this$1 = this;

        var f = function () {
            // setup texture as placeholder for texture to be retrieved later
            this$1.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this$1.texture);
            // Because images have to be download over the internet
            // they might take a moment until they are ready.
            // Until then put a single pixel in the texture so we can
            // use it immediately. When the image has finished downloading
            // we'll update the texture with the contents of the image.
            var level = 0;
            var internalFormat = gl.RGBA;
            var width = 1;
            var height = 1;
            var border = 0;
            var srcFormat = gl.RGBA;
            var srcType = gl.UNSIGNED_BYTE;
            var pixel = new Uint8Array([255, 255, 255, 0]);  // white
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);
            this$1.textureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this$1.textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                0.0, 0.0,
                0.0, 1.0,
                1.0, 1.0,
                0.0, 0.0,
                1.0, 1.0,
                1.0, 0.0
            ]), gl.STATIC_DRAW);

            fetch(href).then(function (r) { return r.json() })
                .then(function (mesh) {
                    this$1._process_image_tile(mesh, gl);
                    // this.msgbus.publish('data', 'tile.loaded.triangles')
                })
                .catch(function (err) { console.error(err); });
        };

        f();
        // q.add(f)

        // let image = new Image()
        // let now = performance.now()
        // image.crossOrigin = ""
        // image.src = 'https://geodata.nationaalgeoregister.nl/tiles/service/tms/1.0.0/brtachtergrondkaart/EPSG:28992/0/0/0.png'
        // image.addEventListener('load', () => {
        // this.texture = gl.createTexture();
        // gl.bindTexture(gl.TEXTURE_2D, this.texture);         
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        // console.log(performance.now() - now)
        // if (isPowerOf2(image.width) && isPowerOf2(image.height)) 
        // {
        //     gl.generateMipmap(gl.TEXTURE_2D);
        // }
        // else
        // {
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // }
        // })
        /*
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        var now = performance.now();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    */
        // let scope = this;
        // let client = new XMLHttpRequest();
        // client.open('GET', this.url, true);
        // "text", "", "arraybuffer", "json" -- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
        // client.responseType = "text";  
        // client.onreadystatechange = function()
        // {
        // if (client.readyState === XMLHttpRequest.DONE && client.status === 200)
        // {
        //     console.log('loaded tile ' + scope.url)
        //     scope._process(client.response);
        //     // var buf = new ArrayBuffer(client.response.length);
        //     // buf = client.response;
        //     // // Here we do transfer the buffer in a way that does not involve
        //     // // copying the ArrayBuffer
        //     // // Note, we do assume that this works, but as it has been added
        //     // // to the spec later, this could not be implemented in a browser!
        //     // postMessage(buf, [buf]);
        // }
        // // we close the worker process
        // // close();
        // }
        // client.send(null);
    };

    TileContent.prototype._process_image_tile = function _process_image_tile (response, gl) {
            var this$1 = this;


        // the json retrieved in response will contain: 
        // {"box": [216931.52, 573100.48, 223812.8, 579981.76],
        //  "texture_href": "7/73/80.png",
        //  "points": [[216931.52, 579981.76, 0], [216931.52, 573100.48, 0], [223812.8, 573100.48, 0], [216931.52, 579981.76, 0], [223812.8, 573100.48, 0], [223812.8, 579981.76, 0]]}   
        var result = [];

        response.points.forEach(
            function (point) { return result.push.apply(result, point); }
        );
        // could also be: response.points.flat(1); ???
        this._upload_image_tile_mesh(gl, new Float32Array(result));
        /*
        // using image object to retrieve the texture
        let image = new Image()
        image.crossOrigin = ""
        image.src = this.texture_root_href + response.texture_href
        image.addEventListener('load', 
            () => {
                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                if (isPowerOf2(image.width) && isPowerOf2(image.height)) 
                {
                    console.log('mipmapping')
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                else
                {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                this.msgbus.publish('data.tile.loaded', 'tile.loaded.texture')
            }
        )
        */
        /*
            					type: "wmts",
    					options: {
    						url: 'https://geodata.nationaalgeoregister.nl/tiles/service/wmts?',
    						layer: 'brtachtergrondkaart',
    						style: 'default',
    						tileMatrixSet: "EPSG:28992",
    						service: "WMTS",
    						request: "GetTile",
    						version: "1.0.0",
    						format: "image/png"
    					}
        */
            
        // using createImageBitmap and fetch to retrieve the texture

        var parts = response.texture_href.split('.'); //  7/73/80.png
        var address = parts[0].split('/');
        var z = +address[0];
        var along_dim = Math.pow(2, z);
        var row = +address[1];
        var col = +address[2];
        var url = "https://geodata.nationaalgeoregister.nl/tiles/service/wmts?&layer=brtachtergrondkaart&style=default&tileMatrixSet=EPSG:28992&service=WMTS&request=GetTile&version=1.0.0&format=image/png";
        url += "&TileCol="+row+"&TileRow="+(along_dim-col)+"&tileMatrix="+z;
        fetch(url, { mode: 'cors' })
            .then(function (response) {
                if (!response.ok) {
                    throw response;
                }
                return response.blob();
            })
            .then(function (blob) {
                // Giving options does not work for Firefox (do we need to give all option fields?)
                return createImageBitmap(blob
                    // , 
                    // {
                    // premultiplyAlpha: 'none',
                    // colorSpaceConversion: 'none',
                    // }
                );
            }).then(function (bitmap) {
                this$1.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this$1.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
                if (isPowerOf2(bitmap.width) && isPowerOf2(bitmap.height)) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                this$1.msgbus.publish('data.tile.loaded', 'tile.loaded.texture');
            }).catch(function (e) {
                console.error(e);
            });
    };

    TileContent.prototype._upload_image_tile_mesh = function _upload_image_tile_mesh (gl, mesh) {
        this.buffer = gl.createBuffer();  //buffer is an object with a reference to the memory location on the GPU
        // bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        // upload content to the GPU
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
        // remember number of triangles for this buffer
        this.buffer.numItems = (mesh.length) / 3;
        // do not keep the floatarray object alive
        // now we have uploaded the triangles to the GPU
        // FIXME: is this needed?
        // this.buffer.buffer = null
    };

    TileContent.prototype.destroy = function destroy (gl) {
        // clear buffers / textures
        var buffers = [this.buffer, this.textureCoordBuffer, this.line_triangleVertexPosBufr,
        this.displacementBuffer, this.polygon_triangleVertexPosBufr];
        buffers.forEach(
            function (buffer) {
                if (buffer !== null) {
                    gl.deleteBuffer(buffer);
                    buffer = null;
                }
            }
        );
        var textures = [this.texture];
        textures.forEach(
            function (texture) {
                gl.deleteTexture(texture);
                texture = null;
            }
        );

    };

    //import { facecount, setfacecount, readfacecount} from "./parse.js"
    //import { require } from "./require"
    //var SortedMap = require("collections/sorted-map");
    //import { fromArray } from '@collectable/sorted-set';
    //import { fromArray } from '../node_modules/@collectable/sorted-set';
    //import Transform from './transform';
    //import { log } from "util";

    //import Rectangle from './rect';
    //var meter_to_pixel = 3779.5275590551; // 1 meter equals 3779.5275590551 pixels


    // FIXME:
    // [x] Remove retrieved property on SSCTree 
    // [x] Unify ImageTileContent and TileContent into one class
    // [x] Make Renderer play nicely with the modifications
    // [x] Resurrect Evictor, with default strategy of removing old stuff
    // [ ] Make use of worker to retrieve ImageTiles
    // [x] Use logicalProcessors = window.navigator.hardwareConcurrency for creating the WorkerHelper Pool
    // [ ] Make retrieval more resilient against non-working server (e.g. ask again for tile content), 
    //     while not overloading the server(queueing requests / abortcontroller.signal)
    // [ ] It should be possible to cancel unneeded requests that have not yet been retrieved (e.g. after user has zoomed)





    var SSCTree = function SSCTree(msgbus, tree_setting) {
        this.msgbus = msgbus;
        this.tree = null;
        this.tree_setting = tree_setting;
        this.states = null;
        this.if_snap = false;
        // FIXME: as the pool of workers is owned by the ssctree, adding a new SSCTree makes again (many) more workers
        // There should be just 1 pool of workers, e.g. in the map object, that is used by all
        // SSCTrees for data retrieval -> also images should be retrieved by a
        // worker for example

        // pool of workers
        var pool_size = window.navigator.hardwareConcurrency || 2;

        //console.log('ssctree.js window.navigator.hardwareConcurrency:', window.navigator.hardwareConcurrency)
        //console.log('ssctree.js pool_size:', pool_size)
        this.worker_helpers = [];
        for (var i = 0; i < pool_size + 1; i++) {
            this.worker_helpers.push(new WorkerHelper());
        }
        console.log(pool_size + ' workers made');
        this.helper_idx_current = -1;
    };

    SSCTree.prototype.load = function load () {
            var this$1 = this;

        //
        // FIXME: convert to worker that does this
        // 
        // fetch('nl/tree_max9_fanout10_9.json')

        //we specify folder 'dist_test', 'dist_buchholz_greedy', or 'dist_buchholz_astar' in sscview-js\rollup.config.js
        //let data_folder = 'data/';
        //    let jsonfile = 'nodes.json';
        //let jsonfile = 'tree_buchholz.json';
        //let jsonfile = 'tree.json';
        //console.log('fetching root' + this.tree_setting.tree_root_href + this.tree_setting.tree_root_file_nm)

        //e.g., this.tree_setting.tree_root_href: '/data/'
        //e.g., this.tree_setting.tree_root_file_nm: 'tree.json'
        //e.g., this.tree_setting.step_event_exc_link: link to 'step_event_exc.json'
        var states = [0];
        if (this.tree_setting.step_event_exc_link != null) {
            this.if_snap = true;

            fetch(this.tree_setting.step_event_exc_link)
                .then(function (r) {
                    //console.log('ssctree.js r:', r)
                    return r.json()
                })
                .then(function (filecontent) {
                    //console.log('ssctree.js filecontent:', filecontent)
                    var current_face_num = filecontent.face_num;
                    var parallel_param = filecontent.parallel_param;
                    var step_event_exceptions = filecontent.step_event_exceptions;
                    var exception_index = 0;
                    var step = 1;
                    while (current_face_num > 1) {
                        var eventnum = Math.ceil(current_face_num * parallel_param);
                        if (exception_index < step_event_exceptions.length && step_event_exceptions[exception_index][0] == step) {
                            eventnum = step_event_exceptions[exception_index][1];
                            exception_index += 1;
                        }

                        states.push(states[states.length - 1] + eventnum);

                        step += 1;
                        current_face_num -= eventnum;
                    }

                    //console.log('ssctree.js states1:', states)
                })
                .then(function () {
                    //this.msgbus.publish('data.states.loaded')
                    console.log('ssctree.js states:', states);
                })
                .catch(function () {
                    states = null;
                });
        }

        fetch(this.tree_setting.tree_root_href + this.tree_setting.tree_root_file_nm)
            .then(function (r) {
                return r.json()
            })
            .then(function (tree) {  //tree: the content in the json file
                this$1.tree = tree;
                //let box3d = tree.box;
                //tree.center2d = [(box3d[0] + box3d[3]) / 2, (box3d[1] + box3d[4]) / 2]
                var dataelements = obtain_dataelements(tree);  //all the dataelements recorded in .json file
                dataelements.forEach(function (element) { //originally, each element has attributes "id", "box", "info"
                    element.content = null;
                    element.last_touched = null;
                    element.url = this$1.tree_setting.tile_root_href + element.href;  //e.g., element.href: node02145.obj
                    //console.log('ssctree.js element.href:', element.href)
                    element.loaded = false;
                });

                //if we don't snap, then we make states == [0, 1, 2, 3, 4, 5, ...]
                if (this$1.if_snap == false) {
                    var step_num = tree.metadata.no_of_steps_Ns;
                    for (var i = 0; i < step_num; i++) {
                        states.push(states[states.length - 1] + 1);
                    }
                }
            })
            .then(function () {
                // Notify via PubSub that tree has loaded 
                // (this re-renders the map if not already rendering)
                this$1.msgbus.publish('data.tree.loaded', ['tree.ready', this$1]);
            })
            .catch(function (err) {
                console.error(err);
            });

        this.states = states;
    };



    SSCTree.prototype.get_relevant_tiles = function get_relevant_tiles (box3d, gl) {
        if (this.tree === null) { return [] }
        this.fetch_tiles(box3d, gl);
        var overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d);
        return overlapped_dataelements
            .map(function (elem) { // set for each tile to be rendered the last accessed time
                elem.last_touched = _now();
                return elem
            })
    };

    SSCTree.prototype.prepare_matrix = function prepare_matrix (near, transform) {
        var matrix = transform.world_square;
        var far = -0.5;
        matrix[10] = -2.0 / (near - far);        
        matrix[14] = (near + far) / (near - far);

        return matrix
    };

    SSCTree.prototype.fetch_tiles = function fetch_tiles (box3d, gl) {
            var this$1 = this;

        if (this.tree === null) { return }
        //console.log('ssctree.js fetch_tiles, this.tree_setting.tree_root_file_nm 1:', this.tree_setting.tree_root_file_nm)
        //console.log('')
        //console.log('ssctree.js fetch_tiles, this.tree:', this.tree)
        //console.log('ssctree.js fetch_tiles, box3d:', box3d)
        //e.g., this.tree: the content in file tree_smooth.json
        var leaves = obtain_overlapped_unloaded_leaves(this.tree, box3d);

        leaves.map(function (leaf) {
            this$1.load_subtree(leaf); //each leaf points to a subtree
        });

        var overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d);

        var to_retrieve = [];
        overlapped_dataelements.map(function (elem) {
            if (elem.loaded === false) {
                to_retrieve.push(elem);
            }
        });

        // sort the tiles via the distance from center of the box
        // decorate-sort-undecorate based on distance:
        //  2D center of viewport -- 2D center of bottom of tile
        to_retrieve = to_retrieve.map(
            function (elem) {
                return [distance2d(elem.box, box3d), elem]
            }
        );
        to_retrieve.sort(
            function (a, b) {
                if (a[0] < b[0]) { return -1 }
                else if (a[0] > b[0]) { return 1 }
                else { return 0 }
            }
        );
        to_retrieve = to_retrieve.map(
            function (elem) { return elem[1] }
        );


        //this.tree_setting
        //console.log('ssctree.js fetch_tiles, this.tree_setting.tree_root_file_nm:', this.tree_setting.tree_root_file_nm)
        //console.log('ssctree.js fetch_tiles, to_retrieve:', to_retrieve)

        // schedule tiles for retrieval
        to_retrieve.map(function (elem) {
            this$1.helper_idx_current = (this$1.helper_idx_current + 1) % this$1.worker_helpers.length;
            var content = new TileContent(
                this$1.msgbus,
                this$1.tree_setting.texture_root_href,
                this$1.worker_helpers[this$1.helper_idx_current]
            );
            content.load(elem.url, gl); //e.g., elem.url = /gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj
            //console.log('ssctree.js fetch_tiles, this.helper_idx_current:', this.helper_idx_current)
            //console.log('ssctree.js fetch_tiles, content.polygon_triangleVertexPosBufr:', content.polygon_triangleVertexPosBufr)

            elem.content = content;
            elem.loaded = true;
            elem.last_touched = _now();
            // FIXME: is this really 'retrieved' ? Or more, scheduled for loading ?
        });

    };


    // differences of uri, info, href
    // tree.json points to many "uri" files; e.g., "uri": "tree_728022.json"
    // uri: saved in a child of an image tree; e.g., uri: "tree_728022.json",
    //  which points to many "info" files of names like "info": "8/255/16.json".
    //  file "tree_728022.json" save the z-range for each polyhedron
    // info: saved in a dataelement of an image tree; e.g., "info": "8/255/16.json"
    //  each file like "8/255/16.json" saves the picture "texture_href": "8/255/16.png", the 2d box,
    //  and the six points for the two triangles of the box
    // href: saved in a dataelement of a vector tree; e.g., "sscgen_smooth.obj"    
    // FIXME: a tree can load other trees, however, the property .uri has been renamed in other parts of the code
    // when we have made new tree serialization for tiles, we should change the code here!
    SSCTree.prototype.load_subtree = function load_subtree (node) {
            var this$1 = this;

        fetch(this.tree_setting.tree_root_href + node.uri) // FIXME: was: node.href
            .then(function (r) {
                return r.json()
            })
            .then(function (j) {
                node.children = j.children;
                var dataelements = obtain_dataelements(node);  //all the dataelements recorded in .json file
                dataelements.forEach(function (element) { //originally, each element has attributes "id", "box", "info"
                    element.content = null;
                    element.last_touched = null;
                    //e.g., element.info: 10/502/479.json

                    element.url = this$1.tree_setting.tile_root_href + element.info; // FIXME:  was: element.href
                    //console.log('ssctree.js element.url:', element.url)
                    //console.log('ssctree.js element.info:', element.info)
                    element.loaded = false;
                });

                this$1.msgbus.publish('data.tree.loaded', 'tree.ready');
            })
            .catch(function (err) {
                console.error(err);
            });
    };


    SSCTree.prototype.get_step_from_St = function get_step_from_St (St) {

        if (this.tree === null) {
            return 0
        }
        //console.log('')

        // reduction in percentage
        var reductionf = 1 - Math.pow(this.tree.metadata.start_scale_Sb / St, 2);
        //console.log('ssctree.js reductionf:', reductionf)
        var step = this.tree.metadata.no_of_objects_Nb * reductionf; //step is not necessarily an integer
        //let step = this.tree.metadata.no_of_steps_Ns * reductionf
        //console.log('ssctree.js step:', step)
        //console.log('ssctree.js Nt:', this.tree.metadata.no_of_objects_Nb - step)

        return step
    };

    //when current_step != Number.MAX_SAFE_INTEGER, St is the new one after computing zoom parameters
    SSCTree.prototype.get_zoom_snappedstep_from_St = function get_zoom_snappedstep_from_St (St, zoom_factor) {
            if ( zoom_factor === void 0 ) zoom_factor = 1;


        var snap_style = null; //do not snap by default

        //to decide the direction we want to zoom to
        if (zoom_factor < 1) { //zoom out
            snap_style = 'ceil';
        }
        if (zoom_factor > 1) { //zoom in
            snap_style = 'floor';
        }
            
        return this.get_snappedstep_from_St(St, snap_style)
    };

    //if (if_floor == false && if_ceil == false), then we snap to the cloest step
    SSCTree.prototype.get_snappedstep_from_St = function get_snappedstep_from_St (St, snap_style) {
            if ( snap_style === void 0 ) snap_style = null;


        if (this.tree === null) {
            return 0
        }

        var step = this.get_step_from_St(St);
        var snapped_step = step;
        var states = this.states;
        if (this.if_snap == true
            && step > states[0] - 0.0001
            && step < states[states.length - 1] + 0.0001 //without this line, the map will stop zooming out when at the last step
        ) {
            snapped_step = this.snap_state(step, snap_style);
        }

        return snapped_step
    };

    SSCTree.prototype.snap_state = function snap_state (state, snap_style) {
            if ( snap_style === void 0 ) snap_style = null;

        return snap_value(state, this.states, snap_style)
        //return this.states[this.snap_stateindex(state, if_floor, if_ceil)]
    };

    SSCTree.prototype.get_time_factor = function get_time_factor (St_new, zoom_factor, current_step) {

        if (this.tree === null) {
            return 1
        }

        // reduction in percentage
        //let reductionf = 1 - Math.pow(this.tree.metadata.start_scale_Sb / St, 2)
        //let step = this.tree.metadata.no_of_objects_Nb * reductionf //step is not necessarily an integer
        var newstep = this.get_step_from_St(St_new);

        var snapped_step = newstep;
        var states = this.states;
        var time_factor = 1;
        if (this.if_snap == true
            && newstep > states[0] - 0.0001
            && newstep < states[states.length - 1] + 0.0001 //without this line, the map will stop zooming out when at the last step
        ) {

            var normal_step_diff = Math.abs(newstep - current_step);

            //let snapped_index = 0
            if (zoom_factor == 1) {
                //console.log('ssctree.js panning')
                snapped_step = this.snap_state(newstep, null);
            }
            else if (zoom_factor < 1) { //zoom out
                //console.log('ssctree.js zoom out')
                snapped_step = this.snap_state(newstep, 'ceil');
            }
            else if (zoom_factor > 1) { //zoom in
                //console.log('ssctree.js zoom in')
                snapped_step = this.snap_state(newstep, 'floor');
            }

            var adjusted_step_diff = Math.abs(snapped_step - current_step);
            time_factor = adjusted_step_diff / normal_step_diff;
        }

        //return Math.max(0, step)
        return time_factor
    };

    SSCTree.prototype.get_St_from_step = function get_St_from_step (step) {
        var Nb = this.tree.metadata.no_of_objects_Nb;
        var St = this.tree.metadata.start_scale_Sb * Math.pow(Nb / (Nb - step), 0.5);

        //console.log('transform.js step, Nb, Sb, St:', step, Nb, this.tree.metadata.start_scale_Sb, St)
        return St
    };

    function snap_value(value, targets, snap_style) {
        if ( snap_style === void 0 ) snap_style = null;

        return targets[snap_value_index(value, targets, snap_style)]
    }


    // if snap_style == null, we snap to the closest value
    // if snap_style == 'floor', we snap to the floor
    // if snap_style == 'ceil', we snap to the ceiling
    // if snap_style == 'zoom_mid', we snap to the closest value with respect to zooming
    function snap_value_index(value, targets, snap_style) {
        if ( snap_style === void 0 ) snap_style = null;

        var start = 0, end = targets.length - 1;

        if (value < targets[0]) {
            return 0
        }
        if (value > targets[end]) {
            return end
        }

        // Iterate while start not meets end 
        while (start <= end) {

            // Find the mid index 
            var mid = Math.floor((start + end) / 2);

            // If element is present at mid, return True 
            if (targets[mid] == value) { return mid; }

            // Else look in left or right half accordingly 
            else if (targets[mid] < value)
                { start = mid + 1; }
            else
                { end = mid - 1; }
        }

        //at this point, start - end == 1
        if (snap_style == 'floor') { //snap to floor
            return end
        }
        else if (snap_style == 'ceil') { //snap to ceiling
            return start
        }
        else { //snap to a kind of middle value
            var mid$1 = (targets[start] + targets[end]) / 2;
            if (snap_style == 'zoom_mid') {
                //the reasoning is that targets[start] / mid == mid / targets[end]
                mid$1 = Math.sqrt(targets[start] * targets[end]);
            }

            if (value <= mid$1) {
                return end 
            }
            else {
                return start
            }
        }

        //else if (snap_style == 'zoom_mid') { //snap to ceiling



        //    return start
        //}
        //else if (value - targets[end] <= targets[start] - value) {
        //    return end  
        //}
        //else {
        //    return start
        //}
    }


    function obtain_dataelements(root) {
        // FIXME: make iterator/generator function* 
        // to avoid making the whole result list in memory
        var dataelements = [];
        var stack = [root];
        while (stack.length > 0) {
            var node = stack.pop();

            if (node.hasOwnProperty('children') === true) {
                // visit chids, if they overlap
                node.children.forEach(function (child) {
                    stack.push(child);
                });
            }
            if (node.hasOwnProperty('dataelements') === true) {
                // add data elements to result list
                node.dataelements.forEach(function (element) {
                    dataelements.push(element);
                });
            }
        }
        return dataelements
    }


    function obtain_overlapped_dataelements(node, box3d) {
        // console.log(box)
        var dataelements = [];
        var stack = [node];
        //console.log('ssctree.js, obtain_overlapped_dataelements node:', node)
        //console.log('ssctree.js, obtain_overlapped_dataelements box3d:', box3d)
        var loop = function () {
            var node$1 = stack.pop();

            if (node$1.hasOwnProperty('children') === true)
            {
                // visit chids, if they overlap
                node$1.children.forEach(function (child) {
                    if (overlaps3d(node$1.box, box3d)) {
                        stack.push(child);
                    }
                });
            }

            // add data elements to result list, if box overlaps
            if (node$1.hasOwnProperty('dataelements') === true)
            {
                node$1.dataelements.forEach(function (element) {
                    if (overlaps3d(element.box, box3d)) {
                        dataelements.push(element);
                    }
                });
            }
        };

        while (stack.length > 0) loop();
        //console.log('ssctree.js, obtain_overlapped_dataelements result.length:', result.length)
        return dataelements
    }


    function obtain_overlapped_unloaded_leaves(node, box3d) {
        var leaves = [];
        var stack = [node];
        while (stack.length > 0) {
            var node$1 = stack.pop();
            if (node$1.hasOwnProperty('children') === true)
            {
                // visit chids, if they overlap
                node$1.children.forEach(function (child) {
                    if (child.hasOwnProperty('children'))
                    {
                        stack.push(child);
                    }
                    else if (child.hasOwnProperty('uri') && !child.hasOwnProperty('loaded')
                        && overlaps3d(child.box, box3d)) {
                        leaves.push(child);
                        child.loaded = true;
                    }
                });
            }

        }
        return leaves
    }




    /*
    function overlaps2d(one, other) {
        // Separating axes theorem
        // xmin=[0][0]
        // xmax=[1][0]
        // ymin=[0][1]
        // ymax=[1][1]
        // If one of the following is true then there can be no overlap
        return !(one[1][0] < other[0][0] ||
            one[0][0] > other[1][0] ||
            one[1][1] < other[0][1] ||
            one[0][1] > other[1][1])
    }
    */

    function overlaps3d(sscbox, slicebox) {
        // Separating axes theorem, nD -> 3D
        // one represents the ssc, and other represents the slicing plane
        // e.g., one: [182000, 308000, 0, 191000, 317000, 7]
        // e.g., other: [185210.15625, 311220.96875, 0, 187789.84375, 313678.9375, 0]

        var dims = 3;
        var cmpbox = sscbox;
        //sscbox[2]: z_min, sscbox[5]: z_max
        //console.log('sscbox[2], sscbox[5]:', sscbox[2], sscbox[5])

        //console.log('*************slicebox[2], slicebox[5]:', slicebox[2], slicebox[5])
        //if (sscbox[2] == sscbox[5]) { //this is a special case at the top of the ssc, where the box of level 0 of raster layer has height 0


        //    let newbox = [...sscbox] //copy the values
        //    newbox[5] += 1 //increase z-max
        //    cmpbox = newbox
        //}


        var are_overlapping = true;
        for (var min = 0; min < dims; min++) {
            var max = min + dims;
            if (cmpbox[max] <= slicebox[min] || cmpbox[min] > slicebox[max]) { 
                are_overlapping = false;
                break
            }
        }
        //console.log('ssctree.js are_overlapping:', are_overlapping)
        return are_overlapping
    }


    function center2d(box3d) {
        // 2D center of bottom of box
        var xmin = box3d[0];
        var ymin = box3d[1];
        var xmax = box3d[3];
        var ymax = box3d[4];
        return [xmin + 0.5 * (xmax - xmin),
        ymin + 0.5 * (ymax - ymin)]
    }

    function distance2d(target, against) {
        // find projected distance between 2 box3d objects
        var ctr_t = center2d(target);
        var ctr_a = center2d(against);
        var dx2 = Math.pow(ctr_a[0] - ctr_t[0], 2);
        var dy2 = Math.pow(ctr_a[1] - ctr_t[1], 2);
        return Math.sqrt(dx2 + dy2)
    }




    var WorkerHelper = function WorkerHelper() {
        var this$1 = this;

        this.tasks = {};
        this.worker = new Worker('worker.js');
        this.worker.onmessage = function (evt) { this$1.receive(evt); }; //evt: {id: id, msg: arrays}, arrays; see worker.js
    };

    WorkerHelper.prototype.send = function send (url, callback) //e.g., callback: the function of makeBuffers in TileContent.load_ssc_tile(url, gl)
    {
        // use a random id
        var id = Math.round((Math.random() * 1e18)).toString(36).substring(0, 10);
        this.tasks[id] = callback;
        this.worker.postMessage({ id: id, msg: url }); //parse the data of the obj file specified by the url
    };

    WorkerHelper.prototype.receive = function receive (evt) {
        var id = evt.data.id;
        var msg = evt.data.msg; // e.g., arrays = parse_obj(data_text)
        this.tasks[id](msg); // execute the callback that was registered while sending
        delete this.tasks[id];
    };

    var Map = function Map(map_setting, canvasnm_in_cbnm) {
        var this$1 = this;
        if ( canvasnm_in_cbnm === void 0 ) canvasnm_in_cbnm = false;

        //console.log('map.js test:')
        //console.log('map.js map_setting:', map_setting)
        this.ssctrees = [];
        this.map_setting = map_setting;
        var tree_settings = map_setting.tree_settings;


        var container = map_setting['canvas_nm'];
        if (typeof container === 'string') {
            this._container = window.document.getElementById(container);
        }
        else {
            this._container = container;
        }
        if (!this._container) {
            throw new Error(("Container '" + container + "' not found."))
        }

        //if we want to include the canvas name in the check box name (cbnm)
        //when we have two canvases in a comparer, we should have this.canvasnm_in_cbnm == true
        this.canvasnm_in_cbnm = canvasnm_in_cbnm;


        // FIXME: to not circle map updates (can this be done more elegantly?)
        //    this._should_broadcast_move = true;

        this._action = 'zoomAnimated'; //if we are zooming, we may want to snap to a valid state
        this._abort = null;

        //console.log('map.js map_setting.initialization.center2d:', map_setting.initialization.center2d)
        this._transform = new Transform(
            map_setting.initialization.center2d,
            [this._container.width, this._container.height],
            map_setting.initialization.scale_den);

        /* settings for zooming and panning */
        this._interaction_settings = {
            zoom_factor: 1,
            zoom_duration: 1, //1 second
            time_factor: 1, //we changed the factor because we snap when merging parallelly
            pan_duration: 1,  //1 second
        };
        //this.if_snap = false //if we want to snap, then we only snap according to the first dataset


        this.msgbus = new MessageBusConnector();

        this.msgbus.subscribe('data.tile.loaded', function (topic, message, sender) {
            //console.log('1 subscribe data.tile.loaded')
            if (this$1._abort === null) {
                //console.log('Rendering because received:', topic, ", ", message, ", ", sender)
                this$1.panAnimated(0, 0); // animate for a small time, so that when new tiles are loaded, we are already rendering
            }
        });

        this.msgbus.subscribe('data.tree.loaded', function (topic, message, sender) {
            this$1.panAnimated(0, 0); // animate for a small time, so that when new tiles are loaded, we are already rendering
        });

        this.msgbus.subscribe("settings.boundary-width", function (topic, message, sender) {
            this$1.renderer.settings.boundary_width = parseFloat(message);
            this$1.abortAndRender();
        });

        this.msgbus.subscribe("settings.zoom-factor", function (topic, message, sender) {
            //        console.log(message);

            this$1._interaction_settings.zoom_factor = parseFloat(message);
            //console.log('map.js zoom_factor:', this._interaction_settings.zoom_factor)
            //this.abortAndRender();
        });

        this.msgbus.subscribe("settings.zoom-duration", function (topic, message, sender) {
            //        console.log(message);
            this$1._interaction_settings.zoom_duration = parseFloat(message);
            //this.abortAndRender();
        });
        this.msgbus.subscribe("settings.pan-duration", function (topic, message, sender) {
            //        console.log('setting pan_duration: ' + message);
            this$1._interaction_settings.pan_duration = parseFloat(message);
            //this.abortAndRender();
        });

        this.subscribe_scale();

        var layercontrol = new LayerControl(this, map_setting);
        layercontrol.add_layercontrols();

        tree_settings.forEach(function (tree_setting) {
            //console.log('map.js tree_setting:', tree_setting)
            this$1.ssctrees.push(new SSCTree(this$1.msgbus, tree_setting));
        });
        //console.log('map.js this.ssctrees:', this.ssctrees)


        this.msgbus.subscribe("go-to-start", function (topic, message, sender) {

            var tr = this$1.getTransform();
            var center = map_setting.initialization.center2d;
            var denominator = map_setting.initialization.scale_den;
            var newWidth = tr.viewport.xmax;
            var newHeight = tr.viewport.ymax;
            tr.initTransform(center, [newWidth, newHeight], denominator);
            //this.renderer.setViewport(newWidth, newHeight)
            this$1.abortAndRender();
        });


        //this.ssctree = this.ssctrees[0]
        this.gl = this.getWebGLContext();
        //console.log('map.js container.width, container.height:', this._container.width, this._container.height)
        initFramebufferObject(this.gl, this._container.width, this._container.height); //set gl.fbo
        this.renderer = new Renderer(this.gl, this._container, this.ssctrees);
        //this.renderer.setViewport(this.getCanvasContainer().width,
        //                      this.getCanvasContainer().height)

        dragHandler(this);  // attach mouse handlers
        scrollHandler(this);
        zoomButtonHandler(this);
        //    moveHandler(this)
        touchPinchHandler(this); // attach touch handlers
        touchDragHandler(this);


        {
            var St = this.getTransform().getScaleDenominator();
            //this.ssctree.get_step_from_St(St, this.if_snap)
            this.msgbus.publish('map.scale', [this.getTransform().getCenterWorld(), St]);
        }

        //this.evictor = new Evictor(this.ssctrees, this.gl)
        //// every 30 seconds release resources
        //window.setInterval(
        //() => {
        //    let St = this.getTransform().getScaleDenominator()

        //    let box3ds = []
        //    const box2d = this.getTransform().getVisibleWorld()
        //    this.ssctrees.forEach((ssctree) => {
        //        var step = ssctree.get_step_from_St(St)

        //        //const near_St = this.ssctree.stepMap(this.getTransform().getScaleDenominator())
        //        //const near = near_St[0]

        //        box3ds.push([box2d.xmin, box2d.ymin, step, box2d.xmax, box2d.ymax, step])

        //    })
        //    this.evictor.evict(box3ds)
        //    this.render()

        //},
        //60 * 1000 * 2.5 // every X mins (expressed in millisec)
        ////10000 // every X mins (expressed in millisec)
        //)

    };

    Map.prototype.loadTree = function loadTree () {
        //this.ssctree.load()

        this.ssctrees.forEach(function (ssctree) {
            //console.log('map.js ssctree.tree_setting:', ssctree.tree_setting)
            ssctree.load();
            //var if_snap = ssctree.load()
            //if (if_snap == true ) {
            //this.if_snap = true
            //}
        });
    };

    Map.prototype.getCanvasContainer = function getCanvasContainer () {
        return this._container;
    };

    Map.prototype.getWebGLContext = function getWebGLContext () {
        return this.getCanvasContainer().getContext('webgl',
            { antialias: true, alpha: false, premultipliedAlpha: false })
    };

    Map.prototype.getTransform = function getTransform () {
        return this._transform;
    };

    Map.prototype.render = function render (k) {
            if ( k === void 0 ) k = 0;

        //console.log('')

        var ssctrees = this.ssctrees;
        var St = this.getTransform().getScaleDenominator();
        var St_for_step = St;
        var steps = [];  //record a step for each layer

        //when we merge two area, we want to continuously change the color of the loser to that of the winer
        //Therefore, we want to tune the transparecies of the two levels.
        //local_statelow is for the low level, and local_statelow for the high level
        var local_statelows = []; //a steplow of current step for each layer
        var local_statehighs = []; //a statehigh of current step for each layer


        //snapped_step and snapped_St have been computed by this.getTransform().updateViewportTransform()
        var snapped_step = this.getTransform().snapped_step;
        var snapped_St = this.getTransform().snapped_St; //the St obtained from a snapped step




        //We treat the first layer differently, because we snap according to only the first layer
        //if k==1, we are at the end of a zooming operation, 
        //we directly use the snapped_step and snapped_St to avoid rounding problems
        if (ssctrees[0].if_snap == false) {
            var returned = this.deal_without_snapstate(St, this.ssctrees);

            steps = returned.steps;
            local_statelows = returned.local_statelows;
            local_statehighs = returned.local_statehighs;
        }
        else {
            if (k == 1 &&
                this._action == 'zoomAnimated' &&  //we snap only when zooming, but not panning
                snapped_step != Number.MAX_SAFE_INTEGER) { //we are not at the state of just having loaded data
                St_for_step = snapped_St;
                steps.push(snapped_step);  //we only snap according to the first dataset
                //console.log('map.js snapped_step:', snapped_step)
                local_statelows.push(snapped_step);
                local_statehighs.push(snapped_step);
            }
            else {
                steps.push(ssctrees[0].get_step_from_St(St_for_step));

                //Notice that the two snapped states can be the same
                local_statelows.push(ssctrees[0].snap_state(steps[0], 'floor'));
                local_statehighs.push(ssctrees[0].snap_state(steps[0], 'ceil'));


                //console.log('map.js steps[0]:', steps[0])
                //console.log('map.js local_statehighs[0]:', local_statehighs[0])
                //console.log('map.js local_statelows[0]:', local_statelows[0])
            }

            //add steps of other layers
            for (var i = 1; i < ssctrees.length; i++) {
                steps.push(ssctrees[i].get_step_from_St(St_for_step));
                local_statelows.push(ssctrees[i].snap_state(steps[i], 'floor'));
                local_statehighs.push(ssctrees[i].snap_state(steps[i], 'ceil'));
            }


            ////If we want to have multi-scale map intead of vario-scale map,
            ////we snap the scale and then snap the step
            //let discrete_scales = this.map_setting.tree_settings[0].discrete_scales
            //if (discrete_scales != null) {

            ////console.log('map.js St_for_step:', St_for_step)

            //let scale_snapped_St = snap_value(St_for_step, discrete_scales,
            //    this.map_setting.tree_settings[0].snap_style)

            ////console.log('map.js scale_snapped_St:', scale_snapped_St)


            //if (ssctrees[0].if_snap == false) { //this should be the normal case because we do not want to snap and have discrete_scales at the same time
            //    steps[0] = ssctrees[0].get_step_from_St(scale_snapped_St)

            //    local_statehighs.push(ssctrees[0].snap_state(steps[0], 'ceil'))
            //    local_statelows.push(ssctrees[0].snap_state(steps[0], 'floor'))
            //}
            //else {
            //    console.log("The map may work, but we didn't consider the case carefully, where we snap and we have discrete_scales.")

            //    // snap to a step to avoid half way generalization (e.g. merging)
            //    //steps[0] = ssctrees[0].get_zoom_snappedstep_from_St(scale_snapped_St)
            //    steps[0] = ssctrees[0].get_snappedstep_from_St(scale_snapped_St)

            //    local_statehighs.push(steps[0])
            //    local_statelows.push(steps[0])
            //}

            //}
            //else {
            ////console.log('map.js steps[0]:', steps[0])
            ////console.log('map.js St_for_step:', St_for_step)
            //}
        }




        this.msgbus.publish('map.scale', [this.getTransform().getCenterWorld(), St_for_step]);

        //this.renderer._clearColor()
        this.renderer.render_ssctrees(steps, this.getTransform(), St_for_step, local_statelows, local_statehighs);


    };


    Map.prototype.deal_without_snapstate = function deal_without_snapstate (St, ssctrees) {

        var steps = [];
        var local_statelows = []; //a steplow of current step for each layer
        var local_statehighs = []; //a statehigh of current step for each layer


        //add steps of other layers
        for (var i = 0; i < ssctrees.length; i++) {
            var scale_snapped_St = St;
            var discrete_scales = this.map_setting.tree_settings[i].discrete_scales;
            if (discrete_scales != null) { //this is the normal case
                scale_snapped_St = snap_value(St, discrete_scales,
                    this.map_setting.tree_settings[i].snap_style);
            }

            steps.push(ssctrees[i].get_step_from_St(scale_snapped_St));
            local_statelows.push(ssctrees[i].snap_state(steps[i], 'floor'));
            local_statehighs.push(ssctrees[i].snap_state(steps[i], 'ceil'));
        }
        return { steps: steps, local_statelows: local_statelows, local_statehighs: local_statehighs }
        //return [steps, local_statelows, local_statehighs]

        ////If we want to have multi-scale map intead of vario-scale map,
        ////we snap the scale and then snap the step
        //let discrete_scales = this.map_setting.tree_settings[0].discrete_scales
        //if (discrete_scales != null) {

        ////console.log('map.js St_for_step:', St_for_step)

        //let scale_snapped_St = snap_value(St_for_step, discrete_scales,
        //    this.map_setting.tree_settings[0].snap_style)

        ////console.log('map.js scale_snapped_St:', scale_snapped_St)

        //if (ssctrees[0].if_snap == true) { // snap to a step to avoid half way generalization (e.g. merging)
        //    //steps[0] = ssctrees[0].get_zoom_snappedstep_from_St(scale_snapped_St)
        //    steps[0] = ssctrees[0].get_snappedstep_from_St(scale_snapped_St)

        //    local_statehighs.push(steps[0])
        //    local_statelows.push(steps[0])
        //}
        //else {
        //    steps[0] = ssctrees[0].get_step_from_St(scale_snapped_St)

        //    local_statehighs.push(ssctrees[0].snap_state(steps[0], 'ceil'))
        //    local_statelows.push(ssctrees[0].snap_state(steps[0], 'floor'))
        //}

        //}
        //else {
        ////console.log('map.js steps[0]:', steps[0])
        ////console.log('map.js St_for_step:', St_for_step)
        //}

        ////add steps of other layers
        //for (var i = 1; i < ssctrees.length; i++) {
        //steps.push(ssctrees[i].get_step_from_St(St_for_step))
        //local_statehighs.push(ssctrees[i].snap_state(steps[i], 'ceil'))
        //local_statelows.push(ssctrees[i].snap_state(steps[i], 'floor'))
        //}

        ////add steps of other layers
        //for (var i = 0; i < ssctrees.length; i++) {
        ////If we want to have multi-scale map intead of vario-scale map,
        ////we snap the scale and then snap the step
        //let discrete_scales = this.map_setting.tree_settings[i].discrete_scales
        //if (discrete_scales != null) {

        //    //console.log('map.js St_for_step:', St_for_step)

        //    let scale_snapped_St = snap_value(St_for_step, discrete_scales,
        //        this.map_setting.tree_settings[i].snap_style)

        //    //console.log('map.js scale_snapped_St:', scale_snapped_St)

        //    if (ssctrees[i].if_snap == true) { // snap to a step to avoid half way generalization (e.g. merging)
        //        //steps[0] = ssctrees[0].get_zoom_snappedstep_from_St(scale_snapped_St)
        //        steps[i] = ssctrees[i].get_snappedstep_from_St(scale_snapped_St)

        //        local_statehighs.push(steps[0])
        //        local_statelows.push(steps[0])
        //    }
        //    else {
        //        steps[0] = ssctrees[0].get_step_from_St(scale_snapped_St)

        //        local_statehighs.push(ssctrees[0].snap_state(steps[0], 'ceil'))
        //        local_statelows.push(ssctrees[0].snap_state(steps[0], 'floor'))
        //    }

        //}
        //else {
        //    //console.log('map.js steps[0]:', steps[0])
        //    //console.log('map.js St_for_step:', St_for_step)
        //}
        //}

    };





    Map.prototype.doEaseNone = function doEaseNone (start, end) {
            var this$1 = this;

        var interpolate = (function (k) {
            var m = new Float64Array(16);
            for (var i = 0; i < 16; i++) {
                var delta = start[i] + k * (end[i] - start[i]);
                m[i] = delta;
            }
            // update the world_square matrix
            this$1.getTransform().world_square = m;
            this$1.getTransform().updateViewportTransform();
            this$1.render(k);
            if (k == 1) {
                this$1._abort = null;
            }
        });
        return interpolate;
    };

    Map.prototype.doEaseInOutSine = function doEaseInOutSine (start, end) {
        function interpolate(k) {
            var m = new Float64Array(16);
            var D = Math.cos(Math.PI * k) + 1;
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * 0.5 * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform();
            this.render(k);
            if (k == 1) {
                this._abort = null;
            }
        }
        return interpolate;
    };

    Map.prototype.doEaseOutSine = function doEaseOutSine (start, end) {
            var this$1 = this;
     //start and end: the world squares
        var interpolate = function (k) {
            var m = new Float64Array(16);
            var D = Math.sin(k * Math.PI * 0.5);
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this$1.getTransform().world_square = m;
            this$1.getTransform().updateViewportTransform();
            this$1.render(k);
            if (k === 1) {
                this$1._abort = null;
            }
        };
        return interpolate;
    };

    Map.prototype.doEaseOutQuint = function doEaseOutQuint (start, end) {
        function interpolate(k) {
            var t = k - 1;
            var t5p1 = Math.pow(t, 5) + 1;
            var m = new Float64Array(16);
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * t5p1 + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform();
            this.render(k);
            if (k == 1) {
                this._abort = null;
            }
        }
        return interpolate;
    };

    Map.prototype.animateZoom = function animateZoom (x, y, zoom_factor) {
        var start = this.getTransform().world_square;
        this._interaction_settings.time_factor = this.getTransform().compute_zoom_parameters(
            this.ssctrees[0], zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y, this.ssctrees[0].if_snap);
        var end = this.getTransform().world_square;  //world_square is updated in function compute_zoom_parameters
        var interpolate = this.doEaseOutSine(start, end);
        //var interpolate = this.doEaseNone(start, end);
        return interpolate;
    };

    Map.prototype.animatePan = function animatePan (dx, dy) {
        var start = this.getTransform().world_square;
        this.getTransform().pan(dx, -dy);
        var end = this.getTransform().world_square;
        var interpolate = this.doEaseOutSine(start, end);
        //var interpolate = this.doEaseNone(start, end);
        return interpolate;
    };

    Map.prototype.jumpTo = function jumpTo (x, y, scale) {
        var center_world = [x, y];
        var r = this.getCanvasContainer();
        var viewport_size = [r.width, r.height];
        var denominator = scale;
        this._transform.initTransform(center_world, viewport_size, denominator);
        this.abortAndRender();
    };

    Map.prototype.panBy = function panBy (dx, dy) {
        //console.log("_abort in map.js:", this._abort)
        if (this._abort !== null) {
            this._abort();
        }
        this.getTransform().pan(dx, -dy);
        this.render();
    };

    Map.prototype.zoom = function zoom (x, y, zoom_factor) {
        this._interaction_settings.time_factor = this.getTransform().compute_zoom_parameters(
            this.ssctrees[0], zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y, this.ssctrees[0].if_snap);
        this.render();
    };

    Map.prototype.abortAndRender = function abortAndRender () {
        // aborts running animation
        // and renders the map based on the current transform
        if (this._abort !== null) {
            this._abort();
            this._abort = null;
        }
        this.getTransform().pan(0, 0);
        this.render();
    };

    Map.prototype.zoomInAnimated = function zoomInAnimated (x, y, op_factor) {
        //e.g., op_factor: 0.0625; 1.0 + op_factor: 1.0625
        this.zoomAnimated(x, y, 1.0 + op_factor * this._interaction_settings.zoom_factor);
    };

    Map.prototype.zoomOutAnimated = function zoomOutAnimated (x, y, op_factor) {
        //e.g., op_factor: 0.0625; 1.0 / (1.0 + op_factor): 0.9411764705882353
        this.zoomAnimated(x, y, 1.0 / (1.0 + op_factor * this._interaction_settings.zoom_factor));
    };

    Map.prototype.zoomAnimated = function zoomAnimated (x, y, zoom_factor) {
        if (this._abort !== null) {
            //console.log('map.js test1')
            this._abort();
        }
        this._action = 'zoomAnimated';
        //console.log('map.js this._interaction_settings.time_factor0:', this._interaction_settings.time_factor)
        //console.log('map.js zoom_factor:', zoom_factor)
        var interpolator = this.animateZoom(x, y, zoom_factor);

        var zoom_duration = this._interaction_settings.zoom_duration * this._interaction_settings.time_factor;
        //console.log('map.js this._interaction_settings.zoom_duration:', this._interaction_settings.zoom_duration)
        //console.log('map.js this._interaction_settings.time_factor:', this._interaction_settings.time_factor)
        //console.log('map.js zoom_duration:', zoom_duration)
        this._abort = timed(interpolator, zoom_duration, this);
    };

    Map.prototype.panAnimated = function panAnimated (dx, dy) {
        if (this._abort !== null) {
            //console.log('map.js this._abort !== null')
            this._abort();
        }
        // FIXME: settings
        this._action = 'panAnimated';
        var interpolator = this.animatePan(dx, dy);
        this._abort = timed(interpolator, this._interaction_settings.pan_duration, this);
    };

    Map.prototype.resize = function resize (newWidth, newHeight) {
        //console.log("resize");
        var tr = this.getTransform();
        var center = tr.getCenterWorld();
        //console.log('map.js center:', center)
        var denominator = tr.getScaleDenominator();
        // re-initialize the transform
        //console.log('map.js newWidth, newHeight:', newWidth, newHeight)
        //console.log('map.js center:', center)
        tr.initTransform(center, [newWidth, newHeight], denominator);
        // update the viewport size of the renderer
        this.renderer.setViewport(newWidth, newHeight);
        var gl = this.gl;

        var fbo = gl.fbo;
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.depthBuffer);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newWidth, newHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, newWidth, newHeight);

        // Unbind the buffer object;
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    };

    Map.prototype.subscribe_scale = function subscribe_scale () {
        var msgbus = this.msgbus;
        msgbus.subscribe('map.scale', function (topic, message, sender) {
            if (sender !== msgbus.id) { return; }
            var scale = Math.round(message[1]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
            //const scale = (Math.round(message[1] / 5) * 5).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
            var el = document.getElementById("scale-denominator");
            el.textContent = " 1:" + scale;
        });
    };

    // import  Rectangle from "./rect"
    //let r = new Rectangle(1, 2, 3, 4);
    //console.log(r);

    var exported = {
        Map: Map,
        MessageBusConnector: MessageBusConnector
    };

    return exported;

})));
