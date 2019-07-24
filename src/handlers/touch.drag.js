import Trace from './trace';

export function touchDragHandler(map) {
    var canvas = map.getCanvasContainer();
    canvas.addEventListener("touchstart", doTouchDragStart, false);
    // canvas.addEventListener("touchstart", doMouseDown, { passive: false });
    canvas.oncontextmenu = function (evt) {
        // prevent context menu from popping up
        evt.preventDefault();
    };

    function getTouchPoint(event) {
        const r = canvas.getBoundingClientRect();
        const touches = event.touches;       
        const x = touches[0].clientX - r.left - canvas.clientLeft;
        const y = touches[0].clientY - r.top - canvas.clientTop;
            
        return [x, y];
    }

    var _trace = null;
    var _state = null;

    function doTouchDragStart(evt) {
        console.log("doing mouse drag!");
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
        let point = getTouchPoint(evt);
        console.log('touchstart');
        _trace = new Trace(point);
        _state = 'pending';
    }
    function doTouchDragMove(evt) {
        console.log('touchmove');
        
        // when we detect more than 1 finger on the screen
        // we obviously do not want to pan, so we set the state to
        // pending (i.e. currently we do not handle events for panning)
        if (evt.touches.length > 1) 
        {
            _state = 'pending';
            return;
        }
        evt.preventDefault();
        let point = getTouchPoint(evt);
        
        // how much did the map move since last time?
        let prev = _trace.last()[1];
        let dx = point[0] - prev[0];
        let dy = point[1] - prev[1];
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
                const last = _trace.last();   
                const first = _trace.first();
                // in seconds
                let time = (last[0] - first[0]) / 1000;
                // so then we can see given the desired duration
                // how far could the map travel with the same speed
                // then if we ease out, we travel a bit less far
                // so that it looks ok
                let start = first[1];
                let dx = (last[1][0] - start[0]);
                let dy = (last[1][1] - start[1]);
                // take percent of speed computed
                const percent = 1.0; // 0.7
                let vx = dx / time * percent;
                let vy = dy / time * percent;
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
                let tx = (vx * 0.5) * (duration / 1000);
                let ty = (vy * 0.5) * (duration / 1000);

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
