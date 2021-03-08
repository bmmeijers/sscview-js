// FIXME: UNIFY TileContent and ImageTileContent by branching inside load()-method
// on the file extension to be retrieved... (not super elegant)

// This makes TileContent quite big class -> split in subclasses?


let isPowerOf2 = ((value) => { return (value & (value - 1)) == 0 })

export class TileContent {
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
        //this.foreground_triangleVertexPosBufr = null;


    }

    load(url, gl) {
        if (url.endsWith('obj') || url.endsWith('obj?raw=true') == true) {
            this.load_ssc_tile(url, gl)
        }
        else if (url.endsWith('json') == true) {
            this.load_image_tile(url, gl)
        }
        //else if (url.endsWith('geojson') == true) {
        //    this.load_geojson_tile(url, gl)
        //}
        else {
            console.error('unknown url type: ' + url)
        }
    }

    load_ssc_tile(url, gl) {
        this.worker_helper.send( //send is a function of class WorkerHelper (see ssctree.js)
            url, //e.g. /gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj
            (data) => { //I call the function makeBuffers, this is a function used as a parameter
                //console.log('')
                //console.log('tilecontent.js load_ssc_tile, url:', url)
                // upload received data to GPU

                // buffer for triangles of polygons
                // itemSize = 6: x, y, z, r_frac, g_frac, b_frac (see parse.js)
                //console.log('tilecontent.js data[0]:', data[0])
                gl.bindFramebuffer(gl.FRAMEBUFFER, gl.fbo); //FIXME: could we remove this line?
                this.polygon_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[0]), 6)
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);  //FIXME: could we remove this line?
                //console.log('tilecontent.js load_ssc_tile, this.polygon_triangleVertexPosBufr:', this.polygon_triangleVertexPosBufr)
                //if (this.polygon_triangleVertexPosBufr == null) {
                //    console.log('tilecontent.js load_ssc_tile, url:', url)
                //    console.log('tilecontent.js load_ssc_tile, polygon_triangleVertexPosBufr:', polygon_triangleVertexPosBufr)
                //    console.log('tilecontent.js load_ssc_tile, data[0]:', data[0])
                //}
                //console.log('tiles.js url2:', url)


                // buffer for triangles of boundaries
                // itemSize = 4: x, y, z (step_low), w (step_high); e.g., start (see parse.js)
                this.line_triangleVertexPosBufr = create_data_buffer(gl, new Float32Array(data[1]), 4)

                // buffer for displacements of boundaries
                // itemSize = 2: x and y; e.g., startl (see parse.js)
                this.displacementBuffer = create_data_buffer(gl, new Float32Array(data[2]), 2)

                //var foreground_data_array = new Float32Array([
                //    186500, 312600, 0, 1, 0, 0, 0.5,
                //    186700, 311800, 0, 0, 0, 1, 0.5,
                //    186200, 311800, 0, 0, 1, 0, 0.5]) //clockwise
                //this.foreground_triangleVertexPosBufr = create_data_buffer(gl, foreground_data_array, 7)


                // notify we are ready
                this.msgbus.publish('data.tile.loaded', 'tile.ready')

                function create_data_buffer(gl, data_array, itemSize) {
                    let data_buffer = gl.createBuffer();
                    //Unfortunately, the data that is buffered must be with type Float32Array (not Float64Array)
                    gl.bindBuffer(gl.ARRAY_BUFFER, data_buffer); 
                    gl.bufferData(gl.ARRAY_BUFFER, data_array, gl.STATIC_DRAW);
                    data_buffer.itemSize = itemSize; //x, y, z, r_frac, g_frac, b_frac
                    //console.log('tiles.js data_array.length:', data_array.length)
                    data_buffer.numItems = data_array.length / itemSize;
                    return data_buffer;
                }

            }
        )
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
            const pixel = new Uint8Array([255, 255, 255, 0]);  // white
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
                .catch(err => { console.error(err) })
        }

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

        // the json retrieved in response will contain: 
        // {"box": [216931.52, 573100.48, 223812.8, 579981.76],
        //  "texture_href": "7/73/80.png",
        //  "points": [[216931.52, 579981.76, 0], [216931.52, 573100.48, 0], [223812.8, 573100.48, 0], [216931.52, 579981.76, 0], [223812.8, 573100.48, 0], [223812.8, 579981.76, 0]]}   
        let result = []

        response.points.forEach(
            point => result.push(...point)
        )
        // could also be: response.points.flat(1); ???
        this._upload_image_tile_mesh(gl, new Float32Array(result))
        /*
        // using image object to retrieve the texture
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
                    console.log('mipmapping')
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
        /*
        					type: "wmts",
					options: {
						url: 'https://geodata.nationaalgeoregister.nl/tiles/service/wmts?',
						layer: 'brtachtergrondkaart',
						style: 'default',
						tileMatrixSet: "EPSG:28992",
						service: "WMTS",
						request: "GetTile",
						version: "1.0.0",
						format: "image/png"
					}
        */
        
        // using createImageBitmap and fetch to retrieve the texture

        let parts = response.texture_href.split('.'); //  7/73/80.png
        let address = parts[0].split('/');
        let z = +address[0];
        let along_dim = Math.pow(2, z);
        let row = +address[1];
        let col = +address[2];
        let url = "https://geodata.nationaalgeoregister.nl/tiles/service/wmts?&layer=brtachtergrondkaart&style=default&tileMatrixSet=EPSG:28992&service=WMTS&request=GetTile&version=1.0.0&format=image/png"
        url += "&TileCol="+row+"&TileRow="+(along_dim-col)+"&tileMatrix="+z;
        fetch(url, { mode: 'cors' })
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
                if (isPowerOf2(bitmap.width) && isPowerOf2(bitmap.height)) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
                else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                this.msgbus.publish('data.tile.loaded', 'tile.loaded.texture')
            }).catch(function (e) {
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
            buffer => {
                if (buffer !== null) {
                    gl.deleteBuffer(buffer)
                    buffer = null
                }
            }
        )
        let textures = [this.texture]
        textures.forEach(
            texture => {
                gl.deleteTexture(texture)
                texture = null
            }
        )

    }

}
