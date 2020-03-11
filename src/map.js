"use strict";

// const bindHandler = require('./handler');
import { dragHandler } from './handlers/mouse.drag';
import { moveHandler } from './handlers/mouse.move';
import { scrollHandler } from './handlers/mouse.scroll';

import { touchPinchHandler } from './handlers/touch.pinch';
import { touchDragHandler } from "./handlers/touch.drag";

import Transform from './transform';
import { timed } from './animate';
import { Renderer } from "./render";

// import MyLoader from './loader';
// import { TileSet , Evictor } from './tiles';
import { SSCTree, Evictor } from './tiles';

import { MessageBusConnector } from './pubsub'

class Map {
    constructor(map_settings) {
        let container = map_settings['canvas_nm']
        if (typeof container === 'string') {
            this._container = window.document.getElementById(container)
        }
        else {
            this._container = container
        }
        if (!this._container) {
            throw new Error(`Container '${container}' not found.`)
        }

        // FIXME: to not circle map updates (can this be done more elegantly?)
//        this._should_broadcast_move = true;

        this._abort = null
        this._transform = new Transform(map_settings.initialization.center2d,
                                        [this.getCanvasContainer().width, this.getCanvasContainer().height],
                                        map_settings.initialization.scale_den)

        /* settings for zooming and panning */
        this._interaction_settings = {
            zoom_factor: 1,
            zoom_duration: 1000,
            pan_duration: 1000
        };


        this.msgbus = new MessageBusConnector()

        this.msgbus.subscribe('data.tile.loaded', (topic, message, sender) => {
            //console.log('1 subscribe data.tile.loaded')
            if (this._abort === null) {
                //console.log('Rendering because received:', topic, ", ", message, ", ", sender)
                this.panAnimated(0, 0) // animate for a small time, so that when new tiles are loaded, we are already rendering
            }
        })

        this.msgbus.subscribe('data.tree.loaded', (topic, message, sender) => {
            let St = this._transform.getScaleDenominator()
            var step = this.ssctree.get_step_from_St(St, true)
            this._prepare_active_tiles(step)
        })

        this.msgbus.subscribe("settings.render.boundary-width", (topic, message, sender) => { 
            this.renderer.settings.boundary_width = parseFloat(message);
            this.abortAndRender();
        } );

        this.msgbus.subscribe("settings.interaction.zoom-factor", (topic, message, sender) => {
//            console.log(message);
            this._interaction_settings.zoom_factor = parseFloat(message);
            this.abortAndRender();
        });

        this.msgbus.subscribe("settings.interaction.zoom-animation", (topic, message, sender) => {
//            console.log(message);
            this._interaction_settings.zoom_duration = parseFloat(message);
            this.abortAndRender();
        });
        this.msgbus.subscribe("settings.interaction.pan-animation", (topic, message, sender) => {
//            console.log('setting pan_duration: ' + message);
            this._interaction_settings.pan_duration = parseFloat(message);
            this.abortAndRender();
        });


        // data load
        this.ssctree = new SSCTree(this.msgbus, map_settings.datasets[0])
        this.renderer = new Renderer(this.getWebGLContext(), this.ssctree);
        this.renderer.setViewport(this.getCanvasContainer().width,
                                  this.getCanvasContainer().height)

        dragHandler(this)  // attach mouse handlers
        scrollHandler(this)
//        moveHandler(this)
        touchPinchHandler(this) // attach touch handlers
        touchDragHandler(this)


        { 
            let St = this.getTransform().getScaleDenominator()
            this.ssctree.get_step_from_St(St, true)
            this.msgbus.publish('map.scale', [this.getTransform().getCenter(), St]) 
        }

        this.evictor = new Evictor(this.ssctree,
                                   this.getWebGLContext())
        // every 30 seconds release resources
        window.setInterval(
            () => {

                let St = this.getTransform().getScaleDenominator()
                var step = this.ssctree.get_step_from_St(St, true)

                //const near_St = this.ssctree.stepMap(this.getTransform().getScaleDenominator())
                //const near = near_St[0]
                const box2d = this.getTransform().getVisibleWorld()
                const box3d = [box2d.xmin, box2d.ymin, step, box2d.xmax, box2d.ymax, step]
                this.evictor.evict(box3d)
                this.render()
            },
            60 * 1000 * 2.5 // every X mins (expressed in millisec)
        )

    }

    loadTree() {
        this.ssctree.load()
    }

    getCanvasContainer() {
        return this._container;
    }

    getWebGLContext() {
        return this.getCanvasContainer().getContext('webgl', { alpha: true, antialias: true })
    }

    getTransform() {
        return this._transform;
    }

    render() {
        let St = this.getTransform().getScaleDenominator()
        this.msgbus.publish('map.scale', [this.getTransform().getCenter(), St])

        let last_step = Number.MAX_SAFE_INTEGER
        if (this.ssctree.tree != null) { //the tree is null when the tree hasn't been loaded yet. 
            last_step = this.ssctree.tree.metadata.no_of_steps_Ns
        }
        //We minus by 0.01 in order to compensate with (possibly) the round-off error
        //so that the boundaries can be displayed correctly.
        var step = this.ssctree.get_step_from_St(St) - 0.02

        if (step < 0) {
            step = 0
        }
        else if (step > last_step) {
            step = last_step + 0.01 // +0.01: in order to display the exterior boundary correctly
        }

        //console.log('map.js, step:', step)


        var matrix_box3d = this._prepare_active_tiles(step)
        this.renderer.render_relevant_tiles(matrix_box3d[0], matrix_box3d[1], [step, St]);
    }

    _prepare_active_tiles(near) {
        let matrix = this.getTransform().world_square
        const far = -0.5
        matrix[10] = -2.0 / (near - far)
        matrix[14] = (near + far) / (near - far)
        const box2d = this.getTransform().getVisibleWorld()
        const box3d = [box2d.xmin, box2d.ymin, near, box2d.xmax, box2d.ymax, near]
        let gl = this.getWebGLContext();
        this.ssctree.fetch_tiles(box3d, gl)
        return [matrix, box3d]
    }

    doEaseNone(start, end) {
        let interpolate = ((k) => {
            var m = new Float32Array(16);
            for (let i = 0; i < 16; i++) {
                let delta = start[i] + k * (end[i] - start[i]);
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render();
            if (k == 1) {
                this._abort = null
            }
        })
        return interpolate;
    }

    doEaseInOutSine(start, end) {
        function interpolate(k) {
            var m = new Float32Array(16);
            let D = Math.cos(Math.PI * k) - 1
            for (let i = 0; i < 16; i++) {
                let c = end[i] - start[i];
                let delta = -c * 0.5 * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render();
            if (k == 1) {
                this._abort = null
            }
        }
        return interpolate;
    }

    doEaseOutSine(start, end) {
        let interpolate = (k) => {
            var m = new Float32Array(16);
            let D = (Math.sin(k * (Math.PI * 0.5)));
            for (let i = 0; i < 16; i++) {
                let c = end[i] - start[i];
                let delta = c * D + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render();
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
            var m = new Float32Array(16);
            for (let i = 0; i < 16; i++) {
                let c = end[i] - start[i];
                let delta = c * t5p1 + start[i];
                m[i] = delta;
            }
            // update the world_square matrix
            this.getTransform().world_square = m;
            this.getTransform().updateViewportTransform()
            this.render();
            if (k == 1) {
                this._abort = null
            }
        }
        return interpolate;
    }

    animateZoom(x, y, zoom_factor) {
        const start = this.getTransform().world_square;
        this.getTransform().zoom(this.ssctree, zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y);
        const end = this.getTransform().world_square;
        var interpolate = this.doEaseOutSine(start, end);
        return interpolate;
    }

    animatePan(dx, dy) {
        const start = this.getTransform().world_square;
        this.getTransform().pan(dx, -dy);
        const end = this.getTransform().world_square;
        var interpolate = this.doEaseOutSine(start, end);
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

    zoom(x, y, factor) {
        this.getTransform().zoom(this.ssctree, factor, x, this.getCanvasContainer().getBoundingClientRect().height - y);
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
        this.zoomAnimated(x, y, 1.0 + op_factor) //e.g., op_factor: 0.0625; 1.0 + op_factor: 1.0625
    }

    zoomOutAnimated(x, y, op_factor) {
        this.zoomAnimated(x, y, 1.0 / (1.0 + op_factor)) //e.g., op_factor: 0.0625; 1.0 / (1.0 + op_factor): 0.9411764705882353
    }

    zoomAnimated(x, y, zoom_factor) {
        if (this._abort !== null) {
            this._abort();
        }
        var interpolator = this.animateZoom(x, y, zoom_factor);
        // FIXME: settings
        this._abort = timed(interpolator, this._interaction_settings.zoom_duration, this);
    }

    panAnimated(dx, dy) {
        if (this._abort !== null) {
            this._abort();
        }
        // FIXME: settings
        var interpolator = this.animatePan(dx, dy);
        this._abort = timed(interpolator, this._interaction_settings.pan_duration, this);
    }

    resize(newWidth, newHeight) {
        //console.log("resize");
        let tr = this.getTransform();
        let center = tr.getCenter();
        let denominator = tr.getScaleDenominator();
        // re-initialize the transform
        tr.initTransform(center, [newWidth, newHeight], denominator);
        // update the viewport size of the renderer
        this.renderer.setViewport(newWidth, newHeight)
    }

}

export default Map
