import { create, createvec3, vec3transform, multiply, invert } from './mat4';
import Rectangle from './rect';

// TODO
// - Aspect ratio / resize of viewport --> update transform
// - Take into account the z-value of the slice
// - Remove duplication inside functions

// let = block scoped
// var = global / function scoped


function pixelToMeter(pixel)
{

    let inch = 0.0254 // 1 inch in meter
    // clamp? - firefox gets overwhelmed with too much data
    let ppi = 96.0 // * (window.devicePixelRatio || 1.0)
    let ratio = inch / ppi
    //    let ratio = 0.00028
    return pixel * ratio

}

// not used at the moment
//function createWorldSquareMatrix(box, ar)
//{
//    // Returns transform matrix to go from world to normalized square
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


function createSquareViewportMatrix(box)
{
    // Returns transform matrix to go from normalized square to viewport
    // FIXME: can overflow? better to first multiply with 1/2?
    let sx = (box.xmax - box.xmin) * .5
    let sy = (box.ymax - box.ymin) * .5
    let tx = (box.xmax + box.xmin)  * .5
    let ty = (box.ymax + box.ymin)  * .5
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

class Transform
{
    constructor(centerWorld, viewportSize, scaleDenominator)
    {
        // matrices
        //
        // transform split in 2 steps: - worldSquareMatrix squareViewportMatrix
        this.viewportWorldMatrix = create();
        this.worldViewportMatrix = create();
        // for the whole transform: - viewportWorldMatrix worldViewportMatrix
        this.worldSquareMatrix = null;
        this.squareViewportMatrix = null;
        //
        this.viewport = null;
        // set up initial transformation
        this.initTransform(centerWorld, viewportSize, scaleDenominator)
    }

    initTransform(centerWorld, viewportSize, scaleDenominator)
    {
        // compute from the center of the world, the viewport size and the scale
        // scaleDenominator how much of the world is visible
        let cx = centerWorld[0],
            cy = centerWorld[1]
        let width = viewportSize[0],
            height = viewportSize[1]
        let halfw = 0.5 * width,
            halfh = 0.5 * height
        // aspect ratio - not used
        // let aspect = width / height
        // console.log(`aspect ratio ${aspect}`)
        // size in real world of viewport
        // get half visible screen size in world units,
        // when we look at it at this map scale (1:scaleDenominator)
        let half_visible_screen = [pixelToMeter(halfw) * scaleDenominator,
                                   pixelToMeter(halfh) * scaleDenominator]
        let xmin = cx - half_visible_screen[0],
            xmax = cx + half_visible_screen[0],
            ymin = cy - half_visible_screen[1],
            ymax = cy + half_visible_screen[1]
        // the size of the viewport 
        this.viewport = new Rectangle(0, 0, width, height)
        // we arrive at what part of the world then is visible
        let visible_world = new Rectangle(xmin, ymin, xmax, ymax)
        // scaling/translating is then as follows:
        let scale = [2. / visible_world.width(),
                     2. / visible_world.height()]
        let translate = [-scale[0] * cx, -scale[1] * cy]
        // by means of which we can calculate a world -> ndc square matrix
        let worldSquareMatrix = create()
        worldSquareMatrix[0] = scale[0]
        worldSquareMatrix[5] = scale[1]
        worldSquareMatrix[12] = translate[0]
        worldSquareMatrix[13] = translate[1]
        this.worldSquareMatrix = worldSquareMatrix
        // we can set up ndc square -> viewport matrix
        this.squareViewportMatrix = createSquareViewportMatrix(this.viewport)
        // and going from one to the other is then the concatenation of the 2
        // (and its inverse)
        this.updateSingleStepTransform()
    }

    /** from viewport coordinates back to world coordinates */
    backward(vec3)
    {
        let resultVec = createvec3()
        vec3transform(resultVec, vec3, this.viewportWorldMatrix)
        return resultVec
    }

    /** having the 2 parts of the transform (world -> ndc and ndc -> viewport)
        make the whole transform available */
    updateSingleStepTransform() {
        // and going from one to the other is then the concatenation of the 2 (and its inverse)
        multiply(this.worldViewportMatrix, this.squareViewportMatrix, this.worldSquareMatrix)
        invert(this.viewportWorldMatrix, this.worldViewportMatrix)
    }

    updateTwoStepTransform() {
        // update the 2 steps of the transform: world<->ndc and ndc<->viewport
        // get what part of the world is visible
        let visibleWorld = this.getVisibleWorld()
        let center = visibleWorld.center()
        // scaling/translating is then as follows:
        let scale = [2. / visibleWorld.width(), 2. / visibleWorld.height()]
        let translate = [-scale[0] * center[0], -scale[1] * center[1]]
        // by means of which we can calculate a new world -> ndc square matrix
        let worldSquareMatrix = create()
        worldSquareMatrix[0] = scale[0]
        worldSquareMatrix[5] = scale[1]
        worldSquareMatrix[12] = translate[0]
        worldSquareMatrix[13] = translate[1]
        this.worldSquareMatrix = worldSquareMatrix
        // and given the size of the viewport we can set up ndc square -> viewport matrix
        // this.viewport = new Rectangle(0, 0, width, height)
        this.squareViewportMatrix = createSquareViewportMatrix(this.viewport)
    }

    /** pan the view by a delta in screen coordinates */
    pan(dx, dy)
    {
        // update the ndc -> viewport matrix
        this.squareViewportMatrix[12] += dx
        this.squareViewportMatrix[13] += dy
        // and the transform chains
        this.updateSingleStepTransform()
        this.updateTwoStepTransform()
    }

    /** zoom around screen point (_x_, _y_) by scaling the map with _factor_ */
    zoom(factor, x, y)
    {
        var tmp = create()
        // 1. translate
        {
            let eye = create()
            eye[12] = -x
            eye[13] = -y
            multiply(tmp, eye, this.squareViewportMatrix)
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
        this.squareViewportMatrix = tmp;
        // update the transformation matrices
        this.updateSingleStepTransform()
        this.updateTwoStepTransform()
    }

    getVisibleWorld()
    {
        var ll = this.backward([this.viewport.xmin, this.viewport.ymin, 0.0]);
        var tr = this.backward([this.viewport.xmax, this.viewport.ymax, 0.0]);
        return new Rectangle(ll[0], ll[1], tr[0], tr[1])
    }

    getCenterWorld()
    {
        var center = this.backward([this.viewport.xmin + (this.viewport.xmax - this.viewport.xmin) * 0.5, 
                                    this.viewport.ymin + (this.viewport.ymax - this.viewport.ymin) * 0.5, 0.0]);
        return center
    }

    getScaleDenominator() 
    {
        let viewportInMeter = new Rectangle(0, 0,
                                            pixelToMeter(this.viewport.width()), 
                                            pixelToMeter(this.viewport.height()))
        let worldInMeter = this.getVisibleWorld()
        return Math.sqrt(worldInMeter.area() / viewportInMeter.area())
    }
}

export default Transform

