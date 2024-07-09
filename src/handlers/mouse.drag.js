
import Trace from './trace';

export function dragHandler(map) {

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
        let e = evt.touches ? evt.touches[0] : evt;

        const x = e.clientX - r.left - canvas.clientLeft;
        const y = e.clientY - r.top - canvas.clientTop;

        //        console.log('doMouseDown');
        //        console.log([x,y]);

        _trace = new Trace([x, y]);
        map.panBy(0, 0); // to cancel on going animations
        
    }

    function doMouseDrag(evt) {
        evt.preventDefault();
        const r = canvas.getBoundingClientRect();

        //console.log('mouse.drag.js swiper.style.transform:', document.getElementById('swiper').style.transform)

        // for mouse use raw evt, for touches, use first touch location
        let e = evt.touches ? evt.touches[0] : evt;

        const x = e.clientX - r.left - canvas.clientLeft;
        const y = e.clientY - r.top - canvas.clientTop;

        // how much did the map move since last time?
        let prev = _trace.last()[1]
        let dx = x - prev[0];
        let dy = y - prev[1];
        _trace.shift(200)
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

        const r = canvas.getBoundingClientRect();
        // for mouse use raw evt, for touches, use first touch location
        let e = evt.changedTouches ? evt.changedTouches[0] : evt;

        const x = e.clientX - r.left - canvas.clientLeft;
        const y = e.clientY - r.top - canvas.clientTop;

        _trace.shift(200)
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
        const last = _trace.last()
        const first = _trace.first()
        // in seconds
        let time = (last[0] - first[0]) / 1000

        // so then we can see given the desired duration
        // how far could the map travel with the same speed
        // then if we ease out, we travel a bit less far
        // so that it looks ok

        let start = first[1]
        let dx = (x - start[0]);
        let dy = (y - start[1]);

        // take percent of speed computed
        const percent = 1.0 // 0.7
        let vx = dx / time * percent
        let vy = dy / time * percent

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
        let duration = parseFloat(map._interaction_settings.pan_duration);
        // var duration = 1000; // parseFloat(document.getElementById('panduration').value);
        let tx = (vx * 0.5) * duration;
        let ty = (vy * 0.5) * duration;

        console.log(duration)
        console.log(tx)
        console.log(ty)
        _trace = null;
        map.panAnimated(tx, ty);
        // console.log('mouseup')
    }

}
