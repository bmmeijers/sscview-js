import parse_obj from './parse';

self.onmessage = function(e) {    
    let id = e.data.id
    let url = e.data.msg

    console.log(`fetching ${url}`)
    fetch(url)  //e.g., url = "/gpudemo/2020/03/merge/0.1/data/sscgen_smooth.obj"
        .then(response => { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
        .then(data_text => { 
            let arrays = parse_obj(data_text)
            console.log(arrays)
            // the arrays are transferable objects (ArrayBuffer objects)
            // (will be transferred without copy overhead to main process)
            postMessage({id: id, msg: arrays}, arrays)  
        })
        .catch(err => { console.error(err) });

}
