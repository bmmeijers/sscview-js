import { ImageTileDrawProgram, ImageFboDrawProgram, LineDrawProgram, PolygonDrawProgram} from "./drawprograms";
import { MessageBusConnector } from './pubsub'

// FIXME: rename draw to renderFunc ?


export class Renderer {
    constructor(gl, canvas, ssctrees) {
        this.gl = gl
        this.ssctrees = ssctrees
        this.settings = {
            boundary_width: 0.2,
            //backdrop_opacity: 1,
            //foreground_opacity: 0.5,
            //layer_opacity: 0.5
        }

        // construct programs once, at init time
        this.programs = [
            new PolygonDrawProgram(gl),
            new LineDrawProgram(gl),
            new ImageTileDrawProgram(gl)
            //new ForegroundDrawProgram(gl)
        ];
        this.canvas = canvas
        this.setViewport(canvas.width, canvas.height)
        //this.fbo = gl.createFramebuffer();
        //gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    }

    // addBucket(mesh)
    // {
    //     console.log('making new mesh')
    //     let b = new Bucket(this.gl, mesh)
    //     this.buckets.push(b)
    //     // setTimeout(() => {
    //     //     this.buckets.map(bucket => {
    //     //         bucket.destroy()
    //     //     })
    //     // }, 15000)
    // }


    render_ssctrees(steps, transform, St, local_statelows, local_statehighs) {

        this._clearColor()
        
        //draw from the last layer to the first layer; first layer will be on top
        for (var i = steps.length - 1; i >= 0; i--) {
            let ssctree = this.ssctrees[i]
            let tree_setting = ssctree.tree_setting

            //If both low_scale and high_scale do not exist, the map will be drawn
            //If low_scale or high_scale exists, we will check if we should draw the map
            let low_scale = tree_setting.low_scale
            let high_scale = tree_setting.high_scale
            if ((low_scale != null && low_scale > St) ||
                (high_scale != null && high_scale < St) ||
                ssctree.tree == null ||  //before the tree is loaded, ssctree.tree == null
                tree_setting.do_draw == false ||
                tree_setting.opacity <= 0) {

                continue
            }

            //console.log('render.js steps[i]:', steps[i])

            //let step = steps[i] - 0.01 

            //to compensate with the rounding problems; default value is 0.001
            let default_comp = tree_setting['state_compensation'] //default compsensation number            

            let step = steps[i] - default_comp 

            
            //console.log('render.js step:', step)

            //let last_step = ssctree.tree.metadata.no_of_steps_Ns
            let last_step = Number.MAX_SAFE_INTEGER
            if (ssctree.tree != null) { //the tree is null when the tree hasn't been loaded yet. 
                last_step = ssctree.tree.metadata.no_of_steps_Ns
                //last_step = this.ssctrees[i].tree.metadata.no_of_steps_Ns
            }




            if (step < 0) {
                //so that the slicing plane will intersect with the SSC, 
                //this is also related how to decide whether they intersect; see function overlaps3d in ssctree.js
                step = 0
                //step = 0.000001
            }
            else if (step >= last_step) {
                step = last_step - 0.000001
            }

            //***********************************************//
            //A better solution would be like the following
            //because the displaced surface is below the slicing plane with z-coordinate step.
            //However, this requires that the top box's height is larger than 0; 
            //otherwise, no intersection at the top of the ssc; see function overlaps3d in ssctree.js
            //if (step < 0) {
            //    //so that the slicing plane will intersect with the SSC, 
            //    //this is also related how to decide whether they intersect; see function overlaps3d in ssctree.js
            //    //step = 0.000001
            //}
            //else if (step >= last_step) {
            //    step = last_step 
            //}



            //steps[i] = step
            //console.log('render.js, step after snapping:', step)

            //console.log('render.js, step after snapping:', step)



            let inputopacity = tree_setting.opacity
            let opacity1 = inputopacity
            let opacity2 = 0 //the layer will not be drawn if opacity is 0
            let local_statehigh = 0
            if (tree_setting.do_color_adapt == true) {
                if (local_statelows[i] == local_statehighs[i]) { 
                    //console.log('render.js equality happened!')
                    //do nothing, draw normally
                }
                else {
                    //if step == local_statelows[i], then local_statehighs[i] == local_statelows[i] because of snapping in map.js
                    let step_progress = (step - local_statelows[i]) / (local_statehighs[i] - local_statelows[i])
                    opacity2 = step_progress * inputopacity
                    opacity1 = (inputopacity - opacity2) / (1 - opacity2)

                    local_statehigh = local_statehighs[i] - default_comp
                }
            }

            //get relevant tiles
            const box2d = transform.getVisibleWorld()
            let box3d = [box2d.xmin, box2d.ymin, step, box2d.xmax, box2d.ymax, step]
            var tiles = ssctree.get_relevant_tiles(box3d, this.gl)

            //draw the layer according to the slicing plane
            //console.log()
            var matrix = ssctree.prepare_matrix(step, transform)
            this.render_relevant_tiles(ssctree, tiles, matrix, opacity1);


            if (tree_setting.do_color_adapt == true && opacity2 > 0) {
                //console.log('render.js step:', step)
                //console.log('render.js opacity1:', opacity1)
                //console.log('render.js opacity2:', opacity2)
                var matrix2 = ssctree.prepare_matrix(local_statehigh, transform)

                this.render_relevant_tiles(ssctree, tiles, matrix2, opacity2);
            }

            // If we want to draw lines twice -> thick line under / small line over
            // we need to do this twice + move the code for determining line width here...
            if (this.settings.boundary_width > 0 && tree_setting.datatype == 'polygon') {
                var line_draw_program = this.programs[1];
                tiles.forEach(tile => {
                    // FIXME: would be nice to specify width here in pixels.
                    // bottom lines (black)
                    // line_draw_program.draw_tile(matrix, tile, near_St, 2.0);
                    // interior (color)
                    line_draw_program.draw_tile(matrix, tile, [step, St], this.settings, tree_setting);
                })
            }
        }
    }

    render_relevant_tiles(ssctree, tiles, matrix, opacity) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?

        //clear the depth before drawing the new layer 
        //so that the new layer will not be discarded by the depth test
        this._clearDepth()
        this._clearDepthFbo()
        //the image in Fbo has been drawn to the screen, so it is safe to clear the color in Fbo
        //On the other hand, we must clear the color in Fbo; otherwise, the next drawing will be influenced
        //because the strategy of the fragmentShaderText in ImageFboDrawProgram
        this._clearColorFbo()



        let gl = this.gl
        let tree_setting = ssctree.tree_setting
        let canvas = this.canvas;
        
        if (tiles.length > 0 && opacity > 0) {

            if (tree_setting.datatype == 'polygon') {
                var polygon_draw_program = this.programs[0];

                if (opacity == 1) {
                    tiles.forEach(tile => { // .filter(tile => {tile.}) // FIXME tile should only have polygon data
                        polygon_draw_program.draw_tile(matrix, tile, tree_setting, canvas.width, canvas.height);
                    })
                }
                else { 
                    //drawing first into offline fbo and second on screen 
                    //will result in flickering on some poor computers (e.g., Dongliang's HP 15-bs183nd)
                    tiles.forEach(tile => { // .filter(tile => {tile.}) // FIXME tile should only have polygon data
                        polygon_draw_program.draw_tile_into_fbo(matrix, tile, tree_setting, canvas.width, canvas.height);
                    })

                    var image_fbo_program = new ImageFboDrawProgram(gl)
                    image_fbo_program.draw_fbo(gl.fbo, opacity)
                }
            }
            else if (tree_setting.datatype == 'image') {
                var image_tile_draw_program = this.programs[2];
                tiles.filter(tile => { // tile should have image data                    
                    return tile.texture !== null
                }).forEach(tile => {
                    image_tile_draw_program.draw_tile(matrix, tile, tree_setting);
                })
            }

        }

        //return tiles
        // this.buckets.forEach(bucket => {
        //     this.programs[0].draw(matrix, bucket);
        // })
        // FIXME:
        // in case there is no active buckets (i.e. all buckets are destroy()'ed )
        // we should this.gl.clear()

    }

    _clearDepth() {
        let gl = this.gl;
        // gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0); // Clear everything
        //        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear both color and depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);  // clear depth buffer
    }

    _clearDepthFbo() {
        let gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
        // gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0); // Clear everything
        //        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear both color and depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);  // clear depth buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    _clearColor(r = 1.0, b = 1.0, g = 1.0, a = 0.0) {
    //_clearColor(r = 0.0, g = 0, b = 0, a = 0.0) {
        let gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer
    }

    _clearColorFbo() {
        let gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo);
        this._clearColor(1.0, 1.0, 1.0, 0)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    setViewport(width, height) {
        this.gl.viewport(0, 0, width, height);
    }


}


