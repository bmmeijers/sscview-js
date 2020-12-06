"use strict";

// const bindHandler = require('./handler');
import { dragHandler } from './handlers/mouse.drag';
import { moveHandler } from './handlers/mouse.move';
import { scrollHandler } from './handlers/mouse.scroll';
import { zoomButtonHandler } from './handlers/mouse.scroll';
import { touchPinchHandler } from './handlers/touch.pinch';
import { touchDragHandler } from "./handlers/touch.drag";

import Transform from './transform';
import { timed } from './animate';
import { Renderer } from "./render";
import LayerControl from "./layercontrol";

// import MyLoader from './loader';
// import { TileSet , Evictor } from './tiles';
import { SSCTree, Evictor, snap_value } from './ssctree';

import { MessageBusConnector } from './pubsub'

import { initFramebufferObject } from './drawprograms';

class Map {
    constructor(map_setting, canvasnm_in_cbnm = false) {
        //console.log('map.js test:')
        //console.log('map.js map_setting:', map_setting)
        this.ssctrees = []
        this.map_setting = map_setting
        let container = map_setting['canvas_nm']
        if (typeof container === 'string') {
            this._container = window.document.getElementById(container)
        }
        else {
            this._container = container
        }
        if (!this._container) {
            throw new Error(`Container '${container}' not found.`)
        }

        //if we want to include the canvas name in the check box name (cbnm)
        //when we have two canvases in a comparer, we should have this.canvasnm_in_cbnm == true
        this.canvasnm_in_cbnm = canvasnm_in_cbnm


        // FIXME: to not circle map updates (can this be done more elegantly?)
//        this._should_broadcast_move = true;

        this._action = 'zoomAnimated' //if we are zooming, we may want to snap to a valid state
        this._abort = null

        //console.log('map.js map_setting.initialization.center2d:', map_setting.initialization.center2d)
        this._transform = new Transform(
            map_setting.initialization.center2d,
            [this._container.width, this._container.height],
            map_setting.initialization.scale_den)

        /* settings for zooming and panning */
        this._interaction_settings = {
            zoom_factor: 1,
            zoom_duration: 1, //1 second
            time_factor: 1, //we changed the factor because we snap when merging parallelly
            pan_duration: 1,  //1 second
        };
        //this.if_snap = false //if we want to snap, then we only snap according to the first dataset



        this.msgbus = new MessageBusConnector()

        this.msgbus.subscribe('data.tile.loaded', (topic, message, sender) => {
            //console.log('1 subscribe data.tile.loaded')
            if (this._abort === null) {
                //console.log('Rendering because received:', topic, ", ", message, ", ", sender)
                this.panAnimated(0, 0) // animate for a small time, so that when new tiles are loaded, we are already rendering
            }
        })

        this.msgbus.subscribe('data.tree.loaded', (topic, message, sender) => {
            //let St = this._transform.getScaleDenominator()
            //let ssctree = message[1]
            //console.log('map.js ssctree:', ssctree)
            //console.log('map.js ssctree.tree:', ssctree.tree)
            //var step = ssctree.get_step_from_St(St, this.if_snap)
            //this._prepare_active_tiles(step, ssctree)
            //var step = this.ssctree.get_step_from_St(St, this.if_snap)
            //this._prepare_active_tiles(step)
            this.panAnimated(0, 0) // animate for a small time, so that when new tiles are loaded, we are already rendering
        })

        this.msgbus.subscribe("settings.boundary-width", (topic, message, sender) => {
            this.renderer.settings.boundary_width = parseFloat(message);
            this.abortAndRender();
        });

        //this.msgbus.subscribe("settings.backdrop-opacity", (topic, message, sender) => {
        //    this.renderer.settings.backdrop_opacity = parseFloat(message);
        //    this.abortAndRender();
        //});

        //this.msgbus.subscribe("settings.foreground-opacity", (topic, message, sender) => {
        //    this.renderer.settings.foreground_opacity = parseFloat(message);
        //    this.abortAndRender();
        //});

        this.msgbus.subscribe("settings.zoom-factor", (topic, message, sender) => {
//            console.log(message);
            
            this._interaction_settings.zoom_factor = parseFloat(message);
            //console.log('map.js zoom_factor:', this._interaction_settings.zoom_factor)
            this.abortAndRender();
        });

        this.msgbus.subscribe("settings.zoom-duration", (topic, message, sender) => {
//            console.log(message);
            this._interaction_settings.zoom_duration = parseFloat(message);
            this.abortAndRender();
        });
        this.msgbus.subscribe("settings.pan-duration", (topic, message, sender) => {
//            console.log('setting pan_duration: ' + message);
            this._interaction_settings.pan_duration = parseFloat(message);
            this.abortAndRender();
        });

        this.subscribe_scale()

        var layercontrol = new LayerControl(this, map_setting)
        layercontrol.add_layercontrols()

        map_setting.tree_settings.forEach((tree_setting) => {
            //console.log('map.js tree_setting:', tree_setting)
            this.ssctrees.push(new SSCTree(this.msgbus, tree_setting))
        })



        
        // data load
        //this.ssctree = new SSCTree(this.msgbus, map_setting.tree_settings[0])

        //this.ssctree = this.ssctrees[0]
        this.gl = this.getWebGLContext()
        //console.log('map.js container.width, container.height:', this._container.width, this._container.height)
        initFramebufferObject(this.gl, this._container.width, this._container.height) //set gl.fbo
        this.renderer = new Renderer(this.gl, this._container, this.ssctrees);
        //this.renderer.setViewport(this.getCanvasContainer().width,
        //                          this.getCanvasContainer().height)

        dragHandler(this)  // attach mouse handlers
        scrollHandler(this)
        zoomButtonHandler(this)
//        moveHandler(this)
        touchPinchHandler(this) // attach touch handlers
        touchDragHandler(this)


        { 
            let St = this.getTransform().getScaleDenominator()
            //this.ssctree.get_step_from_St(St, this.if_snap)
            this.msgbus.publish('map.scale', [this.getTransform().getCenter(), St]) 
        }

        //this.evictor = new Evictor(this.ssctrees, this.gl)
        //// every 30 seconds release resources
        //window.setInterval(
        //    () => {
        //        let St = this.getTransform().getScaleDenominator()

        //        let box3ds = []
        //        const box2d = this.getTransform().getVisibleWorld()
        //        this.ssctrees.forEach((ssctree) => {
        //            var step = ssctree.get_step_from_St(St)

        //            //const near_St = this.ssctree.stepMap(this.getTransform().getScaleDenominator())
        //            //const near = near_St[0]

        //            box3ds.push([box2d.xmin, box2d.ymin, step, box2d.xmax, box2d.ymax, step])

        //        })
        //        this.evictor.evict(box3ds)
        //        this.render()

        //    },
        //    60 * 1000 * 2.5 // every X mins (expressed in millisec)
        //    //10000 // every X mins (expressed in millisec)
        //)

    }

    loadTree() {
        //this.ssctree.load()

        this.ssctrees.forEach((ssctree) => {
            //console.log('map.js ssctree.tree_setting:', ssctree.tree_setting)
            ssctree.load()
            //var if_snap = ssctree.load()
            //if (if_snap == true ) {
            //    this.if_snap = true
            //}
        })
    }

    getCanvasContainer() {
        return this._container;
    }

    getWebGLContext() {
        return this.getCanvasContainer().getContext('webgl', 
            { antialias: true, alpha: false, premultipliedAlpha: false})
    }

    getTransform() {
        return this._transform;
    }

    render(k = 0) {
        //console.log('')

        let ssctrees = this.ssctrees
        let St = this.getTransform().getScaleDenominator()
        let St_for_step = St
        let steps = []  //record a step for each layer
        let local_statehighs = [] //a state of current step for each layer
        let local_statelows = [] //a step_low of current step for each layer

        //snapped_step and snapped_St have been computed by this.getTransform().updateViewportTransform()
        let snapped_step = this.getTransform().snapped_step
        let snapped_St = this.getTransform().snapped_St //the St obtained from a snapped step

        //if k==1, we are at the end of a zooming operation, 
        //we directly use the snapped_step and snapped_St to avoid rounding problems
        if (k == 1 && ssctrees[0].if_snap == true &&
            this._action == 'zoomAnimated' &&  //we snap only when zooming, but not panning
            snapped_step != Number.MAX_SAFE_INTEGER) { //we are not at the state of just having loaded data
            St_for_step = snapped_St
            steps.push(snapped_step)  //we only snap according to the first dataset
            //console.log('map.js snapped_step:', snapped_step)
            local_statehighs.push(snapped_step)
            local_statelows.push(snapped_step)
        }
        else {
            steps.push(ssctrees[0].get_step_from_St(St_for_step))

            //Notice that the two snapped states can be the same
            local_statehighs.push(ssctrees[0].snap_state(steps[0], 'ceil'))
            local_statelows.push(ssctrees[0].snap_state(steps[0], 'floor'))


            //console.log('map.js steps[0]:', steps[0])
            //console.log('map.js local_statehighs[0]:', local_statehighs[0])
            //console.log('map.js local_statelows[0]:', local_statelows[0])
        }

        //If we want to have multi-scale map intead of vario-scale map
        let discrete_scales = this.map_setting.tree_settings[0].discrete_scales
        if (discrete_scales != null) {

            //console.log('map.js St_for_step:', St_for_step)
            
            let scale_snapped_St = snap_value(St_for_step, discrete_scales,
                this.map_setting.tree_settings[0].snap_style)

            //console.log('map.js scale_snapped_St:', scale_snapped_St)

            if (ssctrees[0].if_snap == true) { // snap to a step to avoid half way generalization (e.g. merging)
                //steps[0] = ssctrees[0].get_zoom_snappedstep_from_St(scale_snapped_St)
                steps[0] = ssctrees[0].get_snappedstep_from_St(scale_snapped_St)

                local_statehighs.push(steps[0])
                local_statelows.push(steps[0])
            }
            else {
                steps[0] = ssctrees[0].get_step_from_St(scale_snapped_St)

                local_statehighs.push(ssctrees[0].snap_state(steps[0], 'ceil'))
                local_statelows.push(ssctrees[0].snap_state(steps[0], 'floor'))
            }

        }
        else {
            //console.log('map.js steps[0]:', steps[0])
            //console.log('map.js St_for_step:', St_for_step)
        }

        //add steps of other layers
        for (var i = 1; i < ssctrees.length; i++) {
            steps.push(ssctrees[i].get_step_from_St(St_for_step))
            local_statehighs.push(ssctrees[i].snap_state(steps[i], 'ceil'))
            local_statelows.push(ssctrees[i].snap_state(steps[i], 'floor'))
        }


        this.msgbus.publish('map.scale', [this.getTransform().getCenter(), St_for_step])

        //this.renderer._clearColor()
        this.renderer.render_ssctrees(steps, this.getTransform(), St_for_step, local_statelows, local_statehighs)
        //this.renderer.render_ssctrees(local_statehighs, this.getTransform(), St_for_step, opacities2)
        //if (true) {
            
        //}
        
    }



    doEaseNone(start, end) {
        let interpolate = ((k) => {
            var m = new Float64Array(16);
            for (let i = 0; i < 16; i++) {
                let delta = start[i] + k * (end[i] - start[i]);
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render(k);
            if (k == 1) {
                this._abort = null
            }
        })
        return interpolate;
    }

    doEaseInOutSine(start, end) {
        function interpolate(k) {
            var m = new Float64Array(16);
            let D = Math.cos(Math.PI * k) + 1
            for (let i = 0; i < 16; i++) {
                let c = end[i] - start[i];
                let delta = c * 0.5 * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render(k);
            if (k == 1) {
                this._abort = null
            }
        }
        return interpolate;
    }

    doEaseOutSine(start, end) { //start and end: the world squares
        let interpolate = (k) => {
            var m = new Float64Array(16);
            let D = Math.sin(k * Math.PI * 0.5);
            for (let i = 0; i < 16; i++) {
                let c = end[i] - start[i];
                let delta = c * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render(k);
            if (k === 1) {
                this._abort = null
            }
        }
        return interpolate;
    }

    doEaseOutQuint(start, end) {
        function interpolate(k) {
            let t = k - 1
            let t5p1 = Math.pow(t, 5) + 1
            var m = new Float64Array(16);
            for (let i = 0; i < 16; i++) {
                let c = end[i] - start[i];
                let delta = c * t5p1 + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render(k);
            if (k == 1) {
                this._abort = null
            }
        }
        return interpolate;
    }

    animateZoom(x, y, zoom_factor) {
        const start = this.getTransform().world_square;
        this._interaction_settings.time_factor = this.getTransform().compute_zoom_parameters(
            this.ssctrees[0], zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y, this.ssctrees[0].if_snap);
        const end = this.getTransform().world_square;  //world_square is updated in function compute_zoom_parameters
        var interpolate = this.doEaseOutSine(start, end);
        //var interpolate = this.doEaseNone(start, end);
        return interpolate;
    }

    animatePan(dx, dy) {
        const start = this.getTransform().world_square;
        this.getTransform().pan(dx, -dy);
        const end = this.getTransform().world_square;
        var interpolate = this.doEaseOutSine(start, end);
        //var interpolate = this.doEaseNone(start, end);
        return interpolate;
    }

    jumpTo(x, y, scale) {
        let center_world = [x, y];
        let r = this.getCanvasContainer();
        let viewport_size = [r.width, r.height];
        let denominator = scale;
        this._transform.initTransform(center_world, viewport_size, denominator);
        this.abortAndRender();
    }

    panBy(dx, dy) {
        //console.log("_abort in map.js:", this._abort)
        if (this._abort !== null) {
            this._abort();
        }
        this.getTransform().pan(dx, -dy);
        this.render();
    }

    zoom(x, y, zoom_factor) {
        this._interaction_settings.time_factor = this.getTransform().compute_zoom_parameters(
            this.ssctrees[0], zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y, this.ssctrees[0].if_snap);
        this.render();
    }

    abortAndRender() {
        // aborts running animation
        // and renders the map based on the current transform
        if (this._abort !== null) {
            this._abort();
            this._abort = null;
        }
        this.getTransform().pan(0, 0);
        this.render();
    }

    zoomInAnimated(x, y, op_factor) {
        //e.g., op_factor: 0.0625; 1.0 + op_factor: 1.0625
        this.zoomAnimated(x, y, 1.0 + op_factor * this._interaction_settings.zoom_factor) 
    }

    zoomOutAnimated(x, y, op_factor) {
        //e.g., op_factor: 0.0625; 1.0 / (1.0 + op_factor): 0.9411764705882353
        this.zoomAnimated(x, y, 1.0 / (1.0 + op_factor * this._interaction_settings.zoom_factor)) 
    }

    zoomAnimated(x, y, zoom_factor) {
        if (this._abort !== null) {
            //console.log('map.js test1')
            this._abort();
        }
        this._action = 'zoomAnimated'
        //console.log('map.js this._interaction_settings.time_factor0:', this._interaction_settings.time_factor)
        //console.log('map.js zoom_factor:', zoom_factor)
        var interpolator = this.animateZoom(x, y, zoom_factor);

        let zoom_duration = this._interaction_settings.zoom_duration * this._interaction_settings.time_factor
        //console.log('map.js this._interaction_settings.zoom_duration:', this._interaction_settings.zoom_duration)
        //console.log('map.js this._interaction_settings.time_factor:', this._interaction_settings.time_factor)
        //console.log('map.js zoom_duration:', zoom_duration)
        this._abort = timed(interpolator, zoom_duration, this);
    }

    panAnimated(dx, dy) {
        if (this._abort !== null) {
            //console.log('map.js this._abort !== null')
            this._abort();
        }
        // FIXME: settings
        this._action = 'panAnimated'
        var interpolator = this.animatePan(dx, dy);
        this._abort = timed(interpolator, this._interaction_settings.pan_duration, this);
    }

    resize(newWidth, newHeight) {
        //console.log("resize");
        let tr = this.getTransform();
        let center = tr.getCenter();
        //console.log('map.js center:', center)
        let denominator = tr.getScaleDenominator();
        // re-initialize the transform
        //console.log('map.js newWidth, newHeight:', newWidth, newHeight)
        //console.log('map.js center:', center)
        tr.initTransform(center, [newWidth, newHeight], denominator);
        // update the viewport size of the renderer
        this.renderer.setViewport(newWidth, newHeight)
        let gl = this.gl

        let fbo = gl.fbo;
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.depthBuffer);        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newWidth, newHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, newWidth, newHeight);

        // Unbind the buffer object;
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    subscribe_scale() {
        let msgbus = this.msgbus;
        msgbus.subscribe('map.scale', (topic, message, sender) => {
            if (sender !== msgbus.id) return;
            const scale = Math.round(message[1]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
            //const scale = (Math.round(message[1] / 5) * 5).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
            let el = document.getElementById("scale-denominator");
            el.textContent = " 1:" + scale;
        })
    }

    //subscribe_cb() {
    //    let msgbus = this.msgbus;
    //    msgbus.subscribe('map.scale', (topic, message, sender) => {
    //        if (sender !== msgbus.id) return;
    //        const scale = (Math.round(message[1] / 5) * 5).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    //        let el = document.getElementById("scale-denominator");
    //        el.textContent = " 1:" + scale;
    //    })

        //this.tree_settings.forEach(tree_setting => {
        //    console.log()
        //    console.log('layercontrol.js tree_setting.layer_nm:', tree_setting.layer_nm)
        //    console.log('layercontrol.js tree_setting.do_draw :', tree_setting.do_draw)
        //    //tree_setting.do_draw 
        //})

    //}
    
}

export default Map
