// ==apiScript==
// @name        verseRichMail
// @namespace   berdosi
// @version     1
// ==/apiScript==

var richTextObserver,
    subject = requestData.subject,
    to = requestData.to,
    message = requestData.message;
(richTextObserver = new MutationObserver(function (mutation) {
  try {
    console.log('try.', mutation);
    richTextObserver.disconnect(); 
    if (document.querySelector('[title^=Rich]').contentDocument.body.firstChild.innerHTML != message) document.querySelector('[title^=Rich]').contentDocument.body.firstChild.innerHTML = message;
    document.querySelector("#uniqName_8_1 > input:nth-child(2)").value = to;
    document.querySelector("#uniqName_26_0_subjectInput").value = subject;
    document.querySelector("#uniqName_26_0_subjectInput").focus();
    window.setTimeout(function(){richTextObserver.disconnect(); document.querySelector("button.socpimBtn:nth-child(3)").click(); },1000);
    
  richTextObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: false
});
  } catch (e) {
    richTextObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: false
})
  }
}
)).observe(document.body, {
  childList: true,
  subtree: true,
  characterData: false
});
