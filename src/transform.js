import { create, createvec3, vec3transform, multiply, invert, console_log } from './mat4';
import Rectangle from './rect';
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
    let sx = (box.xmax - box.xmin) * .5
    let sy = (box.ymax - box.ymin) * .5
    let tx = (box.xmax + box.xmin) * .5
    let ty = (box.ymax + box.ymin) * .5
    let m = create()
    m[0] = sx
    m[5] = sy
    m[12] = tx
    m[13] = ty
    return m
}

// FIXME
//
// Check handedness of the 3D system and get it right + consistent!
// https://github.com/g-truc/glm/blob/master/glm/gtc/matrix_transform.inl
//
// OrthoLH
// OrthoRH


class Transform {
    constructor(center_world, viewport_size, denominator) {

        this.viewport_world = create(); //matrix: to transform a point from a viewport to the realworld
        this.world_viewport = create(); //matrix: to transform a point from the realworld to a viewport 
        //
        this.world_square = null;
        this.square_viewport = null;
        //
        this.viewport = null; //e.g., xmin:0, ymin:0, xmax: 1200, ymax: 929

        // set up initial transformation
        this.initTransform(center_world, viewport_size, denominator)

        this.snapped_step = Number.MAX_SAFE_INTEGER
        this.snapped_St = denominator
        //this.current_step = Number.MAX_SAFE_INTEGER
    }

    // fixme: rename -> initTransform
    initTransform(center_world, viewport_size, denominator) {
        // compute from the center of the world, the viewport size and the scale
        // denominator how much of the world is visible
        let cx = center_world[0],
            cy = center_world[1]

        // get half visible screen size in world units,
        // when we look at it at this map scale (1:denominator)
        let half_visible_screen = [
            0.5 * viewport_size[0] / meter_to_pixel * denominator,
            0.5 * viewport_size[1] / meter_to_pixel * denominator
        ]
        let xmin = cx - half_visible_screen[0],
            xmax = cx + half_visible_screen[0],
            ymin = cy - half_visible_screen[1],
            ymax = cy + half_visible_screen[1]
        // the size of the viewport 
        this.viewport = new Rectangle(0, 0, viewport_size[0], viewport_size[1])
        // we arrive at what part of the world then is visible
        // let visible_world = this.getVisibleWorld() //
        let visible_world = new Rectangle(xmin, ymin, xmax, ymax)
        // scaling/translating is then as follows:
        this.update_world_square_viewport(visible_world, cx, cy)
    }


    pan(dx, dy) {
        //console_log(this.square_viewport, 'this.square_viewport before')
        //console.log('dx, dy:', dx, dy)
        this.square_viewport[12] += dx
        this.square_viewport[13] += dy

        //console_log(this.square_viewport, 'this.square_viewport')
        //console_log(this.world_square, 'this.world_square')

        //e.g., viewport: 1200 x 929
        //e.g., this.square_viewport changed by moving dx == 100 and dy == 50:
        //  600         0       0       0
        //    0     464.5       0       0
        //    0         0       1       0
        //  700     514.5       0       1
        //e.g., this.world_square:
        //    0.00006929133087396622      0                         0   0
        //    0                           0.00008950447954703122    0   0
        //    0                           0                         1   0
        //  -12.938166618347168         -27.96834945678711          0   1
        multiply(this.world_viewport, this.square_viewport, this.world_square)
        //e.g., this.world_viewport:
        //      0.04157479852437973     0                       0   0
        //      0                       0.041574832051992416    0   0
        //      0                       0                       1   0
        //  -7062.89990234375      -12476.7978515625            0   1


        //console_log(this.world_viewport, 'this.world_viewport')


        invert(this.viewport_world, this.world_viewport)

        // we arrive at what part of the world then is visible
        let visible_world = this.getVisibleWorld() // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        let center = visible_world.center()
        // scaling/translating is then as follows:
        this.update_world_square_viewport(visible_world, center[0], center[1])
    }

    compute_zoom_parameters(ssctree, zoom_factor, x, y, if_snap) {
        //console.log(' ')
        //let if_snap = true
        //console.log('transform.js St before:', this.getScaleDenominator())
        //console.log('transform.js factor:', zoom_factor)

        //console.log('transform.js zoom_factor:', zoom_factor)

        let St_current = this.getScaleDenominator()
        let current_step = ssctree.get_step_from_St(St_current) //current_step should be compute instantly because of aborting actions
        this.compute_matrix_parameters(zoom_factor, x, y)
        let time_factor = 1


        if (if_snap == true) {

            let St_new = this.getScaleDenominator()


            //console.log('transform.js St_current:', St_current)
            //console.log('transform.js St:', St)
            //console.log('transform.js St_new:', St_new)
            //console.log('transform.js St_current / St:', St_current / St)
            //console.log('transform.js zoom_factor:', zoom_factor)

            //console.log('transform.js ----------------:')
            //console.log('transform.js St after:', this.getScaleDenominator())


            let snapped_step = ssctree.get_zoom_snappedstep_from_St(St_new, zoom_factor)
            //console.log('transform.js snapped_step:', snapped_step)
            time_factor = ssctree.get_time_factor(St_new, zoom_factor, current_step)
            let snapped_St = ssctree.get_St_from_step(snapped_step)
            this.snapped_step = snapped_step
            this.snapped_St = snapped_St

            //this.current_step = snapped_step

            //console.log('transform.js St_new:', St_new)
            //console.log('transform.js snapped_step:', snapped_step)
            //console.log('transform.js snapped_St:', snapped_St)
            //console.log('transform.js St / snapped_St:', St / snapped_St)
            this.compute_matrix_parameters(St_new / snapped_St, x, y)
            //let final_St = this.getScaleDenominator()
            //console.log('transform.js final St:', final_St)
            //console.log('transform.js final step:', ssctree.get_step_from_St(St, false))

        }
        return time_factor
    }

    compute_matrix_parameters(zoom_factor, x, y) {
    //zoom(ssctree, factor, x, y) {
        //console.log('transform.js test')

        var tmp = create()
        // 1. translate
        {
            let eye = create()
            eye[12] = -x
            eye[13] = -y
            multiply(tmp, eye, this.square_viewport)
        }
        // 2. scale
        {
            let eye = create()
            eye[0] = zoom_factor
            eye[5] = zoom_factor
            multiply(tmp, eye, tmp)
        }
        // 3. translate back
        {
            let eye = create()
            eye[12] = x
            eye[13] = y
            multiply(tmp, eye, tmp)
        }
        //this.square_viewport = tmp;
        multiply(this.world_viewport, tmp, this.world_square)
        invert(this.viewport_world, this.world_viewport)
        // we arrive at what part of the world then is visible
        let visible_world = this.getVisibleWorld() // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        let center = visible_world.center()
        // scaling/translating is then as follows:
        this.update_world_square_viewport(visible_world, center[0], center[1])
    }

    update_world_square_viewport(visible_world, cx, cy) {

        let scale = [2. / visible_world.width(), 2. / visible_world.height()]
        let translate = [-scale[0] * cx, -scale[1] * cy]
        // by means of which we can calculate a world -> ndc square matrix
        let world_square = create()
        world_square[0] = scale[0]
        world_square[5] = scale[1]
        world_square[12] = translate[0]
        world_square[13] = translate[1]
        this.world_square = world_square

        //console.log("INITIAL world square" + world_square);
        // and given the size of the viewport we can set up ndc square -> viewport matrix


        //console.log(this.viewport, 'this.viewport')

        //e.g., this.viewport:  xmin: 0, ymin: 0, xmax: 1200, ymax: 929
        //e.g., this.square_viewport obtained from function square_viewport_matrix:
        //  600         0       0       0
        //    0     464.5       0       0
        //    0         0       1       0
        //  600     464.5       0       1
        this.square_viewport = square_viewport_matrix(this.viewport)
        //console_log(this.square_viewport, 'this.square_viewport')

        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform()
        //console.log('ll: ' + ll + " " + this.viewport.xmin + " " + this.viewport.ymin);
        //console.log('tr: ' + tr + " " + this.viewport.xmax + " " + this.viewport.ymax);
    }



    backward(vec3) {
        let result = createvec3()
        vec3transform(result, vec3, this.viewport_world)
        return result
    }

    updateViewportTransform() {
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        //        console.log('square_viewport', this.square_viewport)
        //        console.log('world_square', this.world_square)

        multiply(this.world_viewport, this.square_viewport, this.world_square)
        invert(this.viewport_world, this.world_viewport)
    }

    getVisibleWorld() {
        //console.log("visibleWorld in transform.js")
        var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]); //e.g., this.viewport.xmin == 0; ll[0] == 170625
        var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]); //e.g., this.viewport.xmax == 1200

        // we arrive at what part of the world then is visible
        return new Rectangle(ll[0], ll[1], tr[0], tr[1])
    }

    getCenter() {
        //console.log("getCenter in transform.js")
        var center = this.backward([
            this.viewport.xmin + (this.viewport.xmax - this.viewport.xmin) * 0.5,
            this.viewport.ymin + (this.viewport.ymax - this.viewport.ymin) * 0.5, 0.0]);
        return center
    }

    getScaleDenominator() {

        let viewport_width_meter = this.viewport.width() / meter_to_pixel
        let world_width_meter = this.getVisibleWorld().width()
        let St = world_width_meter / viewport_width_meter

        //let viewport_in_meter = new Rectangle(0, 0,
        //    this.viewport.width() / meter_to_pixel,
        //    this.viewport.height() / meter_to_pixel)
        //let world_in_meter = this.getVisibleWorld()
        //let St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area())
        //console.log('transform.js viewport_in_meter.area():', viewport_in_meter.area())
        //if (viewport_in_meter.area() > 0) {
        //    St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area())
        //}  
        
        return St
    }



}

export default Transform
