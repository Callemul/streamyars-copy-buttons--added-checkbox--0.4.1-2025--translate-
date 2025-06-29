
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


var listOfCommetsAndCheckboxes = [];



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function copyToClipboard(text) {
    copyToClipboard_withHeader("", text)
}

function copyToClipboard_withHeader(header, text) {
    //window.prompt(header+ "\n\nCopy to clipboard: Ctrl+C, and Enter", text);
    bannerMessage = "Скопійовано в буфер обміну:\n" + header + "\n\n" + text;
  // --- 1. Копіювання в буфер обміну ---
  // Використовуємо сучасний та безпечний Navigator Clipboard API
    navigator.clipboard.writeText(text).then(() => {
        // Цей код виконається, якщо копіювання було успішним

        // --- 2. Створення та відображення банера ---

        // Спочатку перевіримо, чи немає вже такого банера, щоб уникнути дублів
        const existingBanner = document.querySelector('.copy-success-banner');
        if (existingBanner) {
        existingBanner.remove();
        }

        // Створюємо елемент div для нашого банера
        const banner = document.createElement('div');
        banner.className = 'copy-success-banner'; // Призначаємо клас для CSS стилів
        banner.textContent = bannerMessage; // Встановлюємо текст

        // Додаємо банер на сторінку
        document.body.appendChild(banner);

        // --- 3. Анімація появи та зникнення ---

        // Невелика затримка перед появою, щоб CSS transition спрацював
        setTimeout(() => {
        banner.classList.add('visible');
        }, 10);

        // Через 2 секунди запускаємо анімацію зникнення
        setTimeout(() => {
        banner.classList.remove('visible');
        }, 2000); // 2000 мс = 2 секунди

        // Ще через 0.5 секунди (час анімації) повністю видаляємо банер зі сторінки
        setTimeout(() => {
        banner.remove();
        }, 2500); // 2000 мс (видимість) + 500 мс (анімація зникнення)

    }).catch(err => {
        // Цей код виконається, якщо виникла помилка
        console.error('Не вдалося скопіювати текст: ', err);
        // Можна також показати банер з помилкою
        alert('Помилка: не вдалося скопіювати текст.');
    }); 
}

/**
 * only text comment
 */
function every_clicked_buton(){
    //                  div_ivanov    div -3        div z-0
    console.log(this.parentElement.parentElement.parentElement)
    //main title and text here PlatformCommentShell__TextWrap-sc-qfxokz-6
    //title ----------- PlatformCommentShell__NameText-sc-qfxokz-9
    //comment -------- PlatformCommentShell__ContentSpan-sc-qfxokz-15
    let nameAndComment = this.parentElement.parentElement.parentElement;

    comment_text = $(nameAndComment).find("[class*='PlatformCommentShell__ContentSpan']").first().text();

    copyToClipboard_withHeader("📄Комент (без автора)", comment_text)

}



/**
 * icon with RED point - author + text
 */
function every_clicked_buton2(){
    //                  div_ivanov    div -3        div z-0
    console.log(this.parentElement.parentElement.parentElement)
    //main title and text here PlatformCommentShell__TextWrap-sc-qfxokz-6
    //name ----------- PlatformCommentShell__NameText-sc-qfxokz-9
    //comment -------- PlatformCommentShell__ContentSpan-sc-qfxokz-15
    let nameAndComment = this.parentElement.parentElement.parentElement;
    var name_text, comment_text ;

    // let name = nameAndComment.getElementsByClassName('PlatformCommentShell__NameText-sc-qfxokz-9')
    // let name = nameAndComment.querySelectorAll('[class^="PlatformCommentShell__NameText"]');
    name_text = $(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().text();
    // console.log('--')
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']"))
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first())
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().val())
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").innerHTML);
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").length);
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").text());
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().text());

    // let comment = nameAndComment.getElementsByClassName('PlatformCommentShell__ContentSpan-sc-qfxokz-15')
    // let comment = nameAndComment.querySelectorAll('[class^="PlatformCommentShell__ContentSpan"]');
    comment_text = $(nameAndComment).find("[class*='PlatformCommentShell__ContentSpan']").first().text();

    copyToClipboard_withHeader("📑Автор і його 📄комент", name_text + '\n\n' + comment_text)


    // alert('1')
}



function every_clicked_buton3_Pray(){
    //                  div_ivanov    div -3        div z-0
    console.log(this.parentElement.parentElement.parentElement)
    //main title and text here PlatformCommentShell__TextWrap-sc-qfxokz-6
    //name ----------- PlatformCommentShell__NameText-sc-qfxokz-9
    //comment -------- PlatformCommentShell__ContentSpan-sc-qfxokz-15
    let nameAndComment = this.parentElement.parentElement.parentElement;
    var name_text, comment_text ;

    // let name = nameAndComment.getElementsByClassName('PlatformCommentShell__NameText-sc-qfxokz-9')
    // let name = nameAndComment.querySelectorAll('[class^="PlatformCommentShell__NameText"]');
    name_text = $(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().text();
    // console.log('--')
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']"))
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first())
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().val())
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").innerHTML);
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").length);
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").text());
    // console.log($(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().text());

    // let comment = nameAndComment.getElementsByClassName('PlatformCommentShell__ContentSpan-sc-qfxokz-15')
    // let comment = nameAndComment.querySelectorAll('[class^="PlatformCommentShell__ContentSpan"]');
    comment_text = $(nameAndComment).find("[class*='PlatformCommentShell__ContentSpan']").first().text();

    copyToClipboard_withHeader("📑Автор і його 🙏 молитовне прохання", '\n\n\n🙏🙏🙏 ' + name_text + '\n\n' + comment_text)


    // alert('1')
}



/*
When click to at CheckBox - then mark this comment like CHECKED
*/
function every_clicked_checkbox4(){
    //                  div_ivanov    div -3        div z-0
    console.log(this.parentElement.parentElement.parentElement)
    let nameAndComment = this.parentElement.parentElement.parentElement;
    var name_text, comment_text ;

    // let name = nameAndComment.getElementsByClassName('PlatformCommentShell__NameText-sc-qfxokz-9')
    // let name = nameAndComment.querySelectorAll('[class^="PlatformCommentShell__NameText"]');
    name_text = $(nameAndComment).find("[class*='PlatformCommentShell__NameText']").first().text();

    // let comment = nameAndComment.querySelectorAll('[class^="PlatformCommentShell__ContentSpan"]');
    comment_text = $(nameAndComment).find("[class*='PlatformCommentShell__ContentSpan']").first().text();

    //copyToClipboard_withHeader("📑Автор і його 🙏 молитовне прохання", '\n\n\n🙏🙏🙏 ' + name_text + '\n\n' + comment_text)

    var element = listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text)
    console.log('TTTTT')
    console.log('curElement: ' + element)


    var newCount, isChecked

    if(element!=undefined){
        newCount = element.countClickIt + 1
        isChecked = !element.isChecked

        console.log('newCount:' + newCount)
        console.log('isChecked:' + isChecked)

        element.countClickIt = newCount
        element.isChecked = isChecked
    }else{
        newCount = 0;
        isChecked = true;
        let elementDB = {comment_text: comment_text, isChecked: isChecked, countClickIt: newCount}; //
        listOfCommetsAndCheckboxes.push(elementDB);

    }
/* FOR TESTING
    console.log('Before Update CurElement:' + element)




    var elementAfterUpdate = listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text)
    console.log('UpdatedCurElement' + elementAfterUpdate)
    console.log('MMMM')*/

    //alert(listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text)?.comment_text); // No error!)
}






/**
 * banner's button
 * Це кнопка для банерів вкладки. ДОДАТКОВІ МОЇ КНОПКИ ДЛЯ БАНЕРІВ
 */
function every_clicked_BANNER_buton1(){
    let banner = this.parentElement.parentElement.parentElement;

    //                  div_ivanov    div -3        div z-0
    console.log(banner)
    //main title and text here PlatformCommentShell__TextWrap-sc-qfxokz-6
    //name ----------- PlatformCommentShell__NameText-sc-qfxokz-9
    //comment -------- PlatformCommentShell__ContentSpan-sc-qfxokz-15
    var banner_text ;

    // let banner_el_temp = banner.getElementsByClassName('Banner__BannerText-sc-t4oiaf-5')
    // let banner_el_temp = banner.querySelectorAll('[class^="Banner__BannerText"]');
    banner_text = $(banner).find("[class*='Banner__BannerText']").first().text();

    copyToClipboard_withHeader("Текст з Банера🗞",banner_text)


    // alert('1')
}

setInterval(() => {

    /**
     * проставляє одразу при загрузки сторінки! Це мені потрібно для адвентістююа буде!
     * @type {string}
     */
    // document.body.style.backgroundColor = "yellow";
    // var button = document.createElement("button");
    // button.setAttribute("id", "Div123");
    // document.body.appendChild(button);

        /*
        main div has classname : PlatformCommentShell__ContentSpan-sc-qfxokz-15
         */

    // let elements = document.getElementsByClassName('PlatformComment__TopRightButtonGroup-sc-g5z7ab-3');
    let elements = document.querySelectorAll('[class^="PlatformComment__TopRightButtonGroup"]');
    let elementsBottom = document.querySelectorAll('[class^="PlatformCommentShell__ContentSpan"]'); //PlatformCommentShell__ContentSpan
    if(elements.length !== 0 ){
        //GOOD
        for (let i = 0; i < elements.length; i++) {

            
            // КНОПКА в ЧАТІ - 1
            if (elements[i].getElementsByClassName('ivanov').length === 0) {

                elements[i].insertAdjacentHTML('beforeend',
                    "<div class='ivanov'>" +
                    "<button class='ivanov_beta' id='d234' style='width: 24px; height: 24px;' >" +

                    "📄" +

                    // "<svg xmlns='http://www.w3.org/2000/svg'  fill='#464648' width='24px' height='24px' viewBox=\"0 0 24 24\" preserveAspectRatio=\"xMidYMid meet\">" +
                    // "<path d=\"M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z\">" +
                    // "</path>" +
                    // "</svg>" +

                    "</button>" +
                    "</div>")

                var p = elements[i].getElementsByClassName("ivanov_beta")
                if(p.length !== 0) {
                    elements[i].getElementsByClassName("ivanov_beta")[0].addEventListener("click", every_clicked_buton);
                    console.log('added click event!')
                }

            }



            // КНОПКА в ЧАТІ - 2  (з хеадер)
            if (elements[i].getElementsByClassName('ivanov2').length === 0) {
                //через insertAdjacentHTML - бо якщо робити через innerHTML - то відвалюється обработчик події clickListener!
                elements[i].insertAdjacentHTML('beforeend',
                    "<div class='ivanov2'>" +
                    "<button class='ivanov_beta2' id='d234_2' style='width: 24px; height: 24px;' >" +

                    // "<svg xmlns='http://www.w3.org/2000/svg'  fill='#464648' width='24px' height='24px' viewBox=\"0 0 24 24\">" +
                    // "<path d=\"M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z\">" +
                    // "</path>" +
                    // "</svg>" +

                    "📑" +


                    "</button>" +
                    "</div>")

                ;

                var p2 = elements[i].getElementsByClassName("ivanov_beta2")
                if(p2.length !== 0) {
                    elements[i].getElementsByClassName("ivanov_beta2")[0].addEventListener("click", every_clicked_buton2);
                    console.log('added click event!2')
                }

            }


            // КНОПКА в ЧАТІ - №3 🙏🙏🙏   (з хеадер)
            if (elements[i].getElementsByClassName('ivanov3').length === 0) {
                //через insertAdjacentHTML - бо якщо робити через innerHTML - то відвалюється обработчик події clickListener!
                elements[i].insertAdjacentHTML('beforeend',
                    "<div class='ivanov3'>" +
                    "<button class='ivanov_beta3' id='d234_3' style='width: 24px; height: 24px;' >" +

                    // "<svg xmlns='http://www.w3.org/2000/svg'  fill='#464648' width='24px' height='24px' viewBox=\"0 0 24 24\">" +
                    // "<path d=\"M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z\">" +
                    // "</path>" +
                    // "</svg>" +

                    "🙏" +


                    "</button>" +
                    "</div>")

                ;

                var p2 = elements[i].getElementsByClassName("ivanov_beta3")
                if(p2.length !== 0) {

                    elements[i].getElementsByClassName("ivanov_beta3")[0].addEventListener("click", every_clicked_buton3_Pray);
                    console.log('added click event!3')
                }

            }





            // КНОПКА в ЧАТІ - №4 checkbox
            if (elements[i].getElementsByClassName('ivanov4').length === 0) {
                //через insertAdjacentHTML - бо якщо робити через innerHTML - то відвалюється обработчик події clickListener!
                elements[i].insertAdjacentHTML('beforeend',
                    "<div class='ivanov4'>" +
                        "<input type='checkbox' class='ivanov_beta4' id='d234_4' style='width: 24px; height: 24px;'>" +
                    "</div>")

                ;

                var p2 = elements[i].getElementsByClassName("ivanov_beta4")
                if(p2.length !== 0) {
                    elements[i].getElementsByClassName("ivanov_beta4")[0].addEventListener("click", every_clicked_checkbox4);

                    console.log('BBBBadded click event!4')

                    comment_text = elementsBottom[i].innerHTML

                    console.log(comment_text)
                    console.log(listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text))
                    console.log(listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text)?.isChecked)
                    console.log(listOfCommetsAndCheckboxes)
                    //console.log(listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text)?.isChecked)

                    if(listOfCommetsAndCheckboxes.find(x => x.comment_text === comment_text)?.isChecked){
                        elements[i].getElementsByClassName("ivanov_beta4")[0].checked = true;
                    }else{
                        elements[i].getElementsByClassName("ivanov_beta4")[0].checked = false;
                    }

                    console.log('EEEEadded click event!4')
                }

            }



        }
    }else{
        console.log('elements.length = 0 (!)')
    }



    //**************************************************************************
    //**************************************************************************
    //**************************************************************************
    //**************************************************************************
    /**
     for banners, copy inside text

     todo - мені треба один раз витянути всі класи для іконки - і їх зберегти, і потім всі ці класи підставляти в свою іконки (підставити класи)
     * @type {HTMLCollectionOf<Element>}
     */
    // let elements3_temp = document.getElementsByClassName('Banner__DesktopTopIconRow-sc-t4oiaf-10');
    
    let elements3_temp = document.querySelectorAll('[class^="Banner__DesktopTopIconRow"]');
    let li_element = document.querySelectorAll('[class^="Banner__LiWrap"]');
    var banner_element_original = $(li_element).find("[class*='Banner__TopIconButton']").first();

    

    if( elements3_temp.length !== 0 ) {

        for (let i = 0; i < elements3_temp.length; i++) {

            // let el_temp = elements3_temp[i].getElementsByClassName('Tooltip__StyledSpan-sc-f4jhla-2');

            // console.log(el_temp)

            // if (el_temp.length !== 0)
            {

                // let el = el_temp[0];
                let el = elements3_temp[i];
                if (el.getElementsByClassName('ivanov3').length === 0) {


                    var origins_classes = " "+banner_element_original.attr('class')+" ";

                    console.log(banner_element_original)
                    console.log(banner_element_original.attr('class'))

                    el.insertAdjacentHTML('beforeend',
                        "<span class='ivanov3 Tooltip__StyledSpan-sc-f4jhla-2'>" +
                        "<button class='ivanov_beta3 " + origins_classes +"' " +
                        "id='d234_3' style='' color=\"grey\">" +

                        "📃" +

                        // "<svg xmlns='http://www.w3.org/2000/svg'  fill='#464648' width='24px' height='24px' viewBox=\"0 0 24 24\" preserveAspectRatio=\"xMidYMid meet\">" +
                        // "<path d=\"M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z\">" +
                        // "</path>" +
                        // "</svg>" +


                        "</button>" +
                        "</span>")

                    var p = el.getElementsByClassName("ivanov_beta3")
                    if (p.length !== 0) {
                        el.getElementsByClassName("ivanov_beta3")[0].addEventListener("click", every_clicked_BANNER_buton1);
                        console.log('added click event!3')
                    }

                }
            }
        }
    }else{
       // console.log('elements3_temp.length = 0 (!)')
    }


    //console.log("World!");

}, 500);


/**
 * check google forms for new responses
 */
setInterval(() => {

    //url

    //grab url

}, 10000)



// for buttons FB and YT (get link)
setInterval(() => {

    let mainDiv = document.getElementsByClassName('Status__OutputStatusRow-sc-3o1cs7-1')
    if(mainDiv.length !== 0 ){
        if ( mainDiv[0].getElementsByClassName('ivanov_header').length === 0 )  {

            mainDiv[0].insertAdjacentHTML('beforeend',
                "<div class='ivanov_header'>" +
                "<button class='ivanov_beta_fb' id='d234_fb' style='width: 24px; height: 24px;' >" +

                "📄" +


                "</button>" +

                "<button class='ivanov_beta_yt' id='d234_yt' style='width: 24px; height: 24px;' >" +

                "📄2" +


                "</button>" +
                "</div>");

            var p = mainDiv[0].getElementsByClassName("ivanov_header")
            if(p.length !== 0) {
                mainDiv[0].getElementsByClassName("ivanov_beta_fb")[0].addEventListener("click", every_clicked_buton_FB);
                mainDiv[0].getElementsByClassName("ivanov_beta_yt")[0].addEventListener("click", every_clicked_buton_YT);
                console.log('added click event!')
            }

        }
    }
    //url

    //grab url

}, 500)

function every_clicked_buton_FB(){

    let fb_button_syard = $("button[aria-controls='broadcast-output-status-menu']")
    alert('fb_button_syard')
    fb_button_syard.click();

    setTimeout(function(){
        let div_popup = $(".OutputMenuOverlay__MenuOverlay-sc-15m5gfc-0");
        console.log("ииии", div_popup);
        let buttons = $(div_popup).find('.ButtonBase__WrapperButton-sc-17604wa-0');
        let second_button_withFB_link_tagA = buttons[2];
        console.log("mmmm", second_button_withFB_link_tagA)
        let url_origins = $(second_button_withFB_link_tagA).attr('href');  ///view_on_platform/facebook?link=https://www.facebook.com/111991190485469/posts/633600771657839/
        console.log("kkkk", url_origins);
        
        let fb_link = url_origins.split('link=')[1];
        console.log("zzzz", fb_link);
        copyToClipboard(fb_link); 
    }, 500);

   
}

function every_clicked_buton_YT(){
    let yt_button_syard = $("button[aria-controls='broadcast-output-status-menu-PHmwpYtovHZ5fJsUo03JhDvy']")
    yt_button_syard.click();

    setTimeout(function(){
        let div_popup = $(".OutputMenuOverlay__MenuOverlay-sc-15m5gfc-0");
        console.log("ииииY", div_popup);
        let buttons = $(div_popup).find('.ButtonBase__WrapperButton-sc-17604wa-0');
        let second_button_withYT_link_tagA = buttons[2];
        console.log("mmmmY", second_button_withYT_link_tagA)
        let url_origins = $(second_button_withYT_link_tagA).attr('href');  ///view_on_platform/facebook?link=https://www.facebook.com/111991190485469/posts/633600771657839/
        console.log("kkkkY", url_origins);
        
        let yt_link = url_origins.split('link=')[1];
        console.log("zzzzY", yt_link);
        copyToClipboard(yt_link); 
    }, 500);

}