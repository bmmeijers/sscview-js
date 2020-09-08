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


    render_ssctrees(steps, transform, St) {

        this._clearColor()



        //this.renderer._clearDepth()
        //console.log('render.js steps.length:', steps.length)

        //console.log('render.js render this.ssctrees.length:', this.ssctrees.length)
        //console.log('render.js this.ssctrees[0]:', this.ssctrees[0])

        //draw from the last layer to the first layer; first layer will be on top
        for (var i = steps.length - 1; i >= 0; i--) {
            let ssctree = this.ssctrees[i]

            //If both low_scale and high_scale do not exist, the map will be drawn
            //If low_scale or high_scale exists, we will check if we should draw the map
            let low_scale = ssctree.tree_setting.low_scale
            let high_scale = ssctree.tree_setting.high_scale
            if (low_scale != null && low_scale > St) {
                continue
            }
            if (high_scale != null && high_scale < St) {
                continue
            }

            //clear the depth before drawing the new layer 
            //so that the new layer will not be discarded by the depth test
            this._clearDepth()
            this._clearDepthFbo()
            //the image in Fbo has been drawn to the screen, so it is safe to clear the color in Fbo
            //On the other hand, we must clear the color in Fbo; otherwise, the next drawing will be influenced
            //because the strategy of the fragmentShaderText in ImageFboDrawProgram
            this._clearColorFbo()

            //console.log('render.js render ssctree:', ssctree)
            let step = steps[i] - 0.001 //to compensate with the rounding problems

            //let last_step = ssctree.tree.metadata.no_of_steps_Ns
            let last_step = Number.MAX_SAFE_INTEGER
            if (ssctree.tree != null) { //the tree is null when the tree hasn't been loaded yet. 
                last_step = ssctree.tree.metadata.no_of_steps_Ns
                //last_step = this.ssctrees[i].tree.metadata.no_of_steps_Ns
            }

            if (step < 0) {
                step = 0
            }
            else if (step >= last_step) {
                step = last_step
            }
            steps[i] = step
            //console.log('render.js, step after snapping:', step)

            //console.log('render.js, step after snapping:', step)
            var matrix_box3d = ssctree.prepare_active_tiles(step, transform, this.gl)
            this.render_relevant_tiles(ssctree, matrix_box3d[0], matrix_box3d[1], [step, St]);
        }
    }

    render_relevant_tiles(ssctree, matrix, box3d, near_St) {
        // FIXME: 
        // should a bucket have a method to 'draw' itself?
        // e.g. by associating multiple programs with a bucket
        // when the bucket is constructed?



        //this._clearDepth()
        if (ssctree.tree == null) { //before the tree is loaded, ssctree.tree == null
            return
        }

        let gl = this.gl
        let tree_setting = ssctree.tree_setting
        let canvas = this.canvas;
        //console.log('render.js tree_setting:', tree_setting)
        //console.log('render.js tree_setting.do_draw:', tree_setting.do_draw)
        //console.log('render.js tree_setting:', &tree_setting)
        //console.log('render.js ssctree.tree_setting.tree_root_file_nm:', ssctree.tree_setting.tree_root_file_nm)
        //console.log('render.js box3d:', box3d)
        //console.log('render.js near_St:', near_St)

        //console.log('render.js step:', near_St[0])

        var tiles = ssctree.get_relevant_tiles(box3d)

        //console.log('render.js layer_nm, opacity', tree_setting.layer_nm, tree_setting.opacity)
        //console.log('render.js, render_relevant_tiles, tiles.length:', tiles.length)
        if (tiles.length > 0 && tree_setting.do_draw == true && tree_setting.opacity > 0) {

            if (tree_setting.datatype == 'polygon') {
                var polygon_draw_program = this.programs[0];

                //console.log('')
                tiles.forEach(tile => { // .filter(tile => {tile.}) // FIXME tile should only have polygon data
                    //polygon_draw_program.draw_tile(matrix, tile, tree_setting, canvas.width, canvas.height);
                    polygon_draw_program.draw_tile_into_fbo(matrix, tile, tree_setting, canvas.width, canvas.height);
                })

                var image_fbo_program = new ImageFboDrawProgram(gl)
                image_fbo_program.draw_fbo(gl.fbo, tree_setting)


                // If we want to draw lines twice -> thick line under / small line over
                // we need to do this twice + move the code for determining line width here...

                if (this.settings.boundary_width > 0) {
                    var line_draw_program = this.programs[1];
                    tiles.forEach(tile => {
                        // FIXME: would be nice to specify width here in pixels.
                        // bottom lines (black)
                        // line_draw_program.draw_tile(matrix, tile, near_St, 2.0);
                        // interior (color)
                        line_draw_program.draw_tile(matrix, tile, near_St, this.settings, tree_setting);
                    })
                }

                // Unbind the fbo.
                //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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


