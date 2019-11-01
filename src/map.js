"use strict";

// const bindHandler = require('./handler');
import { dragHandler } from './handlers/mouse.drag';
// import { moveHandler } from './handlers/mouse.move';
import { scrollHandler } from './handlers/mouse.scroll';

import { touchPinchHandler } from './handlers/touch.pinch';
import { touchDragHandler } from "./handlers/touch.drag";

import Transform from './transform';
import { timed } from './animate';
import { Renderer } from "./render";


import Rectangle from './rect';
var meter_to_pixel = 3779.5275590551; // 1 meter equals 3779.5275590551 pixels

// import MyLoader from './loader';
// import { TileSet , Evictor } from './tiles';
import { SSCTree } from './tiles';

import { MessageBusConnector } from './pubsub'

class Map {
    constructor(container) {
        if (typeof container === 'string') {
            this._container = window.document.getElementById(container)
        }
        else {
            this._container = container
        }
        if (!this._container) {
            throw new Error(`Container '${container}' not found.`)
        }

        const rect = this.getCanvasContainer().getBoundingClientRect();
        this.rect = rect;
        this._abort = null

        // data loader
        this.msgbus = new MessageBusConnector()
        this.msgbus.subscribe('data.tile.loaded', (topic, message, sender) => {
            //console.log('1 subscribe data.tile.loaded')
            if (this._abort === null) {
                //console.log('Rendering because received:', topic, ", ", message, ", ", sender)
                this.panAnimated(0, 0) // animate for a small time, so that when new tiles are loaded, we are already rendering
            }
        })

        this.msgbus.subscribe('data.tree.loaded', (topic, message, sender) => {
            var tree = this.ssctree.tree;
            this._transform = new Transform(rect, tree.center2d, tree.metadata.view_scale_Sv)

            var textContent2 = "Vario-scale demo: " + tree.dataset_nm
            if (tree.metadata.algorithm != "") {
                textContent2 += ", " + tree.metadata.algorithm
            }
            if (tree.metadata.parameter != "") {
                textContent2 += ", " + tree.metadata.parameter
            }

            document.getElementById("demo_info").textContent = textContent2


            const near_St = this.stepMap(this._transform.viewport)
            this._prepare_active_tiles(near_St[0])
        })

        this.msgbus.subscribe('map.scale', (topic, message, sender) => {
            //console.log('message:', message)
            const scale = (Math.round(message / 5) * 5).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
            // console.log(`scale changed to: 1 : ${scale}`)

            let el = document.getElementById("scale-denominator");
            el.textContent = " 1:" + scale;
        })

        this.ssctree = new SSCTree(this.msgbus)
        this.ssctree.load()



        this.renderer = new Renderer(
            this._container.getContext('experimental-webgl', { alpha: false, antialias: true }),
            this.ssctree);
        this.renderer.setViewport(rect.width, rect.height)

        //this.abortAndRender()


        dragHandler(this)  // attach mouse handlers
        // moveHandler(this)
        scrollHandler(this)
        touchPinchHandler(this) // attach touch handlers
        touchDragHandler(this)

        // this.evictor = new Evictor(this.ssctree,
        //                             this._container.getContext('webgl', { alpha: false, antialias: true }))
        // window.setInterval(() => {
        //     const box2d = this.getTransform().visibleWorld()
        //     this.evictor.evict([[box2d.xmin, box2d.ymin], [box2d.xmax, box2d.ymax]]); this.render() }, 15000)

    }

    getCanvasContainer() {
        return this._container;
    }

    getTransform() {
        return this._transform;
    }

    render() {
        const near_St = this.stepMap(this._transform.viewport)
        this.msgbus.publish('map.scale', near_St[1])

        var matrix_box3d = this._prepare_active_tiles(near_St[0])
        this.renderer.render_relevant_tiles(matrix_box3d[0], matrix_box3d[1], near_St);
    }

    _prepare_active_tiles(near) {
        let matrix = this.getTransform().world_square
        const far = -1
        matrix[10] = -2.0 / (near - far)
        matrix[14] = (near + far) / (near - far)
        const box2d = this.getTransform().getvisibleWorld()
        const box3d = [box2d.xmin, box2d.ymin, near, box2d.xmax, box2d.ymax, near]
        let gl = this._container.getContext('experimental-webgl', { alpha: false, antialias: true })
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

    animateZoom(x, y, factor) {
        const start = this.getTransform().world_square;
        this.getTransform().zoom(factor, x, this.rect.height - y);
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

    panBy(dx, dy) {
        //console.log("_abort in map.js:", this._abort)
        if (this._abort !== null) {
            this._abort();
        }
        this.getTransform().pan(dx, -dy);
        this.render();
    }

    zoom(x, y, factor) {
        this.getTransform().zoom(factor, x, this.rect.height - y);
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

    zoomInAnimated(x, y, step) {
        this.zoomAnimated(x, y, 1.0 + step)
    }

    zoomOutAnimated(x, y, step) {
        this.zoomAnimated(x, y, 1.0 / (1.0 + step))
    }

    zoomAnimated(x, y, factor) {
        if (this._abort !== null) {
            this._abort();
        }
        var interpolator = this.animateZoom(x, y, factor);
        var duration = parseFloat(document.getElementById('duration').value);
        this._abort = timed(interpolator, duration, this);
    }

    panAnimated(dx, dy) {
        if (this._abort !== null) {
            this._abort();
        }
        var duration = parseFloat(document.getElementById('panduration').value);
        var interpolator = this.animatePan(dx, dy);
        this._abort = timed(interpolator, duration, this);
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


    stepMap(viewport) {
        let viewport_in_meter = new Rectangle(0, 0,
            viewport.width() / meter_to_pixel,
            viewport.height() / meter_to_pixel)
        let world_in_meter = this.getTransform().getvisibleWorld()


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
        let reductionf = 1 - Math.pow(this.ssctree.tree.metadata.start_scale_Sb / St, 2) // reduction in percentage

        //Originally, step = this.Nb * reductionf.
        //If the goal map has only 1 feature left, then this.Nb = this.Ns + 1.
        //If the base map has 5537 features and the goal map has 734 features,
        //then there are 4803 steps (this.Nb != this.Ns + 1).
        //It is better to use 'this.Ns + 1' instead of this.Nb
        let step = (this.ssctree.tree.metadata.no_of_steps_Ns + 1) * reductionf //step is not necessarily an integer
        return [Math.max(0, step), St]
    }
}

export default Map
