//import { LRU } from './lru';
// import parse_obj from './parse';

import { LineDrawProgram, PolygonDrawProgram } from './ssc_draw';
import { clone } from './mat4.js';
import {WorkerHelper} from './helper.js';

class GPUTile
{
    constructor(gl, id)
    {
        this.gl = gl
        this.id = id

        // FIXME: should we split these buffers into two separate 'layers' 
        // -> PolylineLayer / AreaLayer
        this.polygon_triangleVertexPosBufr = null;
        //
        this.line_triangleVertexPosBufr = null;
        this.displacementBuffer = null;

    }
    
    uploadArrays(data)
    {
        let gl = this.gl
        
//        console.log(`uploading data for tile ${this.id}`)
//        console.log(data)
        // buffer for triangles of polygons
        // itemSize = 6: x, y, z, r_frac, g_frac, b_frac (see parse.js)
        //console.log('tilecontent.js data[0]:', data[0])
        //gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo); //FIXME: could we remove this line?
        this.polygon_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[0]), 6)
        //gl.bindFramebuffer(gl.FRAMEBUFFER, null);  //FIXME: could we remove this line?

        // buffer for triangles of boundaries
        // itemSize = 4: x, y, z (step_low), w (step_high); e.g., start (see parse.js)
        this.line_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[1]), 4)

        // buffer for displacements of boundaries
        // itemSize = 2: x and y; e.g., startl (see parse.js)
        this.displacementBuffer = create_data_buffer(gl, new Float32Array(data[2]), 2)

        function create_data_buffer(gl, data_array, itemSize) {
            let data_buffer = gl.createBuffer();
            //Unfortunately, the data that is buffered must be with type Float32Array (not Float64Array)
            gl.bindBuffer(gl.ARRAY_BUFFER, data_buffer); 
            gl.bufferData(gl.ARRAY_BUFFER, data_array, gl.STATIC_DRAW);
            // FIXME: 
            data_buffer.itemSize = itemSize; //x, y, z, r_frac, g_frac, b_frac
            data_buffer.numItems = data_array.length / itemSize;
            return data_buffer;
        }
    }
}

export class SSCRenderer 
{
    constructor(gl, msgBus, layer)
    {
        this.layer = layer;         // new SSCLayer(msgbus, tree_setting)
        this.gl = gl
        this.msgBus = msgBus

        // FIXME: LRU ???
        this.activeTiles = new Map()
        this.activeDownloads = new Map()

        this.lineDrawProgram = new LineDrawProgram(gl)
        this.polygonDrawProgram = new PolygonDrawProgram(gl)

        this.workerHelper = new WorkerHelper()
    }

    setViewport(width, height) {
        // console.error(`SSCRenderer not using the setViewport values yet ${width}, ${height}`)
    }

    prepareMatrix(matrix, near, far) {
        // sets up the orthogonal projection for the z-axis (scale dimension)
        let m = clone(matrix)
        m[10] = -2.0 / (near - far)
        m[14] = (near + far) / (near - far)
        return m
    }

    update(box2d, scaleDenominator, matrix, opacity) {
//        console.log(`update of SSCRender called ${box2d} ${scaleDenominator}`)
        let step = this.layer.getStepFromDenominator(scaleDenominator)
        //let step = 30
        // let step = 9474
        // FIXME: for debugging it would be nice if we could set a fixed
        // step value in the interface, and then have it use that value
        //let step = 11963

        // tree traversal to get what to render
        // if the tree is not fully complete,
        // a traversal should load the tree parts that are not yet there
        // a mesage that the subtree is loaded could then trigger a re-render
        // it's most efficient if the traversal is done once
        // (and not in 2 separate phases, as was implemented earlier)

        // FIXME:
        // should this part not go to the SSCLayer, which is more a SSCDataSource
        // then a SSCDataSource can supply multiple layers 
        // (currently: line, area, future: point / poi / text ???)
        // Each layer comes with a specific program for drawing 
        // (and thus requires its own buffers with triangles / textures / etc
        let box3d = [box2d[0], box2d[1], step, box2d[2], box2d[3], step]
        let chunksInView = this.layer.chunksInView(box3d)

        let chunkIdsOnScreen = new Set()
        chunksInView.map((chunk) => { 
            let chunkId = chunk.id
            chunkIdsOnScreen.add(chunkId)
        })

        let gpuTiles = []
        // let activeIdsDebug = []
        chunksInView.forEach((tile) => {
            let tileId = tile.id
            if (this.activeTiles.has(tileId)) {
                // activeIdsDebug.push(tileId)
                gpuTiles.push(this.activeTiles.get(tileId))
            } else {
                let gpuTile = new GPUTile(this.gl, tileId)
                // maybe this code should live in a worker
                // and the worker should be able to:
                // - queue requests
                // - cancel on-going fetch requests
                this.workerHelper.send(
                    tile.url,
                    // callback, once finished
                    (arrays) => {
                        gpuTile.uploadArrays(arrays)
                        this.activeDownloads.delete(tileId)
                        this.msgBus.publish('data.tile.loaded', 'tile.ready')
                    }
                )
                //let abortController = new AbortController();
                //const signal = abortController.signal;
                gpuTiles.push(gpuTile)
                this.activeTiles.set(tileId, gpuTile)
                this.activeDownloads.set(tileId, true);
                /*
                fetch(tile.url, { mode: 'cors', signal})
                    .then(response => { return response.text() })
                    .then(data_text => { 
                        let arrays = parse_obj(data_text)
                        // console.log(arrays)
                        return arrays
                    })
                    .then((arrays) => {
                        gpuTile.uploadArrays(arrays)
                        this.activeDownloads.delete(tileId)
                        this.msgBus.publish('data.tile.loaded', 'tile.ready')
                    })
                
                */
            }
        })

        this.msgBus.publish('map.step', step)
        this.msgBus.publish('data.ssc.chunksInView', gpuTiles.length)
        this.msgBus.publish('data.ssc.chunksDownloading', this.activeDownloads.size)
        // console.log(step)
        {
            let m = this.prepareMatrix(matrix, step, 5176476) //288727)
            // this.polygonDrawProgram.taint()
            this.polygonDrawProgram.clear()
            gpuTiles.forEach((gpuTile) => {
                this.polygonDrawProgram.drawTile(m, gpuTile, 
                    0.5, // 1.0, 
                    scaleDenominator, step, 0.5)
            })
            this.polygonDrawProgram.clear()
        }
        {
            let m = this.prepareMatrix(matrix, step, -0.5)
            // this.lineDrawProgram.taint()
            gpuTiles.forEach((gpuTile) => {
                this.lineDrawProgram.drawTile(m, gpuTile, 
                    0.5, // 1.0, 
                    scaleDenominator, step, 0.25)
            })
        }
    }
}

export class SSCLayer {
    constructor(msgbus, tree_setting) {
        this.msgbus = msgbus
        this.tree = null
        this.settings = tree_setting
    }
    load() { // FIXME: rename? loadChunkIndex()
        let url = this.settings.tree_root_href + this.settings.tree_root_file_nm
        console.log(`fetching ${url}`)
        fetch(url)
          .then(r => {
            return r.json()
          })
          .then(tree => {  //tree: the content in the json file
            this.tree = tree
            // console.log(tree)
            //all the dataelements recorded in .json file
            let dataelements = this.obtainDataelements()
            //originally, each element has attributes "id", "box", "info"
            dataelements.forEach(element => { 
              element.content = null
              element.last_touched = null
              //e.g., element.href: node02145.obj
              element.url = this.settings.tile_root_href + element.href
              element.loaded = false
              // console.log(element.url)
            })
          })
          .then(() => {
            // Notify via PubSub that tree has loaded 
            // (this re-renders the map if not already rendering)
            this.msgbus.publish('data.tree.loaded', 'param?')
          })
    }

    // FIXME: rename method
    // note: tree has data and index nodes mixed (?)
    // returns the tree nodes with data
    obtainDataelements() {
        // FIXME: make iterator/generator function* 
        // to avoid making the whole result list in memory
        let root = this.tree
        let dataelements = []
        let stack = [root]
        while (stack.length > 0) {
            const node = stack.pop()

            if (node.hasOwnProperty('children') === true) {
                // visit chids, if they overlap
                node.children.forEach(child => {
                    stack.push(child)
                });
            }
            if (node.hasOwnProperty('dataelements') === true) {
                // add data elements to result list
                node.dataelements.forEach(element => {
                    dataelements.push(element)
                });
            }
        }
        return dataelements
    }


    getStepFromDenominator(denominator) {
        if (this.tree === null) {
            return 0
        }
        // reduction in percentage
        let reductionFactor = 1 - Math.pow(this.tree.metadata.start_scale_Sb / denominator, 2)
        //console.log('ssctree.js reductionf:', reductionf)
        let step = this.tree.metadata.no_of_objects_Nb * reductionFactor //step is not necessarily an integer
        //let step = this.tree.metadata.no_of_steps_Ns * reductionf
        //console.log('ssctree.js step:', step)
        //console.log('ssctree.js Nt:', this.tree.metadata.no_of_objects_Nb - step)
        return parseInt(Math.max(0.0, Math.round(step)))
    }


    chunksInView(box3d) {
        let result = []
        if (this.tree === null) {
            return result
        }
        let stack = [this.tree]
        while (stack.length > 0) {
            let node = stack.pop()
            if (node.hasOwnProperty('children') === true)
            {
                // visit chids, if they overlap
                node.children.forEach(child => {
                    if (overlaps3d(node.box, box3d)) {
                        stack.push(child)
                    }
                });
            }
            // add data elements to result list, if box overlaps
            if (node.hasOwnProperty('dataelements') === true)
            {
                node.dataelements.forEach(element => {
                    if (overlaps3d(element.box, box3d)) {
                        result.push(element)
                    }
                });
            }
        }
        return result
    }

}


function getUnloadedLeavesInView(node, box3d) {
    // get a list of the unloaded nodes of the index tree
    let leaves = []
    let stack = [node]
    while (stack.length > 0) {
        let node = stack.pop()
        if (node.hasOwnProperty('children') === true)
        {
            // visit chids, if they overlap
            node.children.forEach(child => {
                if (child.hasOwnProperty('children'))
                {
                    stack.push(child)
                }
                else if (child.hasOwnProperty('uri') && !child.hasOwnProperty('loaded')
                    && overlaps3d(child.box, box3d)) {
                    leaves.push(child)
                    child.loaded = true;
                }
            });
        }
    }
    return leaves
}





function overlaps3d(sscbox, slicebox) {
    // Separating axes theorem, nD -> 3D
    // one represents the ssc, and other represents the slicing plane
    // e.g., one: [182000, 308000, 0, 191000, 317000, 7]
    // e.g., other: [185210.15625, 311220.96875, 0, 187789.84375, 313678.9375, 0]
    const dims = 3
    let cmpbox = sscbox
    let isOverlapping = true;
    for (let min = 0; min < dims; min++) {
        let max = min + dims
        if (cmpbox[max] <= slicebox[min] || cmpbox[min] > slicebox[max]) { 
            isOverlapping = false
            break
        }
    }
    return isOverlapping
}

