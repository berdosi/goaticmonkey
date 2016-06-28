var self = require("sdk/self");
var querystring = require("sdk/querystring");
var urls = require("sdk/url");
var tabs = require("sdk/tabs");
var { ToggleButton } = require("sdk/ui/button/toggle"); // adding a toolbar button
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
  contentURL: self.data.url("about:blank"),
  onHide: function() {
	button.state('window', {checked: false});}
});

var port = 3000; //whatever is your port
const {Cc, Ci} = require("chrome");
var serverSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
console.log("serversocket created",serverSocket)
serverSocket.init(port, true, -1);
console.log("serversocket initiated",serverSocket)
var listener = {
	onSocketAccepted: function(socket, transport) {
		console.log("transport",transport,"socket",socket);
		//if ((transport.host == "127.0.0.1") || (transport.host == "0:0:0:0:0:0:0:1") || (transport.host == "::1" )) { 
			// only accept from localhost...g
			var input = transport.openInputStream(Ci.nsITransport.OPEN_BLOCKING,0,0);
			var output = transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
			var tm = Cc["@mozilla.org/thread-manager;1"].getService();
			input.asyncWait({
				onInputStreamReady: function(input) {
				  console.log("input stream is ready");
					try {
									console.log("trying");
						var sin = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
						sin.init(inp);
						sin.available();
						//Get request message
						var request = '';
						while (sin.available()) { request = request + sin.read(5120); }
						var reqObj = { type: null, info: [] };
						if(request != null && request.trim() != "") {
							//Here is the message text
							//var allowedKeys = require('sdk/preferences/service').get(['extensions', require('sdk/self').id, 'keyStrings'].join('.'));					
							console.log(request);
							var apiEndPoint, requestParams // this is going to store the API endpoint we registered using an API script
							
							let urlparams = request.split(" ");
							switch (urlparams[0]) {
								case "GET":
									let requestURL = urls.URL(urlparams[1]);
									[apiEndPoint, request] = [requestURL.fileName, querystring.parse(requestURL.search.substring(1))];
									break;
								case "POST":
									apiEndPoint = urls.URL(urlparams[1]).fileName;
									request = querystring.parse(request.split("\n").pop())
									break;
							}
							console.log(request);
							if (allowedKeys.indexOf(request.key + ";") != -1) {
								tabs.open({
									"url": request.url,
									onReady:function(tab){	
										tab.attach({contentScript: request.f})
								}})
							}
						}
					}
					catch(ex) { }           
					finally {
						sin.close();
						input.close();
						output.close();
					}
				}
			}, 0, 0, tm.mainThread);
			console.log("input",input,"output",output);
		//}
	},
	onStopListening: function(socket, status) { console.log("stoplistening", socket, status); }
};
console.log("Listener ready: ", listener);
serverSocket.asyncListen(listener);
console.log("Addon is running.", serverSocket);
