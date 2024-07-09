
class DrawProgram {
    constructor(gl, vertexShaderText, fragmentShaderText) {

        const vertexShader   = loadShader(gl, gl.VERTEX_SHADER,   vertexShaderText);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // create program: attach, link, validate, detach, delete
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('ERROR linking program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        gl.validateProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
            console.error('ERROR validating program!', gl.getProgramInfoLog(shaderProgram));
            return;
        }

        this.shaderProgram = shaderProgram;
        this.gl = gl;

        // FIXME:
        // when to call these detach/delete's? After succesful compilation?
        // gl.detachShader(this.shaderProgram, vertexShader);
        // gl.detachShader(this.shaderProgram, fragmentShader);
        // gl.deleteShader(vertexShader);
        // gl.deleteShader(fragmentShader);

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            const shader = gl.createShader(type);
            gl.shaderSource(shader, source); // Send the source of the shader
            gl.compileShader(shader); // Compile the shader program

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    }

    clearColor() {
        let gl = this.gl
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer
    }

    draw(layer, opacity)
    {
        let triangleVertexPosBufr = layer.vertexCoordBuffer;
        // render
        let gl = this.gl;
        gl.useProgram(this.shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPosBufr);
        this.specifyData('pos', 2, 2*4, 0);

        let opacity_location = gl.getUniformLocation(this.shaderProgram, 'opacity');
        gl.uniform1f(opacity_location, opacity);

        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE)
        gl.disable(gl.DEPTH_TEST)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    specifyData(attribute_name, itemSize, stride, offset) {
        let gl = this.gl, shaderProgram = this.shaderProgram
        const attrib_location = gl.getAttribLocation(shaderProgram, attribute_name);
        gl.enableVertexAttribArray(attrib_location);
        gl.vertexAttribPointer(
            attrib_location,    // * Attribute location
            itemSize,           // * Number of components per vertex attribute. Must be 1, 2, 3, or 4 (1d, 2d, 3d, or 4d).
            gl.FLOAT,           // * Type of elements
            false,              // * Is normalized?
            stride,             // * stride 
            offset              // * Offset from the beginning of 
        );
    }
}

export class BackgroundRenderer
{
    constructor(gl, msgbus)
    {
        this.gl = gl
        this.msgbus = msgbus
        this.vertexCoordBuffer = null  // will be set by uploadPoints
        this.program = new DrawProgram(this.gl,
`
precision mediump float;
attribute vec2 pos;
varying vec4 fragColor;
uniform float opacity;
void main()
{
    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl_Position = vec4(pos, 0.0, opacity);
}
`
,
`
precision mediump float;
varying vec4 fragColor;
void main()
{
    gl_FragColor = vec4(fragColor);
}
`
        )
        this.uploadPoints()
    }

    uploadPoints()
    {
        let gl = this.gl
        let xmin = -1.0, ymin = -1.0, xmax = 1.0, ymax = 1.0

        this.vertexCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexCoordBuffer);
        const coords = new Float32Array([
            xmin, ymax,
            xmin, ymin,
            xmax, ymax,
            xmax, ymin
        ])
        gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
    }

    /** destroy the gpu resources that were allocated */
    dispose()
    {
        let gl = this.gl
        // clear buffers 
        let buffers = [this.vertexCoordBuffer]
        buffers.forEach(
            buffer => {
                if (buffer !== null) {
                    gl.deleteBuffer(buffer)
                    buffer = null
                }
            }
        )
    }

    update(aabb, scaleDenominator, matrix, opacity) {
         this.program.draw(this, opacity)
    }

    clearColor() {
        console.log('clearColor in Background called')
        this.program.clearColor()
    }

    setViewport(width, height) {
        this.gl.viewport(0, 0, width, height);
    }

}
