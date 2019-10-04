var varioscale = (function () {
    'use strict';

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

    var cancel = window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.webkitCancelAnimationFrame ||
        window.msCancelAnimationFrame;

    function timed(fn, dur, ctx) {
        if (!dur) {
            fn.call(ctx, 1);
            return null;
        }

        var abort = false;
        var start = _now();

        function tick(now) {
            if (abort) {
                return;
            }
            now = _now();

            if (now >= start + dur) {
                fn.call(ctx, 1);
            } else {
                var k = (now - start) / dur;
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
        while ((this._trace.length > 0) && ((now - this._trace[0][0]) > cutoff))
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

            var duration = parseFloat(document.getElementById('panduration').value);
            var tx = (vx * 0.5) * (duration / 1000);
            var ty = (vy * 0.5) * (duration / 1000);
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

            // standard value for zoom step
            var step = 0.1;
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


                // make larger zoom steps if mousewheel went faster
                // FIXME: allow user to set multiplication factor, e.g.
                // (1, 2, 4) : (normal, fast, superfast) ?
                switch(delta)
                {
                    case delta > 750:
                        step = 0.0625;
                        break;
                    case delta > 500:
                        step = 0.125;
                        break;
                    case delta > 50:
                        step = 0.25;
                        break;
                    default:
                        step = 0.5;
                        break;
                }
                step *= factor;
                _trace.shift(2000);
    //            console.log(delta + " " + prev[1] + " " + step);
            }

            //if the canvas has size 800 x 800, 
            //evt.clientX: x-coordinate in pixel, starting from the left of the canvas (800 x 800)
            //evt.clientY: y-coordinate in pixel, starting from the top of the canvas (800 x 800)        
            //r has size 800 x 760 because of the bar (with height 39.92) at the top
            //r.left = 0 and r.top = 39.92
            var r = _canvas.getBoundingClientRect();
            //const x = evt.clientX - r.left - _canvas.clientLeft;  //_canvas.clientLeft is 0
            //const y = evt.clientY - r.top - _canvas.clientTop;  //_canvas.clientTop is 0
            var x = evt.clientX - r.left;
            var y = evt.clientY - r.top;
            switch(direction) 
            {
                case 1:
                    _map.zoomInAnimated(x, y, step);
                    break;
                case -1:
                    _map.zoomOutAnimated(x, y, step);
                    break;
            }
    //        console.log(_trace._trace);
            // console.log(_trace.length())
        }

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
            console.log('touchstart');
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
                    var duration = parseFloat(document.getElementById('panduration').value);
                    // with combined speed  of departure and arrivale
                    // * departure (= speed of user action px/s) and
                    // * arrival (= 0 px /s)
                    // we can calcualte what will be the distance travelled
                    // we cap the distance moved at maximum of certain number of pixels
                    // (to prevent map moving too far: heuristic, half the window size)
                    // var tx = Math.max(Math.min((vx * 0.5) * (duration / 1000), max_distance), -max_distance)
                    // var ty = Math.max(Math.min((vy * 0.5) * (duration / 1000), max_distance), -max_distance)
                    var tx = (vx * 0.5) * (duration / 1000);
                    var ty = (vy * 0.5) * (duration / 1000);

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
        w = w || 1.0;
    //    console.log(m[0] + " " + x + " " + m[4]);
        out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
        out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
        out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    //    console.log(out[0]);
        return out;
    }

    function createvec3() {
        var out = new Float32Array(3);
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
        var out = new Float32Array(16);
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

    var global$1 = (typeof global !== "undefined" ? global :
                typeof self !== "undefined" ? self :
                typeof window !== "undefined" ? window : {});

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    var inited = false;
    function init () {
      inited = true;
      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }

      revLookup['-'.charCodeAt(0)] = 62;
      revLookup['_'.charCodeAt(0)] = 63;
    }

    function toByteArray (b64) {
      if (!inited) {
        init();
      }
      var i, j, l, tmp, placeHolders, arr;
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(len * 3 / 4 - placeHolders);

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len;

      var L = 0;

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
        arr[L++] = (tmp >> 16) & 0xFF;
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[L++] = tmp & 0xFF;
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      if (!inited) {
        init();
      }
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var output = '';
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        output += lookup[tmp >> 2];
        output += lookup[(tmp << 4) & 0x3F];
        output += '==';
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
        output += lookup[tmp >> 10];
        output += lookup[(tmp >> 4) & 0x3F];
        output += lookup[(tmp << 2) & 0x3F];
        output += '=';
      }

      parts.push(output);

      return parts.join('')
    }

    function read (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    function write (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    }

    var toString = {}.toString;

    var isArray = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    var INSPECT_MAX_BYTES = 50;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

    function kMaxLength () {
      return Buffer.TYPED_ARRAY_SUPPORT
        ? 0x7fffffff
        : 0x3fffffff
    }

    function createBuffer (that, length) {
      if (kMaxLength() < length) {
        throw new RangeError('Invalid typed array length')
      }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = new Uint8Array(length);
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        if (that === null) {
          that = new Buffer(length);
        }
        that.length = length;
      }

      return that
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
        return new Buffer(arg, encodingOrOffset, length)
      }

      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(this, arg)
      }
      return from(this, arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    // TODO: Legacy, not needed anymore. Remove in next major version.
    Buffer._augment = function (arr) {
      arr.__proto__ = Buffer.prototype;
      return arr
    };

    function from (that, value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
        return fromArrayBuffer(that, value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(that, value, encodingOrOffset)
      }

      return fromObject(that, value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(null, value, encodingOrOffset, length)
    };

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      Buffer.prototype.__proto__ = Uint8Array.prototype;
      Buffer.__proto__ = Uint8Array;
    }

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (that, size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(that, size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(that, size).fill(fill, encoding)
          : createBuffer(that, size).fill(fill)
      }
      return createBuffer(that, size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(null, size, fill, encoding)
    };

    function allocUnsafe (that, size) {
      assertSize(size);
      that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) {
        for (var i = 0; i < size; ++i) {
          that[i] = 0;
        }
      }
      return that
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(null, size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(null, size)
    };

    function fromString (that, string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0;
      that = createBuffer(that, length);

      var actual = that.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        that = that.slice(0, actual);
      }

      return that
    }

    function fromArrayLike (that, array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0;
      that = createBuffer(that, length);
      for (var i = 0; i < length; i += 1) {
        that[i] = array[i] & 255;
      }
      return that
    }

    function fromArrayBuffer (that, array, byteOffset, length) {
      array.byteLength; // this throws if `array` is not a valid ArrayBuffer

      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      if (byteOffset === undefined && length === undefined) {
        array = new Uint8Array(array);
      } else if (length === undefined) {
        array = new Uint8Array(array, byteOffset);
      } else {
        array = new Uint8Array(array, byteOffset, length);
      }

      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = array;
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        that = fromArrayLike(that, array);
      }
      return that
    }

    function fromObject (that, obj) {
      if (internalIsBuffer(obj)) {
        var len = checked(obj.length) | 0;
        that = createBuffer(that, len);

        if (that.length === 0) {
          return that
        }

        obj.copy(that, 0, 0, len);
        return that
      }

      if (obj) {
        if ((typeof ArrayBuffer !== 'undefined' &&
            obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
          if (typeof obj.length !== 'number' || isnan(obj.length)) {
            return createBuffer(that, 0)
          }
          return fromArrayLike(that, obj)
        }

        if (obj.type === 'Buffer' && isArray(obj.data)) {
          return fromArrayLike(that, obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < kMaxLength()` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= kMaxLength()) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + kMaxLength().toString(16) + ' bytes')
      }
      return length | 0
    }
    Buffer.isBuffer = isBuffer;
    function internalIsBuffer (b) {
      return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
      if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) { return 0 }

      var x = a.length;
      var y = b.length;

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) { return -1 }
      if (y < x) { return 1 }
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      var buffer = Buffer.allocUnsafe(length);
      var pos = 0;
      for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (!internalIsBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos);
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (internalIsBuffer(string)) {
        return string.length
      }
      if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
          (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string;
      }

      var len = string.length;
      if (len === 0) { return 0 }

      // Use a for loop to avoid recursion
      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) { return utf8ToBytes(string).length } // assume utf8
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      var loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) { encoding = 'utf8'; }

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) { throw new TypeError('Unknown encoding: ' + encoding) }
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
    // Buffer instances.
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      var i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      var length = this.length | 0;
      if (length === 0) { return '' }
      if (arguments.length === 0) { return utf8Slice(this, 0, length) }
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.equals = function equals (b) {
      if (!internalIsBuffer(b)) { throw new TypeError('Argument must be a Buffer') }
      if (this === b) { return true }
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      var str = '';
      var max = INSPECT_MAX_BYTES;
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
        if (this.length > max) { str += ' ... '; }
      }
      return '<Buffer ' + str + '>'
    };

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!internalIsBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) { return 0 }

      var x = thisEnd - thisStart;
      var y = end - start;
      var len = Math.min(x, y);

      var thisCopy = this.slice(thisStart, thisEnd);
      var targetCopy = target.slice(start, end);

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) { return -1 }
      if (y < x) { return 1 }
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) { return -1 }

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset;  // Coerce to Number.
      if (isNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) { byteOffset = buffer.length + byteOffset; }
      if (byteOffset >= buffer.length) {
        if (dir) { return -1 }
        else { byteOffset = buffer.length - 1; }
      } else if (byteOffset < 0) {
        if (dir) { byteOffset = 0; }
        else { return -1 }
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (internalIsBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (Buffer.TYPED_ARRAY_SUPPORT &&
            typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1;
      var arrLength = arr.length;
      var valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i;
      if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) { foundIndex = i; }
            if (i - foundIndex + 1 === valLength) { return foundIndex * indexSize }
          } else {
            if (foundIndex !== -1) { i -= i - foundIndex; }
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) { byteOffset = arrLength - valLength; }
        for (i = byteOffset; i >= 0; i--) {
          var found = true;
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) { return i }
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      if (strLen % 2 !== 0) { throw new TypeError('Invalid hex string') }

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (isNaN(parsed)) { return i }
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset | 0;
        if (isFinite(length)) {
          length = length | 0;
          if (encoding === undefined) { encoding = 'utf8'; }
        } else {
          encoding = length;
          length = undefined;
        }
      // legacy write(string, encoding, offset, length) - remove in v0.13
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset;
      if (length === undefined || length > remaining) { length = remaining; }

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) { encoding = 'utf8'; }

      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) { throw new TypeError('Unknown encoding: ' + encoding) }
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return fromByteArray(buf)
      } else {
        return fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      var res = [];

      var i = start;
      while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
          : 1;

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = '';
      var i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) { start = 0; }
      if (!end || end < 0 || end > len) { end = len; }

      var out = '';
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = '';
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) { start = 0; }
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) { end = 0; }
      } else if (end > len) {
        end = len;
      }

      if (end < start) { end = start; }

      var newBuf;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        newBuf = this.subarray(start, end);
        newBuf.__proto__ = Buffer.prototype;
      } else {
        var sliceLen = end - start;
        newBuf = new Buffer(sliceLen, undefined);
        for (var i = 0; i < sliceLen; ++i) {
          newBuf[i] = this[i + start];
        }
      }

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) { throw new RangeError('offset is not uint') }
      if (offset + ext > length) { throw new RangeError('Trying to access beyond buffer length') }
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) { checkOffset(offset, byteLength, this.length); }

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      var val = this[offset + --byteLength];
      var mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 1, this.length); }
      return this[offset]
    };

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 2, this.length); }
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 2, this.length); }
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 4, this.length); }

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 4, this.length); }

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) { checkOffset(offset, byteLength, this.length); }

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) { val -= Math.pow(2, 8 * byteLength); }

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) { checkOffset(offset, byteLength, this.length); }

      var i = byteLength;
      var mul = 1;
      var val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) { val -= Math.pow(2, 8 * byteLength); }

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 1, this.length); }
      if (!(this[offset] & 0x80)) { return (this[offset]) }
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 2, this.length); }
      var val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 2, this.length); }
      var val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 4, this.length); }

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 4, this.length); }

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 4, this.length); }
      return read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 4, this.length); }
      return read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 8, this.length); }
      return read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      if (!noAssert) { checkOffset(offset, 8, this.length); }
      return read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!internalIsBuffer(buf)) { throw new TypeError('"buffer" argument must be a Buffer instance') }
      if (value > max || value < min) { throw new RangeError('"value" argument is out of bounds') }
      if (offset + ext > buf.length) { throw new RangeError('Index out of range') }
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var mul = 1;
      var i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var i = byteLength - 1;
      var mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 1, 0xff, 0); }
      if (!Buffer.TYPED_ARRAY_SUPPORT) { value = Math.floor(value); }
      this[offset] = (value & 0xff);
      return offset + 1
    };

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
      if (value < 0) { value = 0xffff + value + 1; }
      for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
        buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
          (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 2, 0xffff, 0); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 2, 0xffff, 0); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
      if (value < 0) { value = 0xffffffff + value + 1; }
      for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
        buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
      }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 4, 0xffffffff, 0); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset + 3] = (value >>> 24);
        this[offset + 2] = (value >>> 16);
        this[offset + 1] = (value >>> 8);
        this[offset] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 4, 0xffffffff, 0); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = 0;
      var mul = 1;
      var sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = byteLength - 1;
      var mul = 1;
      var sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 1, 0x7f, -0x80); }
      if (!Buffer.TYPED_ARRAY_SUPPORT) { value = Math.floor(value); }
      if (value < 0) { value = 0xff + value + 1; }
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 2, 0x7fff, -0x8000); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 2, 0x7fff, -0x8000); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000); }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
        this[offset + 2] = (value >>> 16);
        this[offset + 3] = (value >>> 24);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) { checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000); }
      if (value < 0) { value = 0xffffffff + value + 1; }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) { throw new RangeError('Index out of range') }
      if (offset < 0) { throw new RangeError('Index out of range') }
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) { start = 0; }
      if (!end && end !== 0) { end = this.length; }
      if (targetStart >= target.length) { targetStart = target.length; }
      if (!targetStart) { targetStart = 0; }
      if (end > 0 && end < start) { end = start; }

      // Copy 0 bytes; we're done
      if (end === start) { return 0 }
      if (target.length === 0 || this.length === 0) { return 0 }

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) { throw new RangeError('sourceStart out of bounds') }
      if (end < 0) { throw new RangeError('sourceEnd out of bounds') }

      // Are we oob?
      if (end > this.length) { end = this.length; }
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      var len = end - start;
      var i;

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start];
        }
      } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start];
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0);
          if (code < 256) {
            val = code;
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) { val = 0; }

      var i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        var bytes = internalIsBuffer(val)
          ? val
          : utf8ToBytes(new Buffer(val, encoding).toString());
        var len = bytes.length;
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // HELPER FUNCTIONS
    // ================

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = stringtrim(str).replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) { return '' }
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function stringtrim (str) {
      if (str.trim) { return str.trim() }
      return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
      if (n < 16) { return '0' + n.toString(16) }
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      var codePoint;
      var length = string.length;
      var leadSurrogate = null;
      var bytes = [];

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD); }
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD); }
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD); }
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) { bytes.push(0xEF, 0xBF, 0xBD); }
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) { break }
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) { break }
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) { break }
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) { break }
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) { break }

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }


    function base64ToBytes (str) {
      return toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) { break }
        dst[i + offset] = src[i];
      }
      return i
    }

    function isnan (val) {
      return val !== val // eslint-disable-line no-self-compare
    }


    // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
    // The _isBuffer check is for Safari 5-7 support, because it's missing
    // Object.prototype.constructor. Remove this eventually
    function isBuffer(obj) {
      return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    }

    function isFastBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

    // For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
    }

    if (typeof global$1.setTimeout === 'function') ;
    if (typeof global$1.clearTimeout === 'function') ;

    // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
    var performance = global$1.performance || {};
    var performanceNow =
      performance.now        ||
      performance.mozNow     ||
      performance.msNow      ||
      performance.oNow       ||
      performance.webkitNow  ||
      function(){ return (new Date()).getTime() };

    // TODO
    // - Aspect ratio / resize of viewport --> update transform
    // - Take into account the z-value of the slice
    // - Remove duplication inside functions

    // let = block scoped
    // var = global / function scoped


    var meter_to_pixel = 3779.5275590551; // 1 meter equals 3779.5275590551 pixels


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

    var Transform = function Transform(tree, client_rect) {
        // matrices
        this.tree = tree;
        this.viewport_world = create();
        this.world_viewport = create();
        //
        this.world_square = null;
        this.square_viewport = null;
        //
        this.viewport = null;

        console.log("tree.center2d", tree.center2d);
        console.log("client_rect.width", client_rect.width);
        console.log("client_rect.height", client_rect.height);
        console.log("tree.view_scale_Sv", tree.view_scale_Sv);

        // set up initial transformation
        this.initTransform(tree.center2d, [client_rect.width, client_rect.height], tree.view_scale_Sv);
        //console.log("Set up transform: " + center_world + " 1:" + denominator + " vs 1:" + this.getScaleDenominator())
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
        // let visible_world = this.visibleWorld() //
        var visible_world = new Rectangle(xmin, ymin, xmax, ymax);
        // scaling/translating is then as follows:
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
        // we can set up ndc square -> viewport matrix

        this.square_viewport = square_viewport_matrix(this.viewport);
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform();

        // var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        // var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
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
        _multiply(this.world_viewport, this.square_viewport, this.world_square);
        invert(this.viewport_world, this.world_viewport);
    };

    Transform.prototype.pan = function pan (dx, dy) {
        this.square_viewport[12] += dx;
        this.square_viewport[13] += dy;

        _multiply(this.world_viewport, this.square_viewport, this.world_square);
        invert(this.viewport_world, this.world_viewport);

        // var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        // var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        //console.log('ll: ' + ll + " " + this.viewport.xmin + " " + this.viewport.ymin);
        //console.log('tr: ' + tr + " " + this.viewport.xmax + " " + this.viewport.ymax);

        // we arrive at what part of the world then is visible
        var visible_world = this.visibleWorld(); // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        var center = visible_world.center();
        // scaling/translating is then as follows:
        var scale = [2. / visible_world.width(), 2. / visible_world.height()];
        var translate = [-scale[0] * center[0], -scale[1] * center[1]];
        // by means of which we can calculate a world -> ndc square matrix
        var world_square = create();
        world_square[0] = scale[0];
        world_square[5] = scale[1];
        world_square[12] = translate[0];
        world_square[13] = translate[1];
        this.world_square = world_square;
        // and given the size of the viewport we can set up ndc square -> viewport matrix
        // this.viewport = new Rectangle(0, 0, width, height)
        this.square_viewport = square_viewport_matrix(this.viewport);
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform();
    };

    Transform.prototype.zoom = function zoom (factor, x, y) {
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
            eye$1[0] = factor;
            eye$1[5] = factor;
            _multiply(tmp, eye$1, tmp);
        }
        // 3. translate back
        {
            var eye$2 = create();
            eye$2[12] = x;
            eye$2[13] = y;
            _multiply(tmp, eye$2, tmp);
        }
        this.square_viewport = tmp;
        _multiply(this.world_viewport, this.square_viewport, this.world_square);
        invert(this.viewport_world, this.world_viewport);
        // var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        // var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        // we arrive at what part of the world then is visible
        var visible_world = this.visibleWorld(); // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        var center = visible_world.center();
        // scaling/translating is then as follows:
        var scale = [2. / visible_world.width(), 2. / visible_world.height()];
        var translate = [-scale[0] * center[0], -scale[1] * center[1]];
        // by means of which we can calculate a world -> ndc square matrix
        var world_square = create();
        world_square[0] = scale[0];
        world_square[5] = scale[1];
        world_square[12] = translate[0];
        world_square[13] = translate[1];
        this.world_square = world_square;
        // and given the size of the viewport we can set up ndc square -> viewport matrix
        // this.viewport = new Rectangle(0, 0, width, height)
        this.square_viewport = square_viewport_matrix(this.viewport);
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform();
    };

    Transform.prototype.visibleWorld = function visibleWorld () {
        //console.log("visibleWorld in transform.js")
        var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        // we arrive at what part of the world then is visible
        return new Rectangle(ll[0], ll[1], tr[0], tr[1])
    };

    Transform.prototype.getCenter = function getCenter () {
        //console.log("getCenter in transform.js")
        var center = this.backward([
            this.viewport.xmin + (this.viewport.xmax - this.viewport.xmin) * 0.5,
            this.viewport.ymin + (this.viewport.ymax - this.viewport.ymin) * 0.5, 0.0]);
        return center
    };

    Transform.prototype.getScaleDenominator = function getScaleDenominator () {
        var viewport_in_meter = new Rectangle(0, 0,
            this.viewport.width() / meter_to_pixel,
            this.viewport.height() / meter_to_pixel);
        var world_in_meter = this.visibleWorld();
        var St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area());
        return St
    };

    Transform.prototype.stepMap = function stepMap () {
        var viewport_in_meter = new Rectangle(0, 0,
            this.viewport.width() / meter_to_pixel,
            this.viewport.height() / meter_to_pixel);
        var world_in_meter = this.visibleWorld();


        // FIXME: these 2 variables should be adjusted
        //     based on which tGAP is used...
        // FIXME: this step mapping should move to the data side (the tiles)
        //     and be kept there (for every dataset visualized on the map)
        // FIXME: should use this.getScaleDenominator()

        // let Sb = 48000  // (start scale denominator)
        // let total_steps = 65536 - 1   // how many generalization steps did the process take?

        //let Sb = 24000  // (start scale denominator)
        //let total_steps = 262144 - 1   // how many generalization steps did the process take?



        var St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area()); //current scale denominator 
        var reductionf = 1 - Math.pow(this.tree.start_scale_Sb / St, 2); // reduction in percentage

        //Originally, step = this.Nb * reductionf.
        //If the goal map has only 1 feature left, then this.Nb = this.Ns + 1.
        //If the base map has 5537 features and the goal map has 734 features,
        //then there are 4803 steps (this.Nb != this.Ns + 1).
        //It is better to use 'this.Ns + 1' instead of this.Nb
        var step = (this.tree.no_of_steps_Ns + 1) * reductionf; //step is not necessarily an integer
        return [Math.max(0, step), St]
    };

    // FIXME: rename draw to renderFunc ?

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

    DrawProgram.prototype._prepare_vertices = function _prepare_vertices (gl, shaderProgram, attribute_name, itemSize, stride, offset) {

        var attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,// * Attribute location
            itemSize,       // * Number of components per attribute ????? 
            gl.FLOAT,       // * Type of elements
            false,          // * Is normalized?
            stride,         // * stride 
            offset          // * Offset from the beginning of 
        );

    };



    var LineDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function LineDrawProgram(gl) {

            this.colors = [[141,211,199]
                ,[190,186,218]
                ,[251,128,114]
                ,[128,177,211]
                ,[253,180,98]
                ,[179,222,105]
                ,[252,205,229]
                ,[217,217,217]
                ,[188,128,189]
                ,[204,235,197]
            ].map(function (x) { return [x[0]/255., x[1]/255., x[2]/255.]; });

            var vertexShaderText = "\nprecision highp float;\n\nattribute vec2 displacement;\nattribute vec4 vertexPosition_modelspace;\nuniform mat4 M;\nuniform float near;\nuniform float half_width_reality;\n\nvoid main()\n{\n    vec4 pos = vertexPosition_modelspace;\n\n    if (pos.z <= near && pos.w > near)\n    {\n        pos.x +=  displacement.x * half_width_reality;\n        pos.y +=  displacement.y * half_width_reality;\n        gl_Position = M * vec4(pos.xyz, 1.0);\n\n    } else {\n        gl_Position = vec4(-10.0,-10.0,-10.0,1.0);\n        return;\n    }\n}\n";

            var fragmentShaderText = "\nprecision mediump float;\nuniform vec4 uColor;\n\nvoid main()\n{\n    gl_FragColor = uColor; // color of the lines\n}\n";

            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);
        }

        if ( DrawProgram ) LineDrawProgram.__proto__ = DrawProgram;
        LineDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        LineDrawProgram.prototype.constructor = LineDrawProgram;


        LineDrawProgram.prototype.draw_tile = function draw_tile (matrix, tile, near_St, width_increase) {
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
            this._prepare_vertices(gl, shaderProgram, 'vertexPosition_modelspace', 4, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
            this._prepare_vertices(gl, shaderProgram, 'displacement', 2, 0, 0);

            // the unit of boundary_width is mm; 1 mm equals 3.7795275590551 pixels
            // FIXME: MM: at which amount of dots per inch has this been calculated?
            var boundary_width_screen = parseFloat(document.getElementById('boundary_width_slider').value);
            // The unit of the map must be meter!!!
            var half_width_reality = boundary_width_screen * near_St[1] / 1000 / 2;
            if (width_increase > 0)
            {
                half_width_reality *= width_increase;
            }

            {
                var M_location = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M_location, false, matrix);

                var near_location = gl.getUniformLocation(shaderProgram, 'near');
                gl.uniform1f(near_location, near_St[0]);

                var half_width_reality_location = gl.getUniformLocation(shaderProgram, 'half_width_reality');
                gl.uniform1f(half_width_reality_location, half_width_reality);
                if (width_increase > 0)
                {
                    var c = [0.0, 0.0, 0.0]; // black
                }
                else
                {
                    // var c = this.colors[tile.id % this.colors.length];
                    var c = [1.0, 1.0, 1.0]; // white
                }
                var color_location = gl.getUniformLocation(shaderProgram, 'uColor');
                gl.uniform4f(color_location, c[0], c[1], c[2], 1.0);
            }

            // Set clear color to white, fully opaque
            // gl.clearColor(1., 1., 1., 1.0);
            // gl.clearDepth(1.0); // Clear everything

            // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color
            // gl.clear(gl.COLOR_BUFFER_BIT)

            // gl.disable(gl.BLEND);
            gl.enable(gl.BLEND); // FIXME: needed?
            gl.disable(gl.DEPTH_TEST);

            // gl.enable(gl.CULL_FACE);
            // gl.disable(gl.CULL_FACE); // FIXME: should we be explicit about face orientation and use culling?

            // gl.cullFace(gl.BACK);
            // gl.cullFace(gl.FRONT);
            // gl.cullFace(gl.FRONT_AND_BACK);

            gl.drawArrays(
                gl.TRIANGLES, // kind of primitives to render; e.g., POINTS, LINES
                0,            // Specifies the starting index in the enabled arrays.
                triangleVertexPosBufr.numItems // Specifies the number of indices to be rendered.
            );
        };

        return LineDrawProgram;
    }(DrawProgram));



    var PolygonDrawProgram = /*@__PURE__*/(function (DrawProgram) {
        function PolygonDrawProgram(gl) {
            var vertexShaderText = "\nprecision highp float;\n\nattribute vec3 vertexPosition_modelspace;\nattribute vec4 vertexColor;\nuniform mat4 M;\nvarying vec4 fragColor;\n\nvoid main()\n{\n    fragColor = vertexColor;\n    gl_Position = M * vec4(vertexPosition_modelspace, 1);\n}\n";
            var fragmentShaderText = "\nprecision mediump float;\n\nvarying vec4 fragColor;\nvoid main()\n{\n    gl_FragColor = vec4(fragColor);\n}\n";
            DrawProgram.call(this, gl, vertexShaderText, fragmentShaderText);
        }

        if ( DrawProgram ) PolygonDrawProgram.__proto__ = DrawProgram;
        PolygonDrawProgram.prototype = Object.create( DrawProgram && DrawProgram.prototype );
        PolygonDrawProgram.prototype.constructor = PolygonDrawProgram;

        PolygonDrawProgram.prototype.draw_tile = function draw_tile (matrix, tile) {
            var gl = this.gl;
            var shaderProgram = this.shaderProgram;
            gl.useProgram(shaderProgram);

            var triangleVertexPosBufr = tile.content.polygon_triangleVertexPosBufr;
            if (triangleVertexPosBufr === null) {
                return;
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
            this._prepare_vertices(gl, shaderProgram, 'vertexPosition_modelspace', 3, 24, 0);
            this._prepare_vertices(gl, shaderProgram, 'vertexColor', 3, 24, 12);

            {
                var M_location = gl.getUniformLocation(shaderProgram, 'M');
                gl.uniformMatrix4fv(M_location, false, matrix);
            }

            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
            gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPosBufr.numItems);
        };

        return PolygonDrawProgram;
    }(DrawProgram));






    var Renderer = function Renderer(gl, ssctree) {
        this.gl = gl;
        this.ssctree = ssctree;

        //console.log(this.ssctree)
        // this.map = map;
        // this.buckets = [];
        //this.programs = [
        //new PolygonDrawProgram(gl),
        //new LineDrawProgram(gl),
        ////new ImageTileProgram(gl)
        //]
        // console.log(this.gl);
        // console.log(this.buckets);
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

    Renderer.prototype.render_relevant_tiles = function render_relevant_tiles (matrix, box3d, near_St, rect) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?

        var tiles = this.ssctree.get_relevant_tiles(box3d);

    //    let gl = this.gl;
    //    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    //    gl.clearDepth(1.0); // Clear everything
    //    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer with specified clear color

        if (tiles.length > 0) {

            var polygon_draw_program = new PolygonDrawProgram(this.gl);
            tiles.forEach(function (tile) {
                polygon_draw_program.draw_tile(matrix, tile);
            });

            // FIXME: if lines have width == 0; why draw them?
            // If we want to draw lines twice -> thick line under / small line over
            // we need to do this twice + move the code for determining line width here...
            var line_draw_program = new LineDrawProgram(this.gl);
            tiles.forEach(function (tile) {
                // FIXME: would be nice to specify width here in pixels.
                // bottom lines (black)
                line_draw_program.draw_tile(matrix, tile, near_St, 2.0);
                // interior (color)
                line_draw_program.draw_tile(matrix, tile, near_St, 0);
            });
        }

        // this.buckets.forEach(bucket => {
        // this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()
    };


    Renderer.prototype.setViewport = function setViewport (width, height) {
        this.gl.viewport(0, 0, width, height);
    };

    var SSCTree = function SSCTree(msgbus) {
        this.msgbus = msgbus;
        this.tree = null;
        this.retrieved = {};
    };

    SSCTree.prototype.load = function load () {
            var this$1 = this;

        //
        // FIXME: convert to worker that does this
        // 
        // fetch('nl/tree_max9_fanout10_9.json')

        //we specify folder 'dist_test', 'dist_buchholz_greedy', or 'dist_buchholz_astar' in sscview-js\rollup.config.js
        var data_folder = 'data/';
    //    let jsonfile = 'nodes.json';
        //let jsonfile = 'tree_buchholz.json';
        var jsonfile = 'tree.json';

        fetch(data_folder + jsonfile)
            .then(function (r) {
                return r.json()
            })
            .then(function (tree) {
                this$1.tree = tree;
                var box3d = tree.box;
                tree.center2d = [(box3d[0] + box3d[3]) / 2, (box3d[1] + box3d[4]) / 2];
                var dataelements = obtain_dataelements(this$1.tree);  //dataelements recorded in .json file
                dataelements.forEach(function (element) { //originally, each element has attributes "id", "box", "info"
                    element.content = null;
                    element.last_touched = null;
                    element.url = data_folder + element.info;
                });
            })
            .then(function () {
                this$1.msgbus.publish('data.tree.loaded', 'tree.ready');
            }) // FIXME: Notify via PubSub that tree has loaded (should re-render map if not rendering)
            .catch(function (err) {
                console.error(err);
            });
    };

    SSCTree.prototype.fetch_tiles = function fetch_tiles (box3d, gl) {
            var this$1 = this;

        if (this.tree === null) { return }

        var overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d);
        // FIXME: sort the tiles via the distance from center of the box?
        overlapped_dataelements.map(function (elem) {
            if (!this$1.retrieved[elem.url] && elem.content === null) {
                var content = new TileContent(this$1.msgbus);
                content.load(elem.url, gl); //e.g., elem.url = de/buchholz_greedy_test.obj
                elem.content = content;
                this$1.retrieved[elem.url] = true; 
                // FIXME: is this really 'retrieved' ? Or more, scheduled for loading ?
                // FIXME: put this in the tile itself, instead of in extra object 'this.retrieved'
            }
        });
    };

    SSCTree.prototype.get_relevant_tiles = function get_relevant_tiles (box3d) {
        if (this.tree === null) { return [] }

        var overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d);
        return overlapped_dataelements
            .filter(function (elem) { // those tiles that are loaded and overlap the screen
                //elem.content may have been assigned in function set_active_tiles
                return elem.content !== null && overlaps3d(box3d, elem.box)
            })
            .map(function (elem) { // set for each tile to be rendered the last accessed time
                elem.last_touched = _now();
                return elem
            })
    };


    var TileContent = function TileContent(msgbus) {
        this.msgbus = msgbus;
        this.line_triangleVertexPosBufr = null;
        this.displacementBuffer = null;
        this.polygon_triangleVertexPosBufr = null;
    };

    TileContent.prototype.load = function load (url, gl) {
            var this$1 = this;

        fetch(url)  //e.g., url = "http://localhost:8000/de/buchholz_greedy_test.obj"
            .then(function (response) { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
            .then(function (data_text) {
                var data_from_text = this$1._obtain_data_from_text(data_text, gl, this$1.class_color_dt);
                this$1.line_triangleVertexPosBufr = data_from_text[0];
                this$1.displacementBuffer = data_from_text[1];
                this$1.polygon_triangleVertexPosBufr = data_from_text[2];
                this$1.msgbus.publish('data.tile.loaded', 'tile.ready');
            })
            .catch(function (err) { console.error(err); });
    };

    TileContent.prototype._obtain_data_from_text = function _obtain_data_from_text (data_text, gl) {
        //data_text is the content of an .obj file

        var class_color_dt = generate_class_color_dt();
        var deltas_bound_triangles = [];
        var line_and_polygon_triangleVertexPosBufr = 
            this._obtain_line_and_polygon_triangleVertexPosBufr(data_text, gl, class_color_dt, deltas_bound_triangles);

        var displacementElements = new Float32Array(deltas_bound_triangles.flat(1));
        var displacementBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, displacementElements, gl.STATIC_DRAW);

        displacementBuffer.itemSize = 2; //each item has only x and y
        displacementBuffer.numItems = displacementElements.length / 2;

        return [
            line_and_polygon_triangleVertexPosBufr[0],
            displacementBuffer,
            line_and_polygon_triangleVertexPosBufr[1]];
    };


    TileContent.prototype._obtain_line_and_polygon_triangleVertexPosBufr = function _obtain_line_and_polygon_triangleVertexPosBufr (data_text, gl,
        class_color_dt, deltas_bound_triangles) {
            var this$1 = this;


        var step_high = [];
        var vertex_lt = [];
        var feature_color = [];
        var triangle_color_lt = [];
        var vertices_bound_triangles = []; //vertices of the boundaries, in order to form triangles to display the boundaries
        data_text.split("\n").forEach(function (l) { return this$1._parseLine(
            l, vertex_lt, class_color_dt, triangle_color_lt,
            step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles); });

        //obtain line_triangleVertexPosBufr;
        var line_vertexElements = new Float32Array(vertices_bound_triangles.flat(1));
        var line_itemSize = 4; //the number of elements, which is 4 for position, i.e., x, y, z (step_low), step_high
        var line_extended_itemSize = line_itemSize; //for computing the number of vertices; 
        var line_triangleVertexPosBufr = this._obtain_triangleVertexPosBufr(
            gl, line_vertexElements, line_itemSize, line_extended_itemSize);

        //obtain polygon_triangleVertexPosBufr;
        var polygon_vertexElements = new Float32Array(triangle_color_lt);
        var polygon_itemSize = 3; //the number of elements, which is 3 for position, i.e., x, y, z 
        //each vertex has 6 elements in triangle_color_lt, i.e., x, y, z, r_frac, g_frac, b_frac
        var polygon_extended_itemSize = 6; //for computing the number of vertices;        
        var polygon_triangleVertexPosBufr = this._obtain_triangleVertexPosBufr(
            gl, polygon_vertexElements, polygon_itemSize, polygon_extended_itemSize);

        return [line_triangleVertexPosBufr, polygon_triangleVertexPosBufr];
    };


    TileContent.prototype._obtain_triangleVertexPosBufr = function _obtain_triangleVertexPosBufr (gl, vertexElements, itemSize, extended_itemSize) {
            
        var triangleVertexPosBufr = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        gl.bufferData(gl.ARRAY_BUFFER, vertexElements, gl.STATIC_DRAW);

        triangleVertexPosBufr.itemSize = itemSize;        
        triangleVertexPosBufr.numItems = vertexElements.length / extended_itemSize; //the number of vertices;

        return triangleVertexPosBufr;
    };


    TileContent.prototype._parseLine = function _parseLine (line, vertex_lt, class_color_dt, triangle_color_lt,
        step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles) {

        var words = line.split(' ');
        if (words[0] == 'v') {
            vertex_lt.push({
                x: Number(words[1]),
                y: Number(words[2]),
                z: Number(words[3])
            });
        } else if (words[0] == 'g') {
            var feature_class = Number(words[1].split('_')[0]);
            feature_color[0] = class_color_dt[feature_class];
        } else if (words[0] == 'f') {
            // 3 vertex indentifiers make a triangle; add coordinates and colors
            var f_color = feature_color[0];
            for (i = 1; i <= 3; i++) {
                var vertex = vertex_lt[Number(words[i]) - 1];
                triangle_color_lt.push(vertex.x, vertex.y, vertex.z,
                    f_color.r_frac, f_color.g_frac, f_color.b_frac);
            }
        }
        else if (words[0] == '#') {
            // words[1]: step_high; words[2]: edge_id
            if (words.length > 1) {
                step_high[0] = words[1];
            }
        }
        else if (words[0] == 'l') {
            var polyline = [];
            for (var i = 1; i < words.length; i++) {
                polyline.push(vertex_lt[words[i] - 1]);
            }

            var point_records = [];
            for (var j = 0; j < polyline.length; j++) {
                var pt = polyline[j];
                point_records.push([pt.x, pt.y, pt.z, step_high[0]]); //pt.z is step_low
            }

            for (var j = 0; j < point_records.length - 1; j++) {
                var start = point_records[j];//start point of a line segment
                var end = point_records[j + 1];  //end point of the line segment
                var start_xy = start.slice(0, 2);
                var end_xy = end.slice(0, 2);
                var v = make_vector_start_end(start_xy, end_xy);
                var length = norm(v);

                if (length != 0) {
                    var unitvec = div(v, length);
                    //The lengths of startr, startl, endr, and endl are sqrt(2)
                    var startr = add(mul(unitvec, -1), rotate90cw(unitvec));
                    var startl = add(mul(unitvec, -1), rotate90ccw(unitvec));
                    var endr = add(unitvec, rotate90cw(unitvec));
                    var endl = add(unitvec, rotate90ccw(unitvec));


                    //start consists of x, y, z (step_low), step_high, while
                    //startl consists of only x, y
                    vertices_bound_triangles.push(start, start, end, start, end, end);
                    deltas_bound_triangles.push(startl, startr, endl, startr, endr, endl);
                }
            }
        }

        //#region vector computation

        function sub(a, b) {
            /*Subtract a vector b from a, or subtract a scalar*/
            var result_values = [];
            if (isNaN(b)) { //b is not a number; b is iterable
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] - b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] - b);
                }
            }

            return result_values;
        }

        function add(a, b) {
            /*Add a vector b to a, or add a scalar*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] + b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] + b);
                }
            }

            return result_values;
        }

        function mul(a, b) {
            /*Multiply a vector either element-wise with another vector, or with a
            scalar.*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] * b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] * b);
                }
            }

            return result_values;
        }

        function div(a, b) {
            /*Element-wise division with another vector, or with a scalar.*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] / b[i]);
                }
            }
            else {
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] / b);
                }
            }

            return result_values;
        }


        //function make_vector(end, start) {
        ///*Creates a vector from the start to the end.

        //Vector is made based on two points{ end - (minus) start.
        //    */
        //return sub(end, start);
        //}

        function make_vector_start_end(start, end) {
            /*Creates a vector from the start to the end.
                
            Vector is made based on two points{ end - (minus) start.
                */
            return sub(end, start);
        }

        function dot(v1, v2) {
            /*Returns dot product of v1 and v2 */
            if (v1.length != v2.length) {
                throw "Vector dimensions should be equal";
            }

            var dot_value = 0;
            for (var i = 0; i < v1.length; i++) {
                dot_value += v1[i] * v2[i];
            }
            return dot_value;
        }


        function norm2(v) {
            /*Returns the norm of v, *squared*.*/
            return dot(v, v);
        }


        function norm(a) {
            /*L2 norm*/
            return Math.sqrt(norm2(a));
        }


        function rotate90ccw(v) {
            /*Rotate 2d vector 90 degrees counter clockwise
                
                (x, y) -> (-y, x)
            */
            return [-v[1], v[0]];
        }


        function rotate90cw(v) {
            /*Rotate 2d vector 90 degrees clockwise
                
                (x, y) -> (y, -x)
            */
            return [v[1], -v[0]];
        }
        

    //#endregion
    };





    function obtain_overlapped_dataelements(node, box3d) {
        // console.log(box)
        var result = [];
        var stack = [node];
        var loop = function () {
            var node$1 = stack.pop();

            // visit chids, if they overlap
            node$1.children.forEach(function (child) {
                if (overlaps3d(node$1.box, box3d)) {
                    stack.push(child);
                }
            });

            // add data elements to result list, if box overlaps
            node$1.dataelements.forEach(function (element) {
                if (overlaps3d(element.box, box3d)) {
                    result.push(element);
                }
            });
        };

        while (stack.length > 0) loop();
        return result
    }


    function obtain_dataelements(root) {
        // FIXME: make iterator/generator function* 
        // to avoid making the whole result list
        var result = [];
        var stack = [root];
        while (stack.length > 0) {
            var node = stack.pop();

            // visit chids, if they overlap
            node.children.forEach(function (child) {
                stack.push(child);
            });

            // add data elements to result list, if box overlaps
            node.dataelements.forEach(function (element) {
                result.push(element);
            });
        }
        return result
    }


    function overlaps3d(one, other) {
        // Separating axes theorem, nD
        var dims = 3;
        var are_overlapping = true;
        for (var min = 0; min < dims; min++) {
            var max = min + dims;
            if ((one[max] < other[min]) || (one[min] > other[max])) {
                are_overlapping = false;
                break
            }
        }
        return are_overlapping
    }

    function generate_class_color_dt() {

        var class_color_dt = {
            2101: { r: 239, g: 200, b: 200 },
            2112: { r: 255, g: 174, b: 185 },
            2114: { r: 204, g: 204, b: 204 },
            2201: { r: 138, g: 211, b: 175 },
            2202: { r: 51, g: 204, b: 153 },
            2213: { r: 170, g: 203, b: 175 },
            2230: { r: 181, g: 227, b: 181 },
            2301: { r: 157, g: 157, b: 108 },
            3103: { r: 254, g: 254, b: 254 },
            3302: { r: 204, g: 153, b: 255 },
            4101: { r: 234, g: 216, b: 189 },
            4102: { r: 230, g: 255, b: 204 },
            4103: { r: 171, g: 223, b: 150 },
            4104: { r: 255, g: 255, b: 192 },
            4105: { r: 40, g: 200, b: 254 },
            4107: { r: 141, g: 197, b: 108 },
            4108: { r: 174, g: 209, b: 160 },
            4109: { r: 207, g: 236, b: 168 },
            4111: { r: 190, g: 239, b: 255 },
            5112: { r: 181, g: 208, b: 208 },
        };

        for (var key in class_color_dt) {
            var color = class_color_dt[key];  //color is a dictionary of elements r, g, b
            color.r_frac = color.r / 255;
            color.g_frac = color.g / 255;
            color.b_frac = color.b / 255;
        }

        return class_color_dt;
    }

    // from https://github.com/kelektiv/node-uuid
    // mit license

    // Lookup Table
    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
        byteToHex[i] = (i + 0x100).toString(16).substr(1);
    }

    function bytesToUuid(buf, offset) {
        var i = offset || 0;
        var bth = byteToHex;
        // join used to fix memory issue caused by concatenation: 
        // https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
        return ([bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]], '-',
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]],
        bth[buf[i++]], bth[buf[i++]]]).join('');
    }

    function mathRNG() {
        var rnds = new Array(16);
        for (var i = 0, r = (void 0); i < 16; i++) {
            if ((i & 0x03) === 0) {
                r = Math.random() * 0x100000000;
            }
            rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
        }
        return rnds;
    }

    function getUuid() {
        var x = mathRNG();
        return bytesToUuid(x);
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
        if (!this._topics[topic]) {
            return false;
        }
        var subscribers = this._topics[topic];
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


    var MessageBusConnector = function MessageBusConnector() {
        this.id = getUuid();
    };

    MessageBusConnector.prototype.publish = function publish (topic, message) {
        return instance.publish(topic, message, this.id)
    };

    MessageBusConnector.prototype.subscribe = function subscribe (topic, func) {
        return instance.subscribe(topic, func)
    };

    var Map = function Map(container) {
        var this$1 = this;

        if (typeof container === 'string') {
            this._container = window.document.getElementById(container);
        }
        else {
            this._container = container;
        }
        if (!this._container) {
            throw new Error(("Container '" + container + "' not found."))
        }

        var rect = this.getCanvasContainer().getBoundingClientRect();
        this.rect = rect;
        this._abort = null;

        // data loader
        this.msgbus = new MessageBusConnector();
        this.msgbus.subscribe('data.tile.loaded', function (topic, message, sender) {
            //console.log('1 subscribe data.tile.loaded')
            if (this$1._abort === null) {
                //console.log('Rendering because received:', topic, ", ", message, ", ", sender)
                this$1.panAnimated(0, 0); // animate for a small time, so that when new tiles are loaded, we are already rendering
            }
        });

        this.msgbus.subscribe('data.tree.loaded', function (topic, message, sender) {
            var tree = this$1.ssctree.tree;
            //console.log("tree.view_scale_Sv in this.msgbus.subscribe:", tree.view_scale_Sv);
            //this._transform = new Transform(
            //tree.start_scale_Sb,    //scale denominator of base map (according to dataset)
            //tree.no_of_objects_Nb,  //number of objects on base map (according to dataset)
            //tree.no_of_steps_Ns,    //number of steps of the SSCTree (according to dataset) 
            //tree.center2d,          //center of the map extent (according to dataset)
            //[rect.width, rect.height],
            //tree.view_scale_Sv      //scale denominator of initial view (according to users' preference)
            //)

            this$1._transform = new Transform(
                tree,
                rect
            );

            var textContent = "Vario-scale demo: " + tree.dataset_nm;
            if (tree.algorithm != "") {
                textContent += ", " + tree.algorithm;
            }
            if (tree.parameter != "") {
                textContent += ", " + tree.parameter;
            }

            document.getElementById("demo_info").textContent = textContent;


            var near_St = this$1.getTransform().stepMap();
            this$1._prepare_active_tiles(near_St[0]);
        });

        this.msgbus.subscribe('map.scale', function (topic, message, sender) {
            //console.log('message:', message)
            var scale = (Math.round(message / 5) * 5).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
            // console.log(`scale changed to: 1 : ${scale}`)

            var el = document.getElementById("scale-denominator");
            el.textContent = " 1:" + scale;
        });

        this.ssctree = new SSCTree(this.msgbus);
        this.ssctree.load();



        this.renderer = new Renderer(
            this._container.getContext('experimental-webgl', { alpha: false, antialias: true }),
            this.ssctree);
        this.renderer.setViewport(rect.width, rect.height);

        //this.abortAndRender()


        dragHandler(this);  // attach mouse handlers
        // moveHandler(this)
        scrollHandler(this);
        touchPinchHandler(this); // attach touch handlers
        touchDragHandler(this);

        // this.evictor = new Evictor(this.ssctree,
        //                         this._container.getContext('webgl', { alpha: false, antialias: true }))
        // window.setInterval(() => {
        // const box2d = this.getTransform().visibleWorld()
        // this.evictor.evict([[box2d.xmin, box2d.ymin], [box2d.xmax, box2d.ymax]]); this.render() }, 15000)

    };

    Map.prototype.getCanvasContainer = function getCanvasContainer () {
        return this._container;
    };

    Map.prototype.getTransform = function getTransform () {
        return this._transform;
    };

    Map.prototype.render = function render () {
        var near_St = this.getTransform().stepMap();
        this.msgbus.publish('map.scale', near_St[1]);

        var matrix_box3d = this._prepare_active_tiles(near_St[0]);
        this.renderer.render_relevant_tiles(matrix_box3d[0], matrix_box3d[1], near_St);
    };

    Map.prototype._prepare_active_tiles = function _prepare_active_tiles (near) {
        var matrix = this.getTransform().world_square;
        var far = -1;
        matrix[10] = -2.0 / (near - far);
        matrix[14] = (near + far) / (near - far);
        var box2d = this.getTransform().visibleWorld();
        var box3d = [box2d.xmin, box2d.ymin, near, box2d.xmax, box2d.ymax, near];
        var gl = this._container.getContext('experimental-webgl', { alpha: false, antialias: true });
        this.ssctree.fetch_tiles(box3d, gl);
        return [matrix, box3d]
    };

    Map.prototype.doEaseNone = function doEaseNone (start, end) {
            var this$1 = this;

        var interpolate = (function (k) {
            var m = new Float32Array(16);
            for (var i = 0; i < 16; i++) {
                var delta = start[i] + k * (end[i] - start[i]);
                m[i] = delta;
            }
            // update the world_square matrix
            this$1.getTransform().world_square = m;
            this$1.getTransform().updateViewportTransform();
            this$1.render();
            if (k == 1) {
                this$1._abort = null;
            }
        });
        return interpolate;
    };

    Map.prototype.doEaseInOutSine = function doEaseInOutSine (start, end) {
        function interpolate(k) {
            var m = new Float32Array(16);
            var D = Math.cos(Math.PI * k) - 1;
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = -c * 0.5 * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform();
            this.render();
            if (k == 1) {
                this._abort = null;
            }
        }
        return interpolate;
    };

    Map.prototype.doEaseOutSine = function doEaseOutSine (start, end) {
            var this$1 = this;

        var interpolate = function (k) {
            var m = new Float32Array(16);
            var D = (Math.sin(k * (Math.PI * 0.5)));
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this$1.getTransform().world_square = m;
            this$1.getTransform().updateViewportTransform();
            this$1.render();
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
            var m = new Float32Array(16);
            for (var i = 0; i < 16; i++) {
                var c = end[i] - start[i];
                var delta = c * t5p1 + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform();
            this.render();
            if (k == 1) {
                this._abort = null;
            }
        }
        return interpolate;
    };

    Map.prototype.animateZoom = function animateZoom (x, y, factor) {
        var start = this.getTransform().world_square;
        this.getTransform().zoom(factor, x, this.rect.height - y);
        var end = this.getTransform().world_square;
        var interpolate = this.doEaseOutSine(start, end);
        return interpolate;
    };

    Map.prototype.animatePan = function animatePan (dx, dy) {
        var start = this.getTransform().world_square;
        this.getTransform().pan(dx, -dy);
        var end = this.getTransform().world_square;
        var interpolate = this.doEaseOutSine(start, end);
        return interpolate;
    };

    Map.prototype.panBy = function panBy (dx, dy) {
        //console.log("_abort in map.js:", this._abort)
        if (this._abort !== null) {
            this._abort();
        }
        this.getTransform().pan(dx, -dy);
        this.render();
    };

    Map.prototype.zoom = function zoom (x, y, factor) {
        this.getTransform().zoom(factor, x, this.rect.height - y);
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

    Map.prototype.zoomInAnimated = function zoomInAnimated (x, y, step) {
        this.zoomAnimated(x, y, 1.0 + step);
    };

    Map.prototype.zoomOutAnimated = function zoomOutAnimated (x, y, step) {
        this.zoomAnimated(x, y, 1.0 / (1.0 + step));
    };

    Map.prototype.zoomAnimated = function zoomAnimated (x, y, factor) {
        if (this._abort !== null) {
            this._abort();
        }
        var interpolator = this.animateZoom(x, y, factor);
        var duration = parseFloat(document.getElementById('duration').value);
        this._abort = timed(interpolator, duration, this);
    };

    Map.prototype.panAnimated = function panAnimated (dx, dy) {
        if (this._abort !== null) {
            this._abort();
        }
        var duration = parseFloat(document.getElementById('panduration').value);
        var interpolator = this.animatePan(dx, dy);
        this._abort = timed(interpolator, duration, this);
    };

    Map.prototype.resize = function resize (newWidth, newHeight) {
        //console.log("resize");
        var tr = this.getTransform();
        var center = tr.getCenter();
        var denominator = tr.getScaleDenominator();
        // re-initialize the transform
        tr.initTransform(center, [newWidth, newHeight], denominator);
        // update the viewport size of the renderer
        this.renderer.setViewport(newWidth, newHeight);

    };

    // import  Rectangle from "./rect"
    //let r = new Rectangle(1, 2, 3, 4);
    //console.log(r);

    var exported = {
        Map: Map
    };

    return exported;

}());
