"use strict";

class MyLoader {
    constructor (renderer)
    {
        // console.log('constructing a loader')
        this.renderer = renderer;
        this.retrieved = {}
        this.chunks = null
    }

    process(data)
    {
        let result = [];
        const splitted = data.split('\n');
        for (let i = 0, l = splitted.length; i < l; i ++)
        {
            const line = splitted[i];
            line.split(",").forEach(element => {
                result.push(parseFloat(element));
            });
        }
        // console.log(new Float32Array(result));
        this.renderer.onContentReady({name: 'x', 
                                      data: new Float32Array(result)});
    }

    overlaps2d(one, other)
    {
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

    getFile(url)
    {
        if (url in this.retrieved) {
            return;
        }
        console.log('Getting ' + url)
        let scope = this; // put `this' into local `scope' variable, so we can reference it in readystatechange callback
        this.retrieved[url] = true;
        let client = new XMLHttpRequest();
        client.open('GET', url, true);
        client.responseType = "text";  // "text", "", "arraybuffer", "json" -- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
        client.onreadystatechange = function()
        {
            if (client.readyState === XMLHttpRequest.DONE && client.status === 200)
            {
                scope.process(client.response);
                // var buf = new ArrayBuffer(client.response.length);
                // buf = client.response;
                // // Here we do transfer the buffer in a way that does not involve
                // // copying the ArrayBuffer
                // // Note, we do assume that this works, but as it has been added
                // // to the spec later, this could not be implemented in a browser!
                // postMessage(buf, [buf]);
            }
            // we close the worker process
            // close();
        }
        client.send(null);
    }

    getMetadata()
    {
        let scope = this; // put `this' into local `scope' variable, so we can reference it in readystatechange callback
        let client = new XMLHttpRequest();
        client.open('GET', 'test_metadata.json', true);
        client.responseType = "json";  // "text", "", "arraybuffer", "json" -- https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
        client.onreadystatechange = function()
        {
            if (client.readyState === XMLHttpRequest.DONE && client.status === 200)
            {
                scope.chunks = client.response;
            }           
        }
        client.send(null);
    }

    getContent(box)
    {
        if (this.chunks === null) { return }
        this.chunks.filter(elem => {
            return this.overlaps2d(box, elem.box)
        }).map(elem => {
            return elem.filenm
        }).map(url => {
            this.getFile(url)
        })
    }
}

export default MyLoader