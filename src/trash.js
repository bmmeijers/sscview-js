

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





    // onContentReady(obj)
    // {
    //     this.addBucket(obj.data)
    //     // schedule re-render!
    //     // FIXME: this should only happen when not already rendering /animating the map...
    //     // should the map keep state of {animating|still} ???
    //     // this.map.abortAndRender()
    // }



///**
// * Rotates a mat4 by the given angle around the given axis
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the matrix to rotate
// * @param {Number} rad the angle to rotate the matrix by
// * @param {vec3} axis the axis to rotate around
// * @returns {mat4} out
// */
//export function rotate(out, a, rad, axis) {
//    var x = axis[0], y = axis[1], z = axis[2],
//        len = Math.sqrt(x * x + y * y + z * z),
//        s, c, t,
//        a00, a01, a02, a03,
//        a10, a11, a12, a13,
//        a20, a21, a22, a23,
//        b00, b01, b02,
//        b10, b11, b12,
//        b20, b21, b22;

//    if (len === 0) return null;

//    len = 1 / len;
//    x *= len;
//    y *= len;
//    z *= len;

//    s = Math.sin(rad);
//    c = Math.cos(rad);
//    t = 1 - c;

//    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
//    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
//    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

//    // Construct the elements of the rotation matrix
//    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
//    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
//    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

//    // Perform rotation-specific matrix multiplication
//    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
//    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
//    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
//    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
//    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
//    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
//    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
//    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
//    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
//    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
//    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
//    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

//    if (a !== out) { // If the source and destination differ, copy the unchanged last row
//        out[12] = a[12];
//        out[13] = a[13];
//        out[14] = a[14];
//        out[15] = a[15];
//    }
//    return out;
//}

///**
// * Rotates a matrix by the given angle around the X axis
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the matrix to rotate
// * @param {Number} rad the angle to rotate the matrix by
// * @returns {mat4} out
// */
//export function rotateX(out, a, rad) {
//    var s = Math.sin(rad),
//        c = Math.cos(rad),
//        a10 = a[4],
//        a11 = a[5],
//        a12 = a[6],
//        a13 = a[7],
//        a20 = a[8],
//        a21 = a[9],
//        a22 = a[10],
//        a23 = a[11];

//    if (a !== out) { // If the source and destination differ, copy the unchanged rows
//        out[0]  = a[0];
//        out[1]  = a[1];
//        out[2]  = a[2];
//        out[3]  = a[3];
//        out[12] = a[12];
//        out[13] = a[13];
//        out[14] = a[14];
//        out[15] = a[15];
//    }

//    // Perform axis-specific matrix multiplication
//    out[4] = a10 * c + a20 * s;
//    out[5] = a11 * c + a21 * s;
//    out[6] = a12 * c + a22 * s;
//    out[7] = a13 * c + a23 * s;
//    out[8] = a20 * c - a10 * s;
//    out[9] = a21 * c - a11 * s;
//    out[10] = a22 * c - a12 * s;
//    out[11] = a23 * c - a13 * s;
//    return out;
//}

///**
// * Rotates a matrix by the given angle around the Y axis
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the matrix to rotate
// * @param {Number} rad the angle to rotate the matrix by
// * @returns {mat4} out
// */
//export function rotateY(out, a, rad) {
//    var s = Math.sin(rad),
//        c = Math.cos(rad),
//        a00 = a[0],
//        a01 = a[1],
//        a02 = a[2],
//        a03 = a[3],
//        a20 = a[8],
//        a21 = a[9],
//        a22 = a[10],
//        a23 = a[11];

//    if (a !== out) { // If the source and destination differ, copy the unchanged rows
//        out[4]  = a[4];
//        out[5]  = a[5];
//        out[6]  = a[6];
//        out[7]  = a[7];
//        out[12] = a[12];
//        out[13] = a[13];
//        out[14] = a[14];
//        out[15] = a[15];
//    }

//    // Perform axis-specific matrix multiplication
//    out[0] = a00 * c - a20 * s;
//    out[1] = a01 * c - a21 * s;
//    out[2] = a02 * c - a22 * s;
//    out[3] = a03 * c - a23 * s;
//    out[8] = a00 * s + a20 * c;
//    out[9] = a01 * s + a21 * c;
//    out[10] = a02 * s + a22 * c;
//    out[11] = a03 * s + a23 * c;
//    return out;
//}

///**
// * Rotates a matrix by the given angle around the Z axis
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the matrix to rotate
// * @param {Number} rad the angle to rotate the matrix by
// * @returns {mat4} out
// */
//export function rotateZ(out, a, rad) {
//    var s = Math.sin(rad),
//        c = Math.cos(rad),
//        a00 = a[0],
//        a01 = a[1],
//        a02 = a[2],
//        a03 = a[3],
//        a10 = a[4],
//        a11 = a[5],
//        a12 = a[6],
//        a13 = a[7];

//    if (a !== out) { // If the source and destination differ, copy the unchanged last row
//        out[8]  = a[8];
//        out[9]  = a[9];
//        out[10] = a[10];
//        out[11] = a[11];
//        out[12] = a[12];
//        out[13] = a[13];
//        out[14] = a[14];
//        out[15] = a[15];
//    }

//    // Perform axis-specific matrix multiplication
//    out[0] = a00 * c + a10 * s;
//    out[1] = a01 * c + a11 * s;
//    out[2] = a02 * c + a12 * s;
//    out[3] = a03 * c + a13 * s;
//    out[4] = a10 * c - a00 * s;
//    out[5] = a11 * c - a01 * s;
//    out[6] = a12 * c - a02 * s;
//    out[7] = a13 * c - a03 * s;
//    return out;
//}

///**
// * Creates a matrix from a vector translation
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.translate(dest, dest, vec);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {vec3} v Translation vector
// * @returns {mat4} out
// */
//export function fromTranslation(out, v) {
//    out[0] = 1;
//    out[1] = 0;
//    out[2] = 0;
//    out[3] = 0;
//    out[4] = 0;
//    out[5] = 1;
//    out[6] = 0;
//    out[7] = 0;
//    out[8] = 0;
//    out[9] = 0;
//    out[10] = 1;
//    out[11] = 0;
//    out[12] = v[0];
//    out[13] = v[1];
//    out[14] = v[2];
//    out[15] = 1;
//    return out;
//}

///**
// * Creates a matrix from a vector scaling
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.scale(dest, dest, vec);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {vec3} v Scaling vector
// * @returns {mat4} out
// */
//export function fromScaling(out, v) {
//    out[0] = v[0];
//    out[1] = 0;
//    out[2] = 0;
//    out[3] = 0;
//    out[4] = 0;
//    out[5] = v[1];
//    out[6] = 0;
//    out[7] = 0;
//    out[8] = 0;
//    out[9] = 0;
//    out[10] = v[2];
//    out[11] = 0;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = 0;
//    out[15] = 1;
//    return out;
//}

///**
// * Creates a matrix from a given angle around a given axis
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.rotate(dest, dest, rad, axis);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {Number} rad the angle to rotate the matrix by
// * @param {vec3} axis the axis to rotate around
// * @returns {mat4} out
// */
//export function fromRotation(out, rad, axis) {
//    var x = axis[0], y = axis[1], z = axis[2],
//        len = Math.sqrt(x * x + y * y + z * z),
//        s, c, t;

//    if (len === 0) return null;

//    len = 1 / len;
//    x *= len;
//    y *= len;
//    z *= len;

//    s = Math.sin(rad);
//    c = Math.cos(rad);
//    t = 1 - c;

//    // Perform rotation-specific matrix multiplication
//    out[0] = x * x * t + c;
//    out[1] = y * x * t + z * s;
//    out[2] = z * x * t - y * s;
//    out[3] = 0;
//    out[4] = x * y * t - z * s;
//    out[5] = y * y * t + c;
//    out[6] = z * y * t + x * s;
//    out[7] = 0;
//    out[8] = x * z * t + y * s;
//    out[9] = y * z * t - x * s;
//    out[10] = z * z * t + c;
//    out[11] = 0;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = 0;
//    out[15] = 1;
//    return out;
//}

///**
// * Creates a matrix from the given angle around the X axis
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.rotateX(dest, dest, rad);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {Number} rad the angle to rotate the matrix by
// * @returns {mat4} out
// */
//export function fromXRotation(out, rad) {
//    var s = Math.sin(rad),
//        c = Math.cos(rad);

//    // Perform axis-specific matrix multiplication
//    out[0]  = 1;
//    out[1]  = 0;
//    out[2]  = 0;
//    out[3]  = 0;
//    out[4] = 0;
//    out[5] = c;
//    out[6] = s;
//    out[7] = 0;
//    out[8] = 0;
//    out[9] = -s;
//    out[10] = c;
//    out[11] = 0;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = 0;
//    out[15] = 1;
//    return out;
//}

///**
// * Creates a matrix from the given angle around the Y axis
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.rotateY(dest, dest, rad);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {Number} rad the angle to rotate the matrix by
// * @returns {mat4} out
// */
//export function fromYRotation(out, rad) {
//    var s = Math.sin(rad),
//        c = Math.cos(rad);

//    // Perform axis-specific matrix multiplication
//    out[0]  = c;
//    out[1]  = 0;
//    out[2]  = -s;
//    out[3]  = 0;
//    out[4] = 0;
//    out[5] = 1;
//    out[6] = 0;
//    out[7] = 0;
//    out[8] = s;
//    out[9] = 0;
//    out[10] = c;
//    out[11] = 0;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = 0;
//    out[15] = 1;
//    return out;
//}

///**
// * Creates a matrix from the given angle around the Z axis
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.rotateZ(dest, dest, rad);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {Number} rad the angle to rotate the matrix by
// * @returns {mat4} out
// */
//export function fromZRotation(out, rad) {
//    var s = Math.sin(rad),
//        c = Math.cos(rad);

//    // Perform axis-specific matrix multiplication
//    out[0]  = c;
//    out[1]  = s;
//    out[2]  = 0;
//    out[3]  = 0;
//    out[4] = -s;
//    out[5] = c;
//    out[6] = 0;
//    out[7] = 0;
//    out[8] = 0;
//    out[9] = 0;
//    out[10] = 1;
//    out[11] = 0;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = 0;
//    out[15] = 1;
//    return out;
//}

///**
// * Creates a matrix from a quaternion rotation and vector translation
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.translate(dest, vec);
// *     var quatMat = mat4.create();
// *     quat4.toMat4(quat, quatMat);
// *     mat4.multiply(dest, quatMat);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {quat4} q Rotation quaternion
// * @param {vec3} v Translation vector
// * @returns {mat4} out
// */
//export function fromRotationTranslation(out, q, v) {
//    // Quaternion math
//    var x = q[0], y = q[1], z = q[2], w = q[3],
//        x2 = x + x,
//        y2 = y + y,
//        z2 = z + z,

//        xx = x * x2,
//        xy = x * y2,
//        xz = x * z2,
//        yy = y * y2,
//        yz = y * z2,
//        zz = z * z2,
//        wx = w * x2,
//        wy = w * y2,
//        wz = w * z2;

//    out[0] = 1 - (yy + zz);
//    out[1] = xy + wz;
//    out[2] = xz - wy;
//    out[3] = 0;
//    out[4] = xy - wz;
//    out[5] = 1 - (xx + zz);
//    out[6] = yz + wx;
//    out[7] = 0;
//    out[8] = xz + wy;
//    out[9] = yz - wx;
//    out[10] = 1 - (xx + yy);
//    out[11] = 0;
//    out[12] = v[0];
//    out[13] = v[1];
//    out[14] = v[2];
//    out[15] = 1;

//    return out;
//}

///**
// * Returns the translation vector component of a transformation
// *  matrix. If a matrix is built with fromRotationTranslation,
// *  the returned vector will be the same as the translation vector
// *  originally supplied.
// * @param  {vec3} out Vector to receive translation component
// * @param  {mat4} mat Matrix to be decomposed (input)
// * @return {vec3} out
// */
//export function getTranslation(out, mat) {
//    out[0] = mat[12];
//    out[1] = mat[13];
//    out[2] = mat[14];

//    return out;
//}

///**
// * Returns the scaling factor component of a transformation
// *  matrix. If a matrix is built with fromRotationTranslationScale
// *  with a normalized Quaternion paramter, the returned vector will be
// *  the same as the scaling vector
// *  originally supplied.
// * @param  {vec3} out Vector to receive scaling factor component
// * @param  {mat4} mat Matrix to be decomposed (input)
// * @return {vec3} out
// */
//export function getScaling(out, mat) {
//    var m11 = mat[0],
//        m12 = mat[1],
//        m13 = mat[2],
//        m21 = mat[4],
//        m22 = mat[5],
//        m23 = mat[6],
//        m31 = mat[8],
//        m32 = mat[9],
//        m33 = mat[10];

//    out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
//    out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
//    out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);

//    return out;
//}

///**
// * Returns a quaternion representing the rotational component
// *  of a transformation matrix. If a matrix is built with
// *  fromRotationTranslation, the returned quaternion will be the
// *  same as the quaternion originally supplied.
// * @param {quat} out Quaternion to receive the rotation component
// * @param {mat4} mat Matrix to be decomposed (input)
// * @return {quat} out
// */
//export function getRotation(out, mat) {
//  // Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
//    var trace = mat[0] + mat[5] + mat[10];
//    var S = 0;

//    if (trace > 0) {
//        S = Math.sqrt(trace + 1.0) * 2;
//        out[3] = 0.25 * S;
//        out[0] = (mat[6] - mat[9]) / S;
//        out[1] = (mat[8] - mat[2]) / S;
//        out[2] = (mat[1] - mat[4]) / S;
//    } else if ((mat[0] > mat[5]) & (mat[0] > mat[10])) {
//        S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
//        out[3] = (mat[6] - mat[9]) / S;
//        out[0] = 0.25 * S;
//        out[1] = (mat[1] + mat[4]) / S;
//        out[2] = (mat[8] + mat[2]) / S;
//    } else if (mat[5] > mat[10]) {
//        S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
//        out[3] = (mat[8] - mat[2]) / S;
//        out[0] = (mat[1] + mat[4]) / S;
//        out[1] = 0.25 * S;
//        out[2] = (mat[6] + mat[9]) / S;
//    } else {
//        S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
//        out[3] = (mat[1] - mat[4]) / S;
//        out[0] = (mat[8] + mat[2]) / S;
//        out[1] = (mat[6] + mat[9]) / S;
//        out[2] = 0.25 * S;
//    }

//    return out;
//}

///**
// * Creates a matrix from a quaternion rotation, vector translation and vector scale
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.translate(dest, vec);
// *     var quatMat = mat4.create();
// *     quat4.toMat4(quat, quatMat);
// *     mat4.multiply(dest, quatMat);
// *     mat4.scale(dest, scale)
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {quat4} q Rotation quaternion
// * @param {vec3} v Translation vector
// * @param {vec3} s Scaling vector
// * @returns {mat4} out
// */
//export function fromRotationTranslationScale(out, q, v, s) {
//    // Quaternion math
//    var x = q[0], y = q[1], z = q[2], w = q[3],
//        x2 = x + x,
//        y2 = y + y,
//        z2 = z + z,

//        xx = x * x2,
//        xy = x * y2,
//        xz = x * z2,
//        yy = y * y2,
//        yz = y * z2,
//        zz = z * z2,
//        wx = w * x2,
//        wy = w * y2,
//        wz = w * z2,
//        sx = s[0],
//        sy = s[1],
//        sz = s[2];

//    out[0] = (1 - (yy + zz)) * sx;
//    out[1] = (xy + wz) * sx;
//    out[2] = (xz - wy) * sx;
//    out[3] = 0;
//    out[4] = (xy - wz) * sy;
//    out[5] = (1 - (xx + zz)) * sy;
//    out[6] = (yz + wx) * sy;
//    out[7] = 0;
//    out[8] = (xz + wy) * sz;
//    out[9] = (yz - wx) * sz;
//    out[10] = (1 - (xx + yy)) * sz;
//    out[11] = 0;
//    out[12] = v[0];
//    out[13] = v[1];
//    out[14] = v[2];
//    out[15] = 1;

//    return out;
//}

///**
// * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
// * This is equivalent to (but much faster than):
// *
// *     mat4.identity(dest);
// *     mat4.translate(dest, vec);
// *     mat4.translate(dest, origin);
// *     var quatMat = mat4.create();
// *     quat4.toMat4(quat, quatMat);
// *     mat4.multiply(dest, quatMat);
// *     mat4.scale(dest, scale)
// *     mat4.translate(dest, negativeOrigin);
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {quat4} q Rotation quaternion
// * @param {vec3} v Translation vector
// * @param {vec3} s Scaling vector
// * @param {vec3} o The origin vector around which to scale and rotate
// * @returns {mat4} out
// */
//export function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
//  // Quaternion math
//    var x = q[0], y = q[1], z = q[2], w = q[3],
//        x2 = x + x,
//        y2 = y + y,
//        z2 = z + z,

//        xx = x * x2,
//        xy = x * y2,
//        xz = x * z2,
//        yy = y * y2,
//        yz = y * z2,
//        zz = z * z2,
//        wx = w * x2,
//        wy = w * y2,
//        wz = w * z2,

//        sx = s[0],
//        sy = s[1],
//        sz = s[2],

//        ox = o[0],
//        oy = o[1],
//        oz = o[2];

//    out[0] = (1 - (yy + zz)) * sx;
//    out[1] = (xy + wz) * sx;
//    out[2] = (xz - wy) * sx;
//    out[3] = 0;
//    out[4] = (xy - wz) * sy;
//    out[5] = (1 - (xx + zz)) * sy;
//    out[6] = (yz + wx) * sy;
//    out[7] = 0;
//    out[8] = (xz + wy) * sz;
//    out[9] = (yz - wx) * sz;
//    out[10] = (1 - (xx + yy)) * sz;
//    out[11] = 0;
//    out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
//    out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
//    out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
//    out[15] = 1;

//    return out;
//}

///**
// * Calculates a 4x4 matrix from the given quaternion
// *
// * @param {mat4} out mat4 receiving operation result
// * @param {quat} q Quaternion to create matrix from
// *
// * @returns {mat4} out
// */
//export function fromQuat(out, q) {
//    var x = q[0], y = q[1], z = q[2], w = q[3],
//        x2 = x + x,
//        y2 = y + y,
//        z2 = z + z,

//        xx = x * x2,
//        yx = y * x2,
//        yy = y * y2,
//        zx = z * x2,
//        zy = z * y2,
//        zz = z * z2,
//        wx = w * x2,
//        wy = w * y2,
//        wz = w * z2;

//    out[0] = 1 - yy - zz;
//    out[1] = yx + wz;
//    out[2] = zx - wy;
//    out[3] = 0;

//    out[4] = yx - wz;
//    out[5] = 1 - xx - zz;
//    out[6] = zy + wx;
//    out[7] = 0;

//    out[8] = zx + wy;
//    out[9] = zy - wx;
//    out[10] = 1 - xx - yy;
//    out[11] = 0;

//    out[12] = 0;
//    out[13] = 0;
//    out[14] = 0;
//    out[15] = 1;

//    return out;
//}

///**
// * Generates a frustum matrix with the given bounds
// *
// * @param {mat4} out mat4 frustum matrix will be written into
// * @param {Number} left Left bound of the frustum
// * @param {Number} right Right bound of the frustum
// * @param {Number} bottom Bottom bound of the frustum
// * @param {Number} top Top bound of the frustum
// * @param {Number} near Near bound of the frustum
// * @param {Number} far Far bound of the frustum
// * @returns {mat4} out
// */
//export function frustum(out, left, right, bottom, top, near, far) {
//    var rl = 1 / (right - left),
//        tb = 1 / (top - bottom),
//        nf = 1 / (near - far);
//    out[0] = (near * 2) * rl;
//    out[1] = 0;
//    out[2] = 0;
//    out[3] = 0;
//    out[4] = 0;
//    out[5] = (near * 2) * tb;
//    out[6] = 0;
//    out[7] = 0;
//    out[8] = (right + left) * rl;
//    out[9] = (top + bottom) * tb;
//    out[10] = (far + near) * nf;
//    out[11] = -1;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = (far * near * 2) * nf;
//    out[15] = 0;
//    return out;
//}

///**
// * Generates a perspective projection matrix with the given bounds
// *
// * @param {mat4} out mat4 frustum matrix will be written into
// * @param {number} fovy Vertical field of view in radians
// * @param {number} aspect Aspect ratio. typically viewport width/height
// * @param {number} near Near bound of the frustum
// * @param {number} far Far bound of the frustum
// * @returns {mat4} out
// */
//export function perspective(out, fovy, aspect, near, far) {
//    var f = 1.0 / Math.tan(fovy / 2),
//        nf = 1 / (near - far);
//    out[0] = f / aspect;
//    out[1] = 0;
//    out[2] = 0;
//    out[3] = 0;
//    out[4] = 0;
//    out[5] = f;
//    out[6] = 0;
//    out[7] = 0;
//    out[8] = 0;
//    out[9] = 0;
//    out[10] = (far + near) * nf;
//    out[11] = -1;
//    out[12] = 0;
//    out[13] = 0;
//    out[14] = (2 * far * near) * nf;
//    out[15] = 0;
//    return out;
//}

///**
// * Generates a perspective projection matrix with the given field of view.
// * This is primarily useful for generating projection matrices to be used
// * with the still experiemental WebVR API.
// *
// * @param {mat4} out mat4 frustum matrix will be written into
// * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
// * @param {number} near Near bound of the frustum
// * @param {number} far Far bound of the frustum
// * @returns {mat4} out
// */
//export function perspectiveFromFieldOfView(out, fov, near, far) {
//    var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0),
//        downTan = Math.tan(fov.downDegrees * Math.PI / 180.0),
//        leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0),
//        rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0),
//        xScale = 2.0 / (leftTan + rightTan),
//        yScale = 2.0 / (upTan + downTan);

//    out[0] = xScale;
//    out[1] = 0.0;
//    out[2] = 0.0;
//    out[3] = 0.0;
//    out[4] = 0.0;
//    out[5] = yScale;
//    out[6] = 0.0;
//    out[7] = 0.0;
//    out[8] = -((leftTan - rightTan) * xScale * 0.5);
//    out[9] = ((upTan - downTan) * yScale * 0.5);
//    out[10] = far / (near - far);
//    out[11] = -1.0;
//    out[12] = 0.0;
//    out[13] = 0.0;
//    out[14] = (far * near) / (near - far);
//    out[15] = 0.0;
//    return out;
//}


///**
// * Generates a look-at matrix with the given eye position, focal point, and up axis
// *
// * @param {mat4} out mat4 frustum matrix will be written into
// * @param {vec3} eye Position of the viewer
// * @param {vec3} center Point the viewer is looking at
// * @param {vec3} up vec3 pointing up
// * @returns {mat4} out
// */
//export function lookAt(out, eye, center, up) {
//    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
//        eyex = eye[0],
//        eyey = eye[1],
//        eyez = eye[2],
//        upx = up[0],
//        upy = up[1],
//        upz = up[2],
//        centerx = center[0],
//        centery = center[1],
//        centerz = center[2];

//    if (Math.abs(eyex - centerx) === 0 &&
//        Math.abs(eyey - centery) === 0 &&
//        Math.abs(eyez - centerz) === 0) {
//        return identity(out);
//    }

//    z0 = eyex - centerx;
//    z1 = eyey - centery;
//    z2 = eyez - centerz;

//    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
//    z0 *= len;
//    z1 *= len;
//    z2 *= len;

//    x0 = upy * z2 - upz * z1;
//    x1 = upz * z0 - upx * z2;
//    x2 = upx * z1 - upy * z0;
//    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
//    if (!len) {
//        x0 = 0;
//        x1 = 0;
//        x2 = 0;
//    } else {
//        len = 1 / len;
//        x0 *= len;
//        x1 *= len;
//        x2 *= len;
//    }

//    y0 = z1 * x2 - z2 * x1;
//    y1 = z2 * x0 - z0 * x2;
//    y2 = z0 * x1 - z1 * x0;

//    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
//    if (!len) {
//        y0 = 0;
//        y1 = 0;
//        y2 = 0;
//    } else {
//        len = 1 / len;
//        y0 *= len;
//        y1 *= len;
//        y2 *= len;
//    }

//    out[0] = x0;
//    out[1] = y0;
//    out[2] = z0;
//    out[3] = 0;
//    out[4] = x1;
//    out[5] = y1;
//    out[6] = z1;
//    out[7] = 0;
//    out[8] = x2;
//    out[9] = y2;
//    out[10] = z2;
//    out[11] = 0;
//    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
//    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
//    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
//    out[15] = 1;

//    return out;
//}

///**
// * Returns a string representation of a mat4
// *
// * @param {mat4} a matrix to represent as a string
// * @returns {String} string representation of the matrix
// */
//export function str(a) {
//    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
//                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
//                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
//                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
//}

///**
// * Returns Frobenius norm of a mat4
// *
// * @param {mat4} a the matrix to calculate Frobenius norm of
// * @returns {Number} Frobenius norm
// */
//export function frob(a) {
//    return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2)));
//}

///**
// * Adds two mat4's
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the first operand
// * @param {mat4} b the second operand
// * @returns {mat4} out
// */
//export function add(out, a, b) {
//    out[0] = a[0] + b[0];
//    out[1] = a[1] + b[1];
//    out[2] = a[2] + b[2];
//    out[3] = a[3] + b[3];
//    out[4] = a[4] + b[4];
//    out[5] = a[5] + b[5];
//    out[6] = a[6] + b[6];
//    out[7] = a[7] + b[7];
//    out[8] = a[8] + b[8];
//    out[9] = a[9] + b[9];
//    out[10] = a[10] + b[10];
//    out[11] = a[11] + b[11];
//    out[12] = a[12] + b[12];
//    out[13] = a[13] + b[13];
//    out[14] = a[14] + b[14];
//    out[15] = a[15] + b[15];
//    return out;
//}

///**
// * Subtracts matrix b from matrix a
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the first operand
// * @param {mat4} b the second operand
// * @returns {mat4} out
// */
//export function subtract(out, a, b) {
//    out[0] = a[0] - b[0];
//    out[1] = a[1] - b[1];
//    out[2] = a[2] - b[2];
//    out[3] = a[3] - b[3];
//    out[4] = a[4] - b[4];
//    out[5] = a[5] - b[5];
//    out[6] = a[6] - b[6];
//    out[7] = a[7] - b[7];
//    out[8] = a[8] - b[8];
//    out[9] = a[9] - b[9];
//    out[10] = a[10] - b[10];
//    out[11] = a[11] - b[11];
//    out[12] = a[12] - b[12];
//    out[13] = a[13] - b[13];
//    out[14] = a[14] - b[14];
//    out[15] = a[15] - b[15];
//    return out;
//}

///**
// * Alias for {@link mat4.subtract}
// * @function
// */
//export {subtract as sub};

///**
// * Multiply each element of the matrix by a scalar.
// *
// * @param {mat4} out the receiving matrix
// * @param {mat4} a the matrix to scale
// * @param {Number} b amount to scale the matrix's elements by
// * @returns {mat4} out
// */
//export function multiplyScalar(out, a, b) {
//    out[0] = a[0] * b;
//    out[1] = a[1] * b;
//    out[2] = a[2] * b;
//    out[3] = a[3] * b;
//    out[4] = a[4] * b;
//    out[5] = a[5] * b;
//    out[6] = a[6] * b;
//    out[7] = a[7] * b;
//    out[8] = a[8] * b;
//    out[9] = a[9] * b;
//    out[10] = a[10] * b;
//    out[11] = a[11] * b;
//    out[12] = a[12] * b;
//    out[13] = a[13] * b;
//    out[14] = a[14] * b;
//    out[15] = a[15] * b;
//    return out;
//}

///**
// * Adds two mat4's after multiplying each element of the second operand by a scalar value.
// *
// * @param {mat4} out the receiving vector
// * @param {mat4} a the first operand
// * @param {mat4} b the second operand
// * @param {Number} scale the amount to scale b's elements by before adding
// * @returns {mat4} out
// */
//export function multiplyScalarAndAdd(out, a, b, scale) {
//    out[0] = a[0] + (b[0] * scale);
//    out[1] = a[1] + (b[1] * scale);
//    out[2] = a[2] + (b[2] * scale);
//    out[3] = a[3] + (b[3] * scale);
//    out[4] = a[4] + (b[4] * scale);
//    out[5] = a[5] + (b[5] * scale);
//    out[6] = a[6] + (b[6] * scale);
//    out[7] = a[7] + (b[7] * scale);
//    out[8] = a[8] + (b[8] * scale);
//    out[9] = a[9] + (b[9] * scale);
//    out[10] = a[10] + (b[10] * scale);
//    out[11] = a[11] + (b[11] * scale);
//    out[12] = a[12] + (b[12] * scale);
//    out[13] = a[13] + (b[13] * scale);
//    out[14] = a[14] + (b[14] * scale);
//    out[15] = a[15] + (b[15] * scale);
//    return out;
//}

///**
// * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
// *
// * @param {mat4} a The first matrix.
// * @param {mat4} b The second matrix.
// * @returns {Boolean} True if the matrices are equal, false otherwise.
// */
//export function equals(a, b) {
//    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] &&
//           a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] &&
//           a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
//           a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
//}
