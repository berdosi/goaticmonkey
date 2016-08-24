/*eslint-env browser */
self.port.on("endpointList",function(endpointList){
		 [... document.querySelectorAll("#list a")].splice(2).forEach(function (e){e.parentNode.removeChild(e)})

	if (endpointList.length === 0) document.querySelector("#content").innerHTML = "There are no registered endpoints";
	else {
		for (let endpoint of endpointList) {
			//create a list item for each
			let listItem = document.createElement("a");
			listItem.innerHTML = endpoint.endpointName;
			listItem.addEventListener("click",(function(endpoint) { return function(e){
				console.log(endpoint);
				document.querySelector("#content").innerHTML = JSON.stringify(endpoint).replace(",\"","<br>\"").replace("{","").replace("}","")
			} })(endpoint));
			listItem.href = "#";
			document.querySelector("#list").appendChild(listItem);
		}
	}
	//	document.body.innerHTML += endpoint.endpointName;
});
