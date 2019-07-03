import { now } from "./animate"

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


export function overlaps3d(one, other) {
    // Separating axes theorem, nD
    const dims = 3
    let are_overlapping = true;
    for (let min = 0; min < dims; min++)
    {
        let max = min + dims
        if ((one[max] < other[min]) || (one[min] > other[max]))
        {
            are_overlapping = false
            break
        }
    }
    return are_overlapping
}


let isPowerOf2 = ((value) => {return (value & (value - 1)) == 0})

// class Queue
// {
//     constructor()
//     {
//         // 
//     }

//     add()
//     {

//     }
// }

// let q = new Queue();

class TileContent {
    constructor(msgbus) {
        this.msgbus = msgbus
        this.buffer = null;
        this.texture = null;
        this.textureCoordBuffer = null;
    }

    load(url, gl) {
        let f = () => { fetch(url).then(r => { return r.json() })
            .then(mesh => { 
                this._process(mesh, gl)
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
    /*
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    var now = performance.now();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
*/
        // let scope = this;
        // let client = new XMLHttpRequest();
        // client.open('GET', this.url, true);
        // client.responseType = "text";  // "text", "", "arraybuffer", "json" -- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
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

    // let process_mesh = (data) => 
    // {
    //     return data.split('\n').map(
    //         line => 
    //         {
    //             return line.split(',').map(
    //                 elem => {return parseFloat(elem)}
    //             )
    //         }
    //     )
    // }

    _process(response, gl) {
        let result = []
        
        response.points.forEach(
            point => result.push(...point)
        )
        
        this._upload(gl, new Float32Array(result))

        // fetch(response.texture)
        //     .then(r => { return r.blob() })
        //     .then(data => {
        //         console.log(data) 

        //         /*
        //         function showImage(responseAsBlob) {
        //             const container = document.getElementById('img-container');
        //             const imgElem = document.createElement('img');
        //             container.appendChild(imgElem);
        //             const imgUrl = URL.createObjectURL(responseAsBlob);
        //             imgElem.src = imgUrl;
        //           }
        //           */
                  
                
        //         const imgElem = document.createElement('img');

        //         const imgUrl = URL.createObjectURL(data)
        //         imgElem.src = imgUrl

        //         this.texture = gl.createTexture();
        //         gl.bindTexture(gl.TEXTURE_2D, this.texture);         
        //         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgElem);
        //         gl.generateMipmap(gl.TEXTURE_2D);
        //     })
        //     .catch(err => { console.error(err) })

        // console.log('Retrieve ' + response.texture)
        // fetch('/gpudemo/2019/03' 
        // this.msgbus.publish('data', 'tile.loaded')

        fetch(response.texture, {mode: 'cors'})
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

        // // fetch texture, based on url inside the tile
        // let image = new Image()
        // let now = performance.now()
        // image.crossOrigin = ""
        // image.src = response.texture
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

        // let result = [];
        // const splitted = response.split('\n');
        // for (let i = 0, l = splitted.length; i < l; i++) {
        //     const line = splitted[i];
        //     line.split(",").forEach(element => {
        //         result.push(parseFloat(element));
        //     });
        // }
        // this._upload(gl, new Float32Array(result))
    }

    _upload(gl, mesh) {
        this.buffer = gl.createBuffer();  //buffer is a reference to the memory location on the GPU
        // bind buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        // upload content to the GPU
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
        // remember number of triangles for this buffer
        this.buffer.numItems = (mesh.length) / 3;
        // do not keep the floatarray object alive
        // now we have uploaded the triangles to the GPU
        // FIXME: is this needed?
        this.buffer.buffer = null
    }

    destroy(gl) {
        gl.deleteBuffer(this.buffer);
        gl.deleteBuffer(this.textureCoordBuffer);
        gl.deleteTexture(this.texture);

        this.buffer = null;
        this.textureCoordBuffer = null;
        this.texture = null;
    }
}


function visit(node, box)
{
    // console.log(box)
    let result = []
    let stack = [node]
    while (stack.length > 0)
    {
        let node = stack.pop()

        // visit chids, if they overlap
        node.children.forEach(child => {
            if (overlaps3d(node.box, box))
            {
                stack.push(child)
            }
        });

        // add data elements to result list, if box overlaps
        node.dataelements.forEach(element => {
            if (overlaps3d(element.box, box))
            {
                result.push(element)
            }
        });
    }
    return result
}


function visit_dataelements(root)
{
    // FIXME: make iterator/generator function* 
    // to avoid making the whole result list
    let result = []
    let stack = [root]
    while (stack.length > 0)
    {
        const node = stack.pop()

        // visit chids, if they overlap
        node.children.forEach(child => {
            stack.push(child)
        });

        // add data elements to result list, if box overlaps
        node.dataelements.forEach(element => {
            result.push(element)
        });
    }
    return result
}


export class SSCTree {
    constructor(msgbus) {
        this.msgbus = msgbus
        this.tree = null
        this.retrieved = {}
    }

    load() {
        //
        // FIXME: convert to worker that does this
        //
        let folder_name = 'de'
        fetch(folder_name + '/tree_buchholz.json')
            .then((r) => { 
                return r.json() 
            })
            .then((tree) => { 
                this.tree = tree; 
                let dataelements = visit_dataelements(this.tree)
                dataelements.forEach((tile) => {
                    tile.content = null
                    tile.last_touched = null
                    tile.url = folder_name + "/" + tile.info + ".json"
                    // console.log(tile.info)
                })
            })
            .then(
                () => {
                    this.msgbus.publish('data.tree.loaded', 'tree.ready')
                } // FIXME: Notify via PubSub that tree has loaded (should re-render map if not rendering)

            )
            .catch(err => { 
                console.error(err) 
            })
    }

    getTiles(box, gl) {
        if (this.tree === null) { return }

        let tiles = visit(this.tree, box)
        // FIXME: sort the tiles via the distance from center of the box?
        tiles
            .map(elem => {
                if (!this.retrieved[elem.url] && elem.content === null) {
                    // console.log("fetch: " + elem.url)

                    let content = new TileContent(this.msgbus)
                    content.load(elem.url, gl)
                    elem.content = content
                    this.retrieved[elem.url] = true // FIXME: is this really 'retrieved' ? Or more, scheduled for loading ?
                }
            })
    }

    getActiveTiles(box) {
        if (this.tree === null) { return [] }

        let tiles = visit(this.tree, box)
        // console.log(tiles.length)
        return tiles
            .filter(elem => { // those tiles that are loaded and overlap the screen
                return elem.content !== null && overlaps3d(box, elem.box)
            })
            .map(elem => { // set for each tile to be rendered the last accessed time
                elem.last_touched = now(); 
                // console.log(elem.info)
                return elem
            })
    }

}

// export class TileSet {
//     constructor() {
//         this.tileset = null;
//         this.retrieved = {}
//     }

//     load() {
//         fetch('nl/7_tiles.json')
//             .then((r) => { return r.json() })
//             .then((tileset) => { 
//                 this.tileset = tileset; 
//                 this.tileset.forEach(tile =>
//                     {
//                         tile.content = null
//                         tile.last_touched = null
//                     })
//             })
//             .catch(err => { console.error(err) })
//     }

//     getTiles(box, gl) {
//         if (this.tileset === null) { return }

//         this.tileset.filter(elem => {
//             return overlaps2d(box, elem.box)
//         }).map(elem => {
//             if (!this.retrieved[elem.url] && elem.content === null) {
//                 let content = new TileContent()
//                 content.load(elem.url, gl)
//                 elem.content = content;
//                 this.retrieved[elem.url] = true;
//             }
//         })
//     }

//     getActiveTiles(box) {
//         if (this.tileset === null) { return [] }

//         return this.tileset
//             .filter(elem => { // those tiles that are loaded and overlap the screen
//                 return elem.content !== null && overlaps2d(box, elem.box)
//             })
//             .map(elem => { // set for each tile to be rendered the last accessed time
//                 elem.last_touched = now(); return elem})
//     }
// }

export class Evictor
{
    constructor(tileset, gl)
    {
        this.tileset = tileset
        this.gl = gl
    }

    evict(box)
    {
        console.log('evict called')
        let gl = this.gl
        let to_evict = []
        if (this.tileset.tileset === null) { return; }
        this.tileset.tileset.forEach(tile =>
        {
            // remove tiles that were rendered more than 3 seconds ago
            // and that are currently not on the screen
            if (tile.last_touched !== null && (tile.last_touched + 3000) < now() && !overlaps2d(box, tile.box))
            {
                to_evict.push(tile)
            }
        })
        console.log(to_evict)
        to_evict.forEach(tile => {
            this.tileset.retrieved[tile.url] = false
            tile.content.destroy(gl)
            tile.content = null
            tile.last_touched = null
        })
        // when we have removed tiles, let's clear the screen
        if (to_evict.length > 0 )
        {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        }
    }

}

export default SSCTree

