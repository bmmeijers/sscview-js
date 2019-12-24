import parse_obj from './parse';

self.onmessage = function(e) {
    let url = e.data.msg
    let id = e.data.id
    fetch(url)  //e.g., url = "http://localhost:8000/de/buchholz_greedy_test.obj"
        .then(response => { return response.text() })  //e.g., the text (dataset) stored in an .obj file            
        .then(data_text => { 
            let arrays = parse_obj(data_text)
            // the arrays are transferable objects (ArrayBuffer objects)
            // (will be transferred without copy overhead to main process)
            postMessage({id: id, msg: arrays}, arrays)  
        })
        .catch(err => { console.error(err) });
}
