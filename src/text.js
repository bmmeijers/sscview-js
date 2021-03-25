
// a very nice introduction to all types of text rendering options with webgl:
// https://css-tricks.com/techniques-for-rendering-text-with-webgl/
//
// sdf implementation: https://troika-examples.netlify.app/#text

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
uniform vec2 uScreenSize;

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
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    vec3 sample = texture2D(glyphAtlas, vUv).rgb;
    float sigDist = median(sample.r, sample.g, sample.b);

//    // spread field range over 1px for antialiasing
    float spread = 1.5;
    float fillAlpha = clamp((sigDist - 0.5) * spread + 0.5, 0.0, 1.0);

    vec4 strokeColor = vec4(0.0, 1.0, 0.0, 0.0);
    float strokeWidthPx = 1.0;
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

    update(rect, scaleDenominator, matrix) {
//        this.renderAnchors(rect, scaleDenominator, matrix)
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

//        console.log('rendering for scale 1: ' + scaleDenominator)
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
        
        // the client side screen size
        let uScreenSize = gl.getUniformLocation(shaderProgram, 'uScreenSize');
        // [visibleWorld.xmin, visibleWorld.ymin, visibleWorld.xmax, visibleWorld.ymax]
        let screenSize = [(rect[2]-rect[0]), (rect[3]-rect[1])]
//        console.log(screenSize)
        gl.uniform2fv(uScreenSize, screenSize);

        let glyphAtlasAttrib = gl.getUniformLocation(shaderProgram, 'glyphAtlas')

        // Tell WebGL we want to affect texture unit 0
        gl.activeTexture(gl.TEXTURE0);

        // Bind the texture to texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlasTexture);

        // Tell the shader we bound the texture to texture unit 0
        gl.uniform1i(glyphAtlasAttrib, 0);

//        gl.uniformTexture2D('glyphAtlas', this.glyphAtlasTexture);

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
        gl.blendEquation(gl.FUNC_ADD);
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
        // the glyphs (while they are on the GPU)
        // here (CPU-side) we could bisect a sorted list, stating which text should be rendered and which not
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
        console.log(placed)
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

            let increase = 20.0

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
    }

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
let msdf = 'data:image/png;base64,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\
YAAAAASUVORK5CYII='

export default TextRenderer
