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
serverSocket.init(port, true, -1);
console.log("serversocket initiated",serverSocket)

serverSocket.asyncListen({
	onSocketAccepted: function(socket, transport) {
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
							break;
						case "POST":
							apiEndPoint = urls.URL("http://example.org" + urlparams[1]).fileName;
							request = querystring.parse(request.split("\n").pop())
							break;
					}
					console.log(apiEndPoint, request);
				}
				sin.close();
				input.close();
				output.write("OKAY",4);
				output.close();	
			}
		}, 0, 0, tm.mainThread);
	},
	onStopListening: function(socket, status) {  }
});
