"use strict";

import { now as _now } from '../animate';
import Trace from './trace';

/**
* Handler for touch events
* zooms the map if two fingers are used and the distance between them changes.
* 
*/

export function touchPinchHandler (map) {
    var canvas = map.getCanvasContainer();

    canvas.addEventListener("touchstart", doPinchStart, false);
    canvas.oncontextmenu = function (evt) {
        // prevent context menu from popping up
        evt.preventDefault();
    };

    function dist(points) {
        const [dx, dy] = vec(points);
        return Math.sqrt(dx * dx + dy * dy);
    }

    function center(points) {
        const [dx, dy] = vec(points);
        let p0 = points[0];
        return [p0[0] + dx * 0.5,
                p0[1] + dy * 0.5];
    }

    function vec(points) {
        let dx = points[1][0] - points[0][0];
        let dy = points[1][1] - points[0][1];
        return [dx, dy];
    }

    function getTouchPoints(event) {
        const r = canvas.getBoundingClientRect();
        const touches = event.touches;
        var points = [];
        // note: length hardcoded as 2
        for (let j = 0; j < 2; j++) {
            const x = touches[j].clientX - r.left - canvas.clientLeft;
            const y = touches[j].clientY - r.top - canvas.clientTop;
            points.push([x, y]);
        }
        return points;
    }

    var _prevDist = null;
    var _prevCenter = null
    var _startTime = null;
    var _startCenter = null;

    function doPinchStart(event) {
        if (!event.touches || event.touches.length !== 2) { return; }
        event.preventDefault();

        canvas.removeEventListener("touchstart", doPinchStart, false);
        canvas.addEventListener("touchmove", doPinchMove, { capture: true, passive: false });
        canvas.addEventListener("touchend", doPinchEnd, false);
        
        // let points = getTouchPoints(event);
        // console.log(points);
        // _startCenter = center(points);
        map.abortAndRender(); // to cancel on going animations
        let points = getTouchPoints(event);
        _prevDist = null;
        _prevCenter = center(points);
        _startCenter = center(points);
        _startTime = _now();

    }

    function doPinchMove(event) {
        // we discard the first few movement events at the beginning (30 ms since start)
        // these seem to be 'unstable', are rapidly fired after placing the fingers on 
        // the screen and they lead to wildly varying positions

        if (!event.touches || event.touches.length !== 2 || (_now() - _startTime) < 30) { return; }
        // console.log('time of touch ' + (_now() - _startTime));

        event.preventDefault();
        let points = getTouchPoints(event);
//        _trace.shift(200);
//        _trace.push(points);
        

//        let distTrend = _trace._trace.map((pt, i) => {
//            let [time, val] = pt
//            let [firstTime, firstVal] = _trace._trace[i+1]
////            console.log(i + " " + time + " " + val + " "+ dist(val, firstVal))
//            return dist(val, firstVal)
//        })
//        let distTrend = []
//        let [firstTime, firstVal] = _trace._trace[0]
//        for (let i = 1; i < _trace._trace.length; i++) {
//            let [time, val] = _trace._trace[i]
//            let d = dist(val, _trace._trace[i-1][1])
//            distTrend.push(d)
//        }
//        console.log(distTrend)

        let curDist = dist(points);
        if (_prevDist !== null) {

            let scaleDelta = curDist / _prevDist;
            let currentCenter = center(points);
            let panDist = [currentCenter[0] - _prevCenter[0],
                           currentCenter[1] - _prevCenter[1]]


            var el = document.getElementById("touchCenter")
            el.style.left = Math.floor(currentCenter[0]) + "px"
            el.style.top = Math.floor(currentCenter[1]) + "px"

            el = document.getElementById("touchFirst")
            el.style.left = Math.floor(points[0][0]) + "px"
            el.style.top = Math.floor(points[0][1]) + "px"
            // el.innerHTML = "<span class='circle'>["+points[0][0].toFixed(1) + ","+ points[0][1].toFixed(1) + "]</span>"

            el = document.getElementById("touchSecond")
            el.style.left = Math.floor(points[1][0]) + "px"
            el.style.top = Math.floor(points[1][1]) + "px"
            // el.innerHTML = "<span class='circle'>["+points[1][0].toFixed(1) + ","+ points[1][1].toFixed(1) + "]</span>"

//            map.nonAnimatedZoom(currentCenter[0], currentCenter[1] , scaleDelta );
            map.nonAnimatedZoomAndPan(currentCenter, scaleDelta, panDist);
            _prevCenter = currentCenter
        }
        _prevDist = curDist;
    }

    function doPinchEnd(event) {
        if (event.touches.length !== 0) { return; }
        event.preventDefault();
//        console.log('doPinchEnd');
//        console.log('trace for pinch end ' + _trace.length());
//        if (_trace.length() > 1)
//        {
//            // FIXME:
//            // should the intent of the user be derived from 
//            // comparing the last two touch points only?
//            // or, should we compare begin and end of the gesture
//            // or, should we detect some pattern in the gesture points?
//            // or, ... 
//            let last = _trace.last();
//            let lastbutone = _trace.lastbutone();
//            let curDist = dist(last[1]);
//            let prevDist = dist(lastbutone[1]);
//            if (prevDist !== null) {
//                let scaleDelta = curDist / _prevDist;
//                // let scaleDelta = curDist / prevDist;
//                let [x, y] = center(last[1]);
////                let [x, y] = _startCenter;
//                let step = 0.5;
//                map.nonAnimatedZoom(x, y, Math.max(Math.min(scaleDelta, 1.1), 0.9));
//            }
////            if (curDist < prevDist)
////            {
////                // distance between fingers has become smaller
////                // -> zoom out
////                map.zoomOut(x, y, step)
////            } else {
////                // distance between fingers has become larger
////                // -> zoom in
////                map.zoomIn(x, y, step)
////            }

//            // FIXME: 
//            // should we take the zoom step preference of the
//            // user into account here? e.g. large zoom step -> 
//            // allows larger change of the clamped scaledelta?
//            // map.zoomAnimated(x, y, Math.max(Math.min(scaleDelta, 1.2), 0.8));
//        }

        canvas.removeEventListener("touchmove", doPinchMove, { capture: true, passive: false });
        canvas.removeEventListener("touchend", doPinchEnd, false);
        canvas.addEventListener("touchstart", doPinchStart, false);
        _prevDist = null;
        _prevCenter = null;
        _startTime = null;
        _startCenter = null;
//        _trace = null;
    }
}


