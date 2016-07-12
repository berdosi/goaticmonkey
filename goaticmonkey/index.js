var self = require("sdk/self");
var querystring = require("sdk/querystring");
var urls = require("sdk/url");
var tabs = require("sdk/tabs");
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db'); 
var { ToggleButton } = require("sdk/ui/button/toggle"); // adding a toolbar button

/* * USER INTERFACE * */

var button = ToggleButton({
	id: "goaticButton",
	label: "GoaticMonkey",
	icon: "./goaticon.svg",
	onClick: function(state) {
		if (state.checked) panel.show({ position: button })
	}
})

/* define the panel for the addon*/
var panel = require("sdk/panel").Panel({
  contentURL: self.data.url("./settingspanel.html"),
  contentScriptFile: self.data.url("./settingspanel.js"),
  onHide: function() {
		button.state('window', {checked: false});}
});
//panel.on("show",function(){panel.port.emit("endpointList",endpointList())});

panel.on("show",function(){
	getItems(function(e){panel.port.emit("endpointList", e)})});


/* * SOCKLISTEN * */

var port = 2051; // This will be the next year of the Metal Goat, which is totally cool.
const {Cc, Ci} = require("chrome");
var serverSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
serverSocket.init(port, true, -1);
console.log("serversocket initiated",serverSocket)

serverSocket.asyncListen({
	onSocketAccepted: function(socket, transport) {
		if ((transport.host == "127.0.0.1") || (transport.host == "0:0:0:0:0:0:0:1") || (transport.host == "::1" )) { // only accept from localhost...
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
					var reqObj = { type: null, info: [] };
					if(request != null && request.trim() != "") {
						var apiEndPoint, requestParams; // this is going to store the API endpoint we registered using an API script
						let urlparams = request.split(" ");

						switch (urlparams[0]) {
							case "GET":
								let requestURL = urls.URL("http://example.org" + urlparams[1]);
								[apiEndPoint, request] = [requestURL.fileName, querystring.parse(requestURL.search.substring(1))];
								request.method = "GET"
								break;
							case "POST":
								apiEndPoint = urls.URL("http://example.org" + urlparams[1]).fileName;
								request = querystring.parse(request.split("\n").pop())
								request.method = "POST"
								break;
						}
						console.log(apiEndPoint, request);
						processRequest(apiEndPoint, request);
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


function endpointList() {
	// this function is going to list the current state of installed APIs, and returns it (the settingspanel's content script will receive it)
	// an API has : name, enabledState, userConfirmationNeededState
	return "placeholder"

}

function processRequest(apiEndPoint, request) {
	// when a new request arrives, this is going to call the function of apiEndpoint, and pass the requests' data.
	// it needs to check whether the endpoint is enabled, and check, if user confirmation is necessary.
	// the request should contain a "key" parameter - normally we should only allow to run requests from requestors 
	// for which the key has been confirmed by the user. The key should be removed from the request before passing it to the endpoint
	// apiEndPoint's callback mustn't be allowed to access the indexedDb (needs to be run in its own scope)
	// request contains a url property - the place we are to navigate to.
	request.key = ""; // TODO : check if the key is valid 
	if (true) { // todo : check for user confirmation, if necessary, and whether the request type is allowed  (in request.method)
	getItems(function (e) {
		for (item in endpointList) {
			if (item.endpointName) {
				tabs.open({
					url: request.url, // TODO: check if the url is among the target URLs
					onReady: function(tab) {
						tab.attach({
							contentScript: e.script, 
							contentScriptOptions: request
						});
				}})
			}
			
		}
	
	})
	}
}
// TODO : callbacks to delete / disable / switchCOnfirmationSTate of endpoints


/////////////////////////////
/* * DATABASE FUNCTIONS * */
/////////////////////////////
// https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/indexed-db

var database = {};

database.onerror = function(e) { console.error(e.value) }

function open(version) {
	var request = indexedDB.open("endpointDb", version);
	request.onupgradeneeded = function(e) {
		var db = e.target.result;
		e.target.transaction.onerror = database.onerror;
		if (db.objectStoreNames.contains("endpoints")) db.deleteObjectStore("endpoints");
		var store = db.createObjectStore("endpoints", {keyPath: "endpointName"});
	};

	request.onsuccess = function (e) { database.db = e.target.result; }

	request.onerror = database.onerror;
}

open(1);

function addEndpoint(endpoint) {
	var db = database.db;
	var trans = db.transaction(["endpoints"],"readwrite");
	var store = trans.objectStore("endpoints");
	var request = store.put({
		"endpointName": endpoint.endpointName,
		"enabled": true,
		"confirmationRequired": true, // if there is a request, let the user decide if it is to be fulfilled
		"allowedKeys": [],
		"getEnabled": true, // for debugging only . we don't really want malicious links using our endpoints 
		"postEnabled": true,
		"invisibleEnabled": false, // not implemented yet : invisible apis will be able to function in the background
		"script": endpoint.script,
		
		});
	request.onerror = database.onerror;
}

function getItems(callback) {
	var trans = database.db.transaction(["endpoints"],"readwrite");
	var store = trans.objectStore("endpoints");
	var items = new Array();

	var keyRange = IDBKeyRange.lowerBound(0);
	var cursorRequest = store.openCursor(keyRange);

	cursorRequest.onsuccess = function(e) {
		var result = e.target.result;
		if (!!result == false) return;

		items.push(result);
		result.continue();
	}
	cursorRequest.onerror = database.onerror;

	trans.oncomplete = function() { callback(items); }
}


