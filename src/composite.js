// we can render also in 2 passes
// - first pass: render SSC opaque (non-transparent) to FBO
// - second pass: copy the fragments rendered, but adjust the opacity and render to the screen
export class ImageFboDrawProgram extends DrawProgram {
    constructor(gl) {
        let vertexShaderText = `
            precision highp float;
            attribute vec4 a_Position;
            attribute vec2 a_TexCoord;
            varying vec2 v_TexCoord;
            void main() {
              gl_Position = a_Position;
              v_TexCoord = a_TexCoord;
            }`;

        let fragmentShaderText = `
            precision highp float;
            uniform sampler2D uSampler;
            uniform float opacity;
            varying vec2 v_TexCoord;
            void main() {
              vec4 color = texture2D(uSampler, v_TexCoord);
              if (color.a == 0.0) 
              // when clearing the buffer of fbo, we used value 0.0 for opacity; see render.js
                { discard; } 
              else 
                { color.a = opacity; } 
              gl_FragColor = color;
            }`;

        super(gl, vertexShaderText, fragmentShaderText)
    }

    draw_fbo(fbo, opacity) {
        //console.log('drawprograms.js fbo:', fbo)
        if (fbo === null) {
            console.log('drawprograms.js fbo is null:', fbo)
            return;
        }
        //console.log('drawprograms.js tree_setting.opacity 3:', tree_setting.opacity)
        let gl = this.gl;
        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.program = shaderProgram;
        // Set the vertex information
        var n = initVertexBuffers(gl);
        if (n < 0) {
            console.log('Failed to set the vertex information');
            return;
        }

        {
            let opacity_location = gl.getUniformLocation(shaderProgram, 'opacity');
            gl.uniform1f(opacity_location, opacity);
        }


        //gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.buffer);

        //// FIXME: better to store with bucket how the layout of the mesh is?
        //const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
        //// gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 24, 0);
        //gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
        //gl.enableVertexAttribArray(positionAttrib);



        //gl.bindBuffer(gl.ARRAY_BUFFER, tile.content.textureCoordBuffer)
        //const textureAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoord');
        //gl.vertexAttribPointer(textureAttrib, 2, gl.FLOAT, false, 0, 0);
        //gl.enableVertexAttribArray(textureAttrib);

        gl.activeTexture(gl.TEXTURE0);
        //gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const uSampler = gl.getUniformLocation(shaderProgram, 'uSampler');
        gl.uniform1i(uSampler, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        //        gl.disable(gl.BLEND);
        //gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.DEPTH_TEST);

        //gl.clearColor(0.0, 0.0, 0.0, 1.0);
        //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the color buffer

        //gl.clearDepth(1.0);
        //gl.clear(gl.DEPTH_BUFFER_BIT);
        //gl.clearColor(1.0, 1.0, 1.0, 0.0);
        //gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, n); // Draw the rectangle
        gl.bindTexture(gl.TEXTURE_2D, null);
        //gl.drawArrays(gl.TRIANGLES, 0, tile.content.buffer.numItems); // FIXME!
    }
}



function initVertexBuffers(gl) {
    var verticesTexCoords = new Float32Array([
        // Vertex coordinates, texture coordinate
        -1, 1, 0.0, 1.0,
        -1, -1, 0.0, 0.0,
        1, 1, 1.0, 1.0,
        1, -1, 1.0, 0.0,
    ]);
    var n = 4; // The number of vertices

    // Create the buffer object
    var vertexTexCoordBuffer = gl.createBuffer();
    if (!vertexTexCoordBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);

    var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
    //console.log('drawprograms.js FSIZE:', FSIZE);
    //Get the storage location of a_Position, assign and enable buffer
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
    gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

    // Get the storage location of a_TexCoord
    var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    if (a_TexCoord < 0) {
        console.log('Failed to get the storage location of a_TexCoord');
        return -1;
    }
    // Assign the buffer object to a_TexCoord variable
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

    return n;
}


export function initFramebufferObject(gl, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    var error = function () {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    // Create a frame buffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the object to target
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    framebuffer.texture = texture; // Store the texture object

    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); // Bind the object to target
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);
    framebuffer.depthBuffer = depthBuffer


    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.fbo = framebuffer; //fbo: frambuffer object
}
