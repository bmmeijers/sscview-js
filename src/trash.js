

//class ImageTileProgram extends DrawProgram
//{
//    constructor(gl)
//    {
//        //console.log('here' + gl)
//        // this.gl = gl;

//        let vertexShaderText = `
//            precision highp float;

//            attribute vec3 vertexPosition_modelspace;         
//            attribute vec2 aTextureCoord;

//            uniform mat4 M;

//            varying highp vec2 vTextureCoord;

//            void main()
//            {
//              gl_Position = M * vec4(vertexPosition_modelspace, 1.0);
//              vTextureCoord = aTextureCoord;
//            }
//        `
//        let fragmentShaderText = `
//            precision highp float;

//            varying highp vec2 vTextureCoord;

//            uniform sampler2D uSampler;

//            void main()
//            {
//              gl_FragColor = texture2D(uSampler, vTextureCoord);
//            }
//        `

//        super(gl, vertexShaderText, fragmentShaderText)
//    }

//    draw_tilecontent(matrix, tilecontent, near)
//    {
//        let gl = this.gl;
//        gl.useProgram(this.shaderProgram);
//        // tilecontent.upload(gl);
//        if (tilecontent.buffer === null)
//        {
//            return;
//        }
//        gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent.buffer);
//        // FIXME: better to store with bucket how the layout of the mesh is?
//        const positionAttrib = gl.getAttribLocation(this.shaderProgram, 'vertexPosition_modelspace');
//        // gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
//        gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
//        gl.enableVertexAttribArray(positionAttrib);

//        {
//            let M = gl.getUniformLocation(this.shaderProgram, 'M');
//            gl.uniformMatrix4fv(M, false, matrix);
//        }

//        gl.bindBuffer(gl.ARRAY_BUFFER, tilecontent.textureCoordBuffer)
//        const textureAttrib = gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
//        gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
//        gl.enableVertexAttribArray(textureAttrib);

//        gl.activeTexture(gl.TEXTURE0);
//        gl.bindTexture(gl.TEXTURE_2D, tilecontent.texture);

//        const uSampler = gl.getUniformLocation(this.shaderProgram, 'uSampler');
//        gl.uniform1i(uSampler, 0);

//        // FIXME: do we need to call this every time, or is it sufficient to do at init of transform?
//        // {
//        //     let rect = el.getBoundingClientRect();
//        //     gl.viewport(0, 0, rect.width, rect.height);
//        // }
//        // gl.clearColor(1., 1., 1., 1.0);
//        // gl.clearDepth(1.0);
//        // gl.clear(gl.COLOR_BUFFER_BIT | gl.GL_DEPTH_BUFFER_BIT);
//        gl.disable(gl.BLEND);
//        gl.enable(gl.DEPTH_TEST);
//        gl.drawArrays(gl.TRIANGLES, 0, tilecontent.buffer.numItems);
//        //gl.drawArrays(gl.LINE_LOOP, 0, bucket.buffer.numItems);
//    }
//}


// class Bucket
// {
//     constructor(gl, mesh)
//     {

//         this.buffer = null;
//         this.gl = gl;

//         this.mesh = mesh;
//         this.uploaded = false;
//     }

//     upload()
//     {
//         if (this.uploaded === true || this.mesh === null)
//         {
//             return;
//         }
//         let gl = this.gl;
//         this.buffer = gl.createBuffer();
//         // bind buffer
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
//         gl.bufferData(gl.ARRAY_BUFFER, this.mesh, gl.STATIC_DRAW);
//         // remember size
//         // this.buffer.itemSize = 3;
//         this.buffer.numItems = (this.mesh.length) / 6;
//         this.mesh = null;
//     }

//     destroy()
//     {
//         let gl = this.gl;
//         gl.deleteBuffer(this.buffer);
//         this.buffer = null;
//     }
// }




// class LineDrawProgram extends DrawProgram {
//     constructor(gl) {

//         let vertexShaderText = `
//             // vertex shader
//             precision highp float;
//             //attribute float dx;
//             //attribute float dy;

//             attribute vec2 displacement;
//             attribute vec4 vertexPosition_modelspace;

//             //attribute vec3 vertexColor;

//             uniform mat4 M;
//             uniform float near;

//             //varying vec3 fragColor;
//             void main()
//             {
//             //    fragColor = vertexColor;
//                 vec4 pos = vertexPosition_modelspace;

//                 if (pos.z <= near && pos.w > near)
//                 {
//                 //  if (pos.x == 185950.0 && pos.y == 310570.0)
//                 //  {
//                 //    pos.z = -2.0;
//                 //  }
//                 //  pos.x += dx * edge_frac / 10000.0;
//                 //  pos.y += dy * edge_frac / 10000.0;
//                     vec4 vout = M * vec4(pos.xyz, 1.0);
//                     vout.x += displacement.x;
//                     vout.y += displacement.y;
//                 //    vout.x += dx;
//                 //    vout.y += dy;
//                     gl_Position = vout;
//                 } else {
//                     gl_Position = vec4(-10.0,-10.0,-10.0,1.0);
//                     return;
//                 }
//             }
//             `;
//         let fragmentShaderText = `
//             // fragment shader
//             precision mediump float;
//             varying vec3 fragColor;
//             void main()
//             {
//                 gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // color of the lines: black
//             }
//             `;

//         super(gl, vertexShaderText, fragmentShaderText)
//     }
// }





    //_process(response, gl) {
    //    let result = []
        
    //    response.points.forEach(
    //        point => result.push(...point)
    //    )
        
    //    this._upload(gl, new Float32Array(result))

    //    // fetch(response.texture)
    //    //     .then(r => { return r.blob() })
    //    //     .then(data => {
    //    //         console.log(data) 

    //    //         /*
    //    //         function showImage(responseAsBlob) {
    //    //             const container = document.getElementById('img-container');
    //    //             const imgElem = document.createElement('img');
    //    //             container.appendChild(imgElem);
    //    //             const imgUrl = URL.createObjectURL(responseAsBlob);
    //    //             imgElem.src = imgUrl;
    //    //           }
    //    //           */
                  
                
    //    //         const imgElem = document.createElement('img');

    //    //         const imgUrl = URL.createObjectURL(data)
    //    //         imgElem.src = imgUrl

    //    //         this.texture = gl.createTexture();
    //    //         gl.bindTexture(gl.TEXTURE_2D, this.texture);         
    //    //         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgElem);
    //    //         gl.generateMipmap(gl.TEXTURE_2D);
    //    //     })
    //    //     .catch(err => { console.error(err) })

    //    // console.log('Retrieve ' + response.texture)
    //    // fetch('/gpudemo/2019/03' 
    //    // this.msgbus.publish('data', 'tile.loaded')

    //    fetch(response.texture, {mode: 'cors'})
    //        .then((response) => {
    //            if (!response.ok) {
    //                throw response;
    //            }
                
    //            return response.blob();
    //        })
    //        .then((blob) => {
    //            // Giving options does not work for Firefox (do we need to give all option fields?)
    //            return createImageBitmap(blob
    //                // , 
    //                // {
    //                // premultiplyAlpha: 'none',
    //                // colorSpaceConversion: 'none',
    //                // }
    //                );
    //        }).then((bitmap) => {
                
    //            this.texture = gl.createTexture();
    //            gl.bindTexture(gl.TEXTURE_2D, this.texture);         
    //            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    //            if (isPowerOf2(bitmap.width) && isPowerOf2(bitmap.height)) 
    //            {
    //                gl.generateMipmap(gl.TEXTURE_2D);
    //            }
    //            else
    //            {
    //                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //            }
    //            this.msgbus.publish('data.tile.loaded', 'tile.loaded.texture')
    //        }).catch(function(e) {
    //            console.error(e);
    //        });

    //    // // fetch texture, based on url inside the tile
    //    // let image = new Image()
    //    // let now = performance.now()
    //    // image.crossOrigin = ""
    //    // image.src = response.texture
    //    // image.addEventListener('load', () => {
    //    //     this.texture = gl.createTexture();
    //    //     gl.bindTexture(gl.TEXTURE_2D, this.texture);         
    //    //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    //    //     console.log(performance.now() - now)
    //    //     if (isPowerOf2(image.width) && isPowerOf2(image.height)) 
    //    //     {
    //    //         gl.generateMipmap(gl.TEXTURE_2D);
    //    //     }
    //    //     else
    //    //     {
    //    //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //    //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //    //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //    //     }
    //    // })

    //    // let result = [];
    //    // const splitted = response.split('\n');
    //    // for (let i = 0, l = splitted.length; i < l; i++) {
    //    //     const line = splitted[i];
    //    //     line.split(",").forEach(element => {
    //    //         result.push(parseFloat(element));
    //    //     });
    //    // }
    //    // this._upload(gl, new Float32Array(result))
    //}

    //_upload(gl, mesh) {
    //    this.buffer = gl.createBuffer();  //buffer is a reference to the memory location on the GPU
    //    // bind buffer
    //    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    //    // upload content to the GPU
    //    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    //    // remember number of triangles for this buffer
    //    this.buffer.numItems = (mesh.length) / 3;
    //    // do not keep the floatarray object alive
    //    // now we have uploaded the triangles to the GPU
    //    // FIXME: is this needed?
    //    this.buffer.buffer = null
    //}

    //destroy(gl) {
    //    gl.deleteBuffer(this.buffer);
    //    gl.deleteBuffer(this.textureCoordBuffer);
    //    gl.deleteTexture(this.texture);

    //    this.buffer = null;
    //    this.textureCoordBuffer = null;
    //    this.texture = null;
    //}








    


//export class Evictor {
//    constructor(ssctree, gl) {
//        this.ssctree = ssctree
//        this.gl = gl
//    }

//    evict(box) {
//        console.log('evict called')
//        let gl = this.gl
//        let to_evict = []
//        if (this.ssctree.ssctree === null) { return; }
//        this.ssctree.ssctree.forEach(tile => {
//            // remove tiles that were rendered more than 3 seconds ago
//            // and that are currently not on the screen
//            if (tile.last_touched !== null && (tile.last_touched + 3000) < now() && !overlaps2d(box, tile.box)) {
//                to_evict.push(tile)
//            }
//        })
//        console.log(to_evict)
//        to_evict.forEach(tile => {
//            this.ssctree.retrieved[tile.url] = false
//            tile.content.destroy(gl)
//            tile.content = null
//            tile.last_touched = null
//        })
//        // when we have removed tiles, let's clear the screen
//        if (to_evict.length > 0) {
//            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
//        }
//    }

//}







//  // q.add(f)

//         // let image = new Image()
//         // let now = performance.now()
//         // image.crossOrigin = ""
//         // image.src = 'https://geodata.nationaalgeoregister.nl/tiles/service/tms/1.0.0/brtachtergrondkaart/EPSG:28992/0/0/0.png'
//         // image.addEventListener('load', () => {
//         //     this.texture = gl.createTexture();
//         //     gl.bindTexture(gl.TEXTURE_2D, this.texture);         
//         //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
//         //     console.log(performance.now() - now)
//         //     if (isPowerOf2(image.width) && isPowerOf2(image.height)) 
//         //     {
//         //         gl.generateMipmap(gl.TEXTURE_2D);
//         //     }
//         //     else
//         //     {
//         //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//         //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//         //         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//         //     }
//         // })

//         // setup texture as placeholder for texture to be retrieved later
//         this.texture = gl.createTexture();
//         gl.bindTexture(gl.TEXTURE_2D, this.texture);
//         // Because images have to be download over the internet
//         // they might take a moment until they are ready.
//         // Until then put a single pixel in the texture so we can
//         // use it immediately. When the image has finished downloading
//         // we'll update the texture with the contents of the image.
//         const level = 0;
//         const internalFormat = gl.RGBA;
//         const width = 1;
//         const height = 1;
//         const border = 0;
//         const srcFormat = gl.RGBA;
//         const srcType = gl.UNSIGNED_BYTE;
//         const pixel = new Uint8Array([255, 255, 255, 255]);  // opaque blue
//         gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
//             width, height, border, srcFormat, srcType,
//             pixel);

//         this.textureCoordBuffer = gl.createBuffer();
//         gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//             0.0, 0.0,
//             0.0, 1.0,
//             1.0, 1.0,
//             0.0, 0.0,
//             1.0, 1.0,
//             1.0, 0.0
//         ]), gl.STATIC_DRAW);

//         /*
//         this.texture = gl.createTexture();
//         gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
//         var now = performance.now();
//         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
//     */
//         // let scope = this;
//         // let client = new XMLHttpRequest();
//         // client.open('GET', this.url, true);
//         // "text", "", "arraybuffer", "json" -- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
//         // client.responseType = "text";  
//         // client.onreadystatechange = function()
//         // {
//         //     if (client.readyState === XMLHttpRequest.DONE && client.status === 200)
//         //     {
//         //         console.log('loaded tile ' + scope.url)
//         //         scope._process(client.response);
//         //         // var buf = new ArrayBuffer(client.response.length);
//         //         // buf = client.response;
//         //         // // Here we do transfer the buffer in a way that does not involve
//         //         // // copying the ArrayBuffer
//         //         // // Note, we do assume that this works, but as it has been added
//         //         // // to the spec later, this could not be implemented in a browser!
//         //         // postMessage(buf, [buf]);
//         //     }
//         //     // we close the worker process
//         //     // close();
//         // }
//         // client.send(null);