"use strict";

/**
* Handler while the mouse is being moved, without any buttons pressed
* Does show the real world coordinates where the mouse is hovering
*/

// FIXME: when the mouse stays at the same location, 
// and the view of the map is animated
// the values of the scale and coordinates do change, 
// but this is *not* reflected in the UI
export function moveHandler (map) {

    const _map = map;
    var _canvas = map.getCanvasContainer();

    _canvas.addEventListener("mousedown", doMouseDown, false);
    _canvas.addEventListener("mousemove", doMouseMove, false);

    function doMouseDown(evt)
    {
        // prevent cursor to turn into text selection on chrome
        evt.preventDefault();
        _canvas.addEventListener("mouseup", doMouseUp, false);
        _canvas.removeEventListener("mousemove", doMouseMove, false);
    }

    function doMouseMove(evt)
    {
        //console.log("do hover");
        //console.log('mouse,move.js swiper.style.transform:', document.getElementById('swiper').style.transform)



        var r = _canvas.getBoundingClientRect();



        var x = evt.clientX - r.left - _canvas.clientLeft;
        var y = evt.clientY - r.top - _canvas.clientTop;
        const transformed = _map.getTransform().backward([x, r.height-y, 0]);
        let scale = _map.getTransform().getScaleDenominator();
        displayCoordinates(transformed, scale);
    }

    // eslint-disable-next-line no-unused-vars
    function doMouseUp(evt)
    {
        _canvas.removeEventListener("mouseup", doMouseUp, false);
        _canvas.addEventListener("mousemove", doMouseMove, false);
    }

    function displayCoordinates(coords, scale)
    {
        console.log(coords[0].toFixed(1) + ", " + coords[1].toFixed(1) + " 1:" + scale.toFixed(0))
        // -- modify the DOM
        /*
        var list = document.getElementById("mouse-move-output");
        var li = document.createElement('li');
        var val = document.createTextNode(coords[0].toFixed(1) + ", " + coords[1].toFixed(1) + " 1:" + scale.toFixed(0));
        li.appendChild(val);
        if (list.childNodes[0] !== undefined)
        {
            list.replaceChild(li, list.childNodes[0]);
        }
        else
        {
            list.appendChild(li);
        }
        */
        // end modify
    }
}
