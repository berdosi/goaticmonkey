/*eslint-env browser */
self.port.on("endpointList",function(endpointList){
	if (endpointList.length === 0) document.body.innerHTML = "There are no registered endpoints";
	else for (var endpoint in endpointList) document.body.innerHTML += endpoint.endpointName;
});
