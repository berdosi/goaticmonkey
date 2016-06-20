var self = require("sdk/self");
var tabs = require("sdk/tabs");



var port = 3000; //whatever is your port
const {Cc, Ci} = require("chrome");
var serverSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
serverSocket.init(port, true, -1);
var listener = {
    onSocketAccepted: function(socket, transport) {
    	if (transport.host == "127.0.0.1") || (transport.host == "0:0:0:0:0:0:0:1") || (transport.host == "::1" ) { // only accept from localhost...g
	        var input = transport.openInputStream(Ci.nsITransport.OPEN_BLOCKING,0,0);
	        var output = transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
	        var tm = Cc["@mozilla.org/thread-manager;1"].getService();
	        input.asyncWait({
	            onInputStreamReady: function(inp) {
	                try
	                {
	                    var sin = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	                    sin.init(inp);
	                    sin.available();
	
	                    //Get request message
	                    var request = '';
	                    while (sin.available()) { request = request + sin.read(5120); }
	                    var reqObj = { type: null, info: [] };
	                    if(request != null && request.trim() != "") {
	
	                        //Here is the message text
							var allowedKeys = require('sdk/preferences/service').get(['extensions', require('sdk/self').id, 'keyStrings'].join('.'));					
							request = JSON.parse(request);
	                        console.log(request);
							if (allowedKeys.indexOf(request.key + ";") != -1) {
							tabs.open({
								"url": request.url,
								onReady:function(tab){
									tab.attach({
										contentScript: request.f
										}
									)
								}})
							}
	                    }
	                }
	                catch(ex) { }           
	                finally
	                {
	                    sin.close();
	                    input.close();
	                    output.close();
	                }
	            }
	        }, 0, 0, tm.mainThread);
    	}
    },
    onStopListening: function(socket, status) {
    }
};
serverSocket.asyncListen(listener);
