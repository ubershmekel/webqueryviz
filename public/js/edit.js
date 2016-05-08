var allProps = {
    name: { "type": "string" },
    _id: { "type": "string" },
    slug: { "type": "string" },
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
    database: { "type": "string" },
    sourceId: { "type": "string" },
    query: { "type": "string", format: "textarea" },
    
    // viz
    queryId: { "type": "string" },
    href: { "type": "string" },
};


var schemas = {};
schemas.sqlite = {
    type: "object",
    properties: {
        name: { "type": "string" },

        // source
        filepath: { "type": "string" },
    }
};

schemas.mysql = {
    type: "object",
    properties: {
        name: { "type": "string" },
        host: { "type": "string" },
        username: { "type": "string" },
        password: {
            "type": "string",
            "format": "password"
        },
    }    
};

schemas.teradata = schemas.mysql;


schemas.everything = {
    type: "object",
    headerTemplate: "{{ self.type }} - {{ self.slug }}",
    defaultProperties: ["_id", "type", "name"],
    properties: allProps
};


// Initialize the editor
var options = {
    disable_array_delete_all_rows: true,
    disable_array_delete_last_row: true,
    remove_empty_properties: false,
    disable_collapse: true,
    no_additional_properties: false,
    theme: 'bootstrap3',
    iconlib: 'bootstrap3',
};

var editor;
function createEditor(holderId, title, data, schema) {
    if(schema)
        options.schema = schema;
    else
        options.schema = schemas.everything;
    options.schema.title = title;
    editor = new JSONEditor(document.getElementById(holderId), options);
    // Set the value
    if(data)
        editor.setValue(data);

    // Hide the things users should not modify
    //editor.getEditor('root._id').disable();
    //editor.getEditor('root.type').hide();
    var toHide = ['root._id', 'root.type'];
    toHide.forEach(function(val) {
        var edElem = editor.getEditor(val);
        if(edElem)
            edElem.container.style.display = 'none';
    });
    
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
        // TODO: delete this?
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "", true);
        //xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        xhr.setRequestHeader("Content-Type", "application/json");
        var docsList = editor.getValue();
        //xhr.send(JSON.stringify(docsList));
    });
}


function findCurrentDocToEdit(targetId, docsObject) {
    var found = null;
    Object.keys(docsObject).forEach(function(key)  {
        docsObject[key].forEach(function(doc){
            if(doc._id === targetId) {
                found = doc;
            }
        });
    });
    return found;
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }    
}

function onCreateSourceClick(ev) {
    //console.log(ev);
    var el = ev.target;
    var typeToCreate = el.id;
    console.log(typeToCreate);
    var editorContainer = document.getElementById(editorId);
    clearElement(editorContainer);
    createEditor(editorId, "Create source: " + typeToCreate, undefined, schemas[typeToCreate]);
}

var buttonHolderId = "newButtons";
var editorId = "editorContainer";
if(editObjectId) {
    var docToEdit = null;
    docToEdit = findCurrentDocToEdit(editObjectId, docs);
    createEditor(editorId, "Objects", docToEdit);
} else {
    //createEditor("content", "Objects", {type: true});
    var buttonHolder = document.getElementById(buttonHolderId);
    for(var i = 0; i < dbTypesArray.length; i++) {
        var button = document.createElement("button");
        var dbTypeName = dbTypesArray[i];
        
        var text = document.createTextNode(capitalizeFirstLetter(dbTypeName));
        button.appendChild(text);
        button.className = "createButton";
        button.id = dbTypeName;
        button.onclick = onCreateSourceClick;
        buttonHolder.appendChild(button);
    }
}

