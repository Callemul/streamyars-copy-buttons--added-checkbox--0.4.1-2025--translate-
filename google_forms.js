//https://stackoverflow.com/a/36145174/10175189
// setInterval(() => {
//
//     /**
//      * проставляє одразу при загрузки сторінки! Це мені потрібно для адвентістююа буде!
//      * @type {string}
//      */
//     document.body.style.backgroundColor = "yellow";
//     var button = document.createElement("button");
//     button.setAttribute("id", "Div123");
//     document.body.appendChild(button);
//
//     console.log("World!");
//
//     }, 15000);



//https://stackoverflow.com/a/36145174/10175189
setInterval(() => {

    /**
     * проставляє одразу при загрузки сторінки! Це мені потрібно для адвентістююа буде!
     * @type {string}
     */
    document.body.style.backgroundColor = "yellow";

    

    chrome.runtime.sendMessage({type: "alertUser"});

    console.log("World____FORMS!");

    }, 5000);


