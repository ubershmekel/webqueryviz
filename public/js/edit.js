console.log(docs);

// Set default options
//JSONEditor.defaults.options.theme = 'foundation5';
//JSONEditor.defaults.options.iconlib = 'foundation3';
//JSONEditor.defaults.options.theme = 'bootstrap3';
//JSONEditor.defaults.options.iconlib = 'bootstrap3';

// Initialize the editor
var options = {
    disable_array_delete_all_rows: true,
    disable_array_delete_last_row: true,
    remove_empty_properties: true,
    disable_collapse: true,
    theme: 'bootstrap3',
    iconlib: 'bootstrap3',
    schema: {
        type: "array",
        format: "tabs",
        items: {
            type: "object",
            headerTemplate: "{{ self.type }} - {{ self._id }}",
            defaultProperties: ["_id", "type", "name"],
            properties: {
                name: { "type": "string" },
                _id: { "type": "string" },
                type: {
                    "type": "string",
                    "enum": modelTypesArray
                },
                dbType: {
                    "type": "string",
                    "enum": dbTypesArray
                },

                // source
                host: { "type": "string" },
                username: { "type": "string" },
                filepath: { "type": "string" },
                password: {
                    "type": "string",
                    "format": "password"
                },
                
                // query
                sourceId: { "type": "string" },
                query: { "type": "string", format: "textarea" },
                
                // viz
                queryId: { "type": "string" },
                href: { "type": "string" },
            }
        }
    }
};

var editor;
function createEditor(holderId, title, data) {
    options.schema.title = title;
    editor = new JSONEditor(document.getElementById(holderId), options);
    // Set the value
    editor.setValue(data);
}


for(var i = 0; i < docs.length; i++) {
    //createEditor("content", docs[i]._id, docs[i]);
    //docs[i].id = docs[i]._id;
}

createEditor("content", "Objects", docs);


// Get the value
//var data = editor.getValue();
//console.log(data.name); // "John Smith"

// Validate
var errors = editor.validate();
if(errors.length) {
    // Not valid
    alert(errors);
}

// Listen for changes
editor.on("change",  function() {
    // Do something...
});