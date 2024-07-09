"use strict";

/**
* Handler for a scroll of the MouseWheel
*
* Starts an animated zoom (in or out) operation
*/

import { now as _now } from '../animate';
import Trace from './trace';

export function scrollHandler (map) {

    const _map = map;
    const _canvas = map.getCanvasContainer();

    _canvas.addEventListener("wheel", doMouseWheel, { passive: false });
    _canvas.addEventListener("mousewheel", doMouseWheel, { passive: false });

    var _trace = null;
    var _prev = null;

    function doMouseWheel(evt)
    {
        // prevent from also scrolling the page -- not allowed when passive: true
        evt.preventDefault();
        // return if previous evt is shorter than n msec ago
        const now = _now();
        if ((now - _prev) < 5)
        {
            return 
        }
        // find the wheel value (this is implemented differently per browser)
        let value = undefined
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
        _prev = now

        // standard value for zoom scroll_factor
        var scroll_factor = 0.1;
        let direction = Math.max(-1, Math.min(1, -value));
        if (_trace === null)
        {
            // FIXME: use the trace for determining the direction
            // i.e. average few wheel clicks
            _trace = new Trace(direction);
        }
        else
        {
            let prev = _trace.last()
            const delta = now - prev[0]
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
                    scroll_factor = 0.0625
                    break;
                case delta > 500:
                    scroll_factor = 0.125
                    break;
                case delta > 50:
                    scroll_factor = 0.25
                    break;
                default:
                    scroll_factor = 0.5
                    break;
            }
            scroll_factor *= _map._interaction_settings.zoom_factor  //getspeed()
            _trace.shift(200);
//            console.log(delta + " " + prev[1] + " " + scroll_factor);
        }
        // determine average dir
        direction = _trace.average() >= 0 ? +1 : -1;
        //if the canvas has size 800 x 800, 
        //evt.clientX: x-coordinate in pixel, starting from the left of the canvas (800 x 800)
        //evt.clientY: y-coordinate in pixel, starting from the top of the canvas (800 x 800)        
        //r has size 800 x 760 because of the bar (with height 39.92) at the top
        //r.left = 0 and r.top = 39.92
        const r = _canvas.getBoundingClientRect();
        const x = evt.clientX - r.left - _canvas.clientLeft;  //_canvas.clientLeft is often 0
        const y = evt.clientY - r.top - _canvas.clientTop;  //_canvas.clientTop is often 0

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
    // var radios = document.getElementsByName('speed');
    let factor = 4
//    for (var i = 0, length = radios.length; i < length; i++) {
//        if (radios[i].checked) {
//            // do whatever you want with the checked radio
//            factor = parseFloat(radios[i].value)
//            // only one radio can be logically checked, don't check the rest
//            break;
//        }
//    }

    return factor
}



export function zoomButtonHandler(map) {
    const canvas = map.getCanvasContainer();

    document.getElementById("zoomInButton").addEventListener('click',
        function () {
            map.zoomInAnimated(canvas.width / 2, canvas.height / 2, map._interaction_settings.zoom_factor ) //getspeed())
        }
    )

    document.getElementById("zoomOutButton").addEventListener('click',
        function () {
            map.zoomOutAnimated(canvas.width / 2, canvas.height / 2, map._interaction_settings.zoom_factor )// getspeed())
        }
    )
}
