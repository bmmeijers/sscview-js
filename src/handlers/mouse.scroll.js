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
        if ((now - _prev) < 20)
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

        // standard value for zoom step
        var step = 0.1;
        const direction = Math.max(-1, Math.min(1, -value));
        if (_trace === null)
        {
            _trace = new Trace(direction);
        }
        else
        {
            let prev = _trace.last()
            const delta = now - prev[0]
            _trace.push(direction);

            var radios = document.getElementsByName('speed');
            let factor = 1
            for (var i = 0, length = radios.length; i < length; i++) {
                if (radios[i].checked) {
                    // do whatever you want with the checked radio
                    factor = parseFloat(radios[i].value)
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
                    step = 0.0625
                    break;
                case delta > 500:
                    step = 0.125
                    break;
                case delta > 50:
                    step = 0.25
                    break;
                default:
                    step = 0.5
                    break;
            }
            step *= factor
            _trace.shift(2000);
//            console.log(delta + " " + prev[1] + " " + step);
        }

        const r = _canvas.getBoundingClientRect();
        const x = evt.clientX - r.left - _canvas.clientLeft;
        const y = evt.clientY - r.top - _canvas.clientTop;
        //console.log('wheel ' + [x, y] + " " + delta);
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
