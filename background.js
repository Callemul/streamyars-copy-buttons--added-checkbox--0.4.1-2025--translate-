/**
 * https://stackoverflow.com/a/50548409/10175189 - тут є приклад обміну між popup.html і background js
 *
 * https://stackoverflow.com/questions/52047483/chrome-extension-activate-and-execute-background-js-on-click-from-popup-js
 */

 chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch(message.type) {
    case "alertUser":
      /* play sound, draw attention */

      console.log('bak')

      var audio = new Audio('Message - 1 Second ! Notification.mp3');
      audio.muted = true;
      audio.play();
      break;
  }
});


 setInterval(() => {

  /**
   * проставляє одразу при загрузки сторінки! Це мені потрібно для адвентістююа буде!
   * @type {string}
   */
 

  chrome.notifications.create('test', {
    type: 'basic',
    iconUrl: '1.png',
    title: 'Test Message',
    message: 'You are awesome!',
    priority: 2
  });


  console.log("World____FORMS BGGGG!");

  }, 2000);







function reddenPage() {
  // document.body.style.backgroundColor = 'red';

  console.log('I disable background script')
  return

  function delete_old_buttons() {
    let elements = document.getElementsByClassName('ivanov');
    // let elements = document.getElementsByClassName('gWgSHg');
    // elements[0].insertAdjacentHTML('beforebegin', "<button aria-label=\"Star comment\" aria-selected=\"false\" color=\"grey\" class=\"ButtonBase__WrapperButton-sc-1ij5je9-0 kUbqKL IconButton__Wrap-sc-zez12x-0 doYxmr PlatformComment__StarButton-sc-g5z7ab-5 kCMdXy\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"#464648\"><path d=\"M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z\"></path></svg></button>")
    for (let i = 0; i < elements.length; i++) {

      // elements[i].insertAdjacentHTML('beforebegin', "<button aria-label=\"Star comment\" aria-selected=\"false\" color=\"grey\" class=\"ButtonBase__WrapperButton-sc-1ij5je9-0 kUbqKL IconButton__Wrap-sc-zez12x-0 doYxmr PlatformComment__StarButton-sc-g5z7ab-5 kCMdXy\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"#464648\"><path d=\"M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z\"></path></svg></button>")
      // elements[i].insertAdjacentHTML('beforebegin', "" +
      //     "<button aria-label=\"Star comment\" aria-selected=\"false\" color=\"grey\"" +
      //     " class=\"ButtonBase__WrapperButton-sc-1ij5je9-0 kUbqKL IconButton__Wrap-sc-zez12x-0 doYxmr PlatformComment__StarButton-sc-g5z7ab-5 kCMdXy\">" +
      //     "</button>"
      //     )
      console.log('22333')
      elements[i].remove();
      // elements[i].innerHTML = '';

      ;
    }
  }


  delete_old_buttons();
  /**
   * Comment actions
   * Star comment
   * @type {HTMLCollectionOf<Element>}
   */
  let elements = document.getElementsByClassName('PlatformComment__TopRightButtonGroup-sc-g5z7ab-3');
  // let elements = document.getElementsByClassName('gWgSHg');
  // elements[0].insertAdjacentHTML('beforebegin', "<button aria-label=\"Star comment\" aria-selected=\"false\" color=\"grey\" class=\"ButtonBase__WrapperButton-sc-1ij5je9-0 kUbqKL IconButton__Wrap-sc-zez12x-0 doYxmr PlatformComment__StarButton-sc-g5z7ab-5 kCMdXy\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"#464648\"><path d=\"M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z\"></path></svg></button>")


  if(elements.length === 0 ){
    /**
     * це якщо в режимі F12 (мале вікно, планшетний режим, дизайн іншийй)
     * @type {NodeListOf<Element>}
     */
    // let elements2 = document.querySelectorAll('[aria-label="Comment actions"]');

    // let elements2 = document.getElementsByClassName('Tooltip__StyledSpan-sc-f4jhla-2');
    let elements2 = document.getElementsByClassName('PlatformCommentShell__IconButtonWrap-sc-qfxokz-12');
    //change class PlatformCommentShell__IconButtonWrap-sc-qfxokz-12
    //to
    //PlatformComment__TopRightButtonGroup-sc-g5z7ab-3
    console.log(0)


    for (let i = 0; i < elements2.length; i++) {

      // elements[i].insertAdjacentHTML('beforebegin', "<button aria-label=\"Star comment\" aria-selected=\"false\" color=\"grey\" class=\"ButtonBase__WrapperButton-sc-1ij5je9-0 kUbqKL IconButton__Wrap-sc-zez12x-0 doYxmr PlatformComment__StarButton-sc-g5z7ab-5 kCMdXy\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"#464648\"><path d=\"M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z\"></path></svg></button>")
      // elements[i].insertAdjacentHTML('beforebegin', "" +
      //     "<button aria-label=\"Star comment\" aria-selected=\"false\" color=\"grey\"" +
      //     " class=\"ButtonBase__WrapperButton-sc-1ij5je9-0 kUbqKL IconButton__Wrap-sc-zez12x-0 doYxmr PlatformComment__StarButton-sc-g5z7ab-5 kCMdXy\">" +
      //     "</button>"
      //     )


      if (elements2[i].getElementsByClassName('ivanov').length === 0) {

        // if(elements2[i].classList.contains("PlatformCommentShell__IconButtonWrap-sc-qfxokz-12")) {
        //   elements2[i].classList.remove("PlatformCommentShell__IconButtonWrap-sc-qfxokz-12");
        //
        // }

        if(!elements2[i].classList.contains("PlatformComment__TopRightButtonGroup-sc-g5z7ab-3")) {
          elements2[i].classList.add("PlatformComment__TopRightButtonGroup-sc-g5z7ab-3");
          elements2[i].classList.add("");
        }


        elements2[i].innerHTML +=
            "<div class='ivanov'>" +
            "<button class='ButtonBase__WrapperButton-sc-1ij5je9-0' onclick='console.log(1)' style='width: 24px; height: 24px;' " +

            "<svg xmlns=\"http://www.w3.org/2000/svg\"  fill=\"#464648\">" +
            "<path d=\"M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z\">" +
            "</path>" +
            "</svg>" +
            "</button>"+
        "</div>"

        ;
      }


    }

  }else {




  }
  console.log('код запускається')
  // alert(elements);
}


function google_forms(){
  setInterval(() => {

    /**
     * проставляє одразу при загрузки сторінки! Це мені потрібно для адвентістююа буде!
     * @type {string}
     */
    document.body.style.backgroundColor = "red";


    console.log("World!");

    }, 2000);
  console.log('google_forms')
}


//https://stackoverflow.com/questions/68471997/why-does-tab-url-from-the-callback-of-chrome-tabs-onupdated-addlistener-retu
//https://stackoverflow.com/questions/68471997/why-does-tab-url-from-the-callback-of-chrome-tabs-onupdated-addlistener-retu
//https://stackoverflow.com/questions/34115837/chrome-tabs-onupdated-addlistener-is-called-twice
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {

  console.log('55')
});



chrome.action.onClicked.addListener((tab) => {
  console.log(tab.url)


  if(tab.url.includes("streamyard.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: reddenPage
    });
  }

  if(tab.url.includes("https://docs.google.com/forms/d/1Uv2PfvWwVCbS_FKEOFA0-YwISzLicsISMqVscMeBlTU/edit?ts=62502c5a")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: google_forms
    });
  }
});




/**
 * for notification
 */
