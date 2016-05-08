var socket = io();

var allProps = {
    name: {
        "type": "string",
        "minLength": 1
    },
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
    host: {
        "type": "string",
        "minLength": 1
    },
    username: {
        "type": "string",
        "minLength": 1
    },
    filepath: {
        "type": "string",
        "minLength": 1
    },
    password: {
        "type": "string",
        "format": "password"
    },
    
    // query
    database: { "type": "string" },
    sourceId: { "type": "string" },
    query: {
        "type": "string",
        "format": "textarea",
        "minLength": 1,
    },
    
    // viz
    queryId: { "type": "string" },
    href: { "type": "string" },
};


var sourceSchemas = {};
sourceSchemas.sqlite = {
    type: "object",
    properties: {
        name: allProps.name,
        filepath: allProps.filepath,
    }
};

sourceSchemas.mysql = {
    type: "object",
    properties: {
        name: allProps.name,
        host: allProps.host,
        username: allProps.username,
        password: allProps.password,
    }    
};

sourceSchemas.teradata = sourceSchemas.mysql;

sourceSchemas.everything = {
    type: "object",
    headerTemplate: "{{ self.type }} - {{ self.name }}",
    defaultProperties: ["_id", "type", "name"],
    properties: allProps
};


var sourceIdsArray = [];
var sourceNamesArray = [];
docs.source.forEach(function(doc) {
    sourceIdsArray.push(doc._id);
    sourceNamesArray.push(doc.name + ' - ' + doc.dbType);
});

querySchema = {
    type: "object",
    properties: {
        name: allProps.name,
        query: allProps.query,
        sourceId: {
            "type": "string",
            "enum": sourceNamesArray,
        },
    }
};


// Initialize the editor
var options = {
    disable_array_delete_all_rows: true,
    disable_array_delete_last_row: true,
    remove_empty_properties: false,
    disable_collapse: true,
    no_additional_properties: false,
    show_errors: "always",
    theme: 'bootstrap3',
    iconlib: 'bootstrap3',
};

var editor;


function randomString(len, charSet) {
    charSet = charSet || 'abcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
    	var randomPoz = Math.floor(Math.random() * charSet.length);
    	randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

function handleQueryData(err, docs) {
    if(err || !docs) {
        error("Failed to get query data:" + err);
        return;
    }
    //console.log(docs);
    
    if(docs.length === 0) {
        error("Zero results");
        return;
    }
    var headers = Object.keys(docs[0]);
    var previewRows = [];
    var previewLen = 100;
    if(docs.length < previewLen)
        previewLen = docs.length;
    
    for (var i = 0; i < previewLen; i++) {
        var row = [];
        previewRows.push(row);
        for(var j = 0; j < headers.length; j++) {
            row.push(docs[i][headers[j]]);
        }
    }
    
    var template = $('#tableTemplate').html();
    Mustache.parse(template);   // optional, speeds up future uses
    var templateData = {
        headers: headers,
        rows: previewRows
    }
    var rendered = Mustache.render(template, templateData);
    $('#tablePreview').html(rendered);
    
}

function onPreviewClick(ev) {
    //var id = editor.getValue('root._id');
    var doc = editor.getValue();
    if(doc)
        socket.emit('getQueryDataFromDoc', doc, handleQueryData);
    else
        error('Preview requires an id not: "' + id + '"');
}

function queryEditorSetup(editor) {
    var isQueryEd = editor.getEditor('root.query');
    if(!isQueryEd)
        return;
    
    var button = createButton("preview", "btn", "Preview", onPreviewClick);
    editor.element.appendChild(button);
}

function createEditor(title, data, schema) {
    if(schema)
        options.schema = schema;
    else
        options.schema = sourceSchemas.everything;
    options.schema.title = title;
    var holderId = "editorContainer";
    var holderElem = document.getElementById(holderId);
    clearElement(holderElem);

    editor = new JSONEditor(holderElem, options);
    // Set the value
    if(data)
        editor.setValue(data);

    // Hide the things users should not modify
    //editor.getEditor('root._id').disable();
    var toHide = ['root._id', 'root.type'];
    toHide.forEach(function(val) {
        var edElem = editor.getEditor(val);
        if(edElem)
            edElem.container.style.display = 'none';
    });
    
    // Tooltips
    var edElem = editor.getEditor('root.password');
    if(edElem)
        edElem.container.setAttribute("title", "Passwords are stored as plain text on the server - beware")
    
    // Buttons
    var saveButton = createButton("save", "btn btn-primary", "Save", onSaveClick);
    holderElem.appendChild(saveButton);
    
    var deleteButton = createButton("delete", "btn btn-danger", "Delete", onDeleteClick);
    holderElem.appendChild(deleteButton);
    
    queryEditorSetup(editor);

    return editor;
}

function onDeleteClick(mouseEvent) {
    // TODO: implement
    humane.error("Not yet implemented");
}

function onSaveClick(mouseEvent) {
    // Validate
    function isValid() {
        var errors = editor.validate();
        if(errors.length) {
            // Not valid
            //error(errors);
            return false;
        }
        return true;
    }
    //editor.on("change",  function() {
    if(!isValid()) {
        humane.log("Not sending update to doc because it is invalid");
        return;
    }
    console.log("Sending update to doc");
    
    // TODO: make socketio safe
    var doc = editor.getValue();
    var jsonNewDoc = JSON.stringify(doc);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                //humane.log(xhr.responseText);
                humane.log("Saved");
            } else {
                error(xhr.statusText);
            }
        }
    };
    xhr.onerror = function (e) {
        error(xhr.statusText + ' ' + e);
    };
    xhr.send(jsonNewDoc);
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
    var defaultVal = undefined;
    /*var defaultVal = {
        type: "source",
        _id: randomString(8),
        dbType: typeToCreate,
    };*/
    createEditor("Create source: " + typeToCreate, defaultVal, sourceSchemas[typeToCreate]);
    /*val = editor.getValue();
    val.type = "source";
    val._id = randomString(8);
    val.dbType = typeToCreate;
    editor.setValue(val);*/
}

function onCreateQueryClick(ev) {
    var defaultVal = undefined;
    createEditor("Create query", defaultVal, querySchema);
}

function createButton(id, cssClass, text, onClick) {
    var textNode = document.createTextNode(text);
    var button = document.createElement("button");
    button.appendChild(textNode);
    button.className = cssClass;
    button.id = id;
    button.onclick = onClick;
    return button;
}

function main() {
    var buttonHolderId = "newButtons";
    if(editObjectId) {
        var docToEdit = null;
        docToEdit = findCurrentDocToEdit(editObjectId, docs);
        createEditor("Objects", docToEdit);
    } else {
        var buttonHolder = document.getElementById(buttonHolderId);
        var createCssClass = "createButton btn";

        // new query
        var buttonQuery = createButton("queryCreate", createCssClass + " btn btn-primary", "Create Query", onCreateQueryClick);
        buttonHolder.appendChild(buttonQuery);
        
        // new source
        for(var i = 0; i < dbTypesArray.length; i++) {
            var dbTypeName = dbTypesArray[i];
            
            var button = createButton(dbTypeName, createCssClass, capitalizeFirstLetter(dbTypeName), onCreateSourceClick);
            buttonHolder.appendChild(button);
        }
        
    }
}

main();
