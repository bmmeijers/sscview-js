import { now } from "./animate"
//import { require } from "./require"
//var SortedMap = require("collections/sorted-map");
//import { fromArray } from '@collectable/sorted-set';
//import { fromArray } from '../node_modules/@collectable/sorted-set';
//import Transform from './transform';
//import { log } from "util";

//import Rectangle from './rect';
//var meter_to_pixel = 3779.5275590551; // 1 meter equals 3779.5275590551 pixels


// FIXME:
// [x] Remove retrieved property on SSCTree 
// [x] Unify ImageTileContent and TileContent into one class
// [x] Make Renderer play nicely with the modifications
// [x] Resurrect Evictor, with default strategy of removing old stuff
// [ ] Make use of worker to retrieve ImageTiles
// [ ] Use logicalProcessors = window.navigator.hardwareConcurrency for creating the WorkerHelper Pool
// [ ] Make retrieval more resilient against non-working server (e.g. ask again for tile content), 
//     while not overloading the server(queueing requests / abortcontroller.signal)


function center2d(box3d)
{
    // 2D center of bottom of box
    let xmin = box3d[0]
    let ymin = box3d[1]
    let xmax = box3d[3]
    let ymax = box3d[4]
    return [xmin + 0.5 * (xmax - xmin),
            ymin + 0.5 * (ymax - ymin)]
}

function distance2d(target, against)
{
    // find projected distance between 2 box3d objects
    let ctr_t = center2d(target)
    let ctr_a = center2d(against)
    let dx2 = Math.pow(ctr_a[0] - ctr_t[0], 2)
    let dy2 = Math.pow(ctr_a[1] - ctr_t[1], 2)
    return Math.sqrt(dx2 + dy2)
}


class WorkerHelper {
    constructor() {
        this.tasks = {}
        this.worker = new Worker('worker.js')
        this.worker.onmessage = (evt) => { this.receive(evt)}
    }

    send(data, callback) 
    {
        // use a random id
        const id = Math.round((Math.random() * 1e18)).toString(36).substring(0, 10)
        this.tasks[id] = callback
        this.worker.postMessage({id: id, msg: data})
    }

    receive(evt) 
    {
        const id = evt.data.id;
        const msg = evt.data.msg
        this.tasks[id](msg) // execute the callback that was registered while sending
        delete this.tasks[id]
    }
}


export class SSCTree {
    constructor(msgbus, settings) {
        this.msgbus = msgbus
        this.tree = null
        this.settings = settings
        this.step_highs = null
        // pool of workers
        let pool_size = window.navigator.hardwareConcurrency || 2;
        this.worker_helpers = []
        for (let i = 0; i< pool_size+1; i++) {
            this.worker_helpers.push(new WorkerHelper())
        }
        console.log(pool_size + ' workers made')
        this.helper_idx_current = -1
    }

    load() {
        //
        // FIXME: convert to worker that does this
        // 
        // fetch('nl/tree_max9_fanout10_9.json')

        //we specify folder 'dist_test', 'dist_buchholz_greedy', or 'dist_buchholz_astar' in sscview-js\rollup.config.js
        //let data_folder = 'data/';
//        let jsonfile = 'nodes.json';
        //let jsonfile = 'tree_buchholz.json';
        //let jsonfile = 'tree.json';
        //console.log('fetching root' + this.settings.tree_root_href + this.settings.tree_root_file_nm)

        //e.g., this.settings.tree_root_href: '/data/'
        //e.g., this.settings.tree_root_file_nm: 'tree.json'
        //e.g., this.settings.eventnum_repetition_nm: 'eventnum_repetition.json'
        var step_highs = null
        
        var eventnum_repetition_nm = 'eventnum_repetition_nm'
        if (eventnum_repetition_nm in this.settings) {
            fetch(this.settings.tree_root_href + this.settings[eventnum_repetition_nm])
                .then(r => {
                    step_highs = [0] //if the file exists, we will do parallel merging
                    return r.json()
                })
                .then(eventnum_repetition_dt => {
                    eventnum_repetition_dt.eventnum_repetition.forEach(function (eventnum_repetition_lt) {
                        for (let index = 0; index < eventnum_repetition_lt[1]; ++index) {
                            step_highs.push(step_highs[step_highs.length - 1] + eventnum_repetition_lt[0])
                            //console.log('step_highs[step_highs.length - 1]:', step_highs[step_highs.length - 1])
                            //console.log('step_highs.length - 1:', step_highs.length - 1)
                        }
                    })
                })
                .then(() => {
                    this.step_highs = step_highs
                    //console.log('step_highs:', step_highs)
                })
                .catch(() => {
                    this.step_highs = null
                })
        }
        


        fetch(this.settings.tree_root_href + this.settings.tree_root_file_nm)
            .then(r => {
                return r.json()
            })
            .then(tree => {
                this.tree = tree;
                //let box3d = tree.box;
                //tree.center2d = [(box3d[0] + box3d[3]) / 2, (box3d[1] + box3d[4]) / 2]
                let dataelements = obtain_dataelements(this.tree)  //dataelements recorded in .json file
                dataelements.forEach(element => { //originally, each element has attributes "id", "box", "info"
                    element.content = null
                    element.last_touched = null
                    element.url = this.settings.tile_root_href + element.href
                    element.loaded = false;
                })
            })
            .then(() => {
                // Notify via PubSub that tree has loaded 
                // (this re-renders the map if not already rendering)
                this.msgbus.publish('data.tree.loaded', 'tree.ready')
            })
            .catch(err => {
                console.error(err)
            })
    }

    load_subtree(node) {
        //console.log(this.settings.tree_root_href + node.href)
        fetch(this.settings.tree_root_href + node.href)
            .then(r => {
                return r.json()
            })
            .then(j => {

                node.children = j.children;
                let dataelements = obtain_dataelements(node)  //dataelements recorded in .json file
                dataelements.forEach(element => { //originally, each element has attributes "id", "box", "info"
                    element.content = null
                    element.last_touched = null
                    element.url = this.settings.tile_root_href + element.href
                    element.loaded = false;
                })

                this.msgbus.publish('data.tree.loaded', 'tree.ready')
            })
            .catch(err => {
                console.error(err)
            })
    }
    


    fetch_tiles(box3d, gl) {
        if (this.tree === null) { return }

        let subtrees = obtain_overlapped_subtrees(this.tree, box3d)
        subtrees.map(node => {
            this.load_subtree(node)
        })

        let overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d)
        let to_retrieve = [];
        overlapped_dataelements.map(elem => {
            if (elem.loaded === false) {
                to_retrieve.push(elem);
            }
        })

        // sort the tiles via the distance from center of the box
        // decorate-sort-undecorate based on distance:
        //      2D center of viewport -- 2D center of bottom of tile
        to_retrieve = to_retrieve.map(
            elem => {
                return [distance2d(elem.box, box3d), elem]
            }
        )
        to_retrieve.sort(
            (a, b) => { 
                    if (a[0] < b[0]) { return -1 }
                    else if (a[0] > b[0]) { return 1 }
                    else {return 0}
            }
        )
        to_retrieve = to_retrieve.map(
            elem => {return elem[1]}
        )

        // schedule tiles for retrieval
        to_retrieve.map(elem => {
            this.helper_idx_current = (this.helper_idx_current + 1) % this.worker_helpers.length
            let content = new TileContent(this.msgbus, this.settings.texture_root_href, this.worker_helpers[this.helper_idx_current])
            content.load(elem.url, gl) //e.g., elem.url = de/buchholz_greedy_test.obj
            elem.content = content
            elem.loaded = true
            elem.last_touched = now()
            // FIXME: is this really 'retrieved' ? Or more, scheduled for loading ?
        })

    }

    get_relevant_tiles(box3d) {
        if (this.tree === null) { return [] }

        let overlapped_dataelements = obtain_overlapped_dataelements(this.tree, box3d)
        return overlapped_dataelements
            .map(elem => { // set for each tile to be rendered the last accessed time
                elem.last_touched = now();
                return elem
            })
    }

    get_step_from_St(St, if_snap = false) {
        
        // FIXME: these 2 variables should be adjusted
        //         based on which tGAP is used...
        // FIXME: this step mapping should move to the data side (the tiles)
        //         and be kept there (for every dataset visualized on the map)
        // FIXME: should use this.getScaleDenominator()

        // let Sb = 48000  // (start scale denominator)
        // let total_steps = 65536 - 1   // how many generalization steps did the process take?

        //let Sb = 24000  // (start scale denominator)
        //let total_steps = 262144 - 1   // how many generalization steps did the process take?

        if (this.tree === null)
        {
             return 0
        }

        // reduction in percentage
        let reductionf = 1 - Math.pow(this.tree.metadata.start_scale_Sb / St, 2)
        let step = this.tree.metadata.no_of_objects_Nb * reductionf //step is not necessarily an integer
        let step_highs = this.step_highs
        if (if_snap == true
            && step_highs != null
            && step > step_highs[0]
            && step < step_highs[step_highs.length - 2] //without this line, the map will stop zooming out when at the last step
        ) {
            step = snap_to_existing_stephigh(step, step_highs)
        }
        
        //return Math.max(0, step)
        return step
    }

    get_St_from_step(step) {
        let Nb = this.tree.metadata.no_of_objects_Nb
        let St = this.tree.metadata.start_scale_Sb * Math.pow(Nb / (Nb - step), 0.5)

        //console.log('transform.js step, Nb, Sb, St:', step, Nb, this.tree.metadata.start_scale_Sb, St)
        return St
    }

}


function snap_to_existing_stephigh(step, step_highs) {
    let start = 0, end = step_highs.length - 1;

    // Iterate while start not meets end 
    while (start <= end) {

        // Find the mid index 
        let mid = Math.floor((start + end) / 2);

        // If element is present at mid, return True 
        if (step_highs[mid] == step) return step;

        // Else look in left or right half accordingly 
        else if (step_highs[mid] < step)
            start = mid + 1;
        else
            end = mid - 1;
    }

    //console.log('tiles.js start and end:', start, end)
    //console.log('step_highs[start], step, step_highs[end]:', step_highs[start], step, step_highs[end])
    //console.log('step_highs[start] - step, step - step_highs[end]:', step_highs[start] - step, step - step_highs[end])
    if (step_highs[start] - step <= step - step_highs[end]) { //start is already larger than end by 1
        return step_highs[start]
    }
    else {
        return step_highs[end]
    }
}


function obtain_overlapped_dataelements(node, box3d) {
    // console.log(box)
    let result = []
    let stack = [node]
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


function obtain_overlapped_subtrees(node, box3d) {
    let result = []
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
                else if (child.hasOwnProperty('href') && !child.hasOwnProperty('loaded')
                    && overlaps3d(child.box, box3d)) {
                    result.push(child)
                    child.loaded = true;
                }
            });
        }

    }
    return result
}


function obtain_dataelements(root) {
    // FIXME: make iterator/generator function* 
    // to avoid making the whole result list in memory
    let result = []
    let stack = [root]
    while (stack.length > 0) {
        const node = stack.pop()

        if (node.hasOwnProperty('children') === true)
        {
            // visit chids, if they overlap
            node.children.forEach(child => {
                stack.push(child)
            });
        }
        if (node.hasOwnProperty('dataelements') === true)
        {
            // add data elements to result list
            node.dataelements.forEach(element => {
                result.push(element)
            });
        }
    }
    return result
}

/*
function overlaps2d(one, other) {
    // Separating axes theorem
    // xmin=[0][0]
    // xmax=[1][0]
    // ymin=[0][1]
    // ymax=[1][1]
    // If one of the following is true then there can be no overlap
    return !(one[1][0] < other[0][0] ||
        one[0][0] > other[1][0] ||
        one[1][1] < other[0][1] ||
        one[0][1] > other[1][1])
}
*/

export function overlaps3d(one, other) {
    // Separating axes theorem, nD -> 3D
    const dims = 3
    let are_overlapping = true;
    for (let min = 0; min < dims; min++) {
        let max = min + dims
        if ((one[max] < other[min]) || (one[min] > other[max])) {
            are_overlapping = false
            break
        }
    }
    return are_overlapping
}

function generate_class_color_dt() {

    var class_color_dt = {

        // atkis
        2101: { r: 239, g: 200, b: 200 },
        2112: { r: 255, g: 174, b: 185 },
        2114: { r: 204, g: 204, b: 204 },
        2201: { r: 138, g: 211, b: 175 },
        2202: { r: 51, g: 204, b: 153 },
        2213: { r: 170, g: 203, b: 175 },
        2230: { r: 181, g: 227, b: 181 },
        2301: { r: 157, g: 157, b: 108 },
        3103: { r: 254, g: 254, b: 254 },
        3302: { r: 204, g: 153, b: 255 },
        4101: { r: 234, g: 216, b: 189 },
        4102: { r: 230, g: 255, b: 204 },
        4103: { r: 171, g: 223, b: 150 },
        4104: { r: 255, g: 255, b: 192 },
        4105: { r: 40, g: 200, b: 254 },
        4107: { r: 141, g: 197, b: 108 },
        4108: { r: 174, g: 209, b: 160 },
        4109: { r: 207, g: 236, b: 168 },
        4111: { r: 190, g: 239, b: 255 },
        5112: { r: 181, g: 208, b: 208 },

        // top10nl
        10310: { r: 230, g: 0, b: 0 },
        10311: { r: 230, g: 0, b: 0 },
        10410: { r: 255, g: 170, b: 0 },
        10411: { r: 255, g: 170, b: 0 },
        10510: { r: 255, g: 255, b: 0 },
        10600: { r: 255, g: 255, b: 255 },
        10700: { r: 255, g: 255, b: 255 },
        10710: { r: 255, g: 255, b: 255 },
        10720: { r: 179, g: 179, b: 0 },
        10730: { r: 156, g: 156, b: 156 },
        10740: { r: 255, g: 211, b: 127 },
        10741: { r: 255, g: 211, b: 127 },
        10750: { r: 255, g: 167, b: 127 },
        10760: { r: 255, g: 167, b: 127 },
        10780: { r: 255, g: 255, b: 255 },
        12400: { r: 190, g: 232, b: 255 },
        12500: { r: 190, g: 232, b: 255 },
        13000: { r: 0, g: 0, b: 0 },
        14010: { r: 255, g: 255, b: 222 },
        14030: { r: 156, g: 156, b: 156 },
        14040: { r: 201, g: 235, b: 112 },
        14050: { r: 255, g: 255, b: 190 },
        14060: { r: 140, g: 168, b: 0 },
        14080: { r: 140, g: 168, b: 0 },
        14090: { r: 140, g: 168, b: 0 },
        14100: { r: 204, g: 204, b: 204 },
        14120: { r: 255, g: 255, b: 222 },
        14130: { r: 201, g: 235, b: 112 },
        14140: { r: 252, g: 179, b: 251 },
        14160: { r: 255, g: 255, b: 255 },
        14162: { r: 255, g: 255, b: 255 },
        14170: { r: 201, g: 235, b: 112 },
        14180: { r: 255, g: 255, b: 255 },

    };

    for (var key in class_color_dt) {
        var color = class_color_dt[key];  //color is a dictionary of elements r, g, b
        color.r_frac = color.r / 255;
        color.g_frac = color.g / 255;
        color.b_frac = color.b / 255;
    }

    return class_color_dt;
}

let isPowerOf2 = ((value) => { return (value & (value - 1)) == 0 })







// FIXME: UNIFY TileContent and ImageTileContent by branching inside load()-method
// on the file extension to be retrieved... (not super elegant)

// This makes TileContent quite big class -> split in subclasses?

class TileContent {
    constructor(msgbus, texture_root_href, worker_helper) {
        this.msgbus = msgbus
        this.worker_helper = worker_helper

        // image tiles
        this.texture_root_href = texture_root_href;
        this.buffer = null;
        this.texture = null;
        this.textureCoordBuffer = null;

        // ssc tiles
        this.polygon_triangleVertexPosBufr = null;
        this.line_triangleVertexPosBufr = null;
        this.displacementBuffer = null;


    }

    load(url, gl) {
        if (url.endsWith('obj') == true) 
        {
            this.load_ssc_tile(url, gl) 
        }
        else if (url.endsWith('json') == true) 
        {
            this.load_image_tile(url, gl)
        }
        else
        {
            console.error('unknown url type: '+ url)
        }
    }

    load_ssc_tile(url, gl)
    {
        this.worker_helper.send(
            url, 
            (data) => {

                // upload received data to GPU

                // polygons
                let triangles = new Float32Array(data[0])
                this.polygon_triangleVertexPosBufr = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.polygon_triangleVertexPosBufr);
                gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
                this.polygon_triangleVertexPosBufr.itemSize = 3;
                this.polygon_triangleVertexPosBufr.numItems = triangles.length / 6; 

                // lines
                let line_triangles = new Float32Array(data[1])
                this.line_triangleVertexPosBufr = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.line_triangleVertexPosBufr);
                gl.bufferData(gl.ARRAY_BUFFER, line_triangles, gl.STATIC_DRAW);
                this.line_triangleVertexPosBufr.itemSize = 4;
                this.line_triangleVertexPosBufr.numItems = line_triangles.length / 4; 

                let line_displacements = new Float32Array(data[2])
                this.displacementBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, this.displacementBuffer)
                gl.bufferData(gl.ARRAY_BUFFER, line_displacements, gl.STATIC_DRAW)
                this.displacementBuffer.itemSize = 2   //each item has only x and y
                this.displacementBuffer.numItems = line_displacements.length / 2

                // notify we are ready
                this.msgbus.publish('data.tile.loaded', 'tile.ready')
            }
        )
    }

        // FIXME: here we cannot just make a new handler for the worker 
        // (as this then does forget which tile we were working with)
        // we should somehow communicate back to which tile the data belongs!

//        this.worker.onmessage = (evt) => {
//            let data_from_text = this._obtain_data_from_text(evt.data, gl);

//            this.line_triangleVertexPosBufr = data_from_text[0];
//            this.displacementBuffer = data_from_text[1];
//            this.polygon_triangleVertexPosBufr = data_from_text[2];

//            console.log(this.polygon_triangleVertexPosBufr.numItems + " " + url)
//            this.msgbus.publish('data.tile.loaded', 'tile.ready')
//            this.worker.terminate()
//        }


//        worker.postMessage(url)
//        worker.onMessage = (evt) => {}

//var myWorker = new Worker("worker.js"); <-- should come from a pool of workers ???
//        console.log('start worker')
//        myWorker.onmessage = function (evt) 
//        {
//            console.log('Message received from worker');
//            let vertices = new Float32Array(evt.data);
//            // bind buffer
//            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
//            // remember size
//            buffer.itemSize = 3;
//            buffer.numItems = (vertices.length)/6 - 1;
//            // we do not keep the worker alive
//            map.panBy(0,0);
//            myWorker.terminate()
//            // inside the worker we have implemented: close();
//        };

//        fetch(url)  //e.g., url = "http://localhost:8000/de/buchholz_greedy_test.obj"
//            .then(response => { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
//            .then(data_text => {
//                var data_from_text = this._obtain_data_from_text(data_text, gl);
//                this.line_triangleVertexPosBufr = data_from_text[0];
//                this.displacementBuffer = data_from_text[1];
//                this.polygon_triangleVertexPosBufr = data_from_text[2];
//console.log(this.polygon_triangleVertexPosBufr.numItems + " " + url)
//                this.msgbus.publish('data.tile.loaded', 'tile.ready')
//            })
//            .catch(err => { console.error(err) });
//    }

    _obtain_data_from_text(data_text, gl) {
        //data_text is the content of an .obj file

        var class_color_dt = generate_class_color_dt();
        var deltas_bound_triangles = [];
        var line_and_polygon_triangleVertexPosBufr = 
            this._obtain_line_and_polygon_triangleVertexPosBufr(data_text, gl, class_color_dt, deltas_bound_triangles)

        let displacementElements = new Float32Array(deltas_bound_triangles.flat(1));
        let displacementBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, displacementElements, gl.STATIC_DRAW);

        displacementBuffer.itemSize = 2; //each item has only x and y
        displacementBuffer.numItems = displacementElements.length / 2;

        return [
            line_and_polygon_triangleVertexPosBufr[0],
            displacementBuffer,
            line_and_polygon_triangleVertexPosBufr[1]];
    }


    _obtain_line_and_polygon_triangleVertexPosBufr(data_text, gl,
        class_color_dt, deltas_bound_triangles) {

        var step_high = [];
        var vertex_lt = [];
        var feature_color = [];
        var triangle_color_lt = [];
        var vertices_bound_triangles = []; //vertices of the boundaries, in order to form triangles to display the boundaries
        data_text.split("\n").forEach(l => this._parseLine(
            l, vertex_lt, class_color_dt, triangle_color_lt,
            step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles));

        //console.log("tiles.js:", "..\")
        //const set = fromArray(['X', 'Y']); // => SortedSet<[X, Y]>
        //console.log("tiles.js, set:", set)

        //obtain line_triangleVertexPosBufr;
        var line_vertexElements = new Float32Array(vertices_bound_triangles.flat(1));
        var line_itemSize = 4; //the number of elements, which is 4 for position, i.e., x, y, z (step_low), step_high
        var line_extended_itemSize = line_itemSize; //for computing the number of vertices; 
        var line_triangleVertexPosBufr = this._obtain_triangleVertexPosBufr(
            gl, line_vertexElements, line_itemSize, line_extended_itemSize);

        //obtain polygon_triangleVertexPosBufr;
        var polygon_vertexElements = new Float32Array(triangle_color_lt);
        var polygon_itemSize = 3; //the number of elements, which is 3 for position, i.e., x, y, z 
        //each vertex has 6 elements in triangle_color_lt, i.e., x, y, z, r_frac, g_frac, b_frac
        var polygon_extended_itemSize = 6; //for computing the number of vertices;        
        var polygon_triangleVertexPosBufr = this._obtain_triangleVertexPosBufr(
            gl, polygon_vertexElements, polygon_itemSize, polygon_extended_itemSize);

        return [line_triangleVertexPosBufr, polygon_triangleVertexPosBufr];
    }


    _obtain_triangleVertexPosBufr(gl, vertexElements, itemSize, extended_itemSize) {
        
        let triangleVertexPosBufr = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        gl.bufferData(gl.ARRAY_BUFFER, vertexElements, gl.STATIC_DRAW);

        triangleVertexPosBufr.itemSize = itemSize;        
        triangleVertexPosBufr.numItems = vertexElements.length / extended_itemSize; 
        //the number of vertices;

        return triangleVertexPosBufr;
    }


    _parseLine(line, vertex_lt, class_color_dt, triangle_color_lt,
        step_high, feature_color, vertices_bound_triangles, deltas_bound_triangles) {

        var words = line.split(' ');
        if (words[0] == 'v') {
            vertex_lt.push({
                x: Number(words[1]),
                y: Number(words[2]),
                z: Number(words[3])
            });
        } else if (words[0] == 'g') {
            var feature_class = Number(words[1].split('_')[0]);
            feature_color[0] = class_color_dt[feature_class];
        } else if (words[0] == 'f') {
            // 3 vertex indentifiers make a triangle; add coordinates and colors
            var f_color = feature_color[0];
            for (i = 1; i <= 3; i++) {
                var vertex = vertex_lt[Number(words[i]) - 1];
                triangle_color_lt.push(vertex.x, vertex.y, vertex.z,
                    f_color.r_frac, f_color.g_frac, f_color.b_frac);
            }
        }
        else if (words[0] == '#') {
            // words[1]: step_high; words[2]: edge_id
            if (words.length > 1) {
                step_high[0] = words[1];
            }
        }
        else if (words[0] == 'l') {
            var polyline = [];
            for (var i = 1; i < words.length; i++) {
                polyline.push(vertex_lt[words[i] - 1]);
            }

            var point_records = [];
            for (var j = 0; j < polyline.length; j++) {
                var pt = polyline[j];
                point_records.push([pt.x, pt.y, pt.z, step_high[0]]); //pt.z is step_low
            }

            for (var k = 0; k < point_records.length - 1; k++) {
                var start = point_records[k];    //start point of a line segment
                var end = point_records[k + 1];  //end point of the line segment
                var start_xy = start.slice(0, 2);
                var end_xy = end.slice(0, 2);
                var v = make_vector_start_end(start_xy, end_xy);
                var length = norm(v);

                if (length != 0) {
                    var unitvec = div(v, length);
                    //The lengths of startr, startl, endr, and endl are sqrt(2)
                    var startr = add(mul(unitvec, -1), rotate90cw(unitvec));
                    var startl = add(mul(unitvec, -1), rotate90ccw(unitvec));
                    var endr = add(unitvec, rotate90cw(unitvec));
                    var endl = add(unitvec, rotate90ccw(unitvec));


                    //start consists of x, y, z (step_low), step_high, while
                    //startl consists of only x, y
                    vertices_bound_triangles.push(start, start, end, start, end, end);
                    deltas_bound_triangles.push(startl, startr, endl, startr, endr, endl);
                }
            }
        }

        //#region vector computation

        function sub(a, b) {
            /*Subtract a vector b from a, or subtract a scalar*/
            var result_values = [];
            if (isNaN(b)) { //b is not a number; b is iterable
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] - b[i]);
                }
            }
            else {
                for (var j = 0; j < a.length; j++) {
                    result_values.push(a[j] - b);
                }
            }

            return result_values;
        }

        function add(a, b) {
            /*Add a vector b to a, or add a scalar*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] + b[i]);
                }
            }
            else {
                for (var j = 0; j < a.length; j++) {
                    result_values.push(a[j] + b);
                }
            }

            return result_values;
        }

        function mul(a, b) {
            /*Multiply a vector either element-wise with another vector, or with a
            scalar.*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] * b[i]);
                }
            }
            else {
                for (var j = 0; j < a.length; j++) {
                    result_values.push(a[j] * b);
                }
            }

            return result_values;
        }

        function div(a, b) {
            /*Element-wise division with another vector, or with a scalar.*/
            var result_values = [];
            if (isNaN(b)) {
                if (a.length != b.length) {
                    throw "Vector dimensions should be equal";
                }
                for (var i = 0; i < a.length; i++) {
                    result_values.push(a[i] / b[i]);
                }
            }
            else {
                for (var j = 0; j < a.length; j++) {
                    result_values.push(a[j] / b);
                }
            }

            return result_values;
        }


        //function make_vector(end, start) {
        //    /*Creates a vector from the start to the end.

        //    Vector is made based on two points{ end - (minus) start.
        //        */
        //    return sub(end, start);
        //}

        function make_vector_start_end(start, end) {
            /*Creates a vector from the start to the end.
            
            Vector is made based on two points{ end - (minus) start.
                */
            return sub(end, start);
        }

        function dot(v1, v2) {
            /*Returns dot product of v1 and v2 */
            if (v1.length != v2.length) {
                throw "Vector dimensions should be equal";
            }

            var dot_value = 0;
            for (var i = 0; i < v1.length; i++) {
                dot_value += v1[i] * v2[i];
            }
            return dot_value;
        }


        function norm2(v) {
            /*Returns the norm of v, *squared*.*/
            return dot(v, v);
        }


        function norm(a) {
            /*L2 norm*/
            return Math.sqrt(norm2(a));
        }


        //function dist(start, end) {
        //    /*Distance between two positons*/
        //    return norm(make_vector_start_end(start, end));
        //}


        //function unit(v) {
        //    /*Returns the unit vector in the direction of v.*/
        //    return div(v, norm(v));
        //}


        //function cross(a, b) {
        //    /*Cross product between a 3-vector or a 2-vector*/
        //    if (a.length != b.length) {
        //        throw "Vector dimensions should be equal";
        //    }
        //    if (a.length == 3) {
        //        return (
        //            a[1] * b[2] - a[2] * b[1],
        //            a[2] * b[0] - a[0] * b[2],
        //            a[0] * b[1] - a[1] * b[0]);
        //    }
        //    else if (a.length == 2) {
        //        return a[0] * b[1] - a[1] * b[0];
        //    }
        //    else {
        //        throw 'Vectors must be 2D or 3D';
        //    }
        //}

        //function angle(v1, v2) {
        //    /*angle between 2 vectors*/
        //    return Math.acos(dot(v1, v2) / (norm(v1) * norm(v2)));
        //}

        //function angle_unit(v1, v2) {
        //    /*angle between 2 *unit* vectors*/
        //    let d = dot(v1, v2)
        //    if (d > 1.0 || d < -1.0) {
        //        console.log("dot not in [-1, 1] -- clamp");
        //    }
        //    d = Math.max(-1.0, Math.min(1.0, d));
        //    return Math.acos(d);
        //}

        //function near_zero(val) {
        //    if (Math.abs(val) <= Math.pow(0.1, 8)) {
        //        return true;
        //    }
        //    else {
        //        return false;
        //    }
        //}

        //function bisector(u1, u2) {
        //    /*Based on two unit vectors perpendicular to the wavefront,
        //    get the bisector
            
        //    The magnitude of the bisector vector represents the speed
        //        in which a vertex has to move to keep up(stay at the intersection of)
        //    the 2 wavefront edges
        //    */
        //    let direction = add(u1, u2);

        //    var max_value = 0;
        //    for (var i = 0; i < direction.length; i++) {
        //        max_value = Math.max(max_value, Math.abs(direction[i]));
        //    }

        //    if (near_zero(max_value)) {
        //        return (0, 0);
        //    }
        //    let alpha = 0.5 * Math.PI + 0.5 * angle_unit(u1, u2);
        //    let magnitude = Math.sin(alpha); //if u1 and u2 are unit vectors, then magnitude = sqrt(2) / 2
        //    var bisector_result = div(unit(direction), magnitude);
        //    return bisector_result;
        //}


        function rotate90ccw(v) {
            /*Rotate 2d vector 90 degrees counter clockwise
            
                (x, y) -> (-y, x)
            */
            return [-v[1], v[0]];
        }


        function rotate90cw(v) {
            /*Rotate 2d vector 90 degrees clockwise
            
                (x, y) -> (y, -x)
            */
            return [v[1], -v[0]];
        }
    //#endregion
    }


    load_image_tile(href, gl) {
        let f = () => {

            // setup texture as placeholder for texture to be retrieved later
            this.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            // Because images have to be download over the internet
            // they might take a moment until they are ready.
            // Until then put a single pixel in the texture so we can
            // use it immediately. When the image has finished downloading
            // we'll update the texture with the contents of the image.
            const level = 0;
            const internalFormat = gl.RGBA;
            const width = 1;
            const height = 1;
            const border = 0;
            const srcFormat = gl.RGBA;
            const srcType = gl.UNSIGNED_BYTE;
            const pixel = new Uint8Array([255, 255, 255, 255]);  // opaque blue
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                            width, height, border, srcFormat, srcType,
                            pixel);

            this.textureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                0.0, 0.0, 
                0.0, 1.0,
                1.0, 1.0,
                0.0, 0.0,
                1.0, 1.0,
                1.0, 0.0
            ]), gl.STATIC_DRAW);

            fetch(href).then(r => { return r.json() })
            .then(mesh => { 
                this._process_image_tile(mesh, gl)
                // this.msgbus.publish('data', 'tile.loaded.triangles')
            })
            .catch(err => { console.error(err) }) }

        f()
        // q.add(f)

        // let image = new Image()
        // let now = performance.now()
        // image.crossOrigin = ""
        // image.src = 'https://geodata.nationaalgeoregister.nl/tiles/service/tms/1.0.0/brtachtergrondkaart/EPSG:28992/0/0/0.png'
        // image.addEventListener('load', () => {
        //     this.texture = gl.createTexture();
        //     gl.bindTexture(gl.TEXTURE_2D, this.texture);         
        //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        //     console.log(performance.now() - now)
        //     if (isPowerOf2(image.width) && isPowerOf2(image.height)) 
        //     {
        //         gl.generateMipmap(gl.TEXTURE_2D);
        //     }
        //     else
        //     {
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //     }
        // })
    /*
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    var now = performance.now();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
*/
        // let scope = this;
        // let client = new XMLHttpRequest();
        // client.open('GET', this.url, true);
        // "text", "", "arraybuffer", "json" -- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
        // client.responseType = "text";  
        // client.onreadystatechange = function()
        // {
        //     if (client.readyState === XMLHttpRequest.DONE && client.status === 200)
        //     {
        //         console.log('loaded tile ' + scope.url)
        //         scope._process(client.response);
        //         // var buf = new ArrayBuffer(client.response.length);
        //         // buf = client.response;
        //         // // Here we do transfer the buffer in a way that does not involve
        //         // // copying the ArrayBuffer
        //         // // Note, we do assume that this works, but as it has been added
        //         // // to the spec later, this could not be implemented in a browser!
        //         // postMessage(buf, [buf]);
        //     }
        //     // we close the worker process
        //     // close();
        // }
        // client.send(null);
    }

    _process_image_tile(response, gl) {
        let result = []
        
        response.points.forEach(
            point => result.push(...point)
        )
        // could also be: response.points.flat(1); ???
        this._upload_image_tile_mesh(gl, new Float32Array(result))

        /* // using image object to retrieve the texture
        let image = new Image()
        image.crossOrigin = ""
        image.src = this.texture_root_href + response.texture_href
        image.addEventListener('load', 
            () => {
                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                if (isPowerOf2(image.width) && isPowerOf2(image.height)) 
                {
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                else
                {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                this.msgbus.publish('data.tile.loaded', 'tile.loaded.texture')
            }
        )
        */

        // using createImageBitmap and fetch to retrieve the texture
        fetch(this.texture_root_href + response.texture_href, {mode: 'cors'})
            .then((response) => {
                if (!response.ok) {
                    throw response;
                }
                
                return response.blob();
            })
            .then((blob) => {
                // Giving options does not work for Firefox (do we need to give all option fields?)
                return createImageBitmap(blob
                    // , 
                    // {
                    // premultiplyAlpha: 'none',
                    // colorSpaceConversion: 'none',
                    // }
                    );
            }).then((bitmap) => {
                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
                if (isPowerOf2(bitmap.width) && isPowerOf2(bitmap.height)) 
                {
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                else
                {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                this.msgbus.publish('data.tile.loaded', 'tile.loaded.texture')
            }).catch(function(e) {
                console.error(e);
            });
    }

    _upload_image_tile_mesh(gl, mesh) {
        this.buffer = gl.createBuffer();  //buffer is an object with a reference to the memory location on the GPU
        // bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        // upload content to the GPU
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
        // remember number of triangles for this buffer
        this.buffer.numItems = (mesh.length) / 3;
        // do not keep the floatarray object alive
        // now we have uploaded the triangles to the GPU
        // FIXME: is this needed?
        // this.buffer.buffer = null
    }

    destroy(gl) {
        // clear buffers / textures
        let buffers = [this.buffer, this.textureCoordBuffer, this.line_triangleVertexPosBufr,
                       this.displacementBuffer, this.polygon_triangleVertexPosBufr]
        buffers.forEach(
            buffer =>
            {
                if (buffer !== null)
                {
                    gl.deleteBuffer(buffer)
                    buffer = null
                }
            }
        )
        let textures = [this.texture]
        textures.forEach(
            texture => 
            {
                gl.deleteTexture(texture)
                texture = null
            }
        )

    }

}



export class Evictor {
    constructor(ssctree, gl)
    {
        this.ssctree = ssctree
        this.gl = gl
    }

    /*
    // Releasing resources by means of an evictor... 
    // the evict method implements a strategy to decide which resources to evict
    //
    // Aspects to consider:
    // - tile size
    // - when was it last used
    // - how far is it away from the center of the map
    // - is it currently displayed
    // - ... ?
    */
    evict(box3d)
    {
        let gl = this.gl
        let to_evict = []
        if (this.ssctree.tree === null) { return; }
        let dataelements = obtain_dataelements(this.ssctree.tree).filter(elem => { return elem.loaded })
        console.log('number of loaded tiles: ' + dataelements.length)
        dataelements.forEach(
            tile =>
            {
                // remove tiles that were rendered more than 3 seconds ago
                // and that are currently not on the screen
                if (tile.last_touched !== null && (tile.last_touched + 3000) < now() 
                    && !overlaps3d(box3d, tile.box))
                {
                    to_evict.push(tile)
                }
            }
        )
        console.log('number of tiles for which memory will be released: ' + to_evict.length)
        to_evict.forEach(tile => {
            tile.content.destroy(gl)
            tile.content = null
            tile.last_touched = null
            tile.loaded = false
        })
        // when we have removed tiles, let's clear the screen
        if (to_evict.length > 0 )
        {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        }
    }
}

export default SSCTree

