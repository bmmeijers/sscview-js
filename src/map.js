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

import { doFlyTo } from './fly'

import { WMTSRenderer } from './wmts';
import { TextRenderer } from './text';

import { BackgroundRenderer } from './background';

// import LayerControl from "./layercontrol";

// import MyLoader from './loader';
// import { TileSet , Evictor } from './tiles';
//import { SSCTree, Evictor, snap_value } from './ssctree';

import { SSCLayer, SSCRenderer } from './ssc';

import { MessageBusConnector } from './pubsub'



class Map {
    constructor(map_setting, canvasnm_in_cbnm = false) {

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

        // if we are zooming, we may want to snap to a valid state
        this._action = 'zoomAnimated' 
        this._abort = null

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
            this.render()
        })

        this.msgbus.subscribe('data.tree.loaded', (topic, message, sender) => {
            this.panAnimated(0, 0) // animate for a small time, so that when new tiles are loaded, we are already rendering
        })

        this.msgbus.subscribe("settings.render.boundary-width", (topic, message, sender) => {
            // this.renderer.settings.boundary_width = parseFloat(message);
            console.log("new value for " + topic + " : " + parseFloat(message))
            this.abortAndRender();
        });

        this.msgbus.subscribe("settings.interaction.zoom-factor", (topic, message, sender) => {
            console.log("new value for " + topic + " : " + parseFloat(message))
            this._interaction_settings.zoom_factor = parseFloat(message);
        });

        this.msgbus.subscribe("settings.interaction.zoom-duration", (topic, message, sender) => {
            console.log("new value for " + topic + " : " + parseFloat(message))
            this._interaction_settings.zoom_duration = parseFloat(message);
        });
        this.msgbus.subscribe("settings.interaction.pan-duration", (topic, message, sender) => {
            console.log("new value for " + topic + " : " + parseFloat(message))
            this._interaction_settings.pan_duration = parseFloat(message);
        });

        this.gl = this.getWebGLContext()

//        this.renderer = new Renderer(this.gl, this._container, this.ssctrees);
        //this.renderer.setViewport(this.getCanvasContainer().width,
        //                          this.getCanvasContainer().height)

        dragHandler(this)  // attach mouse handlers
        scrollHandler(this)

        // FIXME: the name of the buttons is fixed?
        zoomButtonHandler(this)

        //        moveHandler(this)
        touchPinchHandler(this) // attach touch handlers
        touchDragHandler(this)

        ///////////////////////////
        //      "opentopo"
        //      "2020_ortho25"
        //      "brtachtergrondkaart"
        //      "top25raster"
        //      "ahn2_05m_ruw"
        //      "lufolabels"
        // FIXME: this should be a series of layers!

        let backgroundRenderer = new BackgroundRenderer(this.getWebGLContext(), this.msgbus)
//        backgroundRenderer.setViewport(this.getCanvasContainer().width, this.getCanvasContainer().height)

        
        let sscLayer = new SSCLayer(this.msgbus, {
            'tree_root_file_nm': 'tree.json',
            'tree_root_href': 'http://127.0.0.1:5000/',
            'tile_root_href': 'http://127.0.0.1:5000/',
        })
        sscLayer.load()

        this.renderers = [
            backgroundRenderer,
            // new BackgroundRenderer(this.getWebGLContext(), this.msgbus),
            new WMTSRenderer(this.getWebGLContext(), this.msgbus, "Actueel_orthoHR", true),
            // new WMTSRenderer(this.getWebGLContext(), this.msgbus, "brtachtergrondkaart", false),
            // new SSCRenderer(this.getWebGLContext(), this.msgbus, sscLayer),
            new TextRenderer(this.getWebGLContext(), this.msgbus),


        ]
        // update all renderers their size
        console.log(`map SIZE ${this.getCanvasContainer().clientWidth}, ${this.getCanvasContainer().clientHeight}`)
        this.resize(this.getCanvasContainer().clientWidth, this.getCanvasContainer().clientHeight)
        

    }

    getCanvasContainer() {
        return this._container;
    }

    getWebGLContext() {
        return this.getCanvasContainer().getContext('webgl',
            { antialias: true, alpha: false, premultipliedAlpha: false })
    }

    getTransform() {
        return this._transform;
    }

    render() {
        let transform = this.getTransform()
        let visibleWorld = transform.getVisibleWorld()
        let scaleDenominator = transform.getScaleDenominator()
        let aabb = [visibleWorld.xmin, visibleWorld.ymin, visibleWorld.xmax, visibleWorld.ymax]
        let matrix = this.getTransform().worldSquareMatrix

        this.msgbus.publish('map.scale', [this.getTransform().getCenterWorld(), scaleDenominator])

//        this.renderers[0].clearColor()
        this.renderers.forEach(
            (renderer, i) => {
                let opacity = 1.0
                if (i==0) {
                    opacity = 1.0;
                } else {
                    opacity = 0.75;
                }
                /*
                switch (i) {
                    case 0:
                        opacity = 1.0
                        break
                    case 1:
                        opacity = 0.9
                        break
                    case 2:
                        opacity = 1.0
                        break
                    default:
                        break
                }
                */
                renderer.update(aabb, scaleDenominator, matrix, opacity)
            }
        )
        // this.getWebGLContext().flush()
    }

    doEaseNone(start, end) {
        let interpolate = ((k) => {
            var m = new Float64Array(16);
            for (let i = 0; i < 16; i++) {
                let delta = start[i] + k * (end[i] - start[i]);
                m[i] = delta;
            }
            // update the worldSquareMatrix matrix
            this.getTransform().worldSquareMatrix = m;
            this.getTransform().updateSingleStepTransform()
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
            // update the worldSquareMatrix matrix
            this.getTransform().worldSquareMatrix = m;
            this.getTransform().updateSingleStepTransform()
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
            // update the worldSquareMatrix matrix
            this.getTransform().worldSquareMatrix = m;
            this.getTransform().updateSingleStepTransform()
            this.render(k);
            if (k === 1) {
                this._abort = null
            }
        }
        return interpolate;
    }
    
    doInterpolate( start, end ) {
        let interpolate = (k) => {

            let transform = this.getTransform()
            transform.initTransform(centerWorld, viewportSize, scaleDenominator)

            this.render(k);
            if (k === 1) {
                this._abort = null
            }
        }
        return interpolate
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
            // update the worldSquareMatrix matrix
            this.getTransform().worldSquareMatrix = m;
            this.getTransform().updateSingleStepTransform()
            this.render(k);
            if (k == 1) {
                this._abort = null
            }
        }
        return interpolate;
    }

//    animateZoom(x, y, zoom_factor) {
//        const start = this.getTransform().worldSquareMatrix;
//        this._interaction_settings.time_factor = this.getTransform().compute_zoom_parameters(
//            this.ssctrees[0], zoom_factor, x, this.getCanvasContainer().getBoundingClientRect().height - y, this.ssctrees[0].if_snap);
//        const end = this.getTransform().worldSquareMatrix;  //worldSquareMatrix is updated in function compute_zoom_parameters
//        var interpolate = this.doEaseOutSine(start, end);
//        //var interpolate = this.doEaseNone(start, end);
//        return interpolate;
//    }


    animateZoom(x, y, factor)
    {
        const rect = this.getCanvasContainer().getBoundingClientRect();
        const start = this.getTransform().worldSquareMatrix;
        this.getTransform().zoom(factor, x, rect.height - y);
        const end = this.getTransform().worldSquareMatrix;
        var interpolate = this.doEaseOutSine(start, end);
        return interpolate;
    }

    nonAnimatedZoom(x, y, factor)
    {
        const rect = this.getCanvasContainer().getBoundingClientRect();
        this.getTransform().zoom(factor, x, rect.height - y);
        this.abortAndRender()
    }

    nonAnimatedZoomAndPan(zoomAround, zoomFactor, panDist)
    {
        const rect = this.getCanvasContainer().getBoundingClientRect();
        this.getTransform().zoom(zoomFactor, zoomAround[0], rect.height - zoomAround[1]);
        this.getTransform().pan(panDist[0], -panDist[1]);
        this.abortAndRender()
    }

    animatePan(dx, dy) {
        const start = this.getTransform().worldSquareMatrix;
        this.getTransform().pan(dx, -dy);
        const end = this.getTransform().worldSquareMatrix;
        var interpolate = this.doEaseOutSine(start, end);
        //var interpolate = this.doEaseNone(start, end);
        return interpolate;
    }

    jumpTo(x, y, scale) {
        let center_world = [x, y];
        let r = this.getCanvasContainer();
        let viewportSize = [r.width, r.height];
        let denominator = scale;
        this.getTransform().initTransform(center_world, viewportSize, denominator);
        this.abortAndRender();
    }

    /** initiate a flyTo action */
    flyTo(x, y, scale) {

        let targetCenter = [x, y]
        let targetDenominator = scale
        let durationSecs = 5.0

        let transform = this.getTransform()

        let visibleWorldCenter = transform.getVisibleWorld().center()
        let scaleDenominator = transform.getScaleDenominator()

        let container = this.getCanvasContainer();
        let viewportSize = [container.width, container.height];

        // get an interpolation function and adjusted duration (if large distance, we fly longer)
        let [interpolate, durationSecsAdapted] = doFlyTo(visibleWorldCenter, scaleDenominator, viewportSize, targetCenter, targetDenominator, durationSecs)

        let goFly = (x) => {
            let result = interpolate(x) // get the center and scale denominator from the flyToInterpolator
            let container = this.getCanvasContainer();
            let viewportSize = [container.width, container.height];
            this.getTransform().initTransform(result[0], viewportSize, result[1]);
            this.render()
            // we could add argument to render: 
            // isInFlightRender:bool, then we can reduce tile level, while in flight (x<1)
            // while we can get the full detail / final map when x = 1
            this.msgbus.publish('map.scale', [this.getTransform().getCenterWorld(), this.getTransform().getScaleDenominator()])
        }
        this._abort = timed(goFly, durationSecsAdapted, this);
    }

    panBy(dx, dy) {
        //console.log("_abort in map.js:", this._abort)
        if (this._abort !== null) {
            this._abort();
        }
        this.getTransform().pan(dx, -dy);
        this.render();
    }

    abortAndRender() {
        // aborts running animation
        // and renders the map based on the current transform
        if (this._abort !== null) {
            this._abort();
            this._abort = null;
        }
        console.log('abortAndRender')
        this.getTransform().pan(0, 0);
        this.render();
    }

    zoomInAnimated(x, y, step) {
        //e.g., op_factor: 0.0625; 1.0 + op_factor: 1.0625
        this.zoomAnimated(x, y, 1.0 + step) // 1.0 + op_factor * this._interaction_settings.zoom_factor)
    }

    zoomOutAnimated(x, y, step) {
        //e.g., op_factor: 0.0625; 1.0 / (1.0 + op_factor): 0.9411764705882353
        this.zoomAnimated(x, y, 1.0 / (1.0 + step)) //1.0 / (1.0 + op_factor * this._interaction_settings.zoom_factor))
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

    // @!FIXME: check and use info of:
    // https://webglfundamentals.org/webgl/lessons/webgl-anti-patterns.html
    resize(newWidth, newHeight) {
        //console.log("resize");
        let tr = this.getTransform();
        let center = tr.getCenterWorld();
        //console.log('map.js center:', center)
        let denominator = tr.getScaleDenominator();
        // re-initialize the transform
        console.log('map.js newWidth, newHeight:', newWidth, newHeight)
        let canvas = this.getCanvasContainer()
        canvas.width = newWidth
        canvas.height = newHeight
        //console.log('map.js center:', center)
        tr.initTransform(center, [newWidth, newHeight], denominator);
        // update the viewport size of the renderer
//        this.renderer.setViewport(newWidth, newHeight)
//        
        this.renderers.forEach(
            (renderer, i) => {
                renderer.setViewport(newWidth, newHeight)
            }
        )
        this.render()
//        let gl = this.gl

//        let fbo = gl.fbo;
//        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
//        gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.depthBuffer);
//        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newWidth, newHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
//        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, newWidth, newHeight);

//        // Unbind the buffer object;
//        gl.bindTexture(gl.TEXTURE_2D, null);
//        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
    
//  function resizeCanvasToDisplaySize() {
//      let width = gl.canvas.clientWidth;
//      let height = gl.canvas.clientHeight;
//      if (gl.canvas.width != width ||  gl.canvas.height != height) {
//          gl.canvas.width = width;
//          gl.canvas.height = height;
//      }
//  }

}

export default Map
