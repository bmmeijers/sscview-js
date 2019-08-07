import { create, createvec3, vec3transform, multiply, invert } from './mat4';
import Rectangle from './rect';

// TODO
// - Aspect ratio / resize of viewport --> update transform
// - Take into account the z-value of the slice
// - Remove duplication inside functions

// let = block scoped
// var = global / function scoped


var meter_to_pixel = 3779.5275590551; // 1 meter equals 3779.5275590551 pixels

function world_square_matrix(box, ar) {
    // Returns transform matrix to go from world to normalized square
    // FIXME: aspect ratio - is NOT taken into account ??? !!!
    let sx = 2. / ((box.xmax - box.xmin) * ar)
    let sy = 2. / (box.ymax - box.ymin)
    let tx = -(box.xmax + box.xmin) / (box.xmax - box.xmin)
    let ty = -(box.ymax + box.ymin) / (box.ymax - box.ymin)
    let m = create()
    m[0] = sx
    m[5] = sy
    m[12] = tx
    m[13] = ty
    return m
}


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
    constructor(Sb, Nb, Ns, center_world, viewport_size, denominator) {

        this.Sb = Sb; // start scale denominator
        this.Nb = Nb; //total number of objects on base map 
        this.Ns = Ns; //total number of steps
        // matrices
        this.viewport_world = create();
        this.world_viewport = create();
        //
        this.world_square = null;
        this.square_viewport = null;
        //
        this.viewport = null;
        // set up initial transformation
        this.initTransform(center_world, viewport_size, denominator)
        //console.log("Set up transform: " + center_world + " 1:" + denominator + " vs 1:" + this.getScaleDenominator())
    }

    // fixme: rename -> initTransform
    initTransform(center_world, viewport_size, denominator) {
        // compute from the center of the world, the viewport size and the scale
        // denominator how much of the world is visible
        let cx = center_world[0],
            cy = center_world[1]
        let width = viewport_size[0],
            height = viewport_size[1]
        let halfw = 0.5 * width,
            halfh = 0.5 * height

        // get half visible screen size in world units,
        // when we look at it at this map scale (1:denominator)
        let half_visible_screen = [halfw / meter_to_pixel * denominator, halfh / meter_to_pixel * denominator]
        let xmin = cx - half_visible_screen[0],
            xmax = cx + half_visible_screen[0],
            ymin = cy - half_visible_screen[1],
            ymax = cy + half_visible_screen[1]
        // the size of the viewport 
        this.viewport = new Rectangle(0, 0, width, height)
        // we arrive at what part of the world then is visible
        // let visible_world = this.visibleWorld() //
        let visible_world = new Rectangle(xmin, ymin, xmax, ymax)
        // scaling/translating is then as follows:
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
        // we can set up ndc square -> viewport matrix

        this.square_viewport = square_viewport_matrix(this.viewport)
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform()

        // var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        // var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
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
        multiply(this.world_viewport, this.square_viewport, this.world_square)
        invert(this.viewport_world, this.world_viewport)
    }

    pan(dx, dy) {
        this.square_viewport[12] += dx
        this.square_viewport[13] += dy

        multiply(this.world_viewport, this.square_viewport, this.world_square)
        invert(this.viewport_world, this.world_viewport)

        // var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        // var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        //console.log('ll: ' + ll + " " + this.viewport.xmin + " " + this.viewport.ymin);
        //console.log('tr: ' + tr + " " + this.viewport.xmax + " " + this.viewport.ymax);

        // we arrive at what part of the world then is visible
        let visible_world = this.visibleWorld() // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        let center = visible_world.center()
        // scaling/translating is then as follows:
        let scale = [2. / visible_world.width(), 2. / visible_world.height()]
        let translate = [-scale[0] * center[0], -scale[1] * center[1]]
        // by means of which we can calculate a world -> ndc square matrix
        let world_square = create()
        world_square[0] = scale[0]
        world_square[5] = scale[1]
        world_square[12] = translate[0]
        world_square[13] = translate[1]
        this.world_square = world_square
        // and given the size of the viewport we can set up ndc square -> viewport matrix
        // this.viewport = new Rectangle(0, 0, width, height)
        this.square_viewport = square_viewport_matrix(this.viewport)
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform()
    }

    zoom(factor, x, y) {
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
            eye[0] = factor
            eye[5] = factor
            multiply(tmp, eye, tmp)
        }
        // 3. translate back
        {
            let eye = create()
            eye[12] = x
            eye[13] = y
            multiply(tmp, eye, tmp)
        }
        this.square_viewport = tmp;
        multiply(this.world_viewport, this.square_viewport, this.world_square)
        invert(this.viewport_world, this.world_viewport)
        // var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        // var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        // we arrive at what part of the world then is visible
        let visible_world = this.visibleWorld() // new Rectangle(ll[0], ll[1], tr[0], tr[1])
        let center = visible_world.center()
        // scaling/translating is then as follows:
        let scale = [2. / visible_world.width(), 2. / visible_world.height()]
        let translate = [-scale[0] * center[0], -scale[1] * center[1]]
        // by means of which we can calculate a world -> ndc square matrix
        let world_square = create()
        world_square[0] = scale[0]
        world_square[5] = scale[1]
        world_square[12] = translate[0]
        world_square[13] = translate[1]
        this.world_square = world_square
        // and given the size of the viewport we can set up ndc square -> viewport matrix
        // this.viewport = new Rectangle(0, 0, width, height)
        this.square_viewport = square_viewport_matrix(this.viewport)
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        this.updateViewportTransform()
    }

    visibleWorld() {
        //console.log("visibleWorld in transform.js")
        var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
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
        let viewport_in_meter = new Rectangle(0, 0,
            this.viewport.width() / meter_to_pixel,
            this.viewport.height() / meter_to_pixel)
        let world_in_meter = this.visibleWorld()
        let St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area())
        return St
    }

    stepMap() {
        let viewport_in_meter = new Rectangle(0, 0,
            this.viewport.width() / meter_to_pixel,
            this.viewport.height() / meter_to_pixel)
        let world_in_meter = this.visibleWorld()


        // FIXME: these 2 variables should be adjusted
        //         based on which tGAP is used...
        // FIXME: this step mapping should move to the data side (the tiles)
        //         and be kept there (for every dataset visualized on the map)
        // FIXME: should use this.getScaleDenominator()

        // let Sb = 48000  // (start scale denominator)
        // let total_steps = 65536 - 1   // how many generalization steps did the process take?

        //let Sb = 24000  // (start scale denominator)
        //let total_steps = 262144 - 1   // how many generalization steps did the process take?



        let St = Math.sqrt(world_in_meter.area() / viewport_in_meter.area()) //current scale denominator 
        let reductionf = 1 - Math.pow(this.Sb / St, 2) // reduction in percentage

        //Originally, step = this.Nb * reductionf.
        //If the goal map has only 1 feature left, then this.Nb = this.Ns + 1.
        //If the base map has 5537 features and the goal map has 734 features,
        //then there are 4803 steps (this.Nb != this.Ns + 1).
        //It is better to use 'this.Ns + 1' instead of this.Nb
        let step = (this.Ns + 1) * reductionf //step is not necessarily an integer
        return [Math.max(0, step), St]
    }

}

export default Transform
