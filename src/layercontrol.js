


class LayerControl {
    constructor(map, tree_settings) {
        this.map = map
        this.tree_settings = tree_settings
    }

    add_layercontrols(div_id) {

        // var container_close = document.getElementById("container-close");
        // container_close.parentNode.insertBefore(newheader, container_close)
        // var newcontainer = document.createElement("div");
        // newcontainer.class = 'w3-container w3-padding'
        let msgbus = this.map.msgbus;
        var fieldsets_rendering = document.getElementById(div_id)

        this.tree_settings.forEach(tree_setting => {

            let layer_nm = tree_setting.layer_nm
            //console.log('map.js layer_nm:', layer_nm)
            // create a new div element 
            var newfieldset = document.createElement("fieldset");
            fieldsets_rendering.append(newfieldset)


            //make the legend of the layer
            var newlegend = document.createElement("legend");
            newfieldset.append(newlegend); //must append at the beginning so that the content of innerHTML is effective immediately

            let id_cb = layer_nm + '_cb'
            let topic_cb = 'setting.layer.' + layer_nm + '_cb'
            newlegend.innerHTML = `<input type="checkbox" id=${id_cb} onclick="toggle_layer(this)"> ` + layer_nm
            let cb = document.getElementById(id_cb)
            cb.checked = tree_setting.do_draw
            cb.value = topic_cb

            msgbus.subscribe(topic_cb, (topic_cb, message, sender) => {
                tree_setting.do_draw = message //if we want to draw the layer or not
                this.map.abortAndRender();
            });


            //make the slider for the opacity
            var opacity_div = document.createElement("div");
            opacity_div.id = layer_nm + '_opacity-value'

            // var slider_div = document.createElement("div");
            var slider = document.createElement("input")
            // slider.id = layer_nm + '_opacity-slider';
            slider.type = 'range';
            slider.min = 0;
            slider.max = 1;
            slider.step = 0.025;
            slider.value = tree_setting.opacity; //we must set the value after setting slider.step; otherwise, uneffective

            newfieldset.append(opacity_div, slider)



            let topic = 'setting.layer.' + layer_nm + '_opacity-slider'
            msgbus.subscribe(topic, (topic, message, sender) => {
                // let el = document.getElementById(displayid);
                opacity_div.innerHTML = 'opacity value: ' + message;
            });
            // let slider = document.getElementById(widgetid);
            slider.addEventListener('input',
                () => {
                    // console.log('index.html slider.value:', slider.value)

                    msgbus.publish(topic, parseFloat(slider.value));
                    // tree_setting.opacity = parseFloat(slider.value);
                    this.map.abortAndRender();
                }
            );
            msgbus.publish(topic, parseFloat(slider.value));

            msgbus.subscribe(topic, (topic, message, sender) => {
                tree_setting.opacity = parseFloat(message);
                this.map.abortAndRender();
            });
        });
    }

}

export default LayerControl