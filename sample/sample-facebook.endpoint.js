o = {
	"endpointName": "facebookEndpoint424",
	"allowedURLs": ["https://mbasic.facebok.com"],
	"description": "Allows posting status updates on Facebook using the mobile interface."};
/*body*/
/*eslint-env browser */
document.querySelector("textarea").value = self.options.m;
if (confirm("Are you sure you want to post this? \n" + self.options.m)) document.querySelector("textarea").form["view_post"].click();