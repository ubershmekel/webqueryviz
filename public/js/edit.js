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


var schemas = {};
var sourceSchemas = {};
schemas.source = sourceSchemas;
sourceSchemas.sqlite = {
    type: "object",
    properties: {
        name: allProps.name,
        filepath: allProps.filepath,
        dbType: allProps.dbType,
    }
};

sourceSchemas.mysql = {
    type: "object",
    properties: {
        name: allProps.name,
        host: allProps.host,
        username: allProps.username,
        password: allProps.password,
        dbType: allProps.dbType,
        database: allProps.database,
    }
};

sourceSchemas.teradata = sourceSchemas.mysql;

/*sourceSchemas.everything = {
    type: "object",
    headerTemplate: "{{ self.type }} - {{ self.name }}",
    defaultProperties: ["_id", "type", "name"],
    properties: allProps
};*/


var sourceIdsArray = [];
var sourceNamesArray = [];
docs.source.forEach(function(doc) {
    sourceIdsArray.push(doc._id);
    sourceNamesArray.push(doc.name + ' - ' + doc.dbType);
});

schemas.query = {
    type: "object",
    properties: {
        name: allProps.name,
        query: allProps.query,
        sourceName: {
            "type": "string",
            "enum": sourceNamesArray,
        },
    }
};

schemas.viz = {
    type: "object",
    properties: {
        name: allProps.name,
        queryId: { "type": "string" },
        href: { "type": "string" },
    }
}

// Initialize the editor
var options = {
    disable_array_delete_all_rows: true,
    disable_array_delete_last_row: true,
    remove_empty_properties: false,
    disable_collapse: true,
    no_additional_properties: false,
    required_by_default: true,
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
    var plotTypes = ['plot', 'gfilter'];
    
    // Mustache makes this hard
    plotTypes[0].first = true;
    headers[0].first = true;
    
    var templateData = {
        plotTypes: plotTypes,
        headers: headers,
        rows: previewRows
    }
    var rendered = Mustache.render(template, templateData);
    $('#tablePreview').html(rendered);
    
    var vizLink = $('#vizLink');
    
    var xpropSelector = '.xpropSelector';
    var plotTypeSelector = '.plotTypeSelector';
    var gfilterTemplate = 'http://localhost:3000/gfilter/?dl=/query/{{queryId}}&type=json&viz={{vizType}}&xprop={{xprop}}';
    
    function onChangeRadio(ev) {
        var xpropSelected = $(xpropSelector + ':checked').val();
        var plotTypeSelected = $(plotTypeSelector + ':checked').val();
        if(xpropSelected) {
            var queryId = editor.getValue()._id;
            var gfilterTemplateData = {
                queryId: queryId,
                xprop: xpropSelected,
                vizType: plotTypeSelected,
            };
            var href = Mustache.render(gfilterTemplate, gfilterTemplateData);
            vizLink.attr("href", href);
        } else {
            vizLink.removeAttr("href");
        }
    }
    
    // default first radio button 
    var propsJq = $(xpropSelector);
    propsJq.first().prop("checked", true);
    $(plotTypeSelector).first().prop("checked", true);
    
    // set default link
    onChangeRadio();
    
    $('.myRadio').change(onChangeRadio);
}

function onPreviewClick(ev) {
    //var id = editor.getValue('root._id');
    var doc = editor.getValue();
    if(doc) {
        var sourceIndex = sourceNamesArray.indexOf(doc.sourceName);
        if(sourceIndex === -1) {
            error("Source name unidentified");
            return;
        }
        doc.sourceId = sourceIdsArray[sourceIndex];
        socket.emit('getQueryDataFromDoc', doc, handleQueryData);
    } else {
        error('Preview requires an id not: "' + id + '"');
    }
}

function queryEditorSetup(editor) {
    var isQueryEd = editor.getEditor('root.query');
    if(!isQueryEd)
        return;
    
    var button = createButton("preview", "btn", "Preview", onPreviewClick);
    editor.element.appendChild(button);
}

function createEditor(title, defaultVal, schema) {
    if(schema) {
        options.schema = schema;
    } else {
        // TODO: make this shared code with the server and data driven
        switch(defaultVal.type) {
            case "query":
                options.schema = schemas.query;
            break;
            case "source":
                options.schema = sourceSchemas[defaultVal.dbType];
            break;
            case "viz":
                options.schema = schemas.viz;
            break;
            default:
                error("Unknown object type: " + defaultVal.type);
        }
    }
    options.schema.title = title;
    var holderId = "editorContainer";
    var holderElem = document.getElementById(holderId);
    clearElement(holderElem);

    editor = new JSONEditor(holderElem, options);
    // Set the value
    if(defaultVal) {
        var orig = editor.getValue();
        $.extend(orig, defaultVal);
        editor.setValue(orig);
    }

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
    
    // Disable fields
    var edElem2 = editor.getEditor('root.dbType');
    if(edElem2)
        edElem2.disable();
    
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
            console.warn(errors);
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
                error(xhr.statusText + ' - ' + xhr.responseText);
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
    var defaultVal = {
        type: "source",
        _id: randomString(8),
        dbType: typeToCreate,
    };
    createEditor("Create source: " + typeToCreate, defaultVal, sourceSchemas[typeToCreate]);
    /*val = editor.getValue();
    val.type = "source";
    val._id = randomString(8);
    val.dbType = typeToCreate;
    editor.setValue(val);*/
}

function onCreateQueryClick(ev) {
    var defaultVal = {
        type: "query",
        _id: randomString(8),
    };
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
        // editObjectId is provided in edit.html
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
