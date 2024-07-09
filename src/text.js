
// a very nice introduction to all types of text rendering options with webgl:
// https://css-tricks.com/techniques-for-rendering-text-with-webgl/
//
// sdf implementation: https://troika-examples.netlify.app/#text
// for ThreeJS: https://github.com/protectwise/troika/blob/main/packages/troika-three-text/src/index.js (loads ttf, builds sdf client side -webworker- and then renders)

/* FIXME
Why does the anchor.z not conform to 

https://stackoverflow.com/questions/7777913/how-to-render-depth-linearly-in-modern-opengl-with-gl-fragcoord-z-in-fragment-sh/45710371#45710371

https://learnopengl.com/Advanced-OpenGL/Depth-testing
*/

class TextProgram {
    constructor(gl, vertexShaderText, fragmentShaderText) {

        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderText);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

        // Create program: attach, link, validate, detach, delete
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

        // creates a shader of the given type, uploads the source and
        // compiles it.
        function loadShader(gl, type, source) {

            const shader = gl.createShader(type);
            // Send the source of the shader
            gl.shaderSource(shader, source); 
            // Compile the shader program
            gl.compileShader(shader); 

            // See if it compiled successfully
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('ERROR occurred while compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    }


}


function makeTextProgram(gl) {

let vertexShaderText = `
precision highp float;

attribute vec3 aAnchor;
attribute vec2 aPosition;
attribute vec3 aUv;

uniform mat4 M;
//uniform vec2 uScreenSize;

uniform float uScaleDenominator;

varying vec2 vUv;

void main()
{

    vec4 tmp = M * vec4(aAnchor.xy + aPosition.xy * (uScaleDenominator * 0.00028), 0.0, 1.0);
    
    // @!FIXME could this be done with depth buffer?
    if (aAnchor.z <= uScaleDenominator) {
        tmp.xy = vec2(-10.0, -10.0);
    }

    vUv = aUv.xy;

    // vec4 tmp2 = vec4(aPosition, 0.0, 1.0);
    // does this give the position at the correct location

    //gl_Position = tmp + vec4(aPosition, 0.0, 1.0);

//    gl_Position = tmp;
//    gl_Position.z = -1.0 * gl_Position.z;

//    gl_PointSize = 10.0;

    // gl_Position = tmp;
//* vec2(2.0/1920.0 * 100.0, 2.0/967.0 * 100.0)
    gl_Position = tmp; //+ vec4(aPosition * (uScaleDenominator * 0.00028), 0.0, 1.0);
}
`

/*
let origVertexShader = `
precision mediump float;

attribute vec2 position;
attribute vec3 uv;

uniform mat4 transform;
uniform float fieldRange;
uniform vec2 resolution;

varying vec2 vUv;
varying float vFieldRangeDisplay_px;

void main() {
    vUv = uv.xy;

    // determine the field range in pixels when drawn to the framebuffer
    vec2 scale = abs(vec2(transform[0][0], transform[1][1]));
    float atlasScale = uv.z;
    vFieldRangeDisplay_px = fieldRange * scale.y * (resolution.y * 0.5) / atlasScale;
    vFieldRangeDisplay_px = max(vFieldRangeDisplay_px, 1.0);

    vec2 p = vec2(position.x * resolution.y / resolution.x, position.y);

    gl_Position = transform * vec4(p, 0.0, 1.0);
}
`
*/

let fragmentShaderText = `
precision highp float;

// mm- disabled msdf fragement shader mar24-2020
// uniform vec4 uColor;
varying vec2 vUv;
uniform sampler2D glyphAtlas;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main()
{
    vec4 color = vec4(1.0, 0.0, 0.0, 1.0);
    vec3 sample = texture2D(glyphAtlas, vUv).rgb;
    float sigDist = median(sample.r, sample.g, sample.b);

    // spread field range over 1px for anti-aliasing
    float spread = 1.5;
    float fillAlpha = clamp((sigDist - 0.5) * spread + 0.5, 0.0, 1.0);

    vec4 strokeColor = vec4(0.0, 1.0, 0.0, 0.0);
    float strokeWidthPx = 8.0;
    float strokeDistThreshold = clamp(strokeWidthPx * 2. / 1.0, 0.0, 1.0);
    float strokeDistScale = 1. / (1.0 - strokeDistThreshold);
    float _offset = 0.5 / strokeDistScale;
    float strokeAlpha = clamp((sigDist - _offset) * 1.0 + _offset, 0.0, 1.0);

//    float strokeAlpha = 1.0;

    gl_FragColor = (
        color * fillAlpha * color.a + strokeColor * strokeColor.a * strokeAlpha * (1.0 - fillAlpha)
    );

//    if ( gl_FragCoord.z > 0.0)
//    {
//        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
//    } else {
//        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
//    }

//    gl_FragColor = vec4(sample, 1.0);
//    gl_FragColor = vec4(vec3(gl_FragCoord.z), 1.0);
// end of disable
//void main()
//{
//    gl_FragColor = vec4(1, 0.5, 0.5, 1);
//

}
`

// msdf sample shader
//`
//in vec2 pos;
//out vec4 color;
//uniform sampler2D msdf;
//uniform float pxRange;
//uniform vec4 bgColor;
//uniform vec4 fgColor;

//float median(float r, float g, float b) {
//    return max(min(r, g), min(max(r, g), b));
//}

//void main() {
//    vec2 msdfUnit = pxRange/vec2(textureSize(msdf, 0));
//    vec3 sample = texture(msdf, pos).rgb;
//    float sigDist = median(sample.r, sample.g, sample.b) - 0.5;
//    sigDist *= dot(msdfUnit, 0.5/fwidth(pos));
//    float opacity = clamp(sigDist + 0.5, 0.0, 1.0);
//    color = mix(bgColor, fgColor, opacity);
//}
//`

//vec3 sample = texture2D(glyphAtlas, vUv).rgb;
//float sigDist = median(sample.r, sample.g, sample.b);
//float fillAlpha = clamp((sigDist - 0.5) * 1. + 0.5, 0.0, 1.0);

let origFragmentShaderText = `
#version 100

precision mediump float;     

uniform vec4 color;
uniform sampler2D glyphAtlas;

uniform mat4 transform;

varying vec2 vUv;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {

vec3 sample = texture2D(glyphAtlas, vUv).rgb;
float sigDist = median(sample.r, sample.g, sample.b);

// spread field range over 1px for antialiasing
float fillAlpha = clamp((sigDist - 0.5) * vFieldRangeDisplay_px + 0.5, 0.0, 1.0);

vec4 strokeColor = vec4(0.0, 1.0, 0.0, 1.0);
float strokeWidthPx = 1.0;
float strokeDistThreshold = clamp(strokeWidthPx * 2. / vFieldRangeDisplay_px, 0.0, 1.0);
float strokeDistScale = 1. / (1.0 - strokeDistThreshold);
float _offset = 0.5 / strokeDistScale;
float strokeAlpha = clamp((sigDist - _offset) * vFieldRangeDisplay_px + _offset, 0.0, 1.0);

gl_FragColor = (
    color * fillAlpha * color.a + strokeColor * strokeColor.a * strokeAlpha * (1.0 - fillAlpha)
);

// to help debug stroke
/**
gl_FragColor =
vec4(vec3(sigDist), 0.) + strokeColor * strokeColor.a * strokeAlpha
// * (1.0 - fillAlpha)
;
/**/
}`

    let tp = new TextProgram(gl, vertexShaderText, fragmentShaderText)
    return tp.shaderProgram
}

//let text = new Text()

// console.log(text)



function makeAnchorSquaresProgram(gl) {
    let vertexShaderText = `
precision highp float;

attribute vec2 vertexPosition_modelspace;
uniform mat4 M;

void main()
{
    gl_Position = M * vec4(vertexPosition_modelspace, 0.0, 1.0);
}
    `
    let fragmentShaderText = `
void main()
{
    gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
}
    `
    let tp = new TextProgram(gl, vertexShaderText, fragmentShaderText)
    return tp
}



export class TextRenderer {

    constructor(gl, msgbus) {
        this.gl = gl
        this.msgbus = msgbus
        const lineHeight = 1.0

        // fetch glyph property data (i.e. font description + texture(raster image) with font outlines/signed distance field)
        let atlas = this.getAtlas()

        // load texture that encodes multi-channel signed distance field (msdf)
        // the msdf is used in the fragment shader
        this.glyphAtlasTexture = null
        let htmlImageElement = new Image();
        htmlImageElement.src = msdf
        htmlImageElement.addEventListener('load', () => {
            let glyphAtlasTexture = this.createGlyphAtlas(gl, htmlImageElement);
            this.glyphAtlasTexture = glyphAtlasTexture
        });

        // fetch label data (i.e. label locations and type)
        let labels = this.getLabels()

        // place / layout glyps
        let placed = this.layoutGlyphs(labels, atlas, lineHeight)
        console.log(placed)

        // produce vertex + triangle data for glyphs that were placed
        // for each vertex, upload: anchor.x, anchor.y, 
        let vao = this.generateVertexData(placed, atlas)
        console.log(vao)

        // upload vertex/triangle buffer and textures to GPU
        this.textBuffer = this.createTextBuffer(gl, vao)

        // make the shader program
        this.shaderProgram = makeTextProgram(gl)

        let squares = this.getLabels().map((label) => {
            let rectHalfSize = [250, 150]
            return [label.x - rectHalfSize[0], label.y + rectHalfSize[1],
                    label.x, label.y,
                    label.x + rectHalfSize[0], label.y + rectHalfSize[1],
                    label.x - rectHalfSize[0], label.y - rectHalfSize[1],
                    label.x, label.y,
                    label.x + rectHalfSize[0], label.y - rectHalfSize[1]
                    ]
        } ).flat()
        this.squaresBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squaresBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squares), gl.STATIC_DRAW);

        this.squaresProgram = makeAnchorSquaresProgram(gl)
    }

    setViewport(width, height) {
        // console.error(`TextRenderer not using the setViewport values yet ${width}, ${height}`)
    }


    update(rect, scaleDenominator, matrix) {
       this.renderAnchors(rect, scaleDenominator, matrix)
        this.renderText(rect, scaleDenominator, matrix)

    }

    renderAnchors(rect, scaleDenominator, matrix) {
        let gl = this.gl;
        let shaderProgram = this.squaresProgram.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.squaresBuffer);
        const vertexPositionAttrib = gl.getAttribLocation(shaderProgram, 'vertexPosition_modelspace');
        gl.enableVertexAttribArray(vertexPositionAttrib);
        gl.vertexAttribPointer(vertexPositionAttrib, 2, gl.FLOAT, false, 2*4, 0);
        const M = gl.getUniformLocation(shaderProgram, 'M');
        gl.uniformMatrix4fv(M, false, matrix);
//        gl.disable(gl.CULL_FACE); 
//        gl.disable(gl.DEPTH_TEST);
//        gl.disable(gl.STENCIL_TEST);
//        gl.disable(gl.SCISSOR_TEST);
//        gl.disable(gl.BLEND);

//        gl.clearColor(0, 0, 0, 0);
//        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer

        // should this be at the end of the rendering?
        // -> compositing canvas with other elements in the browser

//        gl.clearColor(0, 0, 0, 0)
//        gl.clear(gl.COLOR_BUFFER_BIT); // clear color buffer

        gl.drawArrays(gl.TRIANGLES, 0, 6 * this.getLabels().length ) //this.squaresBuffer.vertexCount / 6);
    }
    
    prepareMatrix(matrix, near, far) {
        matrix[10] = -2.0 / (near - far)        
        matrix[14] = (near + far) / (near - far)

        return matrix
    }


    renderText(rect, scaleDenominator, matrix) {

        if (this.glyphAtlasTexture === null) return

//        console.log('rendering text for scale 1: ' + scaleDenominator)
        let gl = this.gl;

//        console.log(gl.getParameter(gl.DEPTH_RANGE))

        let shaderProgram = this.shaderProgram;
        gl.useProgram(shaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textBuffer.deviceHandle); 

        // anchor (world pos)
        const anchorAttrib = gl.getAttribLocation(shaderProgram, 'aAnchor');
        gl.vertexAttribPointer(anchorAttrib, 3, gl.FLOAT, false, 32, 0);
        gl.enableVertexAttribArray(anchorAttrib);

        // translation against anchor (internal pos)
        const positionAttrib = gl.getAttribLocation(shaderProgram, 'aPosition');
        gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 32, 12); // skip 32 bytes for next, start at byte 12 for reading this attribute
        gl.enableVertexAttribArray(positionAttrib);

        // texture coordinate (uv.xy) + scale (uv.z)
        const uvAttrib = gl.getAttribLocation(shaderProgram, 'aUv');
        gl.vertexAttribPointer(uvAttrib, 3, gl.FLOAT, false, 32, 20); // skip 32 bytes for next, start at byte 20 for reading this attribute
        gl.enableVertexAttribArray(uvAttrib);

        let uScaleDenominator = gl.getUniformLocation(shaderProgram, 'uScaleDenominator');
        gl.uniform1f(uScaleDenominator, scaleDenominator);
        
//        // the client side screen size
//        let uScreenSize = gl.getUniformLocation(shaderProgram, 'uScreenSize');
//        let screenSize = [(rect[2]-rect[0]), (rect[3]-rect[1])]
//        gl.uniform2fv(uScreenSize, screenSize);

        let glyphAtlasAttrib = gl.getUniformLocation(shaderProgram, 'glyphAtlas')

        // Tell WebGL we want to affect texture unit 0
        gl.activeTexture(gl.TEXTURE0);

        // Bind the texture to texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlasTexture);

        // Tell the shader we bound the texture to texture unit 0
        gl.uniform1i(glyphAtlasAttrib, 0);

        // matrix M
        let M = gl.getUniformLocation(shaderProgram, 'M');

//        let near = Math.sqrt(607516766)
//        let far = -0.5
//        matrix = this.prepareMatrix(matrix, near, far)

        gl.uniformMatrix4fv(M, false, matrix);
//        console.log(matrix)

        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.SCISSOR_TEST);

        gl.enable(gl.BLEND);
//        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

//        gl.clearColor(1, 1, 1, 1); // opaque white
//        gl.clear(gl.COLOR_BUFFER_BIT);

//        gl.enable(gl.DEPTH_TEST);
//        gl.clearDepth(1.0); // Clear everything
//        gl.clear(gl.DEPTH_BUFFER_BIT);
//    gl.NEVER (never pass)
//    gl.LESS (pass if the incoming value is less than the depth buffer value)
//    gl.EQUAL (pass if the incoming value equals the depth buffer value)
//    gl.LEQUAL (pass if the incoming value is less than or equal to the depth buffer value)
//    gl.GREATER (pass if the incoming value is greater than the depth buffer value)
//    gl.NOTEQUAL (pass if the incoming value is not equal to the depth buffer value)
//    gl.GEQUAL (pass if the incoming value is greater than or equal to the depth buffer value)
//    gl.ALWAYS (always pass)
//        gl.depthFunc(gl.LESS);

//        gl.drawArrays(gl.LINE_STRIP, 0, this.textBuffer.vertexCount);

        // MM: one way to disable rendering of some text is not drawing 
        // the glyphs at all (while they do re-side on the GPU)
        // here (CPU-side) we could bisect a sorted list, 
        // stating which glyphs should be rendered and which not
        // drawing only the glyphs that are still remaining
//        gl.drawArrays(gl.TRIANGLES, 24, this.textBuffer.vertexCount-24);

        gl.drawArrays(gl.TRIANGLES, 0, this.textBuffer.vertexCount);
    }

    createGlyphAtlas(gl, textureSource) {
        let mapTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, mapTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        // gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); // @! review

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureSource);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // mip-map filtering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);

        return mapTexture;
    }

    layoutGlyphs(labels, atlas, lineHeight) {
        let placed = []
        labels.forEach(
            (label) => {
                const anchor = {x: label.x, y: label.y, z: label.maxDenominator}
                // console.log( anchor )
                let i = 0
                let x = 0.0
                let y = 0.0

                for (let i = 0; i < label.label.length; i++)
                {
                    let c = label.label[i]
//                    console.log(c)
                    // console.log(atlas.characters[c])
                    if (c in atlas.characters) {
//                        console.log(i, x, c)
                        placed.push({char: c, x: x, y: y, anchor: anchor})
                        x += atlas.characters[c].advance
                    } else if (c === '\n') {
//                        console.log('line end')
                        x = 0.0
                        y += lineHeight
                        // console.log(i, x, c)
                    } else {
                        console.error('character ' + c + ' not found')
                    }
                }
            }
        )
        return placed
    }

    generateSquareData(squares) {
        // memory layout details
        const elementSizeBytes = 4;     // (float32)
        const anchorElements = 2;       // anchor.x, anchor.y
        const elementsPerVertex = anchorElements;
        const vertexSizeBytes = elementsPerVertex * elementSizeBytes;
        const squareVertexCount = 4; // each square has 4 vertices

        const vertexArray = new Float32Array(squares);
        return {
            vertexArray: vertexArray,
            elementsPerVertex: elementsPerVertex,
            vertexCount: characterOffset_vx,
            vertexLayout: {
                anchor: {
                    elements: anchorElements,
                    elementSizeBytes: elementSizeBytes,
                    strideBytes: vertexSizeBytes,
                    offsetBytes: 0,
                },
            }
        }
    }

    createSquareBuffer(gl, squares) {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, squares, gl.STATIC_DRAW);

        return {
            deviceHandle: buffer,
            vertexCount: squares.length
        };
    }

    createTextBuffer(gl, vertexData) {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData.vertexArray, gl.STATIC_DRAW);

        return {
            deviceHandle: buffer,
            vertexCount: vertexData.vertexCount,
            vertexLayout: vertexData.vertexLayout,
            drawMode: gl.TRIANGLES,
            frontFace: gl.CCW,
        };
    }





    generateVertexData(sequence, font) {
        // memory layout details
        const elementSizeBytes = 4;     // (float32)
        const anchorElements = 3;       // anchor.x, anchor.y, anchor.z
        const positionElements = 2;     // p.x, p.y
        const uvElements = 3;           // uv.x, uv.y, uv.z 
        const elementsPerVertex = anchorElements + positionElements + uvElements;
        const vertexSizeBytes = elementsPerVertex * elementSizeBytes;
        const characterVertexCount = 6; // each char has 6 vertices (could be 4 when using drawElements + indices)

        const vertexArray = new Float32Array(sequence.length * characterVertexCount * elementsPerVertex);

        let characterOffset_vx = 0; // in terms of numbers of vertices rather than array elements

        for (let i = 0; i < sequence.length; i++) {
            const item = sequence[i];
            const fontCharacter = font.characters[item.char];

            // skip null-glyphs
            if (fontCharacter == null || fontCharacter.glyph == null) { continue };

            const glyph = fontCharacter.glyph;

            // quad dimensions
//            let px = item.x // 
//            let py = item.y // 
//            let w = 12
//            let h = 12

            let increase = 40.0 // was: 20.0

            let px = item.x - glyph.offset.x;
            // y = 0 in the glyph corresponds to the baseline, which is font.ascender from the top of the glyph
            let py = -(item.y + font.ascender + glyph.offset.y);

            // convert width to normalized font units with atlasScale property
            let w = glyph.atlasRect.w / glyph.atlasScale; 
            let h = glyph.atlasRect.h / glyph.atlasScale;

            px *= increase
            py *= increase
            w *= increase
            h *= increase

//            console.log([w,h])

            // uv
            // add half-text offset to map to texel centers
            let ux = (glyph.atlasRect.x + 0.5) / font.textureSize.w;
            let uy = (glyph.atlasRect.y + 0.5) / font.textureSize.h;
            let uw = (glyph.atlasRect.w - 1.0) / font.textureSize.w;
            let uh = (glyph.atlasRect.h - 1.0) / font.textureSize.h;
            // flip glyph uv y, this is different from flipping the glyph y _position_
            uy = uy + uh;
            uh = -uh;
            // two-triangle quad with ccw face winding
            vertexArray.set([
                item.anchor.x, item.anchor.y, item.anchor.z, px,     py,     ux,      uy,      glyph.atlasScale, // bottom left
                item.anchor.x, item.anchor.y, item.anchor.z, px + w, py + h, ux + uw, uy + uh, glyph.atlasScale, // top right
                item.anchor.x, item.anchor.y, item.anchor.z, px,     py + h, ux,      uy + uh, glyph.atlasScale, // top left

                item.anchor.x, item.anchor.y, item.anchor.z, px,     py,     ux,      uy,      glyph.atlasScale, // bottom left
                item.anchor.x, item.anchor.y, item.anchor.z, px + w, py,     ux + uw, uy,      glyph.atlasScale, // bottom right
                item.anchor.x, item.anchor.y, item.anchor.z, px + w, py + h, ux + uw, uy + uh, glyph.atlasScale, // top right
            ], characterOffset_vx * elementsPerVertex);

            // advance character quad in vertex array
            characterOffset_vx += characterVertexCount;
        }

        let result = {
            vertexArray: vertexArray,
            elementsPerVertex: elementsPerVertex,
            vertexCount: characterOffset_vx,
            vertexLayout: {
                anchor: {
                    elements: anchorElements,
                    elementSizeBytes: elementSizeBytes,
                    strideBytes: vertexSizeBytes,
                    offsetBytes: 0,
                },
                position: {
                    elements: positionElements,
                    elementSizeBytes: elementSizeBytes,
                    strideBytes: vertexSizeBytes,
                    offsetBytes: anchorElements * elementSizeBytes,
                },
                uv: {
                    elements: uvElements,
                    elementSizeBytes: elementSizeBytes,
                    strideBytes: vertexSizeBytes,
                    offsetBytes: (anchorElements + positionElements) * elementSizeBytes,
                }
            }
        }
        console.log(result)
        return result
    }


    getAtlas() { 
      return {
        "format": "TextureAtlasFontJson",
        "version": 1,
        "technique": "msdf",
        "characters": {
          "0": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 108.17580340251016,
              "atlasRect": {
                "x": 320,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.02038444735698034,
                "y": 0.0092442114460519
              }
            }
          },
          "1": {
            "advance": 0.16933158584534733,
            "glyph": {
              "atlasScale": 108.38068181807343,
              "atlasRect": {
                "x": 288,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.07187418086500655,
                "y": 0.009226736566186108
              }
            }
          },
          "2": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 104.42518248185624,
              "atlasRect": {
                "x": 256,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.033036260375654,
                "y": 0.00931411096548152
              }
            }
          },
          "3": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 97.07379134887657,
              "atlasRect": {
                "x": 224,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.05441135264612319,
                "y": 0.014495412844036697
              }
            }
          },
          "4": {
            "advance": 0.24298820445609437,
            "glyph": {
              "atlasScale": 101.55279503106173,
              "atlasRect": {
                "x": 192,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.022953254696429882,
                "y": 0.02164263870691481
              }
            }
          },
          "5": {
            "advance": 0.217824377457405,
            "glyph": {
              "atlasScale": 102.55376344104609,
              "atlasRect": {
                "x": 160,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.045268676277850584,
                "y": 0.013944954128440368
              }
            }
          },
          "6": {
            "advance": 0.24325032765399737,
            "glyph": {
              "atlasScale": 94.04272801999687,
              "atlasRect": {
                "x": 128,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.051000436872052426,
                "y": 0.010633464394937876
              }
            }
          },
          "7": {
            "advance": 0.15937090432503276,
            "glyph": {
              "atlasScale": 97.98801369872812,
              "atlasRect": {
                "x": 96,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.03746614242021494,
                "y": 0.02488422892087025
              }
            }
          },
          "8": {
            "advance": 0.20996068152031455,
            "glyph": {
              "atlasScale": 89.69435736692813,
              "atlasRect": {
                "x": 64,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.06501529051982176,
                "y": 0.04470074268233814
              }
            }
          },
          "9": {
            "advance": 0.24298820445609437,
            "glyph": {
              "atlasScale": 90.68938193359295,
              "atlasRect": {
                "x": 32,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.05584971603325819,
                "y": 0.05663608562696723
              }
            }
          },
          "\t": {
            "advance": 0.11716906946264745
          },
          " ": {
            "advance": 0.14285714285714285
          },
          "!": {
            "advance": 0.31035386631716905,
            "glyph": {
              "atlasScale": 61.59849300329922,
              "atlasRect": {
                "x": 288,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.1039143730886291,
                "y": 0.01675840978592713
              }
            }
          },
          "\"": {
            "advance": 0.31035386631716905,
            "glyph": {
              "atlasScale": 160.74438202228438,
              "atlasRect": {
                "x": 256,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.04934906072526344,
                "y": -0.29902140672838795
              }
            }
          },
          "#": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 68.53293413159375,
              "atlasRect": {
                "x": 224,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.00017474879860256883,
                "y": 0.023765836609929227
              }
            }
          },
          "$": {
            "advance": 0.45190039318479686,
            "glyph": {
              "atlasScale": 51.81077410595789,
              "atlasRect": {
                "x": 192,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.06346876365219396,
                "y": 0.07827872433371429
              }
            }
          },
          "%": {
            "advance": 0.5934469200524246,
            "glyph": {
              "atlasScale": 55.77485380117656,
              "atlasRect": {
                "x": 160,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.010380078636959372,
                "y": 0.05200524246395806
              }
            }
          },
          "&": {
            "advance": 0.39554390563564873,
            "glyph": {
              "atlasScale": 67.44254566896328,
              "atlasRect": {
                "x": 128,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.04811708169511927,
                "y": 0.026622979467072084
              }
            }
          },
          "'": {
            "advance": 0.1596330275229358,
            "glyph": {
              "atlasScale": 170.56631892710703,
              "atlasRect": {
                "x": 96,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.008877238968987679,
                "y": -0.30475316732141544
              }
            }
          },
          "(": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 54.19034090909633,
              "atlasRect": {
                "x": 64,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.04269986893840105,
                "y": 0.11910878112712975
              }
            }
          },
          ")": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 55.911089399091715,
              "atlasRect": {
                "x": 32,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.12745303626031979,
                "y": 0.10150283966792137
              }
            }
          },
          "*": {
            "advance": 0.2823066841415465,
            "glyph": {
              "atlasScale": 119.09469302825389,
              "atlasRect": {
                "x": 0,
                "y": 192,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.000008737439930094889,
                "y": -0.2179467016169856
              }
            }
          },
          "+": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 127.8770949721836,
              "atlasRect": {
                "x": 480,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.04853647881176409,
                "y": -0.007907383136746526
              }
            }
          },
          ",": {
            "advance": 0.1596330275229358,
            "glyph": {
              "atlasScale": 223.53515624999997,
              "atlasRect": {
                "x": 448,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.05397990388810485,
                "y": 0.05453910004374312
              }
            }
          },
          "-": {
            "advance": 0.20131061598951508,
            "glyph": {
              "atlasScale": 178.82812500000003,
              "atlasRect": {
                "x": 416,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.010921799912631194,
                "y": -0.06989951944085977
              }
            }
          },
          ".": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 324.2209631728484,
              "atlasRect": {
                "x": 384,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.08066404543463172,
                "y": 0.0030843162953310614
              }
            }
          },
          "/": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 60.58761249309999,
              "atlasRect": {
                "x": 352,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.07141983398869724,
                "y": 0.025155089558815204
              }
            }
          },
          ":": {
            "advance": 0.18453473132372214,
            "glyph": {
              "atlasScale": 111.65853658552578,
              "atlasRect": {
                "x": 0,
                "y": 160,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.005417212756667889,
                "y": 0.008955875928358585
              }
            }
          },
          ";": {
            "advance": 0.20131061598951508,
            "glyph": {
              "atlasScale": 94.12006578941093,
              "atlasRect": {
                "x": 480,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.036443861948393184,
                "y": 0.060690257754422015
              }
            }
          },
          "<": {
            "advance": 0.31035386631716905,
            "glyph": {
              "atlasScale": 106.36617100369531,
              "atlasRect": {
                "x": 448,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.005801660113581126,
                "y": -0.013534294451720053
              }
            }
          },
          "=": {
            "advance": 0.4474442988204456,
            "glyph": {
              "atlasScale": 89.9764150940922,
              "atlasRect": {
                "x": 416,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.08036697247706423,
                "y": 0.04820445609436435
              }
            }
          },
          ">": {
            "advance": 0.31035386631716905,
            "glyph": {
              "atlasScale": 114.90963855400861,
              "atlasRect": {
                "x": 384,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.02747051114023591,
                "y": -0.016854521625163828
              }
            }
          },
          "?": {
            "advance": 0.33866317169069465,
            "glyph": {
              "atlasScale": 71.44194756559219,
              "atlasRect": {
                "x": 352,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.02015727391874181,
                "y": 0.01399737876802097
              }
            }
          },
          "@": {
            "advance": 0.5874180865006553,
            "glyph": {
              "atlasScale": 56.490621915121956,
              "atlasRect": {
                "x": 320,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.011655744866759632,
                "y": 0.12805591961549673
              }
            }
          },
          "A": {
            "advance": 0.4235910878112713,
            "glyph": {
              "atlasScale": 62.67798466593125,
              "atlasRect": {
                "x": 288,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.006850152905193184,
                "y": 0.041642638706914814
              }
            }
          },
          "B": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 62.472707423710936,
              "atlasRect": {
                "x": 256,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.07511577107912976,
                "y": 0.04117081695068938
              }
            }
          },
          "C": {
            "advance": 0.39554390563564873,
            "glyph": {
              "atlasScale": 57.68649193549157,
              "atlasRect": {
                "x": 224,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.03332459589334732,
                "y": 0.0676627348186422
              }
            }
          },
          "D": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 62.50682687084608,
              "atlasRect": {
                "x": 192,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.087557885539481,
                "y": 0.04089995631274443
              }
            }
          },
          "E": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 62.8155872666875,
              "atlasRect": {
                "x": 160,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.04540847531667627,
                "y": 0.041083442551276536
              }
            }
          },
          "F": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 56.213163064830084,
              "atlasRect": {
                "x": 128,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.015762341633895675,
                "y": 0.06837920489302228
              }
            }
          },
          "G": {
            "advance": 0.4235910878112713,
            "glyph": {
              "atlasScale": 46.41119221411859,
              "atlasRect": {
                "x": 96,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.1258715596330275,
                "y": 0.2144692005242464
              }
            }
          },
          "H": {
            "advance": 0.564875491480996,
            "glyph": {
              "atlasScale": 59.39283860926008,
              "atlasRect": {
                "x": 64,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.0759545653124194,
                "y": 0.04265618173869462
              }
            }
          },
          "I": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 64.93617021290547,
              "atlasRect": {
                "x": 32,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.10825688073394496,
                "y": 0.023918741808650064
              }
            }
          },
          "J": {
            "advance": 0.508519003931848,
            "glyph": {
              "atlasScale": 41.66363305424906,
              "atlasRect": {
                "x": 0,
                "y": 128,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.014958497160337614,
                "y": 0.2232153778948362
              }
            }
          },
          "K": {
            "advance": 0.508519003931848,
            "glyph": {
              "atlasScale": 52.96159185563914,
              "atlasRect": {
                "x": 480,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.013621668851032241,
                "y": 0.09581476627342596
              }
            }
          },
          "L": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 58.03752535496946,
              "atlasRect": {
                "x": 448,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.1442289209261127,
                "y": 0.04344255133240366
              }
            }
          },
          "M": {
            "advance": 0.564875491480996,
            "glyph": {
              "atlasScale": 46.48659626321649,
              "atlasRect": {
                "x": 416,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.03619047619053211,
                "y": 0.11757972913941808
              }
            }
          },
          "N": {
            "advance": 0.4235910878112713,
            "glyph": {
              "atlasScale": 57.657430730451566,
              "atlasRect": {
                "x": 384,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.02835299257323198,
                "y": 0.05640017474885452
              }
            }
          },
          "O": {
            "advance": 0.4235910878112713,
            "glyph": {
              "atlasScale": 57.282282282284605,
              "atlasRect": {
                "x": 352,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.05284403669724771,
                "y": 0.06778505897771954
              }
            }
          },
          "P": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 55.07699711258883,
              "atlasRect": {
                "x": 320,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.06481432940154129,
                "y": 0.08499781564007339
              }
            }
          },
          "Q": {
            "advance": 0.39554390563564873,
            "glyph": {
              "atlasScale": 45.61578318056648,
              "atlasRect": {
                "x": 288,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.12428134556569331,
                "y": 0.1930886850147313
              }
            }
          },
          "R": {
            "advance": 0.45190039318479686,
            "glyph": {
              "atlasScale": 58.03752535496946,
              "atlasRect": {
                "x": 256,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.0004543468763646658,
                "y": 0.07437308868495937
              }
            }
          },
          "S": {
            "advance": 0.45190039318479686,
            "glyph": {
              "atlasScale": 60.619703389689064,
              "atlasRect": {
                "x": 224,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.010205329838351769,
                "y": 0.05004805591955963
              }
            }
          },
          "T": {
            "advance": 0.39554390563564873,
            "glyph": {
              "atlasScale": 63.72494432081094,
              "atlasRect": {
                "x": 192,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.03647007426818349,
                "y": 0.032992573176115335
              }
            }
          },
          "U": {
            "advance": 0.3672346002621232,
            "glyph": {
              "atlasScale": 60.619703389689064,
              "atlasRect": {
                "x": 160,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.05004805591955963,
                "y": 0.058435998252456094
              }
            }
          },
          "V": {
            "advance": 0.2823066841415465,
            "glyph": {
              "atlasScale": 68.82140709539922,
              "atlasRect": {
                "x": 128,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.05463521188286238,
                "y": 0.023180428134500657
              }
            }
          },
          "W": {
            "advance": 0.6214941022280471,
            "glyph": {
              "atlasScale": 50.957257346380004,
              "atlasRect": {
                "x": 96,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.08103101791169594,
                "y": 0.10848405417218349
              }
            }
          },
          "X": {
            "advance": 0.45190039318479686,
            "glyph": {
              "atlasScale": 62.43862520441875,
              "atlasRect": {
                "x": 64,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.0382437745740498,
                "y": 0.043538663171690695
              }
            }
          },
          "Y": {
            "advance": 0.39554390563564873,
            "glyph": {
              "atlasScale": 67.28395061701796,
              "atlasRect": {
                "x": 32,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.003486238532110092,
                "y": 0.04081258191349934
              }
            }
          },
          "Z": {
            "advance": 0.2823066841415465,
            "glyph": {
              "atlasScale": 68.82140709539922,
              "atlasRect": {
                "x": 0,
                "y": 96,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.06892092616857667,
                "y": 0.022394058540791614
              }
            }
          },
          "[": {
            "advance": 0.24298820445609437,
            "glyph": {
              "atlasScale": 61.334405144550786,
              "atlasRect": {
                "x": 480,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09520314547837483,
                "y": 0.06768020969855831
              }
            }
          },
          "\\": {
            "advance": 0.327129750982962,
            "glyph": {
              "atlasScale": 60.141881240235165,
              "atlasRect": {
                "x": 448,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09382262996936304,
                "y": 0.02685015290514286
              }
            }
          },
          "]": {
            "advance": 0.24298820445609437,
            "glyph": {
              "atlasScale": 59.362033195042265,
              "atlasRect": {
                "x": 416,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.14174748798607603,
                "y": 0.06795980777637746
              }
            }
          },
          "^": {
            "advance": 0.2854521625163827,
            "glyph": {
              "atlasScale": 123.06451612889765,
              "atlasRect": {
                "x": 384,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.016251638269986893,
                "y": -0.1127129750982962
              }
            }
          },
          "_": {
            "advance": 0.327129750982962,
            "glyph": {
              "atlasScale": 89.9764150940922,
              "atlasRect": {
                "x": 352,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.012686762778505898,
                "y": 0.14833551769331585
              }
            }
          },
          "`": {
            "advance": 0.1596330275229358,
            "glyph": {
              "atlasScale": 184.00321543424843,
              "atlasRect": {
                "x": 320,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.01224989078199528,
                "y": -0.2797553516825164
              }
            }
          },
          "a": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 103.10810810812423,
              "atlasRect": {
                "x": 288,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.007077326343381389,
                "y": 0.025950196592398427
              }
            }
          },
          "b": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 59.609375,
              "atlasRect": {
                "x": 256,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.10445609436435124,
                "y": 0.016775884665792922
              }
            }
          },
          "c": {
            "advance": 0.19764089121887288,
            "glyph": {
              "atlasScale": 114.90963855400861,
              "atlasRect": {
                "x": 224,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.0031979030144167757,
                "y": 0.00870249017038008
              }
            }
          },
          "d": {
            "advance": 0.2823066841415465,
            "glyph": {
              "atlasScale": 59.609375,
              "atlasRect": {
                "x": 192,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09672346002621232,
                "y": 0.016775884665792922
              }
            }
          },
          "e": {
            "advance": 0.19764089121887288,
            "glyph": {
              "atlasScale": 115.48940464168517,
              "atlasRect": {
                "x": 160,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.014932284840547313,
                "y": 0.008920926168626999
              }
            }
          },
          "f": {
            "advance": 0.19764089121887288,
            "glyph": {
              "atlasScale": 46.52439024389953,
              "atlasRect": {
                "x": 128,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.20799475753604194,
                "y": 0.1798165137614679
              }
            }
          },
          "g": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 59.45454545456946,
              "atlasRect": {
                "x": 96,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.10958093893871561,
                "y": 0.26006989952
              }
            }
          },
          "h": {
            "advance": 0.2823066841415465,
            "glyph": {
              "atlasScale": 59.609375,
              "atlasRect": {
                "x": 64,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09252948885976409,
                "y": 0.016775884665792922
              }
            }
          },
          "i": {
            "advance": 0.14102228047182175,
            "glyph": {
              "atlasScale": 80.14705882376485,
              "atlasRect": {
                "x": 32,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09058977719528179,
                "y": 0.012477064220183487
              }
            }
          },
          "j": {
            "advance": 0.16933158584534733,
            "glyph": {
              "atlasScale": 56.213163064830084,
              "atlasRect": {
                "x": 0,
                "y": 64,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.17139362166941022,
                "y": 0.17716033202327655
              }
            }
          },
          "k": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 60.01573151566562,
              "atlasRect": {
                "x": 480,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09464394932290432,
                "y": 0.01666229794670721
              }
            }
          },
          "l": {
            "advance": 0.14102228047182175,
            "glyph": {
              "atlasScale": 59.609375,
              "atlasRect": {
                "x": 448,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.1416775884665793,
                "y": 0.016775884665792922
              }
            }
          },
          "m": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 80.37219101114219,
              "atlasRect": {
                "x": 416,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.012721712538220707,
                "y": 0.06932284840547312
              }
            }
          },
          "n": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 102.55376344104609,
              "atlasRect": {
                "x": 384,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.023800786369593707,
                "y": 0.02652686762778506
              }
            }
          },
          "o": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 107.66698024474218,
              "atlasRect": {
                "x": 352,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.007487986020101704,
                "y": 0.019903888160712976
              }
            }
          },
          "p": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 64.69756924790468,
              "atlasRect": {
                "x": 320,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.1197815640018034,
                "y": 0.21938837920545218
              }
            }
          },
          "q": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 66.27069723046719,
              "atlasRect": {
                "x": 288,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.09883898765756226,
                "y": 0.20801229911402358
              }
            }
          },
          "r": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 115.02512562837735,
              "atlasRect": {
                "x": 256,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.024858016601079946,
                "y": 0.0092179991262616
              }
            }
          },
          "s": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 105.00000000010392,
              "atlasRect": {
                "x": 224,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.009523809523803932,
                "y": 0.023547400611564875
              }
            }
          },
          "t": {
            "advance": 0.19764089121887288,
            "glyph": {
              "atlasScale": 63.86718750008516,
              "atlasRect": {
                "x": 192,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.1372826561816828,
                "y": 0.01565749235473447
              }
            }
          },
          "u": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 101.73333333353203,
              "atlasRect": {
                "x": 160,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.01402359108781127,
                "y": 0.026998689384010486
              }
            }
          },
          "v": {
            "advance": 0.22595019659239843,
            "glyph": {
              "atlasScale": 113.20474777419064,
              "atlasRect": {
                "x": 128,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.01672346002621232,
                "y": 0.011716906946264745
              }
            }
          },
          "w": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 80.82627118645078,
              "atlasRect": {
                "x": 96,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.0065006553079947575,
                "y": 0.06676277850589776
              }
            }
          },
          "x": {
            "advance": 0.2823066841415465,
            "glyph": {
              "atlasScale": 98.32474226789374,
              "atlasRect": {
                "x": 64,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.00346002621231979,
                "y": 0.03218872870249017
              }
            }
          },
          "y": {
            "advance": 0.254259501965924,
            "glyph": {
              "atlasScale": 59.17786970008813,
              "atlasRect": {
                "x": 32,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.10811708169511926,
                "y": 0.2606727828751769
              }
            }
          },
          "z": {
            "advance": 0.16933158584534733,
            "glyph": {
              "atlasScale": 112.42632612966017,
              "atlasRect": {
                "x": 0,
                "y": 32,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.020166011358615992,
                "y": 0.01151594582786684
              }
            }
          },
          "{": {
            "advance": 0.3108781127129751,
            "glyph": {
              "atlasScale": 53.58146067413453,
              "atlasRect": {
                "x": 480,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.11027522935779817,
                "y": 0.10044560943643512
              }
            }
          },
          "|": {
            "advance": 0.327129750982962,
            "glyph": {
              "atlasScale": 60.619703389689064,
              "atlasRect": {
                "x": 448,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.07272171253817038,
                "y": 0.02488422892087025
              }
            }
          },
          "}": {
            "advance": 0.327129750982962,
            "glyph": {
              "atlasScale": 54.86577181207008,
              "atlasRect": {
                "x": 416,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.12687636522493317,
                "y": 0.10787243337696462
              }
            }
          },
          "~": {
            "advance": 0.22647444298820446,
            "glyph": {
              "atlasScale": 138.22463768115077,
              "atlasRect": {
                "x": 384,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.03103538663171691,
                "y": -0.27847968545216256
              }
            }
          },
          "Δ": {
            "advance": 0.11716906946264745
          },
          "Θ": {
            "advance": 0.11716906946264745
          },
          "Ξ": {
            "advance": 0.11716906946264745
          },
          "Σ": {
            "advance": 0.11716906946264745
          },
          "Ω": {
            "advance": 0.11716906946264745
          },
          "α": {
            "advance": 0.11716906946264745
          },
          "β": {
            "advance": 0.11716906946264745
          },
          "γ": {
            "advance": 0.11716906946264745
          },
          "ε": {
            "advance": 0.11716906946264745
          },
          "ζ": {
            "advance": 0.11716906946264745
          },
          "η": {
            "advance": 0.11716906946264745
          },
          "θ": {
            "advance": 0.11716906946264745
          },
          "λ": {
            "advance": 0.11716906946264745
          },
          "μ": {
            "advance": 0.11716906946264745
          },
          "ν": {
            "advance": 0.11716906946264745
          },
          "π": {
            "advance": 0.11716906946264745
          },
          "σ": {
            "advance": 0.11716906946264745
          },
          "τ": {
            "advance": 0.11716906946264745
          },
          "υ": {
            "advance": 0.11716906946264745
          },
          "φ": {
            "advance": 0.11716906946264745
          },
          "χ": {
            "advance": 0.11716906946264745
          },
          "ω": {
            "advance": 0.11716906946264745
          },
          "£": {
            "advance": 0.3944954128440367,
            "glyph": {
              "atlasScale": 65.66265060263126,
              "atlasRect": {
                "x": 352,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.049515072083879424,
                "y": 0.022830930537352554
              }
            }
          },
          "©": {
            "advance": 0.46972477064220186,
            "glyph": {
              "atlasScale": 75.34562211955078,
              "atlasRect": {
                "x": 320,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.014775010921805503,
                "y": 0.019432066404487552
              }
            }
          },
          "«": {
            "advance": 0.37745740498034075,
            "glyph": {
              "atlasScale": 93.12449145621017,
              "atlasRect": {
                "x": 288,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.03958934032322936,
                "y": 0.031314984709536045
              }
            }
          },
          "»": {
            "advance": 0.37745740498034075,
            "glyph": {
              "atlasScale": 93.12449145621017,
              "atlasRect": {
                "x": 256,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.03958934032322936,
                "y": 0.031314984709536045
              }
            }
          },
          "±": {
            "advance": 0.33892529488859763,
            "glyph": {
              "atlasScale": 99.52173913035702,
              "atlasRect": {
                "x": 224,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.012887723896903801,
                "y": 0.009785932721706947
              }
            }
          },
          "·": {
            "advance": 0.18453473132372214,
            "glyph": {
              "atlasScale": 324.2209631728484,
              "atlasRect": {
                "x": 192,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.08066404543463172,
                "y": 0.0030843162953310614
              }
            }
          },
          "×": {
            "advance": 0.33551769331585846,
            "glyph": {
              "atlasScale": 165.39017341049765,
              "atlasRect": {
                "x": 160,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": -0.08359982525114548,
                "y": -0.03799038881602097
              }
            }
          },
          "²": {
            "advance": 0.2600262123197903,
            "glyph": {
              "atlasScale": 123.5961123110164,
              "atlasRect": {
                "x": 128,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.0004892966360861862,
                "y": -0.15154215814760683
              }
            }
          },
          "³": {
            "advance": 0.20131061598951508,
            "glyph": {
              "atlasScale": 135.76512455489922,
              "atlasRect": {
                "x": 96,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.02165137614678899,
                "y": -0.18241153342070773
              }
            }
          },
          "¼": {
            "advance": 0.46107470511140236,
            "glyph": {
              "atlasScale": 69.07060953528749,
              "atlasRect": {
                "x": 64,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.00006116207951064745,
                "y": 0.02784622105717431
              }
            }
          },
          "½": {
            "advance": 0.45321100917431195,
            "glyph": {
              "atlasScale": 67.80213270119296,
              "atlasRect": {
                "x": 32,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.00033202271734437743,
                "y": 0.01750109218004718
              }
            }
          },
          "¾": {
            "advance": 0.46998689384010484,
            "glyph": {
              "atlasScale": 65.85155350957969,
              "atlasRect": {
                "x": 0,
                "y": 0,
                "w": 32,
                "h": 32
              },
              "offset": {
                "x": 0.010336391437303277,
                "y": 0.026981214504094367
              }
            }
          }
        },
        "kerning": {
          "Ta": -0.10065530799475754,
          "Tc": -0.10065530799475754,
          "Td": -0.10065530799475754,
          "Te": -0.10065530799475754,
          "Tg": -0.10065530799475754,
          "To": -0.10065530799475754,
          "Tp": -0.10065530799475754,
          "Tq": -0.10065530799475754
        },
        "textures": [
          [
            {
              "localPath": "Pacifico-0.png"
            }
          ]
        ],
        "textureSize": {
          "w": 512,
          "h": 256
        },
        "ascender": 0.7551769331585846,
        "descender": -0.24482306684141547,
        "typoAscender": 0.7551769331585846,
        "typoDescender": -0.3522935779816514,
        "lowercaseHeight": 0.20209698558322411,
        "metadata": {
          "family": "Pacifico",
          "subfamily": "Regular",
          "version": "Version 1.000",
          "postScriptName": "Pacifico",
          "copyright": "Copyright (c) 2011 by vernon adams. All rights reserved.",
          "trademark": "Pacifico is a trademark of vernon adams.",
          "manufacturer": "vernon adams",
          "manufacturerURL": null,
          "designerURL": null,
          "license": null,
          "licenseURL": null,
          "height_funits": 3815,
          "funitsPerEm": 2048
        },
        "glyphBounds": null,
        "fieldRange_px": 2
      }
    }
      /*
        return { "format": "TextureAtlasFontJson",
  "version": 1,
  "technique": "msdf",
  "characters": {
    "0": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 51.888372093084065,
        "atlasRect": {
          "x": 32,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09842237361061312,
          "y": 0.0457153101470061
        }
      }
    },
    "1": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 480,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.13765814680117605,
          "y": 0.03744301592989602
        }
      }
    },
    "2": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 52.65812542123703,
        "atlasRect": {
          "x": 416,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09570762690157045,
          "y": 0.03798084310809609
        }
      }
    },
    "3": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 352,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.10267376940012908,
          "y": 0.04566408851092148
        }
      }
    },
    "4": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 53.12380952391328,
        "atlasRect": {
          "x": 288,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09089279311581212,
          "y": 0.03764790247400502
        }
      }
    },
    "5": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 52.69365721979188,
        "atlasRect": {
          "x": 224,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09102084720579419,
          "y": 0.04512626133272141
        }
      }
    },
    "6": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 160,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.0949649131792614,
          "y": 0.04566408851092148
        }
      }
    },
    "7": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 96,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09140500947596988,
          "y": 0.03744301592989602
        }
      }
    },
    "8": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 32,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09837115197452852,
          "y": 0.04566408851092148
        }
      }
    },
    "9": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 480,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09872970342666189,
          "y": 0.04566408851092148
        }
      }
    },
    "\t": {
      "advance": 0.44065973467192543
    },
    " ": {
      "advance": 0.19074937253495877
    },
    "!": {
      "advance": 0.19612764431695948,
      "glyph": {
        "atlasScale": 52.37558685435984,
        "atlasRect": {
          "x": 0,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.20778056651129437,
          "y": 0.04858372176407314
        }
      }
    },
    "\"": {
      "advance": 0.29437074220150594,
      "glyph": {
        "atlasScale": 140.70630630635736,
        "atlasRect": {
          "x": 416,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.033473339138386515,
          "y": -0.31583260769250626
        }
      }
    },
    "#": {
      "advance": 0.47436357117246325,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 352,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.0627208933052994,
          "y": 0.03744301592989602
        }
      }
    },
    "$": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 46.67782426765297,
        "atlasRect": {
          "x": 288,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.13356041591968448,
          "y": 0.0855145213338114
        }
      }
    },
    "%": {
      "advance": 0.6045177482968807,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 224,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.005864877324185012,
          "y": 0.04566408851092148
        }
      }
    },
    "&": {
      "advance": 0.5360344209394048,
      "glyph": {
        "atlasScale": 51.888372093084065,
        "atlasRect": {
          "x": 160,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.020795984223736106,
          "y": 0.0457153101470061
        }
      }
    },
    "'": {
      "advance": 0.16242380781642166,
      "glyph": {
        "atlasScale": 147.90151515154156,
        "atlasRect": {
          "x": 96,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.027147467090197205,
          "y": -0.32136454438321976
        }
      }
    },
    "(": {
      "advance": 0.21728217999282898,
      "glyph": {
        "atlasScale": 43.72452407632203,
        "atlasRect": {
          "x": 32,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.25352148747565434,
          "y": 0.1619115914562639
        }
      }
    },
    ")": {
      "advance": 0.21728217999282898,
      "glyph": {
        "atlasScale": 43.72452407632203,
        "atlasRect": {
          "x": 480,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.26105106797045535,
          "y": 0.1619115914562639
        }
      }
    },
    "*": {
      "advance": 0.4051631409107207,
      "glyph": {
        "atlasScale": 82.02941176485969,
        "atlasRect": {
          "x": 416,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.006453926138400861,
          "y": -0.19845822875582647
        }
      }
    },
    "+": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 78.7217741934078,
        "atlasRect": {
          "x": 352,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.006325872048349947,
          "y": -0.055985248168892075
        }
      }
    },
    ",": {
      "advance": 0.17999282897095734,
      "glyph": {
        "atlasScale": 155.56175298814156,
        "atlasRect": {
          "x": 288,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.026123034369652205,
          "y": 0.10751421400392973
        }
      }
    },
    "-": {
      "advance": 0.23628540695589817,
      "glyph": {
        "atlasScale": 159.04684317726216,
        "atlasRect": {
          "x": 224,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.017543410336516314,
          "y": -0.09624545407977052
        }
      }
    },
    ".": {
      "advance": 0.19541054141269273,
      "glyph": {
        "atlasScale": 288.16236162356154,
        "atlasRect": {
          "x": 160,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.0421810172617569,
          "y": 0.01733852379245321
        }
      }
    },
    "/": {
      "advance": 0.2696306920043026,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 96,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.164908057163313,
          "y": 0.03744301592989602
        }
      }
    },
    ":": {
      "advance": 0.19541054141269273,
      "glyph": {
        "atlasScale": 67.72940156114937,
        "atlasRect": {
          "x": 416,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.1385289146134672,
          "y": 0.039927265276787374
        }
      }
    },
    ";": {
      "advance": 0.19541054141269273,
      "glyph": {
        "atlasScale": 56.26224783858407,
        "atlasRect": {
          "x": 352,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.20334989499571174,
          "y": 0.13020539876050197
        }
      }
    },
    "<": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 78.17017017000484,
        "atlasRect": {
          "x": 288,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.004891666239816421,
          "y": -0.0611842442248261
        }
      }
    },
    "=": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 83.96989247311359,
        "atlasRect": {
          "x": 224,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.018849562055021873,
          "y": -0.0683296624494514
        }
      }
    },
    ">": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 78.17017017000484,
        "atlasRect": {
          "x": 160,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.004891666239816421,
          "y": -0.0611842442248261
        }
      }
    },
    "?": {
      "advance": 0.315166726425242,
      "glyph": {
        "atlasScale": 51.64814814835797,
        "atlasRect": {
          "x": 96,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.15704553603442095,
          "y": 0.04912154894227322
        }
      }
    },
    "@": {
      "advance": 0.6600932233775547,
      "glyph": {
        "atlasScale": 47.44349939232203,
        "atlasRect": {
          "x": 32,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.007196639860686985,
          "y": 0.10884597654052348
        }
      }
    },
    "A": {
      "advance": 0.46468268196486195,
      "glyph": {
        "atlasScale": 53.19618528625672,
        "atlasRect": {
          "x": 480,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.06843210572139118,
          "y": 0.0375966808379204
        }
      }
    },
    "B": {
      "advance": 0.4757977769809968,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 416,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.04586897505503048,
          "y": 0.03744301592989602
        }
      }
    },
    "C": {
      "advance": 0.4632484761563284,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 352,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.06484659120005737,
          "y": 0.04566408851092148
        }
      }
    },
    "D": {
      "advance": 0.535317318035138,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 288,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.018260513240783077,
          "y": 0.03744301592989602
        }
      }
    },
    "E": {
      "advance": 0.4083901039799211,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 224,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08136556881623522,
          "y": 0.03744301592989602
        }
      }
    },
    "F": {
      "advance": 0.3789888849049839,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 160,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08136556881623522,
          "y": 0.03744301592989602
        }
      }
    },
    "G": {
      "advance": 0.5346002151308713,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 96,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.04512626133272141,
          "y": 0.04566408851092148
        }
      }
    },
    "H": {
      "advance": 0.541771244173539,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 32,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.028479229626561492,
          "y": 0.03744301592989602
        }
      }
    },
    "I": {
      "advance": 0.20473287916816063,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 480,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.19699841212925065,
          "y": 0.03744301592989602
        }
      }
    },
    "J": {
      "advance": 0.19612764431695948,
      "glyph": {
        "atlasScale": 42.280454791563876,
        "atlasRect": {
          "x": 416,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.34257030169609176,
          "y": 0.18534548993491576
        }
      }
    },
    "K": {
      "advance": 0.4506991753316601,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 352,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.03816011883416278,
          "y": 0.03744301592989602
        }
      }
    },
    "L": {
      "advance": 0.3811401936177842,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 288,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08136556881623522,
          "y": 0.03744301592989602
        }
      }
    },
    "M": {
      "advance": 0.6629616349946217,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 224,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.03211596578397992,
          "y": 0.03744301592989602
        }
      }
    },
    "N": {
      "advance": 0.5536034420939405,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 160,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.02274240639245034,
          "y": 0.03744301592989602
        }
      }
    },
    "O": {
      "advance": 0.5718895661527429,
      "glyph": {
        "atlasScale": 51.888372093084065,
        "atlasRect": {
          "x": 96,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.02240946575833632,
          "y": 0.0457153101470061
        }
      }
    },
    "P": {
      "advance": 0.44209394048045897,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 32,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.06128668749676587,
          "y": 0.03744301592989602
        }
      }
    },
    "Q": {
      "advance": 0.5718895661527429,
      "glyph": {
        "atlasScale": 42.60338243315952,
        "atlasRect": {
          "x": 480,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08961225221530299,
          "y": 0.17172053475384724
        }
      }
    },
    "R": {
      "advance": 0.45392613840086055,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 416,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.042821287711896736,
          "y": 0.03744301592989602
        }
      }
    },
    "S": {
      "advance": 0.4030118321979204,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 352,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.10500435383899606,
          "y": 0.04566408851092148
        }
      }
    },
    "T": {
      "advance": 0.4062387952671208,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 288,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.0966040055319039,
          "y": 0.03744301592989602
        }
      }
    },
    "U": {
      "advance": 0.5346002151308713,
      "glyph": {
        "atlasScale": 52.69365721979188,
        "atlasRect": {
          "x": 224,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.03634175075545357,
          "y": 0.04512626133272141
        }
      }
    },
    "V": {
      "advance": 0.4370742201505916,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 160,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08100701736410183,
          "y": 0.03744301592989602
        }
      }
    },
    "W": {
      "advance": 0.6798135532448907,
      "glyph": {
        "atlasScale": 42.418250950559404,
        "atlasRect": {
          "x": 96,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.03746862674793833,
          "y": 0.11509501613481535
        }
      }
    },
    "X": {
      "advance": 0.4238078164216565,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 32,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08764021922856939,
          "y": 0.03744301592989602
        }
      }
    },
    "Y": {
      "advance": 0.4112585155969882,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 480,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09391486964090355,
          "y": 0.03744301592989602
        }
      }
    },
    "Z": {
      "advance": 0.41914664754392256,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 416,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08997080366743636,
          "y": 0.03744301592989602
        }
      }
    },
    "[": {
      "advance": 0.2416636787378989,
      "glyph": {
        "atlasScale": 43.72452407632203,
        "atlasRect": {
          "x": 352,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.22447881985353887,
          "y": 0.1619115914562639
        }
      }
    },
    "\\": {
      "advance": 0.2696306920043026,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 160,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.16401167853297954,
          "y": 0.03744301592989602
        }
      }
    },
    "]": {
      "advance": 0.2416636787378989,
      "glyph": {
        "atlasScale": 43.72452407632203,
        "atlasRect": {
          "x": 32,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.26571223684818934,
          "y": 0.1619115914562639
        }
      }
    },
    "^": {
      "advance": 0.39799211186805306,
      "glyph": {
        "atlasScale": 77.31881188107594,
        "atlasRect": {
          "x": 64,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.008297905035083543,
          "y": -0.1559186600419362
        }
      }
    },
    "_": {
      "advance": 0.3291502330584439,
      "glyph": {
        "atlasScale": 84.33261339113297,
        "atlasRect": {
          "x": 96,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.0251498232854213,
          "y": 0.2791835271228397
        }
      }
    },
    "`": {
      "advance": 0.4238078164216565,
      "glyph": {
        "atlasScale": 198.7073791349022,
        "atlasRect": {
          "x": 128,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.1308456692106418,
          "y": -0.4232443784261026
        }
      }
    },
    "a": {
      "advance": 0.4083901039799211,
      "glyph": {
        "atlasScale": 68.86419753085343,
        "atlasRect": {
          "x": 480,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.04105414126927214,
          "y": 0.036213696665471494
        }
      }
    },
    "b": {
      "advance": 0.44998207242739335,
      "glyph": {
        "atlasScale": 49.550761421169376,
        "atlasRect": {
          "x": 192,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08679506223432054,
          "y": 0.0475336782257153
        }
      }
    },
    "c": {
      "advance": 0.34958766583004663,
      "glyph": {
        "atlasScale": 68.74295774637453,
        "atlasRect": {
          "x": 224,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.049531322030491216,
          "y": 0.036264918301556114
        }
      }
    },
    "d": {
      "advance": 0.44998207242739335,
      "glyph": {
        "atlasScale": 49.550761421169376,
        "atlasRect": {
          "x": 256,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.10884597654052348,
          "y": 0.0475336782257153
        }
      }
    },
    "e": {
      "advance": 0.4119756185012549,
      "glyph": {
        "atlasScale": 68.74295774637453,
        "atlasRect": {
          "x": 288,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.02532909901148799,
          "y": 0.036264918301556114
        }
      }
    },
    "f": {
      "advance": 0.24883470778056652,
      "glyph": {
        "atlasScale": 49.83535417980376,
        "atlasRect": {
          "x": 320,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.17566460072731443,
          "y": 0.040132151820896377
        }
      }
    },
    "g": {
      "advance": 0.4022947292936536,
      "glyph": {
        "atlasScale": 48.56467661706719,
        "atlasRect": {
          "x": 384,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.13010295548833276,
          "y": 0.21758950980887773
        }
      }
    },
    "h": {
      "advance": 0.4506991753316601,
      "glyph": {
        "atlasScale": 50.187660668519385,
        "atlasRect": {
          "x": 448,
          "y": 0,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09148184193009681,
          "y": 0.03985043282288993
        }
      }
    },
    "i": {
      "advance": 0.18572965220509144,
      "glyph": {
        "atlasScale": 51.95741849626469,
        "atlasRect": {
          "x": 0,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.21472109819181068,
          "y": 0.038493059468253855
        }
      }
    },
    "j": {
      "advance": 0.18572965220509144,
      "glyph": {
        "atlasScale": 39.14385964911899,
        "atlasRect": {
          "x": 64,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.3644675510935819,
          "y": 0.22750089637863033
        }
      }
    },
    "k": {
      "advance": 0.38544281104338474,
      "glyph": {
        "atlasScale": 50.187660668519385,
        "atlasRect": {
          "x": 128,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09847359524669773,
          "y": 0.03985043282288993
        }
      }
    },
    "l": {
      "advance": 0.18572965220509144,
      "glyph": {
        "atlasScale": 50.187660668519385,
        "atlasRect": {
          "x": 192,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.22593863648011475,
          "y": 0.03985043282288993
        }
      }
    },
    "m": {
      "advance": 0.683040516314091,
      "glyph": {
        "atlasScale": 49.96289187447188,
        "atlasRect": {
          "x": 256,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.023075347026518464,
          "y": 0.12016595810076729
        }
      }
    },
    "n": {
      "advance": 0.4506991753316601,
      "glyph": {
        "atlasScale": 69.97491039447921,
        "atlasRect": {
          "x": 320,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.001331762536495088,
          "y": 0.02858167289873073
        }
      }
    },
    "o": {
      "advance": 0.44352814628899245,
      "glyph": {
        "atlasScale": 68.74295774637453,
        "atlasRect": {
          "x": 384,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.010987040926083902,
          "y": 0.036264918301556114
        }
      }
    },
    "p": {
      "advance": 0.44998207242739335,
      "glyph": {
        "atlasScale": 48.56467661706719,
        "atlasRect": {
          "x": 448,
          "y": 32,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09335143164466118,
          "y": 0.21758950980887773
        }
      }
    },
    "q": {
      "advance": 0.44998207242739335,
      "glyph": {
        "atlasScale": 48.56467661706719,
        "atlasRect": {
          "x": 0,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.11540234595086411,
          "y": 0.21758950980887773
        }
      }
    },
    "r": {
      "advance": 0.2997490139835066,
      "glyph": {
        "atlasScale": 69.97491039447921,
        "atlasRect": {
          "x": 64,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.05242534446560057,
          "y": 0.02858167289873073
        }
      }
    },
    "s": {
      "advance": 0.3503047687343134,
      "glyph": {
        "atlasScale": 68.74295774637453,
        "atlasRect": {
          "x": 128,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.055447420990692005,
          "y": 0.036264918301556114
        }
      }
    },
    "t": {
      "advance": 0.2592326998924346,
      "glyph": {
        "atlasScale": 57.001459854001865,
        "atlasRect": {
          "x": 192,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.15322952415093583,
          "y": 0.042257849715654355
        }
      }
    },
    "u": {
      "advance": 0.4506991753316601,
      "glyph": {
        "atlasScale": 69.97491039447921,
        "atlasRect": {
          "x": 256,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.005455104236035855,
          "y": 0.03575270194139835
        }
      }
    },
    "v": {
      "advance": 0.36787378988884906,
      "glyph": {
        "atlasScale": 71.25182481750235,
        "atlasRect": {
          "x": 320,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.04061875736301183,
          "y": 0.02806945653834349
        }
      }
    },
    "w": {
      "advance": 0.5711724632484761,
      "glyph": {
        "atlasScale": 50.44702842385594,
        "atlasRect": {
          "x": 384,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.03139886287971316,
          "y": 0.12067817446092508
        }
      }
    },
    "x": {
      "advance": 0.38472570813911794,
      "glyph": {
        "atlasScale": 71.25182481750235,
        "atlasRect": {
          "x": 448,
          "y": 64,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.03255134969001076,
          "y": 0.02806945653834349
        }
      }
    },
    "y": {
      "advance": 0.37002509860164934,
      "glyph": {
        "atlasScale": 49.176322418112974,
        "atlasRect": {
          "x": 0,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.1403472826921764,
          "y": 0.21707729344871998
        }
      }
    },
    "z": {
      "advance": 0.3434922911437791,
      "glyph": {
        "atlasScale": 71.25182481750235,
        "atlasRect": {
          "x": 64,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.052630231009480104,
          "y": 0.02806945653834349
        }
      }
    },
    "{": {
      "advance": 0.27823592685550375,
      "glyph": {
        "atlasScale": 43.72452407632203,
        "atlasRect": {
          "x": 128,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.22860216155307278,
          "y": 0.1619115914562639
        }
      }
    },
    "|": {
      "advance": 0.4044460380064539,
      "glyph": {
        "atlasScale": 38.05653021444423,
        "atlasRect": {
          "x": 192,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.21802489371513803,
          "y": 0.23039491881305127
        }
      }
    },
    "}": {
      "advance": 0.27823592685550375,
      "glyph": {
        "atlasScale": 43.72452407632203,
        "atlasRect": {
          "x": 256,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.22483737130567227,
          "y": 0.1619115914562639
        }
      }
    },
    "~": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 81.26118626441594,
        "atlasRect": {
          "x": 320,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.012677354914719254,
          "y": -0.06197817958299032
        }
      }
    },
    "Δ": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 384,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08943297648923629,
          "y": 0.03744301592989602
        }
      }
    },
    "Θ": {
      "advance": 0.5718895661527429,
      "glyph": {
        "atlasScale": 51.888372093084065,
        "atlasRect": {
          "x": 448,
          "y": 96,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.02240946575833632,
          "y": 0.0457153101470061
        }
      }
    },
    "Ξ": {
      "advance": 0.4062387952671208,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 0,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09642472980583722,
          "y": 0.03744301592989602
        }
      }
    },
    "Σ": {
      "advance": 0.4162782359268555,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 64,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.08620601342003587,
          "y": 0.03744301592989602
        }
      }
    },
    "Ω": {
      "advance": 0.5743994263176766,
      "glyph": {
        "atlasScale": 52.587205387030785,
        "atlasRect": {
          "x": 128,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.016698253342221588,
          "y": 0.03803206474418071
        }
      }
    },
    "α": {
      "advance": 0.4485478666188598,
      "glyph": {
        "atlasScale": 68.74295774637453,
        "atlasRect": {
          "x": 192,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.0071198074066518464,
          "y": 0.036264918301556114
        }
      }
    },
    "β": {
      "advance": 0.46109716744352813,
      "glyph": {
        "atlasScale": 37.92714910150812,
        "atlasRect": {
          "x": 256,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.17661220099373254,
          "y": 0.22913998873127284
        }
      }
    },
    "γ": {
      "advance": 0.3761204732879168,
      "glyph": {
        "atlasScale": 49.176322418112974,
        "atlasRect": {
          "x": 320,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.13747887107510937,
          "y": 0.21707729344871998
        }
      }
    },
    "ε": {
      "advance": 0.34887056292577984,
      "glyph": {
        "atlasScale": 68.74295774637453,
        "atlasRect": {
          "x": 384,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.05473031808642524,
          "y": 0.036264918301556114
        }
      }
    },
    "ζ": {
      "advance": 0.35460738615991394,
      "glyph": {
        "atlasScale": 39.90393459378619,
        "atlasRect": {
          "x": 448,
          "y": 128,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.21397838446950163,
          "y": 0.19389950315003227
        }
      }
    },
    "η": {
      "advance": 0.4506991753316601,
      "glyph": {
        "atlasScale": 48.56467661706719,
        "atlasRect": {
          "x": 0,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.10213594222192901,
          "y": 0.21758950980887773
        }
      }
    },
    "θ": {
      "advance": 0.43456435998565796,
      "glyph": {
        "atlasScale": 48.838023764695784,
        "atlasRect": {
          "x": 64,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.11015212825907493,
          "y": 0.04812272704
        }
      }
    },
    "λ": {
      "advance": 0.39225528863391895,
      "glyph": {
        "atlasScale": 49.14537444913188,
        "atlasRect": {
          "x": 128,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.13194693438508426,
          "y": 0.047866618859806385
        }
      }
    },
    "μ": {
      "advance": 0.4546432413051273,
      "glyph": {
        "atlasScale": 49.176322418112974,
        "atlasRect": {
          "x": 192,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.09803821134043743,
          "y": 0.21707729344871998
        }
      }
    },
    "ν": {
      "advance": 0.39799211186805306,
      "glyph": {
        "atlasScale": 71.25182481750235,
        "atlasRect": {
          "x": 256,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.04061875736301183,
          "y": 0.02806945653834349
        }
      }
    },
    "π": {
      "advance": 0.4772319827895303,
      "glyph": {
        "atlasScale": 62.82542236538,
        "atlasRect": {
          "x": 320,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.022870460482501256,
          "y": 0.06177329303888132
        }
      }
    },
    "σ": {
      "advance": 0.44998207242739335,
      "glyph": {
        "atlasScale": 69.97491039447921,
        "atlasRect": {
          "x": 384,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.008169850945032628,
          "y": 0.03575270194139835
        }
      }
    },
    "τ": {
      "advance": 0.3474363571172463,
      "glyph": {
        "atlasScale": 69.6628010703072,
        "atlasRect": {
          "x": 448,
          "y": 160,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.062413563489250624,
          "y": 0.03767351329204733
        }
      }
    },
    "υ": {
      "advance": 0.4471136608103263,
      "glyph": {
        "atlasScale": 69.97491039447921,
        "atlasRect": {
          "x": 0,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.004584336423698817,
          "y": 0.03575270194139835
        }
      }
    },
    "φ": {
      "advance": 0.5270706346360703,
      "glyph": {
        "atlasScale": 48.56467661706719,
        "atlasRect": {
          "x": 64,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.06574296983039082,
          "y": 0.21758950980887773
        }
      }
    },
    "χ": {
      "advance": 0.40086052348512013,
      "glyph": {
        "atlasScale": 48.99121706378,
        "atlasRect": {
          "x": 128,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.13225426420113304,
          "y": 0.21723095835674433
        }
      }
    },
    "ω": {
      "advance": 0.5675869487271423,
      "glyph": {
        "atlasScale": 57.71766444926515,
        "atlasRect": {
          "x": 192,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.006581980228451774,
          "y": 0.08431081288742918
        }
      }
    },
    "£": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 52.72923700222016,
        "atlasRect": {
          "x": 256,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.0963735081697526,
          "y": 0.03792962147201147
        }
      }
    },
    "©": {
      "advance": 0.6109716744352814,
      "glyph": {
        "atlasScale": 51.92287234033281,
        "atlasRect": {
          "x": 320,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.0026635250729809966,
          "y": 0.04586897505503048
        }
      }
    },
    "«": {
      "advance": 0.365005378271782,
      "glyph": {
        "atlasScale": 91.22897196282452,
        "atlasRect": {
          "x": 384,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.007478358858785227,
          "y": -0.01733852379245321
        }
      }
    },
    "»": {
      "advance": 0.365005378271782,
      "glyph": {
        "atlasScale": 91.22897196282452,
        "atlasRect": {
          "x": 448,
          "y": 192,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.006761255954518465,
          "y": -0.01733852379245321
        }
      }
    },
    "±": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 64.11494252890593,
        "atlasRect": {
          "x": 0,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.039978486912871994,
          "y": 0.03083542488347078
        }
      }
    },
    "·": {
      "advance": 0.19541054141269273,
      "glyph": {
        "atlasScale": 289.22962962975873,
        "atlasRect": {
          "x": 64,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.042385903805865904,
          "y": -0.2039133329919541
        }
      }
    },
    "×": {
      "advance": 0.4198637504481893,
      "glyph": {
        "atlasScale": 86.38495575239749,
        "atlasRect": {
          "x": 128,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": -0.024355887927027607,
          "y": -0.07437381549963429
        }
      }
    },
    "²": {
      "advance": 0.254930082466834,
      "glyph": {
        "atlasScale": 87.25363128485047,
        "atlasRect": {
          "x": 192,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.05752189724936537,
          "y": -0.18718946883166726
        }
      }
    },
    "³": {
      "advance": 0.254930082466834,
      "glyph": {
        "atlasScale": 85.6271929823797,
        "atlasRect": {
          "x": 256,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.06387338011582647,
          "y": -0.18065871023913949
        }
      }
    },
    "¼": {
      "advance": 0.5726066690570096,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 320,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.01915689187111653,
          "y": 0.03744301592989602
        }
      }
    },
    "½": {
      "advance": 0.5726066690570096,
      "glyph": {
        "atlasScale": 53.414500683800775,
        "atlasRect": {
          "x": 384,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.02256313066638365,
          "y": 0.03744301592989602
        }
      }
    },
    "¾": {
      "advance": 0.5726066690570096,
      "glyph": {
        "atlasScale": 50.610499028008434,
        "atlasRect": {
          "x": 448,
          "y": 224,
          "w": 32,
          "h": 32
        },
        "offset": {
          "x": 0.030195154433330946,
          "y": 0.05063258720493367
        }
      }
    }
  },
  "kerning": {
    "\"A": -0.0512728576550735,
    "\"T": 0.014700609537468627,
    "\"V": 0.014700609537468627,
    "\"W": 0.014700609537468627,
    "\"Y": 0.007171029042667623,
    "\"a": -0.029401219074937254,
    "\"c": -0.04410182861240588,
    "\"d": -0.04410182861240588,
    "\"e": -0.04410182861240588,
    "\"g": -0.02187163858013625,
    "\"m": -0.02187163858013625,
    "\"n": -0.02187163858013625,
    "\"o": -0.04410182861240588,
    "\"p": -0.02187163858013625,
    "\"q": -0.04410182861240588,
    "\"r": -0.02187163858013625,
    "\"s": -0.02187163858013625,
    "\"u": -0.02187163858013625,
    "\"Δ": -0.0512728576550735,
    "\"α": -0.029401219074937254,
    "\"ε": -0.014700609537468627,
    "\"ζ": -0.014700609537468627,
    "\"η": -0.014700609537468627,
    "\"μ": -0.014700609537468627,
    "\"σ": -0.029401219074937254,
    "\"φ": -0.029401219074937254,
    "'A": -0.0512728576550735,
    "'T": 0.014700609537468627,
    "'V": 0.014700609537468627,
    "'W": 0.014700609537468627,
    "'Y": 0.007171029042667623,
    "'a": -0.029401219074937254,
    "'c": -0.04410182861240588,
    "'d": -0.04410182861240588,
    "'e": -0.04410182861240588,
    "'g": -0.02187163858013625,
    "'m": -0.02187163858013625,
    "'n": -0.02187163858013625,
    "'o": -0.04410182861240588,
    "'p": -0.02187163858013625,
    "'q": -0.04410182861240588,
    "'r": -0.02187163858013625,
    "'s": -0.02187163858013625,
    "'u": -0.02187163858013625,
    "'Δ": -0.0512728576550735,
    "'α": -0.029401219074937254,
    "'ε": -0.014700609537468627,
    "'ζ": -0.014700609537468627,
    "'η": -0.014700609537468627,
    "'μ": -0.014700609537468627,
    "'σ": -0.029401219074937254,
    "'φ": -0.029401219074937254,
    "(J": 0.06597346719254213,
    ",C": -0.03657224811760488,
    ",G": -0.03657224811760488,
    ",O": -0.03657224811760488,
    ",Q": -0.03657224811760488,
    ",T": -0.0512728576550735,
    ",U": -0.014700609537468627,
    ",V": -0.04410182861240588,
    ",W": -0.04410182861240588,
    ",Y": -0.04410182861240588,
    ",Θ": -0.029401219074937254,
    ",θ": -0.014700609537468627,
    "-T": -0.029401219074937254,
    ".C": -0.03657224811760488,
    ".G": -0.03657224811760488,
    ".O": -0.03657224811760488,
    ".Q": -0.03657224811760488,
    ".T": -0.0512728576550735,
    ".U": -0.014700609537468627,
    ".V": -0.04410182861240588,
    ".W": -0.04410182861240588,
    ".Y": -0.04410182861240588,
    ".Θ": -0.029401219074937254,
    ".θ": -0.014700609537468627,
    "A\"": -0.0512728576550735,
    "A'": -0.0512728576550735,
    "AC": -0.014700609537468627,
    "AG": -0.014700609537468627,
    "AJ": 0.09537468626747939,
    "AO": -0.014700609537468627,
    "AQ": -0.014700609537468627,
    "AT": -0.0512728576550735,
    "AV": -0.029401219074937254,
    "AW": -0.029401219074937254,
    "AY": -0.04410182861240588,
    "B,": -0.029401219074937254,
    "B.": -0.029401219074937254,
    "BA": -0.014700609537468627,
    "BT": -0.02187163858013625,
    "BV": -0.007171029042667623,
    "BW": -0.007171029042667623,
    "BX": -0.014700609537468627,
    "BY": -0.007171029042667623,
    "BZ": -0.007171029042667623,
    "CC": -0.014700609537468627,
    "CG": -0.014700609537468627,
    "CO": -0.014700609537468627,
    "CQ": -0.014700609537468627,
    "D,": -0.029401219074937254,
    "D.": -0.029401219074937254,
    "DA": -0.014700609537468627,
    "DT": -0.02187163858013625,
    "DV": -0.007171029042667623,
    "DW": -0.007171029042667623,
    "DX": -0.014700609537468627,
    "DY": -0.007171029042667623,
    "DZ": -0.007171029042667623,
    "EJ": 0.04410182861240588,
    "F,": -0.04410182861240588,
    "F.": -0.04410182861240588,
    "F?": 0.014700609537468627,
    "FA": -0.014700609537468627,
    "KC": -0.014700609537468627,
    "KG": -0.014700609537468627,
    "KO": -0.014700609537468627,
    "KQ": -0.014700609537468627,
    "L\"": -0.05880243814987451,
    "L'": -0.05880243814987451,
    "LC": -0.014700609537468627,
    "LG": -0.014700609537468627,
    "LO": -0.014700609537468627,
    "LQ": -0.014700609537468627,
    "LT": -0.014700609537468627,
    "LU": -0.007171029042667623,
    "LV": -0.014700609537468627,
    "LW": -0.014700609537468627,
    "LY": -0.02187163858013625,
    "O,": -0.029401219074937254,
    "O.": -0.029401219074937254,
    "OA": -0.014700609537468627,
    "OT": -0.02187163858013625,
    "OV": -0.007171029042667623,
    "OW": -0.007171029042667623,
    "OX": -0.014700609537468627,
    "OY": -0.007171029042667623,
    "OZ": -0.007171029042667623,
    "P,": -0.09537468626747939,
    "P.": -0.09537468626747939,
    "PA": -0.03657224811760488,
    "PX": -0.014700609537468627,
    "PZ": -0.007171029042667623,
    "Q,": -0.029401219074937254,
    "Q.": -0.029401219074937254,
    "QA": -0.014700609537468627,
    "QT": -0.02187163858013625,
    "QV": -0.007171029042667623,
    "QW": -0.007171029042667623,
    "QX": -0.014700609537468627,
    "QY": -0.007171029042667623,
    "QZ": -0.007171029042667623,
    "T,": -0.04410182861240588,
    "T-": -0.029401219074937254,
    "T.": -0.04410182861240588,
    "T?": 0.014700609537468627,
    "TA": -0.0512728576550735,
    "TC": -0.014700609537468627,
    "TG": -0.014700609537468627,
    "TO": -0.014700609537468627,
    "TQ": -0.014700609537468627,
    "TT": 0.014700609537468627,
    "Ta": -0.05880243814987451,
    "Tc": -0.0512728576550735,
    "Td": -0.0512728576550735,
    "Te": -0.0512728576550735,
    "Tg": -0.0512728576550735,
    "Tm": -0.03657224811760488,
    "Tn": -0.03657224811760488,
    "To": -0.0512728576550735,
    "Tp": -0.03657224811760488,
    "Tq": -0.0512728576550735,
    "Tr": -0.03657224811760488,
    "Ts": -0.04410182861240588,
    "Tu": -0.03657224811760488,
    "Tv": -0.014700609537468627,
    "Tw": -0.014700609537468627,
    "Tx": -0.014700609537468627,
    "Ty": -0.014700609537468627,
    "Tz": -0.029401219074937254,
    "U,": -0.014700609537468627,
    "U.": -0.014700609537468627,
    "UA": -0.007171029042667623,
    "V,": -0.03657224811760488,
    "V.": -0.03657224811760488,
    "V?": 0.014700609537468627,
    "VA": -0.029401219074937254,
    "VC": -0.007171029042667623,
    "VG": -0.007171029042667623,
    "VO": -0.007171029042667623,
    "VQ": -0.007171029042667623,
    "Va": -0.014700609537468627,
    "Vc": -0.014700609537468627,
    "Vd": -0.014700609537468627,
    "Ve": -0.014700609537468627,
    "Vg": -0.007171029042667623,
    "Vm": -0.007171029042667623,
    "Vn": -0.007171029042667623,
    "Vo": -0.014700609537468627,
    "Vp": -0.007171029042667623,
    "Vq": -0.014700609537468627,
    "Vr": -0.007171029042667623,
    "Vs": -0.007171029042667623,
    "Vu": -0.007171029042667623,
    "W,": -0.03657224811760488,
    "W.": -0.03657224811760488,
    "W?": 0.014700609537468627,
    "WA": -0.029401219074937254,
    "WC": -0.007171029042667623,
    "WG": -0.007171029042667623,
    "WO": -0.007171029042667623,
    "WQ": -0.007171029042667623,
    "Wa": -0.014700609537468627,
    "Wc": -0.014700609537468627,
    "Wd": -0.014700609537468627,
    "We": -0.014700609537468627,
    "Wg": -0.007171029042667623,
    "Wm": -0.007171029042667623,
    "Wn": -0.007171029042667623,
    "Wo": -0.014700609537468627,
    "Wp": -0.007171029042667623,
    "Wq": -0.014700609537468627,
    "Wr": -0.007171029042667623,
    "Ws": -0.007171029042667623,
    "Wu": -0.007171029042667623,
    "XC": -0.014700609537468627,
    "XG": -0.014700609537468627,
    "XO": -0.014700609537468627,
    "XQ": -0.014700609537468627,
    "Y,": -0.04410182861240588,
    "Y.": -0.04410182861240588,
    "Y?": 0.014700609537468627,
    "YA": -0.04410182861240588,
    "YC": -0.014700609537468627,
    "YG": -0.014700609537468627,
    "YO": -0.014700609537468627,
    "YQ": -0.014700609537468627,
    "Ya": -0.03657224811760488,
    "Yc": -0.03657224811760488,
    "Yd": -0.03657224811760488,
    "Ye": -0.03657224811760488,
    "Yg": -0.014700609537468627,
    "Ym": -0.02187163858013625,
    "Yn": -0.02187163858013625,
    "Yo": -0.03657224811760488,
    "Yp": -0.02187163858013625,
    "Yq": -0.03657224811760488,
    "Yr": -0.02187163858013625,
    "Ys": -0.029401219074937254,
    "Yu": -0.02187163858013625,
    "Yz": -0.014700609537468627,
    "ZC": -0.007171029042667623,
    "ZG": -0.007171029042667623,
    "ZO": -0.007171029042667623,
    "ZQ": -0.007171029042667623,
    "[J": 0.06597346719254213,
    "a\"": -0.007171029042667623,
    "a'": -0.007171029042667623,
    "b\"": -0.007171029042667623,
    "b'": -0.007171029042667623,
    "bv": -0.014700609537468627,
    "bw": -0.014700609537468627,
    "bx": -0.014700609537468627,
    "by": -0.014700609537468627,
    "bz": -0.007171029042667623,
    "c\"": 0.014700609537468627,
    "c'": 0.014700609537468627,
    "e\"": -0.007171029042667623,
    "e'": -0.007171029042667623,
    "ev": -0.014700609537468627,
    "ew": -0.014700609537468627,
    "ex": -0.014700609537468627,
    "ey": -0.014700609537468627,
    "ez": -0.007171029042667623,
    "f\"": 0.04410182861240588,
    "f'": 0.04410182861240588,
    "h\"": -0.007171029042667623,
    "h'": -0.007171029042667623,
    "kc": -0.014700609537468627,
    "kd": -0.014700609537468627,
    "ke": -0.014700609537468627,
    "ko": -0.014700609537468627,
    "kq": -0.014700609537468627,
    "m\"": -0.007171029042667623,
    "m'": -0.007171029042667623,
    "n\"": -0.007171029042667623,
    "n'": -0.007171029042667623,
    "o\"": -0.007171029042667623,
    "o'": -0.007171029042667623,
    "ov": -0.014700609537468627,
    "ow": -0.014700609537468627,
    "ox": -0.014700609537468627,
    "oy": -0.014700609537468627,
    "oz": -0.007171029042667623,
    "p\"": -0.007171029042667623,
    "p'": -0.007171029042667623,
    "pv": -0.014700609537468627,
    "pw": -0.014700609537468627,
    "px": -0.014700609537468627,
    "py": -0.014700609537468627,
    "pz": -0.007171029042667623,
    "r\"": 0.029401219074937254,
    "r'": 0.029401219074937254,
    "ra": -0.014700609537468627,
    "rc": -0.014700609537468627,
    "rd": -0.014700609537468627,
    "re": -0.014700609537468627,
    "rg": -0.007171029042667623,
    "ro": -0.014700609537468627,
    "rq": -0.014700609537468627,
    "t\"": 0.014700609537468627,
    "t'": 0.014700609537468627,
    "v\"": 0.029401219074937254,
    "v'": 0.029401219074937254,
    "v,": -0.029401219074937254,
    "v.": -0.029401219074937254,
    "v?": 0.014700609537468627,
    "w\"": 0.029401219074937254,
    "w'": 0.029401219074937254,
    "w,": -0.029401219074937254,
    "w.": -0.029401219074937254,
    "w?": 0.014700609537468627,
    "xc": -0.014700609537468627,
    "xd": -0.014700609537468627,
    "xe": -0.014700609537468627,
    "xo": -0.014700609537468627,
    "xq": -0.014700609537468627,
    "y\"": 0.029401219074937254,
    "y'": 0.029401219074937254,
    "y,": -0.029401219074937254,
    "y.": -0.029401219074937254,
    "y?": 0.014700609537468627,
    "{J": 0.06597346719254213,
    "Δ\"": -0.0512728576550735,
    "Δ'": -0.0512728576550735,
    "ΔΘ": -0.014700609537468627,
    "Θ,": -0.029401219074937254,
    "Θ.": -0.029401219074937254,
    "ΘΔ": -0.014700609537468627,
    "ΘΣ": -0.007171029042667623,
    "Θλ": -0.007171029042667623,
    "αλ": 0.014700609537468627,
    "γ,": -0.029401219074937254,
    "γ.": -0.029401219074937254,
    "γλ": -0.007171029042667623,
    "ζ-": -0.03657224811760488,
    "ζα": -0.014700609537468627,
    "ζπ": -0.014700609537468627,
    "ζσ": -0.014700609537468627,
    "ζτ": -0.014700609537468627,
    "ζφ": -0.014700609537468627,
    "η\"": -0.007171029042667623,
    "η'": -0.007171029042667623,
    "θ,": -0.014700609537468627,
    "θ.": -0.014700609537468627,
    "λ\"": -0.04410182861240588,
    "λ'": -0.04410182861240588,
    "λα": -0.007171029042667623,
    "λγ": -0.014700609537468627,
    "λν": -0.014700609537468627,
    "λπ": -0.014700609537468627,
    "λσ": -0.007171029042667623,
    "λτ": -0.014700609537468627,
    "λφ": -0.007171029042667623,
    "ν,": -0.029401219074937254,
    "ν.": -0.029401219074937254,
    "νλ": -0.007171029042667623,
    "σ,": -0.007171029042667623,
    "σ.": -0.007171029042667623,
    "φ\"": -0.007171029042667623,
    "φ'": -0.007171029042667623,
    "φγ": -0.014700609537468627,
    "φν": -0.014700609537468627,
    "χ,": -0.02187163858013625,
    "χ-": -0.014700609537468627,
    "χ.": -0.02187163858013625,
    "χα": -0.014700609537468627,
    "χσ": -0.014700609537468627,
    "χφ": -0.014700609537468627
  },
  "textures": [
    [
      {
        "localPath": "OpenSans-Regular-0.png"
      }
    ]
  ],
  "textureSize": {
    "w": 512,
    "h": 256
  },
  "ascender": 0.7848691287199713,
  "descender": -0.2151308712800287,
  "typoAscender": 0.5618501254930083,
  "typoDescender": -0.17640731444962351,
  "lowercaseHeight": 0.39297239153818575,
  "metadata": {
    "family": "Open Sans",
    "subfamily": "Regular",
    "version": "Version 1.10",
    "postScriptName": "OpenSans-Regular",
    "copyright": "Digitized data copyright © 2010-2011, Google Corporation.",
    "trademark": "Open Sans is a trademark of Google and may be registered in certain jurisdictions.",
    "manufacturer": "Ascender Corporation",
    "manufacturerURL": "http://www.ascendercorp.com/",
    "designerURL": "http://www.ascendercorp.com/typedesigners.html",
    "license": "Licensed under the Apache License, Version 2.0",
    "licenseURL": "http://www.apache.org/licenses/LICENSE-2.0",
    "height_funits": 2789,
    "funitsPerEm": 2048
  },
  "glyphBounds": null,
  "fieldRange_px": 2
}
    }*/

    getLabels() {
       // sorted list on maxDenominator
       return [
 {"x": 146191.0, "y": 476794.0, "label": "Blaricum", "inhabitants": 10795, "maxDenominator": 69466},
 {"x": 78435.0, "y": 440277.0, "label": "Midden-Delfland", "inhabitants": 19338, "maxDenominator": 94700},
 {"x": 104851.0, "y": 502949.0, "label": "Heemskerk", "inhabitants": 39146, "maxDenominator": 104066},
 {"x": 105306.0, "y": 430924.0, "label": "Alblasserdam", "inhabitants": 20014, "maxDenominator": 104933},
 {"x": 165076.0, "y": 453417.0, "label": "Renswoude", "inhabitants": 5175, "maxDenominator": 107833},
 {"x": 94851.0, "y": 476304.0, "label": "Noordwijkerhout", "inhabitants": 16605, "maxDenominator": 108200},
 {"x": 120172.0, "y": 495243.0, "label": "Oostzaan", "inhabitants": 9735, "maxDenominator": 109666},
 {"x": 102089.0, "y": 436760.0, "label": "Krimpen aan den IJssel", "inhabitants": 29306, "maxDenominator": 110000},
 {"x": 92359.0, "y": 466776.0, "label": "Oegstgeest", "inhabitants": 23887, "maxDenominator": 111700},
 {"x": 114264.0, "y": 472261.0, "label": "Uithoorn", "inhabitants": 29445, "maxDenominator": 112233},
 {"x": 119994.0, "y": 429992.0, "label": "Giessenlanden", "inhabitants": 14551, "maxDenominator": 114966},
 {"x": 97530.0, "y": 485900.0, "label": "Zandvoort", "inhabitants": 16970, "maxDenominator": 115300},
 {"x": 195109.0, "y": 441170.0, "label": "Westervoort", "inhabitants": 15015, "maxDenominator": 116066},
 {"x": 190507.0, "y": 417015.0, "label": "Mook en Middelaar", "inhabitants": 7768, "maxDenominator": 119433},
 {"x": 147290.0, "y": 525458.0, "label": "Enkhuizen", "inhabitants": 18476, "maxDenominator": 122200},
 {"x": 194117.0, "y": 331155.0, "label": "Onderbanken", "inhabitants": 7857, "maxDenominator": 124366},
 {"x": 100528.0, "y": 487626.0, "label": "Bloemendaal", "inhabitants": 23208, "maxDenominator": 125100},
 {"x": 103424.0, "y": 428400.0, "label": "Hendrik-Ido-Ambacht", "inhabitants": 30677, "maxDenominator": 125400},
 {"x": 97163.0, "y": 463501.0, "label": "Leiderdorp", "inhabitants": 27197, "maxDenominator": 129933},
 {"x": 90042.0, "y": 460048.0, "label": "Voorschoten", "inhabitants": 25453, "maxDenominator": 132066},
 {"x": 200425.0, "y": 324274.0, "label": "Landgraaf", "inhabitants": 37612, "maxDenominator": 135066},
 {"x": 82121.0, "y": 437076.0, "label": "Vlaardingen", "inhabitants": 72050, "maxDenominator": 136100},
 {"x": 147477.0, "y": 473622.0, "label": "Eemnes", "inhabitants": 9112, "maxDenominator": 137066},
 {"x": 105195.0, "y": 499846.0, "label": "Beverwijk", "inhabitants": 41077, "maxDenominator": 139133},
 {"x": 122681.0, "y": 478037.0, "label": "Ouder-Amstel", "inhabitants": 13496, "maxDenominator": 140733},
 {"x": 143381.0, "y": 473251.0, "label": "Laren", "inhabitants": 11146, "maxDenominator": 142766},
 {"x": 56397.0, "y": 389374.0, "label": "Kapelle", "inhabitants": 12720, "maxDenominator": 146766},
 {"x": 114584.0, "y": 522813.0, "label": "Langedijk", "inhabitants": 27836, "maxDenominator": 148000},
 {"x": 90301.0, "y": 471615.0, "label": "Noordwijk", "inhabitants": 26056, "maxDenominator": 150500},
 {"x": 130402.0, "y": 448880.0, "label": "IJsselstein", "inhabitants": 34302, "maxDenominator": 151133},
 {"x": 188231.0, "y": 324069.0, "label": "Nuth", "inhabitants": 15201, "maxDenominator": 151433},
 {"x": 82074.0, "y": 450410.0, "label": "Rijswijk", "inhabitants": 52208, "maxDenominator": 152066},
 {"x": 192261.0, "y": 320085.0, "label": "Voerendaal", "inhabitants": 12390, "maxDenominator": 152666},
 {"x": 157703.0, "y": 454766.0, "label": "Woudenberg", "inhabitants": 13021, "maxDenominator": 154066},
 {"x": 32716.0, "y": 387141.0, "label": "Vlissingen", "inhabitants": 44485, "maxDenominator": 154333},
 {"x": 117244.0, "y": 427910.0, "label": "Hardinxveld-Giessendam", "inhabitants": 17958, "maxDenominator": 155333},
 {"x": 88959.0, "y": 447433.0, "label": "Pijnacker-Nootdorp", "inhabitants": 53634, "maxDenominator": 156200},
 {"x": 143319.0, "y": 450302.0, "label": "Bunnik", "inhabitants": 15214, "maxDenominator": 158566},
 {"x": 166908.0, "y": 443610.0, "label": "Rhenen", "inhabitants": 19816, "maxDenominator": 159500},
 {"x": 102405.0, "y": 484376.0, "label": "Heemstede", "inhabitants": 27080, "maxDenominator": 160800},
 {"x": 94987.0, "y": 458763.0, "label": "Zoeterwoude", "inhabitants": 8430, "maxDenominator": 163700},
 {"x": 109081.0, "y": 490784.0, "label": "Haarlemmerliede en Spaarnwoude", "inhabitants": 5867, "maxDenominator": 164166},
 {"x": 87843.0, "y": 425013.0, "label": "Oud-Beijerland", "inhabitants": 24301, "maxDenominator": 165200},
 {"x": 142912.0, "y": 404329.0, "label": "Haaren", "inhabitants": 14103, "maxDenominator": 165200},
 {"x": 97552.0, "y": 474502.0, "label": "Lisse", "inhabitants": 22746, "maxDenominator": 165533},
 {"x": 103786.0, "y": 450716.0, "label": "Waddinxveen", "inhabitants": 27578, "maxDenominator": 167633},
 {"x": 96227.0, "y": 423277.0, "label": "Binnenmaas", "inhabitants": 29098, "maxDenominator": 167700},
 {"x": 100137.0, "y": 426444.0, "label": "Zwijndrecht", "inhabitants": 44586, "maxDenominator": 167900},
 {"x": 148937.0, "y": 418997.0, "label": "Maasdriel", "inhabitants": 24350, "maxDenominator": 169500},
 {"x": 132549.0, "y": 479521.0, "label": "Weesp", "inhabitants": 19147, "maxDenominator": 174700},
 {"x": 196413.0, "y": 309969.0, "label": "Vaals", "inhabitants": 9874, "maxDenominator": 174966},
 {"x": 149858.0, "y": 375153.0, "label": "Eersel", "inhabitants": 18778, "maxDenominator": 175000},
 {"x": 184661.0, "y": 326879.0, "label": "Beek", "inhabitants": 15895, "maxDenominator": 176933},
 {"x": 120044.0, "y": 412163.0, "label": "Geertruidenberg", "inhabitants": 21517, "maxDenominator": 176933},
 {"x": 86084.0, "y": 438062.0, "label": "Schiedam", "inhabitants": 77907, "maxDenominator": 178533},
 {"x": 177844.0, "y": 430657.0, "label": "Beuningen", "inhabitants": 25798, "maxDenominator": 179533},
 {"x": 100663.0, "y": 431454.0, "label": "Ridderkerk", "inhabitants": 45789, "maxDenominator": 179900},
 {"x": 142129.0, "y": 427232.0, "label": "Neerijnen", "inhabitants": 12397, "maxDenominator": 180866},
 {"x": 214493.0, "y": 574000.0, "label": "Marum", "inhabitants": 10488, "maxDenominator": 181566},
 {"x": 181445.0, "y": 331102.0, "label": "Stein", "inhabitants": 24987, "maxDenominator": 182200},
 {"x": 196524.0, "y": 328304.0, "label": "Brunssum", "inhabitants": 28241, "maxDenominator": 185100},
 {"x": 112659.0, "y": 427077.0, "label": "Sliedrecht", "inhabitants": 25020, "maxDenominator": 186133},
 {"x": 160670.0, "y": 429292.0, "label": "West Maas en Waal", "inhabitants": 18891, "maxDenominator": 188633},
 {"x": 200254.0, "y": 498769.0, "label": "Hattem", "inhabitants": 12154, "maxDenominator": 190233},
 {"x": 72405.0, "y": 434267.0, "label": "Brielle", "inhabitants": 17040, "maxDenominator": 190266},
 {"x": 85581.0, "y": 461532.0, "label": "Wassenaar", "inhabitants": 26084, "maxDenominator": 190900},
 {"x": 146588.0, "y": 468421.0, "label": "Baarn", "inhabitants": 24630, "maxDenominator": 191266},
 {"x": 127600.0, "y": 422157.0, "label": "Woudrichem", "inhabitants": 14634, "maxDenominator": 191700},
 {"x": 89045.0, "y": 467278.0, "label": "Katwijk", "inhabitants": 64956, "maxDenominator": 191900},
 {"x": 119109.0, "y": 448919.0, "label": "Oudewater", "inhabitants": 10180, "maxDenominator": 193333},
 {"x": 129516.0, "y": 496415.0, "label": "Waterland", "inhabitants": 17259, "maxDenominator": 193366},
 {"x": 170198.0, "y": 431185.0, "label": "Druten", "inhabitants": 18701, "maxDenominator": 194700},
 {"x": 89445.0, "y": 429703.0, "label": "Albrandswaard", "inhabitants": 25218, "maxDenominator": 195233},
 {"x": 139886.0, "y": 519602.0, "label": "Drechterland", "inhabitants": 19440, "maxDenominator": 195700},
 {"x": 166272.0, "y": 387741.0, "label": "Nuenen, Gerwen en Nederwetten", "inhabitants": 23019, "maxDenominator": 196433},
 {"x": 109022.0, "y": 512693.0, "label": "Heiloo", "inhabitants": 23099, "maxDenominator": 197366},
 {"x": 129289.0, "y": 438276.0, "label": "Zederik", "inhabitants": 14004, "maxDenominator": 199133},
 {"x": 161612.0, "y": 391935.0, "label": "Son en Breugel", "inhabitants": 16753, "maxDenominator": 199200},
 {"x": 119146.0, "y": 385691.0, "label": "Baarle-Nassau", "inhabitants": 6799, "maxDenominator": 199533},
 {"x": 107098.0, "y": 427587.0, "label": "Papendrecht", "inhabitants": 32264, "maxDenominator": 199700},
 {"x": 185746.0, "y": 319079.0, "label": "Valkenburg aan de Geul", "inhabitants": 16431, "maxDenominator": 199700},
 {"x": 157003.0, "y": 459335.0, "label": "Leusden", "inhabitants": 29755, "maxDenominator": 204000},
 {"x": 134240.0, "y": 468506.0, "label": "Wijdemeren", "inhabitants": 23659, "maxDenominator": 204833},
 {"x": 134474.0, "y": 428821.0, "label": "Lingewaal", "inhabitants": 11134, "maxDenominator": 205033},
 {"x": 173259.0, "y": 477366.0, "label": "Ermelo", "inhabitants": 26793, "maxDenominator": 205266},
 {"x": 182289.0, "y": 377545.0, "label": "Asten", "inhabitants": 16719, "maxDenominator": 205700},
 {"x": 136049.0, "y": 442368.0, "label": "Vianen", "inhabitants": 19967, "maxDenominator": 206000},
 {"x": 181084.0, "y": 322843.0, "label": "Meerssen", "inhabitants": 19039, "maxDenominator": 206900},
 {"x": 217872.0, "y": 582458.0, "label": "Grootegast", "inhabitants": 12143, "maxDenominator": 207033},
 {"x": 201725.0, "y": 320436.0, "label": "Kerkrade", "inhabitants": 45823, "maxDenominator": 207233},
 {"x": 190398.0, "y": 329164.0, "label": "Schinnen", "inhabitants": 12911, "maxDenominator": 208633},
 {"x": 131488.0, "y": 405802.0, "label": "Loon op Zand", "inhabitants": 23120, "maxDenominator": 208833},
 {"x": 197345.0, "y": 350913.0, "label": "Roerdalen", "inhabitants": 20728, "maxDenominator": 209066},
 {"x": 123370.0, "y": 496017.0, "label": "Landsmeer", "inhabitants": 11435, "maxDenominator": 209566},
 {"x": 88298.0, "y": 456490.0, "label": "Leidschendam-Voorburg", "inhabitants": 74947, "maxDenominator": 209633},
 {"x": 160406.0, "y": 377573.0, "label": "Waalre", "inhabitants": 17075, "maxDenominator": 210133},
 {"x": 125110.0, "y": 405315.0, "label": "Dongen", "inhabitants": 25777, "maxDenominator": 210933},
 {"x": 102137.0, "y": 445965.0, "label": "Zuidplas", "inhabitants": 41882, "maxDenominator": 211433},
 {"x": 173780.0, "y": 414246.0, "label": "Landerd", "inhabitants": 15332, "maxDenominator": 211700},
 {"x": 148778.0, "y": 463117.0, "label": "Soest", "inhabitants": 46089, "maxDenominator": 211766},
 {"x": 150990.0, "y": 444732.0, "label": "Wijk bij Duurstede", "inhabitants": 23678, "maxDenominator": 211800},
 {"x": 129932.0, "y": 506827.0, "label": "Edam-Volendam", "inhabitants": 35953, "maxDenominator": 211933},
 {"x": 138329.0, "y": 376592.0, "label": "Reusel-De Mierden", "inhabitants": 13040, "maxDenominator": 212300},
 {"x": 218280.0, "y": 570084.0, "label": "Leek", "inhabitants": 19669, "maxDenominator": 212700},
 {"x": 94501.0, "y": 446549.0, "label": "Lansingerland", "inhabitants": 61155, "maxDenominator": 214300},
 {"x": 195176.0, "y": 453210.0, "label": "Rozendaal", "inhabitants": 1575, "maxDenominator": 214866},
 {"x": 179574.0, "y": 417267.0, "label": "Grave", "inhabitants": 12419, "maxDenominator": 215266},
 {"x": 133141.0, "y": 462386.0, "label": "Stichtse Vecht", "inhabitants": 64513, "maxDenominator": 215966},
 {"x": 143554.0, "y": 433271.0, "label": "Geldermalsen", "inhabitants": 26818, "maxDenominator": 216200},
 {"x": 241994.0, "y": 588824.0, "label": "Ten Boer", "inhabitants": 7292, "maxDenominator": 217800},
 {"x": 110302.0, "y": 504177.0, "label": "Uitgeest", "inhabitants": 13520, "maxDenominator": 218033},
 {"x": 261280.0, "y": 566028.0, "label": "Pekela", "inhabitants": 12245, "maxDenominator": 218366},
 {"x": 157171.0, "y": 409201.0, "label": "Sint-Michielsgestel", "inhabitants": 28673, "maxDenominator": 218533},
 {"x": 252454.0, "y": 593289.0, "label": "Appingedam", "inhabitants": 11801, "maxDenominator": 219266},
 {"x": 124582.0, "y": 388199.0, "label": "Alphen-Chaam", "inhabitants": 10083, "maxDenominator": 220766},
 {"x": 234959.0, "y": 484706.0, "label": "Wierden", "inhabitants": 24258, "maxDenominator": 221966},
 {"x": 140890.0, "y": 446211.0, "label": "Houten", "inhabitants": 49579, "maxDenominator": 222466},
 {"x": 235677.0, "y": 590494.0, "label": "Bedum", "inhabitants": 10475, "maxDenominator": 222833},
 {"x": 146800.0, "y": 407403.0, "label": "Vught", "inhabitants": 26418, "maxDenominator": 223566},
 {"x": 247644.0, "y": 481318.0, "label": "Borne", "inhabitants": 23124, "maxDenominator": 224200},
 {"x": 109583.0, "y": 441030.0, "label": "Krimpenerwaard", "inhabitants": 55644, "maxDenominator": 225300},
 {"x": 154723.0, "y": 380303.0, "label": "Veldhoven", "inhabitants": 44925, "maxDenominator": 225333},
 {"x": 207148.0, "y": 448086.0, "label": "Doesburg", "inhabitants": 11328, "maxDenominator": 225666},
 {"x": 111837.0, "y": 474595.0, "label": "Aalsmeer", "inhabitants": 31499, "maxDenominator": 226133},
 {"x": 170444.0, "y": 437021.0, "label": "Neder-Betuwe", "inhabitants": 23615, "maxDenominator": 226533},
 {"x": 198381.0, "y": 439977.0, "label": "Duiven", "inhabitants": 25438, "maxDenominator": 227600},
 {"x": 125788.0, "y": 524374.0, "label": "Opmeer", "inhabitants": 11526, "maxDenominator": 227866},
 {"x": 134925.0, "y": 449205.0, "label": "Nieuwegein", "inhabitants": 62426, "maxDenominator": 228266},
 {"x": 184763.0, "y": 421113.0, "label": "Heumen", "inhabitants": 16462, "maxDenominator": 228666},
 {"x": 82232.0, "y": 421664.0, "label": "Korendijk", "inhabitants": 11097, "maxDenominator": 229733},
 {"x": 97536.0, "y": 417650.0, "label": "Strijen", "inhabitants": 8793, "maxDenominator": 230166},
 {"x": 112410.0, "y": 453195.0, "label": "Bodegraven-Reeuwijk", "inhabitants": 33948, "maxDenominator": 230833},
 {"x": 168933.0, "y": 382482.0, "label": "Geldrop-Mierlo", "inhabitants": 39252, "maxDenominator": 231433},
 {"x": 144700.0, "y": 478251.0, "label": "Huizen", "inhabitants": 41369, "maxDenominator": 233033},
 {"x": 132757.0, "y": 417506.0, "label": "Aalburg", "inhabitants": 13153, "maxDenominator": 233300},
 {"x": 202034.0, "y": 587493.0, "label": "Kollumerland en Nieuwkruisland", "inhabitants": 12827, "maxDenominator": 234100},
 {"x": 181563.0, "y": 410139.0, "label": "Mill en Sint Hubert", "inhabitants": 10831, "maxDenominator": 234233},
 {"x": 200497.0, "y": 384179.0, "label": "Horst aan de Maas", "inhabitants": 42271, "maxDenominator": 234433},
 {"x": 197411.0, "y": 315123.0, "label": "Simpelveld", "inhabitants": 10561, "maxDenominator": 234666},
 {"x": 118871.0, "y": 501722.0, "label": "Wormerland", "inhabitants": 15995, "maxDenominator": 235766},
 {"x": 26637.0, "y": 394890.0, "label": "Veere", "inhabitants": 21867, "maxDenominator": 236000},
 {"x": 140427.0, "y": 461526.0, "label": "De Bilt", "inhabitants": 42846, "maxDenominator": 236300},
 {"x": 151272.0, "y": 437912.0, "label": "Buren", "inhabitants": 26365, "maxDenominator": 236700},
 {"x": 94947.0, "y": 470273.0, "label": "Teylingen", "inhabitants": 36584, "maxDenominator": 237033},
 {"x": 65824.0, "y": 434856.0, "label": "Westvoorne", "inhabitants": 14508, "maxDenominator": 241266},
 {"x": 258979.0, "y": 488333.0, "label": "Dinkelland", "inhabitants": 26291, "maxDenominator": 242233},
 {"x": 124600.0, "y": 451136.0, "label": "Montfoort", "inhabitants": 13879, "maxDenominator": 242666},
 {"x": 99728.0, "y": 479064.0, "label": "Hillegom", "inhabitants": 21812, "maxDenominator": 244366},
 {"x": 123105.0, "y": 507890.0, "label": "Beemster", "inhabitants": 9550, "maxDenominator": 244833},
 {"x": 181057.0, "y": 444873.0, "label": "Renkum", "inhabitants": 31338, "maxDenominator": 245400},
 {"x": 135533.0, "y": 525970.0, "label": "Medemblik", "inhabitants": 44480, "maxDenominator": 247066},
 {"x": 103565.0, "y": 496003.0, "label": "Velsen", "inhabitants": 67831, "maxDenominator": 247666},
 {"x": 182204.0, "y": 312849.0, "label": "Eijsden-Margraten", "inhabitants": 25566, "maxDenominator": 248266},
 {"x": 186488.0, "y": 491673.0, "label": "Elburg", "inhabitants": 23107, "maxDenominator": 248400},
 {"x": 167328.0, "y": 373639.0, "label": "Heeze-Leende", "inhabitants": 15886, "maxDenominator": 248533},
 {"x": 103276.0, "y": 388125.0, "label": "Zundert", "inhabitants": 21525, "maxDenominator": 251233},
 {"x": 125285.0, "y": 517556.0, "label": "Koggenland", "inhabitants": 22659, "maxDenominator": 253133},
 {"x": 152936.0, "y": 472413.0, "label": "Bunschoten", "inhabitants": 21266, "maxDenominator": 253200},
 {"x": 118157.0, "y": 520177.0, "label": "Heerhugowaard", "inhabitants": 55850, "maxDenominator": 253700},
 {"x": 187076.0, "y": 414497.0, "label": "Cuijk", "inhabitants": 24911, "maxDenominator": 253833},
 {"x": 168462.0, "y": 472816.0, "label": "Putten", "inhabitants": 24313, "maxDenominator": 254666},
 {"x": 196472.0, "y": 412449.0, "label": "Gennep", "inhabitants": 17052, "maxDenominator": 255166},
 {"x": 95625.0, "y": 429518.0, "label": "Barendrecht", "inhabitants": 48477, "maxDenominator": 255200},
 {"x": 169279.0, "y": 393731.0, "label": "Laarbeek", "inhabitants": 22158, "maxDenominator": 255733},
 {"x": 238207.0, "y": 574921.0, "label": "Haren", "inhabitants": 19861, "maxDenominator": 257733},
 {"x": 249974.0, "y": 475008.0, "label": "Hengelo", "inhabitants": 80593, "maxDenominator": 259666},
 {"x": 176234.0, "y": 402021.0, "label": "Boekel", "inhabitants": 10502, "maxDenominator": 260100},
 {"x": 186498.0, "y": 403258.0, "label": "Sint Anthonis", "inhabitants": 11577, "maxDenominator": 262066},
 {"x": 148317.0, "y": 388746.0, "label": "Oirschot", "inhabitants": 18558, "maxDenominator": 262400},
 {"x": 265136.0, "y": 476155.0, "label": "Losser", "inhabitants": 22547, "maxDenominator": 264033},
 {"x": 45545.0, "y": 385108.0, "label": "Borsele", "inhabitants": 22716, "maxDenominator": 264433},
 {"x": 122893.0, "y": 471022.0, "label": "De Ronde Venen", "inhabitants": 43620, "maxDenominator": 267400},
 {"x": 161733.0, "y": 469196.0, "label": "Nijkerk", "inhabitants": 42307, "maxDenominator": 268366},
 {"x": 138207.0, "y": 387858.0, "label": "Hilvarenbeek", "inhabitants": 15366, "maxDenominator": 269600},
 {"x": 103551.0, "y": 399083.0, "label": "Etten-Leur", "inhabitants": 43532, "maxDenominator": 270266},
 {"x": 43047.0, "y": 399592.0, "label": "Noord-Beveland", "inhabitants": 7314, "maxDenominator": 270866},
 {"x": 163629.0, "y": 410333.0, "label": "Bernheze", "inhabitants": 30550, "maxDenominator": 273733},
 {"x": 162764.0, "y": 455680.0, "label": "Scherpenzeel", "inhabitants": 9751, "maxDenominator": 274200},
 {"x": 155643.0, "y": 391628.0, "label": "Best", "inhabitants": 29497, "maxDenominator": 276700},
 {"x": 76700.0, "y": 438027.0, "label": "Maassluis", "inhabitants": 32518, "maxDenominator": 280133},
 {"x": 130673.0, "y": 390801.0, "label": "Goirle", "inhabitants": 23621, "maxDenominator": 285100},
 {"x": 204693.0, "y": 458320.0, "label": "Brummen", "inhabitants": 20771, "maxDenominator": 285366},
 {"x": 202578.0, "y": 364650.0, "label": "Beesel", "inhabitants": 13444, "maxDenominator": 285366},
 {"x": 244314.0, "y": 595752.0, "label": "Loppersum", "inhabitants": 9732, "maxDenominator": 286700},
 {"x": 194519.0, "y": 587968.0, "label": "Dantumadiel", "inhabitants": 18904, "maxDenominator": 287766},
 {"x": 97492.0, "y": 392958.0, "label": "Rucphen", "inhabitants": 22401, "maxDenominator": 291233},
 {"x": 127712.0, "y": 483242.0, "label": "Diemen", "inhabitants": 28121, "maxDenominator": 294366},
 {"x": 189639.0, "y": 352576.0, "label": "Maasgouw", "inhabitants": 23697, "maxDenominator": 294600},
 {"x": 181932.0, "y": 367302.0, "label": "Nederweert", "inhabitants": 17038, "maxDenominator": 294633},
 {"x": 225406.0, "y": 435435.0, "label": "Oude IJsselstreek", "inhabitants": 39520, "maxDenominator": 297266},
 {"x": 103495.0, "y": 467480.0, "label": "Kaag en Braassem", "inhabitants": 26625, "maxDenominator": 297566},
 {"x": 182219.0, "y": 483524.0, "label": "Nunspeet", "inhabitants": 27114, "maxDenominator": 297633},
 {"x": 137785.0, "y": 479283.0, "label": "Gooise Meren", "inhabitants": 57337, "maxDenominator": 298900},
 {"x": 229038.0, "y": 591285.0, "label": "Winsum", "inhabitants": 13560, "maxDenominator": 298900},
 {"x": 207312.0, "y": 528912.0, "label": "Meppel", "inhabitants": 33410, "maxDenominator": 299400},
 {"x": 121946.0, "y": 417119.0, "label": "Werkendam", "inhabitants": 26979, "maxDenominator": 300300},
 {"x": 139305.0, "y": 412023.0, "label": "Heusden", "inhabitants": 43723, "maxDenominator": 301566},
 {"x": 200125.0, "y": 491121.0, "label": "Heerde", "inhabitants": 18603, "maxDenominator": 301900},
 {"x": 169416.0, "y": 366481.0, "label": "Cranendonck", "inhabitants": 20336, "maxDenominator": 302766},
 {"x": 191575.0, "y": 362907.0, "label": "Leudal", "inhabitants": 35857, "maxDenominator": 305633},
 {"x": 233436.0, "y": 472739.0, "label": "Hof van Twente", "inhabitants": 34930, "maxDenominator": 306500},
 {"x": 118786.0, "y": 405566.0, "label": "Oosterhout", "inhabitants": 55147, "maxDenominator": 307033},
 {"x": 249538.0, "y": 492325.0, "label": "Tubbergen", "inhabitants": 21213, "maxDenominator": 307766},
 {"x": 173986.0, "y": 442821.0, "label": "Wageningen", "inhabitants": 38412, "maxDenominator": 309200},
 {"x": 147154.0, "y": 366975.0, "label": "Bergeijk", "inhabitants": 18398, "maxDenominator": 309200},
 {"x": 111555.0, "y": 412563.0, "label": "Drimmelen", "inhabitants": 27063, "maxDenominator": 309800},
 {"x": 202503.0, "y": 434533.0, "label": "Zevenaar", "inhabitants": 43402, "maxDenominator": 310433},
 {"x": 69734.0, "y": 428764.0, "label": "Hellevoetsluis", "inhabitants": 39997, "maxDenominator": 311733},
 {"x": 217208.0, "y": 452058.0, "label": "Bronckhorst", "inhabitants": 36352, "maxDenominator": 312600},
 {"x": 99498.0, "y": 438804.0, "label": "Capelle aan den IJssel", "inhabitants": 66854, "maxDenominator": 312966},
 {"x": 141845.0, "y": 395922.0, "label": "Oisterwijk", "inhabitants": 26132, "maxDenominator": 313633},
 {"x": 212648.0, "y": 434460.0, "label": "Montferland", "inhabitants": 35627, "maxDenominator": 315400},
 {"x": 78704.0, "y": 391068.0, "label": "Bergen op Zoom", "inhabitants": 66354, "maxDenominator": 317266},
 {"x": 74592.0, "y": 446163.0, "label": "Westland", "inhabitants": 107492, "maxDenominator": 317733},
 {"x": 220636.0, "y": 466139.0, "label": "Lochem", "inhabitants": 33574, "maxDenominator": 318000},
 {"x": 107052.0, "y": 479404.0, "label": "Haarlemmermeer", "inhabitants": 147282, "maxDenominator": 318533},
 {"x": 204767.0, "y": 562455.0, "label": "Opsterland", "inhabitants": 29753, "maxDenominator": 319466},
 {"x": 176700.0, "y": 425393.0, "label": "Wijchen", "inhabitants": 40847, "maxDenominator": 320200},
 {"x": 92969.0, "y": 400434.0, "label": "Halderberge", "inhabitants": 29888, "maxDenominator": 322866},
 {"x": 207068.0, "y": 484876.0, "label": "Olst-Wijhe", "inhabitants": 18023, "maxDenominator": 323100},
 {"x": 192086.0, "y": 420232.0, "label": "Berg en Dal", "inhabitants": 34748, "maxDenominator": 325733},
 {"x": 134265.0, "y": 434969.0, "label": "Leerdam", "inhabitants": 21030, "maxDenominator": 326800},
 {"x": 235717.0, "y": 437681.0, "label": "Aalten", "inhabitants": 26962, "maxDenominator": 328533},
 {"x": 180467.0, "y": 394706.0, "label": "Gemert-Bakel", "inhabitants": 30340, "maxDenominator": 328766},
 {"x": 166562.0, "y": 448383.0, "label": "Veenendaal", "inhabitants": 64918, "maxDenominator": 331066},
 {"x": 258921.0, "y": 481066.0, "label": "Oldenzaal", "inhabitants": 31915, "maxDenominator": 331100},
 {"x": 193198.0, "y": 434926.0, "label": "Lingewaard", "inhabitants": 46372, "maxDenominator": 336500},
 {"x": 236598.0, "y": 447498.0, "label": "Oost Gelre", "inhabitants": 29675, "maxDenominator": 338000},
 {"x": 200876.0, "y": 512977.0, "label": "Zwartewaterland", "inhabitants": 22468, "maxDenominator": 339700},
 {"x": 84723.0, "y": 445427.0, "label": "Delft", "inhabitants": 102253, "maxDenominator": 339933},
 {"x": 113917.0, "y": 464571.0, "label": "Nieuwkoop", "inhabitants": 28269, "maxDenominator": 341233},
 {"x": 181474.0, "y": 437144.0, "label": "Overbetuwe", "inhabitants": 47481, "maxDenominator": 343900},
 {"x": 121497.0, "y": 396564.0, "label": "Gilze en Rijen", "inhabitants": 26313, "maxDenominator": 345733},
 {"x": 93267.0, "y": 463363.0, "label": "Leiden", "inhabitants": 124306, "maxDenominator": 349033},
 {"x": 189574.0, "y": 343738.0, "label": "Echt-Susteren", "inhabitants": 31751, "maxDenominator": 349733},
 {"x": 274414.0, "y": 557495.0, "label": "Westerwolde", "inhabitants": 24684, "maxDenominator": 350100},
 {"x": 235332.0, "y": 567743.0, "label": "Tynaarlo", "inhabitants": 33462, "maxDenominator": 351166},
 {"x": 150798.0, "y": 398816.0, "label": "Boxtel", "inhabitants": 30672, "maxDenominator": 353700},
 {"x": 197345.0, "y": 372073.0, "label": "Peel en Maas", "inhabitants": 43312, "maxDenominator": 354366},
 {"x": 249578.0, "y": 558803.0, "label": "Aa en Hunze", "inhabitants": 25390, "maxDenominator": 354466},
 {"x": 118471.0, "y": 477716.0, "label": "Amstelveen", "inhabitants": 89870, "maxDenominator": 357100},
 {"x": 193459.0, "y": 579400.0, "label": "Tytsjerksteradiel", "inhabitants": 31870, "maxDenominator": 362900},
 {"x": 226106.0, "y": 503676.0, "label": "Ommen", "inhabitants": 17630, "maxDenominator": 362966},
 {"x": 227498.0, "y": 489608.0, "label": "Hellendoorn", "inhabitants": 35796, "maxDenominator": 366166},
 {"x": 172422.0, "y": 464491.0, "label": "Barneveld", "inhabitants": 57339, "maxDenominator": 367333},
 {"x": 170961.0, "y": 519893.0, "label": "Urk", "inhabitants": 20524, "maxDenominator": 367533},
 {"x": 200567.0, "y": 449676.0, "label": "Rheden", "inhabitants": 43527, "maxDenominator": 367900},
 {"x": 248659.0, "y": 463920.0, "label": "Haaksbergen", "inhabitants": 24291, "maxDenominator": 368666},
 {"x": 176181.0, "y": 376661.0, "label": "Someren", "inhabitants": 19120, "maxDenominator": 370000},
 {"x": 185579.0, "y": 383105.0, "label": "Deurne", "inhabitants": 32137, "maxDenominator": 370066},
 {"x": 219897.0, "y": 599087.0, "label": "De Marne", "inhabitants": 10058, "maxDenominator": 370866},
 {"x": 204377.0, "y": 467810.0, "label": "Voorst", "inhabitants": 24310, "maxDenominator": 377933},
 {"x": 215232.0, "y": 503095.0, "label": "Dalfsen", "inhabitants": 28242, "maxDenominator": 380233},
 {"x": 190949.0, "y": 312327.0, "label": "Gulpen-Wittem", "inhabitants": 14196, "maxDenominator": 386433},
 {"x": 192523.0, "y": 496045.0, "label": "Oldebroek", "inhabitants": 23504, "maxDenominator": 386833},
 {"x": 81402.0, "y": 401474.0, "label": "Steenbergen", "inhabitants": 24781, "maxDenominator": 387733},
 {"x": 113259.0, "y": 497417.0, "label": "Zaanstad", "inhabitants": 154865, "maxDenominator": 388100},
 {"x": 108251.0, "y": 447657.0, "label": "Gouda", "inhabitants": 72700, "maxDenominator": 388766},
 {"x": 204076.0, "y": 399022.0, "label": "Bergen (L.)", "inhabitants": 13106, "maxDenominator": 389666},
 {"x": 107186.0, "y": 519997.0, "label": "Bergen (NH.)", "inhabitants": 29941, "maxDenominator": 391166},
 {"x": 144050.0, "y": 523742.0, "label": "Stede Broec", "inhabitants": 21670, "maxDenominator": 393233},
 {"x": 155077.0, "y": 449598.0, "label": "Utrechtse Heuvelrug", "inhabitants": 49314, "maxDenominator": 393433},
 {"x": 145955.0, "y": 457088.0, "label": "Zeist", "inhabitants": 63322, "maxDenominator": 397500},
 {"x": 241281.0, "y": 603801.0, "label": "Eemsmond", "inhabitants": 15553, "maxDenominator": 399000},
 {"x": 104154.0, "y": 458577.0, "label": "Alphen aan den Rijn", "inhabitants": 109682, "maxDenominator": 403766},
 {"x": 105152.0, "y": 508211.0, "label": "Castricum", "inhabitants": 35608, "maxDenominator": 405333},
 {"x": 121547.0, "y": 457746.0, "label": "Woerden", "inhabitants": 51758, "maxDenominator": 405900},
 {"x": 103174.0, "y": 408544.0, "label": "Moerdijk", "inhabitants": 36967, "maxDenominator": 406300},
 {"x": 218802.0, "y": 527284.0, "label": "De Wolden", "inhabitants": 23917, "maxDenominator": 410200},
 {"x": 159168.0, "y": 576090.0, "label": "Harlingen", "inhabitants": 15783, "maxDenominator": 411000},
 {"x": 121849.0, "y": 443807.0, "label": "Lopik", "inhabitants": 14395, "maxDenominator": 411633},
 {"x": 139218.0, "y": 422652.0, "label": "Zaltbommel", "inhabitants": 28014, "maxDenominator": 414800},
 {"x": 192009.0, "y": 507639.0, "label": "Kampen", "inhabitants": 53259, "maxDenominator": 420466},
 {"x": 255015.0, "y": 567943.0, "label": "Veendam", "inhabitants": 27508, "maxDenominator": 426500},
 {"x": 60142.0, "y": 387057.0, "label": "Reimerswaal", "inhabitants": 22555, "maxDenominator": 429266},
 {"x": 82299.0, "y": 380426.0, "label": "Woensdrecht", "inhabitants": 21800, "maxDenominator": 433166},
 {"x": 129045.0, "y": 411572.0, "label": "Waalwijk", "inhabitants": 47725, "maxDenominator": 436366},
 {"x": 171583.0, "y": 408287.0, "label": "Uden", "inhabitants": 41725, "maxDenominator": 439833},
 {"x": 242639.0, "y": 498462.0, "label": "Twenterand", "inhabitants": 33903, "maxDenominator": 443333},
 {"x": 197448.0, "y": 543365.0, "label": "Weststellingwerf", "inhabitants": 25720, "maxDenominator": 446733},
 {"x": 114681.0, "y": 433751.0, "label": "Molenwaard", "inhabitants": 29295, "maxDenominator": 447433},
 {"x": 205496.0, "y": 581382.0, "label": "Achtkarspelen", "inhabitants": 27935, "maxDenominator": 447933},
 {"x": 193896.0, "y": 482259.0, "label": "Epe", "inhabitants": 32863, "maxDenominator": 448966},
 {"x": 215713.0, "y": 489260.0, "label": "Raalte", "inhabitants": 37158, "maxDenominator": 454300},
 {"x": 170048.0, "y": 581893.0, "label": "Waadhoeke", "inhabitants": 46112, "maxDenominator": 457533},
 {"x": 226414.0, "y": 478676.0, "label": "Rijssen-Holten", "inhabitants": 38097, "maxDenominator": 458866},
 {"x": 189604.0, "y": 559369.0, "label": "Heerenveen", "inhabitants": 50192, "maxDenominator": 460600},
 {"x": 93457.0, "y": 452893.0, "label": "Zoetermeer", "inhabitants": 124695, "maxDenominator": 463333},
 {"x": 159342.0, "y": 484232.0, "label": "Zeewolde", "inhabitants": 22407, "maxDenominator": 465500},
 {"x": 79034.0, "y": 427770.0, "label": "Nissewaard", "inhabitants": 84588, "maxDenominator": 466066},
 {"x": 194127.0, "y": 405161.0, "label": "Boxmeer", "inhabitants": 28853, "maxDenominator": 466700},
 {"x": 173742.0, "y": 387490.0, "label": "Helmond", "inhabitants": 90903, "maxDenominator": 469000},
 {"x": 232895.0, "y": 543218.0, "label": "Midden-Drenthe", "inhabitants": 33172, "maxDenominator": 471500},
 {"x": 254891.0, "y": 547558.0, "label": "Borger-Odoorn", "inhabitants": 25351, "maxDenominator": 472866},
 {"x": 224334.0, "y": 568065.0, "label": "Noordenveld", "inhabitants": 32370, "maxDenominator": 473166},
 {"x": 184336.0, "y": 592979.0, "label": "Ferwerderadiel", "inhabitants": 8671, "maxDenominator": 479166},
 {"x": 126584.0, "y": 501421.0, "label": "Purmerend", "inhabitants": 79983, "maxDenominator": 484566},
 {"x": 47503.0, "y": 392796.0, "label": "Goes", "inhabitants": 37636, "maxDenominator": 484966},
 {"x": 156353.0, "y": 432951.0, "label": "Tiel", "inhabitants": 41465, "maxDenominator": 490033},
 {"x": 195966.0, "y": 322779.0, "label": "Heerlen", "inhabitants": 86762, "maxDenominator": 491000},
 {"x": 210504.0, "y": 516537.0, "label": "Staphorst", "inhabitants": 16797, "maxDenominator": 496566},
 {"x": 111909.0, "y": 533566.0, "label": "Schagen", "inhabitants": 46379, "maxDenominator": 501100},
 {"x": 246081.0, "y": 528951.0, "label": "Coevorden", "inhabitants": 35299, "maxDenominator": 503100},
 {"x": 54653.0, "y": 410986.0, "label": "Schouwen-Duiveland", "inhabitants": 33687, "maxDenominator": 505833},
 {"x": 265108.0, "y": 579215.0, "label": "Oldambt", "inhabitants": 38075, "maxDenominator": 506666},
 {"x": 220698.0, "y": 587989.0, "label": "Zuidhorn", "inhabitants": 18917, "maxDenominator": 507133},
 {"x": 249915.0, "y": 579678.0, "label": "Midden-Groningen", "inhabitants": 60951, "maxDenominator": 509433},
 {"x": 231098.0, "y": 526784.0, "label": "Hoogeveen", "inhabitants": 55677, "maxDenominator": 512333},
 {"x": 161348.0, "y": 399958.0, "label": "Meierijstad", "inhabitants": 80148, "maxDenominator": 515566},
 {"x": 212989.0, "y": 460434.0, "label": "Zutphen", "inhabitants": 47537, "maxDenominator": 516166},
 {"x": 62759.0, "y": 371014.0, "label": "Hulst", "inhabitants": 27472, "maxDenominator": 521200},
 {"x": 104641.0, "y": 488651.0, "label": "Haarlem", "inhabitants": 159709, "maxDenominator": 526666},
 {"x": 140018.0, "y": 470598.0, "label": "Hilversum", "inhabitants": 89521, "maxDenominator": 527066},
 {"x": 159895.0, "y": 368516.0, "label": "Valkenswaard", "inhabitants": 30654, "maxDenominator": 534500},
 {"x": 216205.0, "y": 539383.0, "label": "Westerveld", "inhabitants": 19152, "maxDenominator": 535566},
 {"x": 177128.0, "y": 500564.0, "label": "Dronten", "inhabitants": 40735, "maxDenominator": 548166},
 {"x": 174916.0, "y": 453756.0, "label": "Ede", "inhabitants": 114682, "maxDenominator": 557733},
 {"x": 193187.0, "y": 391191.0, "label": "Venray", "inhabitants": 43341, "maxDenominator": 571933},
 {"x": 207530.0, "y": 611670.0, "label": "Schiermonnikoog", "inhabitants": 932, "maxDenominator": 575700},
 {"x": 198639.0, "y": 569824.0, "label": "Smallingerland", "inhabitants": 55889, "maxDenominator": 577733},
 {"x": 126435.0, "y": 538255.0, "label": "Hollands Kroon", "inhabitants": 47681, "maxDenominator": 580166},
 {"x": 144662.0, "y": 375911.0, "label": "Bladel", "inhabitants": 20144, "maxDenominator": 586266},
 {"x": 90631.0, "y": 417650.0, "label": "Cromstrijen", "inhabitants": 12826, "maxDenominator": 592166},
 {"x": 133290.0, "y": 518905.0, "label": "Hoorn", "inhabitants": 72806, "maxDenominator": 598166},
 {"x": 246987.0, "y": 443229.0, "label": "Winterswijk", "inhabitants": 28987, "maxDenominator": 601866},
 {"x": 116288.0, "y": 566275.0, "label": "Texel", "inhabitants": 13584, "maxDenominator": 603333},
 {"x": 186197.0, "y": 333804.0, "label": "Sittard-Geleen", "inhabitants": 92956, "maxDenominator": 604600},
 {"x": 165019.0, "y": 421075.0, "label": "Oss", "inhabitants": 90951, "maxDenominator": 610400},
 {"x": 198395.0, "y": 529996.0, "label": "Steenwijkerland", "inhabitants": 43768, "maxDenominator": 612466},
 {"x": 215160.0, "y": 555416.0, "label": "Ooststellingwerf", "inhabitants": 25459, "maxDenominator": 619300},
 {"x": 142843.0, "y": 439718.0, "label": "Culemborg", "inhabitants": 28195, "maxDenominator": 622033},
 {"x": 189995.0, "y": 446504.0, "label": "Arnhem", "inhabitants": 157223, "maxDenominator": 635533},
 {"x": 180690.0, "y": 547658.0, "label": "De Fryske Marren", "inhabitants": 51742, "maxDenominator": 636533},
 {"x": 126735.0, "y": 427843.0, "label": "Gorinchem", "inhabitants": 36284, "maxDenominator": 649600},
 {"x": 160769.0, "y": 498883.0, "label": "Lelystad", "inhabitants": 77389, "maxDenominator": 655033},
 {"x": 66561.0, "y": 398222.0, "label": "Tholen", "inhabitants": 25583, "maxDenominator": 673666},
 {"x": 241600.0, "y": 485202.0, "label": "Almelo", "inhabitants": 72629, "maxDenominator": 686766},
 {"x": 212926.0, "y": 475919.0, "label": "Deventer", "inhabitants": 99653, "maxDenominator": 706900},
 {"x": 111631.0, "y": 399765.0, "label": "Breda", "inhabitants": 183448, "maxDenominator": 709233},
 {"x": 148139.0, "y": 413975.0, "label": "'s-Hertogenbosch", "inhabitants": 153434, "maxDenominator": 710833},
 {"x": 22819.0, "y": 372400.0, "label": "Sluis", "inhabitants": 23526, "maxDenominator": 729033},
 {"x": 79624.0, "y": 454259.0, "label": "'s-Gravenhage", "inhabitants": 532561, "maxDenominator": 729266},
 {"x": 172628.0, "y": 606629.0, "label": "Ameland", "inhabitants": 3654, "maxDenominator": 733700},
 {"x": 108238.0, "y": 421705.0, "label": "Dordrecht", "inhabitants": 118426, "maxDenominator": 740933},
 {"x": 176267.0, "y": 360516.0, "label": "Weert", "inhabitants": 49855, "maxDenominator": 754366},
 {"x": 198632.0, "y": 357052.0, "label": "Roermond", "inhabitants": 57761, "maxDenominator": 767533},
 {"x": 154828.0, "y": 465056.0, "label": "Amersfoort", "inhabitants": 155226, "maxDenominator": 770700},
 {"x": 165903.0, "y": 559742.0, "label": "S\u00fadwest-Frysl\u00e2n", "inhabitants": 89583, "maxDenominator": 772966},
 {"x": 236089.0, "y": 457626.0, "label": "Berkelland", "inhabitants": 44029, "maxDenominator": 784133},
 {"x": 173290.0, "y": 483524.0, "label": "Harderwijk", "inhabitants": 46832, "maxDenominator": 818033},
 {"x": 252586.0, "y": 599866.0, "label": "Delfzijl", "inhabitants": 24864, "maxDenominator": 825400},
 {"x": 116428.0, "y": 512764.0, "label": "Alkmaar", "inhabitants": 108470, "maxDenominator": 828033},
 {"x": 145429.0, "y": 486601.0, "label": "Almere", "inhabitants": 203990, "maxDenominator": 834900},
 {"x": 233639.0, "y": 557344.0, "label": "Assen", "inhabitants": 67708, "maxDenominator": 840700},
 {"x": 198072.0, "y": 597218.0, "label": "Dongeradeel", "inhabitants": 23789, "maxDenominator": 878533},
 {"x": 263956.0, "y": 558470.0, "label": "Stadskanaal", "inhabitants": 32258, "maxDenominator": 928233},
 {"x": 32990.0, "y": 391763.0, "label": "Middelburg", "inhabitants": 48303, "maxDenominator": 937933},
 {"x": 67901.0, "y": 418388.0, "label": "Goeree-Overflakkee", "inhabitants": 49129, "maxDenominator": 949600},
 {"x": 126729.0, "y": 585883.0, "label": "Vlieland", "inhabitants": 1132, "maxDenominator": 967800},
 {"x": 237347.0, "y": 512741.0, "label": "Hardenberg", "inhabitants": 60539, "maxDenominator": 993100},
 {"x": 132897.0, "y": 399060.0, "label": "Tilburg", "inhabitants": 215521, "maxDenominator": 1024200},
 {"x": 180689.0, "y": 525085.0, "label": "Noordoostpolder", "inhabitants": 46625, "maxDenominator": 1061066},
 {"x": 133587.0, "y": 455922.0, "label": "Utrecht", "inhabitants": 347483, "maxDenominator": 1163266},
 {"x": 218914.0, "y": 441550.0, "label": "Doetinchem", "inhabitants": 57382, "maxDenominator": 1188700},
 {"x": 203825.0, "y": 503221.0, "label": "Zwolle", "inhabitants": 126116, "maxDenominator": 1202600},
 {"x": 151232.0, "y": 601458.0, "label": "Terschelling", "inhabitants": 4906, "maxDenominator": 1342633},
 {"x": 192941.0, "y": 468823.0, "label": "Apeldoorn", "inhabitants": 161156, "maxDenominator": 1384833},
 {"x": 88175.0, "y": 392017.0, "label": "Roosendaal", "inhabitants": 77000, "maxDenominator": 1449100},
 {"x": 205341.0, "y": 379079.0, "label": "Venlo", "inhabitants": 101192, "maxDenominator": 1522900},
 {"x": 185983.0, "y": 427864.0, "label": "Nijmegen", "inhabitants": 175948, "maxDenominator": 1683900},
 {"x": 182443.0, "y": 575996.0, "label": "Leeuwarden", "inhabitants": 122415, "maxDenominator": 1762100},
 {"x": 261064.0, "y": 530773.0, "label": "Emmen", "inhabitants": 107192, "maxDenominator": 1933233},
 {"x": 90741.0, "y": 435415.0, "label": "Rotterdam", "inhabitants": 638712, "maxDenominator": 2020200},
 {"x": 112430.0, "y": 548590.0, "label": "Den Helder", "inhabitants": 55760, "maxDenominator": 2029000},
 {"x": 176995.0, "y": 318173.0, "label": "Maastricht", "inhabitants": 122723, "maxDenominator": 2284100},
 {"x": 159982.0, "y": 384551.0, "label": "Eindhoven", "inhabitants": 229126, "maxDenominator": 3699366},
 {"x": 256852.0, "y": 471350.0, "label": "Enschede", "inhabitants": 158261, "maxDenominator": 3777666},
 {"x": 47489.0, "y": 367648.0, "label": "Terneuzen", "inhabitants": 54440, "maxDenominator": 4698166},
 {"x": 234901.0, "y": 582534.0, "label": "Groningen", "inhabitants": 202810, "maxDenominator": 4943233},
 {"x": 120436.0, "y": 488248.0, "label": "Amsterdam", "inhabitants": 854047, "maxDenominator": 607516766}]
    }
}

// multi-channel signed distance field texture
// hardcoded, to not download extra png
// let msdf = 'data:image/png;base64,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'''
let msdf = 'data:image/png;base64,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'

export default TextRenderer
