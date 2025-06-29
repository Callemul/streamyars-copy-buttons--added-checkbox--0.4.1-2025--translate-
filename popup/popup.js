var options = {
  type: "basic",
  title: "Notification from opengenus foundation",
  message: "https://iq.opengenus.org",
  iconUrl: "assets/imgs/1.png"
};
  
var db = {};


//CONSTS
var SS_SpeakersMonday = "Сергей Молчанов, Алексей Опарин, Олег Василенко";

function callback(){
    console.log('Popup done!')
}
chrome.notifications.create(options, callback);


//"POMOLITES POJALUISTA O VOPROSE"
//ПОМОЛИТЕС ПО О ВОПРОСЕ
// Функция для перевода транслитерированного текста на русский
function translitToRussian(translitText) {
    const translitMap = {
        "A": "А",
        "B": "Б",
        "V": "В",
        "G": "Г",
        "D": "Д",
        "E": "Е",
        "YO": "Ё",
        "J": "Ж",
        "ZH": "Ж",
        "Z": "З",
        "I": "И",
        "Y": "Й",
        "K": "К",
        "L": "Л",
        "M": "М",
        "N": "Н",
        "O": "О",
        "P": "П",
        "R": "Р",
        "S": "С",
        "T": "Т",
        "U": "У",
        "F": "Ф",
        "H": "Х",
        "C": "Ц",
        "CH": "Ч",
        "SH": "Ш",
        "SHCH": "Щ",
        "YU": "Ю",
        "YA": "Я",
        "'": "ь",
        "Y'": "Ы",
        "X": "Х",

        "\"": "\"",
        ":": ":",
        ";": ";",
        ".": ".",
        ",": ",",
        "!": "!",
        "?": "?",
        "%": "%",
        "*": "*",
        "(": "(",
        ")": ")",
        "-": "-",
        "_": "_",
        "@": "@",
        "~": "~",


        "a": "а",
        "b": "б",
        "v": "в",
        "g": "г",
        "d": "д",
        "e": "е",
        "yo": "ё",
        "j": "ж",
        "zh": "ж",
        "z": "з",
        "i": "и",
        "y": "ы",
        "k": "к",
        "l": "л",
        "m": "м",
        "n": "н",
        "o": "о",
        "p": "п",
        "r": "р",
        "s": "с",
        "t": "т",
        "u": "у",
        "f": "ф",
        "h": "х",
        "c": "ц",
        "ch": "ч",
        "sh": "ш",
        "shch": "щ",
        "Yu": "Ю",
        "yu": "ю",
        "Ya": "Я",
        "ya": "я",
        "'": "ь",
        "y'": "ы",
        "x": "х"

    };

    translitText = translitText.replaceAll('BLAGODARU', 'БЛАГОДАРЮ');
    translitText = translitText.replaceAll('BLAGODARNOST', 'БЛАГОДАРНОСТЬ');
    translitText = translitText.replaceAll('SINOVIAX', 'СЫНОВЬЯХ');
    translitText = translitText.replaceAll('moiu', 'мою');
    translitText = translitText.replaceAll('bratia', 'братья');


    //для двух букв подряд
    translitText = translitText.replaceAll('ts', 'ц');
    translitText = translitText.replaceAll('ei', 'ей'); //MOEI
    translitText = translitText.replaceAll('shch', 'щ');
    translitText = translitText.replaceAll('sh', 'ш');
    translitText = translitText.replaceAll('ch', 'ч');
    translitText = translitText.replaceAll('ya', 'я');
    translitText = translitText.replaceAll('yu', 'ю');
    translitText = translitText.replaceAll('yo', 'ё');
    translitText = translitText.replaceAll('zh', 'ж');


    //для двух букв подряд
    translitText = translitText.replaceAll('TS', 'Ц');
    translitText = translitText.replaceAll('EI', 'ЕЙ'); //MOEI
    translitText = translitText.replaceAll('SHCH', 'Щ');
    translitText = translitText.replaceAll('SH', 'Ш');
    translitText = translitText.replaceAll('CH', 'Ч');
    translitText = translitText.replaceAll('YA', 'Я');
    translitText = translitText.replaceAll('YU', 'Ю');
    translitText = translitText.replaceAll('YO', 'Ё');
    translitText = translitText.replaceAll('ZH', 'Ж');

    const words = translitText.split(' ');
    const russianWords = words.map(word => {
        let russianWord = "";
        let curLetter = "";
        for (let i = 0; i < word.length; i++) {
            curLetter += word[i];
            if (translitMap[curLetter]) {
                russianWord += translitMap[curLetter];
                curLetter = "";
            }else{
                russianWord += word[i];
                curLetter = "";
            }
        }
        return russianWord;
    });

    return russianWords.join(' ');
}




//btn Translate
$(document).ready(function(){
    $("#Translate").click(function(){

        var oldText = $("#textArea1_oldText").val();

        const russianText = translitToRussian(oldText);


        $("#textArea2_generatedRuText").html(russianText);

        // for testing
        //alert("Please");

    });
});

//btn L
$(document).ready(function(){
    $("#sschoolNameBtn").click(function(){

        var newTitleSS = $("#sschoolName").val();

        

        if(newTitleSS != ""){
            $("#titleSS1").html(newTitleSS); 
            $("#titleSS2").html(newTitleSS); 
            $("#titleSS3").html(newTitleSS); 
            $("#titleSS4").html(newTitleSS); 
        }
        alert("Please");

        //-------change date
        var dateFromPicker = new Date($('#dateMonday').val());
        var newDate = new Date();
        var resDate;
        if(dateFromPicker<newDate){
            resDate = newDate
        }else{
            resDate = dateFromPicker
        }

       
        var newDateUA_Monday = convertDateMM_DD_YYYY_To_DD_MMMM(resDate)
        $('#dateLable1').html(newDateUA_Monday);


        //saveData
        if(db==undefined){
            db = {};
        }
        db.newTitleSS = newTitleSS;
        db.newDateUA_Monday = resDate.toISOString().substring(0,10);
        saveDataToStorage();
    });
});


//btn R
$(document).ready(function(){
    $("#preachNameBtn").click(function(){

        var newTitlePreach = $("#preachNameInput").val();
        

        

        if(newTitlePreach!= ""){
            $("#preachName1").html(newTitlePreach); 
            $("#preachName2").html(newTitlePreach); 
        }
        alert("Please2")

        //-------change date
        var dateFromPicker = new Date($('#dateSaturday').val());
        var newDate = new Date();
        var resDate;
        if(dateFromPicker<newDate){
            resDate = newDate
        }else{
            resDate = dateFromPicker
        }

        var newDateUA_Saturday = convertDateMM_DD_YYYY_To_DD_MMMM(resDate)
        $('#dateLable2').html(newDateUA_Saturday);

        //----END DATE----
        var preacherSaturday = $('#PreacherSaturdayTextBox').val();
        $('#PreacherSaturdayLabel').html(preacherSaturday)

        var Saturday_UsersSS_TextBox = $('#Saturday_UsersSS_TextBox').val();
        $('#Saturday_UsersSS_Label').html(Saturday_UsersSS_TextBox);
       

        var Saturday_UsersSS_Obj = getFromForm_SaturdayOneOrTwoUsersSS()
        setToForm_SaturdayOneOrTwoUsersSS(Saturday_UsersSS_Obj);


        db.Saturday_UsersSS_Obj = Saturday_UsersSS_Obj;
        db.Saturday_UsersSS_TextBox = Saturday_UsersSS_TextBox;
        db.preacherSaturday = preacherSaturday;
        db.newTitlePreach = newTitlePreach;
        db.newDateUA_Saturday = resDate.toISOString().substring(0,10);
        saveDataToStorage();
    });
});


$(document).ready(function(){
    console.log("onload" + Date())
//000 - good 
    var newDate = new Date();
    var newDateFomated = newDate.toISOString().substring(0,10); // 2022-07-04


    if(db!=undefined){
        if(db.newDateUA_Monday!=undefined && db.newDateUA_Monday != 'Invalid Date'){
            $('#dateMonday').val((db.newDateUA_Monday))
            var date = convertDateMM_DD_YYYY_To_DD_MMMM(db.newDateUA_Monday)
            $('#dateLable1').text(date)///
        }else{
            $('#dateMonday').val((newDateFomated))
            var date = convertDateMM_DD_YYYY_To_DD_MMMM(newDateFomated)
            $('#dateLable1').text(newDateFomated) ///
            db.newDateUA_Monday = newDateFomated;
        }
    

        if(db.newDateUA_Saturday!=undefined && db.newDateUA_Saturday != 'Invalid Date'){
            $('#dateSaturday').val((db.newDateUA_Saturday))
            var date = convertDateMM_DD_YYYY_To_DD_MMMM(db.newDateUA_Saturday)
            $('#dateLable2').text(date)///
        }else{
            $('#dateSaturday').val((newDateFomated))
            var date = convertDateMM_DD_YYYY_To_DD_MMMM(newDateFomated)
            $('#dateLable2').text(newDateFomated) ///
            db.newDateUA_Saturday = newDateFomated;
        }
    //not 000 shown


        if(db.newTitleSS!=undefined && db.newTitleSS != ''){
            $("#titleSS1").html(db.newTitleSS); 
            $("#titleSS2").html(db.newTitleSS); 
            $("#titleSS3").html(db.newTitleSS); 
            $("#titleSS4").html(db.newTitleSS); 
            $("#sschoolName").val(db.newTitleSS);
        }else{

            $("#titleSS1").html('db.newTitleSS'); 
            $("#titleSS2").html('db.newTitleSS'); 
            $("#titleSS3").html('db.newTitleSS'); 
            $("#titleSS4").html('db.newTitleSS'); 
            $("#sschoolName").val('db.newTitleSS');
        }

        if(db.newTitlePreach!= undefined && db.newTitlePreach!=''){
            $("#preachName1").html(db.newTitlePreach); 
            $("#preachName2").html(db.newTitlePreach); 
            $("#preachNameInput").val(db.newTitlePreach); 

        }else{
            $("#preachName1").html('db.newTitlePreach'); 
            $("#preachName2").html('db.newTitlePreach'); 
            $("#preachNameInput").val('db.newTitlePreach'); 
        }





       if(db.preacherSaturday!=undefined){
            $('#PreacherSaturdayTextBox').val(db.preacherSaturday);
            $('#PreacherSaturdayLabel').html(db.preacherSaturday);
       }else{
            $('#PreacherSaturdayTextBox').val('db.preacherSaturday');
            $('#PreacherSaturdayLabel').html('db.preacherSaturday');
       }
    }

   $('#changedFromWeekToWeek_SpeakersMonday1').html(SS_SpeakersMonday);
   $('#changedFromWeekToWeek_SpeakersMonday2').html(SS_SpeakersMonday);
   
   
  setToForm_SaturdayOneOrTwoUsersSS(db.Saturday_UsersSS_Obj);
        

   saveDataToStorage();

//    alert('onload end') //if this not work, then this function has mistake
});

function saveDataToStorage() {
    chrome.storage.local.set({'db':db}, function() {
        //alert('Value is set to ' + JSON.stringify(db));
    });
}

//LOAD FROM FILE
chrome.storage.local.get('db', function(result) {
    db = result.db;
    var newTitlePreach;
    var newTitleSS;
    //alert(JSON.stringify(result.db));
    if(db === undefined){
        newTitlePreach = 'tesssst1111_newTitlePreach';
    }else{
        newTitlePreach = result.db.newTitlePreach;
    }

    $("#preachName1").html(newTitlePreach); 
    $("#preachName2").html(newTitlePreach); 

    console.log('Value currently is ' + result.db);

    if(db === undefined){
        newTitleSS = 'tesssst2222_newTitleSS';
    }else{
        newTitleSS = result.db.newTitleSS;
    }
    $("#titleSS1").html(newTitleSS); 
    $("#titleSS2").html(newTitleSS); 
    $("#titleSS3").html(newTitleSS); 
    $("#titleSS4").html(newTitleSS); 
});


/**
 * convert date from 2022-09-26 to 26 сентября
 */
function convertDateMM_DD_YYYY_To_DD_MMMM(resDate){
       
    var k = new Date(resDate)
    var options = {month: 'long', day: 'numeric' };
    var p =  k.toLocaleDateString('ru-RU', options)
    return p;

}


function getFromForm_SaturdayOneOrTwoUsersSS(){
    var obj = {}
    
    obj.user1SS = $('#Saturday_UsersSS_TextBox1').val();
    obj.user2SS = $('#Saturday_UsersSS_TextBox2').val();

    if(obj.user2SS != ''){
        obj.count = 2;
    }else{
        obj.count = 1;
    }
    return obj;
}

function setToForm_SaturdayOneOrTwoUsersSS(userSaturdayObj){

    if(userSaturdayObj != undefined ){
        $('#Saturday_UsersSS_TextBox1').val(userSaturdayObj.user1SS);
        $('#Saturday_UsersSS_TextBox2').val(userSaturdayObj.user2SS);


        var count = userSaturdayObj.count;


        if(count == 1){
            $('#Saturday_UsersSS_Label').html(userSaturdayObj.user1SS)
            $('#saturdayOneOrTwoUsersSS').html('ет')
        }
        else if(count == 2){
            var twoUsersSS_text = userSaturdayObj.user1SS + " и " + userSaturdayObj.user2SS
            $('#Saturday_UsersSS_Label').html(twoUsersSS_text)
            $('#saturdayOneOrTwoUsersSS').html('ут')
        }
        else{
            $('#saturdayOneOrTwoUsersSS').html('#saturdayOneOrTwoUsersSS')
        }
    }
    else{
        $('#Saturday_UsersSS_TextBox1').val('userSaturdayObj');
        $('#Saturday_UsersSS_TextBox2').val('userSaturdayObj');

        $('#Saturday_UsersSS_Label').html('userSaturdayObj')
        $('#saturdayOneOrTwoUsersSS').html('#Saturday_UsersSS_Label32')
    }
}

function setSaturdayOneOrTwoUsersSS(){
    
}