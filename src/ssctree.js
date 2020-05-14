import { now } from "./animate"
import { TileContent } from "./tilecontent"
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
// [x] Use logicalProcessors = window.navigator.hardwareConcurrency for creating the WorkerHelper Pool
// [ ] Make retrieval more resilient against non-working server (e.g. ask again for tile content), 
//     while not overloading the server(queueing requests / abortcontroller.signal)
// [ ] It should be possible to cancel unneeded requests that have not yet been retrieved (e.g. after user has zoomed)





export class SSCTree {
    constructor(msgbus, dataset) {
        this.msgbus = msgbus
        this.tree = null
        this.dataset = dataset
        this.step_highs = null
        // FIXME: as the pool of workers is owned by the ssctree, adding a new SSCTree makes again (many) more workers
        // There should be just 1 pool of workers, e.g. in the map object, that is used by all
        // SSCTrees for data retrieval -> also images should be retrieved by a
        // worker for example

        // pool of workers
        let pool_size = window.navigator.hardwareConcurrency || 2;
        this.worker_helpers = []
        for (let i = 0; i< pool_size+1; i++) {
            this.worker_helpers.push(new WorkerHelper())
        }
        console.log(pool_size + ' workers made')
        this.helper_idx_current = -1

        // FIXME: theses should be put in settings *per* SSCTree ?
        this.bln_glfront = false  //by default, draw the front faces
        this.bln_depth_test = true //by default, do depth test
        this.bln_blend = false
        this.opacity = 1 //by default, opaque (not transparent)

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
        //console.log('fetching root' + this.dataset.tree_root_href + this.dataset.tree_root_file_nm)

        //e.g., this.dataset.tree_root_href: '/data/'
        //e.g., this.dataset.tree_root_file_nm: 'tree.json'
        //e.g., this.dataset.eventdiff_nm: 'eventdiff.json'
        var step_highs = null
        var if_snap = false
        var eventdiff_nm = 'eventdiff_nm'
        if (eventdiff_nm in this.dataset) {
            if_snap = true
            fetch(this.dataset.tree_root_href + this.dataset[eventdiff_nm])
                .then(r => {
                    step_highs = [0] //if the file exists, we will do parallel merging
                    return r.json()
                })
                .then(step_eventdiff_dt => {
                    var current_face_num = step_eventdiff_dt.face_num
                    var parallel_param = step_eventdiff_dt.parallel_param
                    var step_diff_ltlt = step_eventdiff_dt.step_eventdiff
                    var diff_index = 0
                    var step = 1
                    while (current_face_num > 1) {
                        var max_parallel = Math.ceil(current_face_num * parallel_param)
                        var event_diff = 0
                        if (diff_index < step_diff_ltlt.length && step_diff_ltlt[diff_index][0] == step) {
                            event_diff = step_diff_ltlt[diff_index][1]
                            diff_index += 1
                        }
                        var eventnum = max_parallel - event_diff
                        step_highs.push(step_highs[step_highs.length - 1] + eventnum)

                        step += 1
                        current_face_num -= eventnum
                    } 

                    //console.log('ssctree.js step_diff_ltlt.length:', step_diff_ltlt.length)
                })
                .then(() => {
                    this.step_highs = step_highs
                    //this.msgbus.publish('data.step_highs.loaded')
                    console.log('ssctree.js step_highs:', step_highs)
                })
                .catch(() => {
                    this.step_highs = null
                })
        }

        fetch(this.dataset.tree_root_href + this.dataset.tree_root_file_nm)
            .then(r => {
                return r.json()
            })
            .then(tree => {  //tree: the content in the json file
                this.tree = tree
                //let box3d = tree.box;
                //tree.center2d = [(box3d[0] + box3d[3]) / 2, (box3d[1] + box3d[4]) / 2]
                let dataelements = obtain_dataelements(this.tree)  //dataelements recorded in .json file
                dataelements.forEach(element => { //originally, each element has attributes "id", "box", "info"
                    element.content = null
                    element.last_touched = null
                    element.url = this.dataset.tile_root_href + element.href  //e.g., element.href: node02145.obj
                    console.log('ssctree.js element.href:', element.href)
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

        return if_snap
    }

    // FIXME: a tree can load other trees, however, the property .uri has been renamed in other parts of the code
    // when we have made new tree serialization for tiles, we should change the code here!
    load_subtree(node) {
        fetch(this.dataset.tree_root_href + node.uri) // FIXME: was: node.href
            .then(r => {
                return r.json()
            })
            .then(j => {

                node.children = j.children;
                let dataelements = obtain_dataelements(node)  //dataelements recorded in .json file
                dataelements.forEach(element => { //originally, each element has attributes "id", "box", "info"
                    element.content = null
                    element.last_touched = null
                    //e.g., element.info: 10/502/479.json
                    element.url = this.dataset.tile_root_href + element.info // FIXME:  was: element.href
                    //console.log('ssctree.js element.info:', element.info)
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
        //console.log('ssctree.js fetch_tiles, this.dataset.tree_root_file_nm 1:', this.dataset.tree_root_file_nm)
        //console.log('')
        //console.log('ssctree.js fetch_tiles, this.tree:', this.tree)
        //console.log('ssctree.js fetch_tiles, box3d:', box3d)
        //e.g., this.tree: the content in file tree_smooth.json
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


        //this.dataset
        //console.log('ssctree.js fetch_tiles, this.dataset.tree_root_file_nm:', this.dataset.tree_root_file_nm)
        //console.log('ssctree.js fetch_tiles, to_retrieve:', to_retrieve)

        // schedule tiles for retrieval
        to_retrieve.map(elem => {
            this.helper_idx_current = (this.helper_idx_current + 1) % this.worker_helpers.length
            let content = new TileContent(
                this.msgbus,
                this.dataset.texture_root_href,
                this.worker_helpers[this.helper_idx_current]
            )
            content.load(elem.url, gl) //e.g., elem.url = /gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj
            //console.log('ssctree.js fetch_tiles, this.helper_idx_current:', this.helper_idx_current)
            //console.log('ssctree.js fetch_tiles, content.polygon_triangleVertexPosBufr:', content.polygon_triangleVertexPosBufr)
            
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

    get_step_from_St(St, if_snap = false, zoom_factor = 1, current_step = Number.MAX_SAFE_INTEGER) {
        
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
        //console.log('')

        // reduction in percentage
        let reductionf = 1 - Math.pow(this.tree.metadata.start_scale_Sb / St, 2)
        console.log('ssctree.js reductionf:', reductionf)
        let step = this.tree.metadata.no_of_objects_Nb * reductionf //step is not necessarily an integer
        let snapped_step = step
        let step_highs = this.step_highs
        if (if_snap == true
            && step_highs != null
            && step > step_highs[0] - 0.001
            && step < step_highs[step_highs.length - 1] + 0.001 //without this line, the map will stop zooming out when at the last step
        ) {
            //console.log('ssctree.js step_highs:', step_highs)
            //console.log('ssctree.js step:', step)
            

            let current_step_index = snap_to_existing_stephigh(current_step, step_highs)
            if (Math.abs(current_step - step_highs[current_step_index]) < 0.001) {
                current_step = step_highs[current_step_index]
            }


            //if we scroll too little, the map doesn't zoom because of the snapping.
            //we force snapping for at least one step. 
            //let snapped_St = this.get_St_from_step(step_highs[step_index])
            //console.log('ssctree.js normal_step_diff:', normal_step_diff)
            //console.log('ssctree.js current_step:', current_step)
            //console.log('ssctree.js step_highs[step_index]:', step_highs[step_index])
            let snapped_index = snap_to_existing_stephigh(step, step_highs)
            snapped_step = step_highs[snapped_index]



            if (current_step != Number.MAX_SAFE_INTEGER) {
                if (zoom_factor < 1 //zoom out
                    && snapped_step <= current_step) { //wrong direction because of snapping
                    snapped_index += 1
                }
                else if (zoom_factor > 1 //zoom in
                    && snapped_step >= current_step) { //wrong direction because of snapping
                    snapped_index -= 1
                }
            }
            else {
                //do nothing
            }

            snapped_step = step_highs[snapped_index]

            //console.log('ssctree.js new step:', step)

            //console.log('ssctree.js snapped_step:', snapped_step)
        }

        
        console.log('ssctree.js new step:', step)
        console.log('ssctree.js snapped_step:', snapped_step)

        //return Math.max(0, step)
        return snapped_step
    }

    get_time_factor(St, if_snap = false, zoom_factor = 1, current_step = Number.MAX_SAFE_INTEGER) {

        if (this.tree === null || if_snap == false) {
            return 1
        }

        // reduction in percentage
        let reductionf = 1 - Math.pow(this.tree.metadata.start_scale_Sb / St, 2)
        let step = this.tree.metadata.no_of_objects_Nb * reductionf //step is not necessarily an integer
        let snapped_step = step
        let step_highs = this.step_highs
        let time_factor = 1
        if (if_snap == true
            && step_highs != null
            && step > step_highs[0] - 0.001
            && step < step_highs[step_highs.length - 1] + 0.001 //without this line, the map will stop zooming out when at the last step
        ) {
            //console.log('ssctree.js --------------------------------------')
            //console.log('ssctree.js step_highs:', step_highs)
            //console.log('ssctree.js current_step:', current_step)
            let current_step_index = snap_to_existing_stephigh(current_step, step_highs)
            if (Math.abs(current_step - step_highs[current_step_index]) < 0.001) {
                current_step = step_highs[current_step_index]
            }



            //console.log('ssctree.js current_step_index:', current_step_index)

            //console.log('ssctree.js step:', step)
            //console.log('ssctree.js step_highs[current_step_index]:', step_highs[current_step_index])
            let normal_step_diff = Math.abs(step - current_step)

            let snapped_index = snap_to_existing_stephigh(step, step_highs)


            //if we scroll too little, the map doesn't zoom because of the snapping.
            //we force snapping for at least one step. 

            //let snapped_St = this.get_St_from_step(step_highs[step_index])
            //console.log('ssctree.js normal_step_diff:', normal_step_diff)
            //console.log('ssctree.js snapped_index:', snapped_index)
            //console.log('ssctree.js step_highs[snapped_index]:', step_highs[snapped_index])
            //console.log('ssctree.js zoom_factor:', zoom_factor)
            //if (current_step == step_highs[snapped_index] && current_step != Number.MAX_SAFE_INTEGER) {
            //    if (zoom_factor > 1) { //zooming in 
            //        snapped_index -= 1
            //    }
            //    else if (zoom_factor < 1) { //zooming out
            //        snapped_index += 1
            //    }
            //}

            snapped_step = step_highs[snapped_index]
            if (current_step != Number.MAX_SAFE_INTEGER) {
                if (//current_step < step //zoom out
                    zoom_factor < 1
                    && snapped_step <= current_step) { //wrong direction or no zooming because of snapping
                    snapped_index += 1
                }
                else if (//current_step > step //zoom in
                    zoom_factor > 1
                    && snapped_step >= current_step) { //wrong direction because of snapping
                    snapped_index -= 1
                }
            }
            snapped_step = step_highs[snapped_index]
            //console.log('ssctree.js snapped_step:', snapped_step)

            let adjusted_step_diff = Math.abs(snapped_step - current_step)

            if (current_step != Number.MAX_SAFE_INTEGER) {
                time_factor = adjusted_step_diff / normal_step_diff
            }

            //console.log('ssctree.js adjusted_step_diff:', adjusted_step_diff)
            //console.log('ssctree.js normal_step_diff:', normal_step_diff)
            //console.log('ssctree.js time_factor:', time_factor)

            //console.log('ssctree.js snapped_step:', step)
        }

        //return Math.max(0, step)
        return time_factor
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
        if (step_highs[mid] == step) return mid;

        // Else look in left or right half accordingly 
        else if (step_highs[mid] < step)
            start = mid + 1;
        else
            end = mid - 1;
    }

    //console.log('ssctree.js start and end:', start, end)
    //console.log('step_highs[start], step, step_highs[end]:', step_highs[start], step, step_highs[end])
    //console.log('step_highs[start] - step, step - step_highs[end]:', step_highs[start] - step, step - step_highs[end])
    if (step_highs[start] - step <= step - step_highs[end]) { //start is already larger than end by 1
        return Math.min(start, step_highs.length - 1) //start will be larger than the last value of step_highs[0] if step is larger than all the values of step_highs    
    }
    else {
        return Math.max(end, 0) //end will be negtive if step is smaller than step_highs[0]
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
                else if (child.hasOwnProperty('uri') && !child.hasOwnProperty('loaded')
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
    // e.g., one: [182000, 308000, 0, 191000, 317000, 7]
    // e.g., other: [185210.15625, 311220.96875, 0, 187789.84375, 313678.9375, 0]

    const dims = 3
    let are_overlapping = true;
    for (let min = 0; min < dims; min++) {
        let max = min + dims
        if ((one[max] < other[min]) || (one[min] > other[max])) {
            are_overlapping = false
            break
        }
    }
    //console.log('ssctree.js are_overlapping:', are_overlapping)
    return are_overlapping
}

function center2d(box3d) {
    // 2D center of bottom of box
    let xmin = box3d[0]
    let ymin = box3d[1]
    let xmax = box3d[3]
    let ymax = box3d[4]
    return [xmin + 0.5 * (xmax - xmin),
    ymin + 0.5 * (ymax - ymin)]
}

function distance2d(target, against) {
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
        this.worker.onmessage = (evt) => { this.receive(evt) } //evt: {id: id, msg: arrays}, arrays; see worker.js
    }

    send(url, callback) //e.g., callback: the function of makeBuffers
    {
        // use a random id
        const id = Math.round((Math.random() * 1e18)).toString(36).substring(0, 10)
        this.tasks[id] = callback
        this.worker.postMessage({ id: id, msg: url }) //parse the data of the obj file specified by the url
    }

    receive(evt) {
        const id = evt.data.id;
        const msg = evt.data.msg // e.g., arrays = parse_obj(data_text)
        this.tasks[id](msg) // execute the callback that was registered while sending
        delete this.tasks[id]
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
        // when we have removed tiles, let's clear the screen (both color and depth buffer)
        if (to_evict.length > 0 )
        {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        }
    }
}

export default SSCTree

