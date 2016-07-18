/*eslint-env node */
var self = require("sdk/self");
var querystring = require("sdk/querystring");
var urls = require("sdk/url");
var tabs = require("sdk/tabs");
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');

const {Cc, Ci} = require("chrome");

// we will need this to show prompts. To be replaced with a more API SDK way.
var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService); 
// adding a toolbar button
 var { ToggleButton } = require("sdk/ui/button/toggle"); 

 /* * BEGIN : BROWSER UI * */
var button = ToggleButton({
	id: "goaticButton",
	label: "GoaticMonkey",
	icon: "./goaticon.svg",
	onClick: function(state) {
		if (state.checked) panel.show({ position: button });
	}
});

/* define the panel for the addon*/
var panel = require("sdk/panel").Panel({
  contentURL: self.data.url("./settingspanel.html"),
  contentScriptFile: self.data.url("./settingspanel.js"),
  onHide: function() {
		button.state('window', {checked: false});}
});

panel.on("show",function(){
	getItems(function(e){panel.port.emit("endpointList", e);});});

/* * END : BROWSER UI * */
	
/* * BEGIN : SOCKLISTEN * */

var port = 2051; // This will be the next year of the Metal Goat, which is totally cool.
var serverSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
serverSocket.init(port, true, -1);
console.log("serversocket initiated",serverSocket);

serverSocket.asyncListen({
	onSocketAccepted: function(socket, transport) {
		if (transport.host === "127.0.0.1" || transport.host === "0:0:0:0:0:0:0:1" || transport.host === "::1" ) { // only accept from localhost...
			var input = transport.openInputStream(Ci.nsITransport.OPEN_BLOCKING,0,0);
			var output = transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
			var tm = Cc["@mozilla.org/thread-manager;1"].getService();
			input.asyncWait({
				onInputStreamReady: function(inp) {
					var sin = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
					sin.init(inp);
					sin.available();

					var request = '';
					while (sin.available()) request = request + sin.read(5120); 
					if(request !== null && request.trim() !== "") {
						var apiEndpoint; // this is going to store the API endpoint we registered using an API script
						let urlparams = request.split(" ");

						switch (urlparams[0]) {
							case "GET":
								let requestURL = urls.URL("http://example.org" + urlparams[1]);
								[apiEndpoint, request] = [requestURL.fileName, querystring.parse(requestURL.search.substring(1))];
								request.method = "GET";
								break;
							case "POST":
								apiEndpoint = urls.URL("http://example.org" + urlparams[1]).fileName;
								request = querystring.parse(request.split("\n").pop());
								request.method = "POST";
								break;
						}
						console.log(apiEndpoint, request);
						processRequest(apiEndpoint, request);
					}
					sin.close();
					input.close();
					output.write("OKAY",4);
					output.close();	
				}
			}, 0, 0, tm.mainThread);
		}
	},
	onStopListening: function(socket, status) {  }
});

/* * END : SOCKLISTEN * */

/* * BEGIN : look for new endpoint's in current tabs * */
require("sdk/tabs").on("ready", function(tab){
	if (tab.url.match(/endpoint.js$/)) {
		var worker = tab.attach({contentScript: "self.port.emit('addEndpointMessage', document.body.innerText)"});
		worker.port.on("addEndpointMessage", addEndpoint)
	}
	//if (tab.url.match(/endpoint.js$/)) addEndpoint(tab);
});


/**
 * @name processRequest
 * @description Processes a request: checks for authorization, then executes it.
 * @param apiEndpoint {String} The name of the endpoint called by the request.
 * @param request {Object} The unsanitized data passed to the endpoint.
 * @returns Nothing.
 */
/**
 * @name processRequest
 * @description description
 * @param apiEndpoint
 * @param request
 * @returns returns
 */
function processRequest(apiEndpoint, request) {
	// when a new request arrives, this is going to call the function of apiEndpoint, and pass the requests' data.
	// it needs to check whether the endpoint is enabled, and check, if user confirmation is necessary.
	// the request should contain a "key" parameter - normally we should only allow to run requests from requestors 
	// for which the key has been confirmed by the user. The key should be removed from the request before passing it to the endpoint
	// apiEndpoint's callback mustn't be allowed to access the indexedDb (needs to be run in its own scope)
	// request contains a url property - the place we are to navigate to.
	
	getItem(apiEndpoint, function(endpointObject) {
		var keyIncluded = endpointObject.allowedKeys.indexOf(request.key) > -1;
		if (keyIncluded || confirmRequest(apiEndpoint, request.key)) {
			if (checkURL(request.URL, apiEndpoint.allowedURLs)) tabs.open({
				url: request.url,
				onReady: function(tab) {
					tab.attach({
						contentScript: endpointObject.script, 
						contentScriptOptions: request
					});
			}});
		} else {
// if the key is not included, and the user didn't confirm, there's nothing to do.
		}
	});
}

/**
 * @name checkURL
 * @description Checks whether the request should be allowed based on an URL and a list of patterns
 * @param requestURL {String} The URL the request is targeting.
 * @param allowedURLs {Array} A list of URL patters to match against
 * @returns returns {Boolean} true if the request should be allowed based on it's target URL
 */
function checkURL(requestURL, allowedURLs) {
	// TODO to be implemented
	return true;
}

/**
 * @name confirmRequest
 * @description Shows a confirmation request regarding what to do with the incoming API request.
 * @param apiEndpoint {Object} object, the endpoint object to check against / update.
 * @param apiKey {String} the api key to match against.
 * @returns {Boolean} TRUE if access is granted, FALSE if refused
 */
function confirmRequest(apiEndpoint, apiKey) {
// TODO : show a confirmation dialog explaining the implications.
// actions: 
// - allow now
// - allow and store key for permanent use
// - deny now
// - deny permanently
// permanent actions add the api's key to the obejctstore
// if there are too much requests to be denied with changing api keys, the endpoint should be renamed by the user, and given to the trusted applications.

// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPromptService#select()

	return true;
}


/////////////////////////////
/* * DATABASE FUNCTIONS * */
/////////////////////////////
// https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/indexed-db

var database = {};

database.onerror = function(e) { console.error(e.value); };

function open(version) {
	var request = indexedDB.open("endpointDb", version);
	request.onupgradeneeded = function(e) {
		var db = e.target.result;
		e.target.transaction.onerror = database.onerror;
		if (db.objectStoreNames.contains("endpoints")) 
				db.deleteObjectStore("endpoints");	
				// TODO : the database schema should be updated with 
				// default values instead of, well, burning up it all. 
		db.createObjectStore("endpoints", {keyPath: "endpointName"});
	};

	request.onsuccess = function (e) { database.db = e.target.result; };

	request.onerror = database.onerror;
}

open(1);
/**
 * @name addEndpoint
 * @description Adds the endpoint to the database (or updates a previous one)
 * @param endpoint {String}	The source code of the script to be parsed.
 * @returns null
 */
function addEndpoint(endpoint) {
	var header, body;
	[header, body] = endpoint.split("/*body*/");
	header = JSON.parse(header.replace(/^[a-z]+ ?= ?/,"").replace(/;$/,"")); 
	// allowing metadata to be assigned to a variable (thus making the script a valid javascript)
	console.log(header, body);
	if (header.endpointName === undefined || header.allowedURLs === undefined) { console.log("missing data"); return; }
	var db = database.db;
	var trans = db.transaction(["endpoints"],"readwrite");
	var store = trans.objectStore("endpoints");
	var request = store.put({
		"endpointName": header.endpointName,
		"enabled": true,
		"confirmationRequired": true, // if there is a request, let the user decide if it is to be fulfilled
		"allowedKeys": [],
		"deniedKeys": [],
		"getEnabled": true, // TODO: for debugging only . we don't really want malicious links using our endpoints 
		"postEnabled": true,
		"invisibleEnabled": false, // not implemented yet : invisible apis will be able to function in the background
		"description": header.description ? header.description : "No description provided", 
		"script": body,
		"allowedURLs": header.allowedURLs
		});
	request.onsuccess = function (e) {console.log("endpoint added", e, request)}
	request.onerror = database.onerror;
}

function getItems(callback) {
	var trans = database.db.transaction(["endpoints"]);
	var store = trans.objectStore("endpoints");
	var items = new Array();

	var keyRange = IDBKeyRange.lowerBound(0);
	var cursorRequest = store.openCursor(keyRange);

	cursorRequest.onsuccess = function(e) {
		var result = e.target.result;
		if (!!result === false) return;

		items.push(result);
		result.continue();
	};
	cursorRequest.onerror = database.onerror;

	trans.oncomplete = function() { callback(items); };
}

function getItem(item, callback) {
	var trans = database.db.transaction(["endpoints"]);
	var store = trans.objectStore("endpoints");
	var request = store.get(item);
	request.onsuccess = function(event){ callback(request.result); };
}