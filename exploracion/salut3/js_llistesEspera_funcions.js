var URL_dades = "";
var intervencio_seleccionada = 0;

var textSeccioPacients = "Pacients en llista d'espera";
var textSeccioDones = "Dones";
var textSeccioHomes = "Homes";
var textSeccioIntervinguts = "Pacients intervinguts des de gener";
var textSeccioEspera = "Temps mig d'espera de pacients pendents d’intervenció (dies)";
var textTaulaTipus = "Tipus d'intervenció";
var textComboTipus = "Tots els tipus d'intervenció";
var textResultats = "d'intervencions";
var formulariActivat = false;

var elemPerPag = 10;
var numFila = 0;
var numPag = 1;
var paginaActual = 1;



$(document).ready(function(){
    $("#caixa1").click(function(){
        ocultarCerca();
        if ($("#caixa1").hasClass("caixaSelected")){
            desactivarFormulari();
        }else{
            intervencio_seleccionada = 1;
            activarFormulari(intervencio_seleccionada);
        }
    });
    $("#caixa2").click(function(){
        ocultarCerca();
        if ($("#caixa2").hasClass("caixaSelected")){
            desactivarFormulari();
        }else{
            intervencio_seleccionada = 2;
            activarFormulari(intervencio_seleccionada);
        }
    });
    $("#caixa3").click(function(){
        ocultarCerca();
        if ($("#caixa3").hasClass("caixaSelected")){
            desactivarFormulari();
        }else{
            intervencio_seleccionada = 3;
            activarFormulari(intervencio_seleccionada);
        }
    });
    $("#caixa4").click(function(){
        ocultarCerca();
        if ($("#caixa4").hasClass("caixaSelected")){
            desactivarFormulari();
        }else{
            intervencio_seleccionada = 4;
            activarFormulari(intervencio_seleccionada);
        }
    });


    $("#divDades").click(function(){
        clickPestanyaDades();
    });
    $("#divTaula").click(function(){
        clickPestanyaTaula();
    });


    $('#pacients').change(function(){
        this.checked ? $('.taulaPacients').show() : $('.taulaPacients').hide();
    });
    $('#homes').change(function(){
        this.checked ? $('.taulaHomes').show() : $('.taulaHomes').hide();
    });
    $('#dones').change(function(){
        this.checked ? $('.taulaDones').show() : $('.taulaDones').hide();
    });
    $('#intervinguts').change(function(){
        this.checked ? $('.taulaIntervinguts').show() : $('.taulaIntervinguts').hide();
    });
    $('#temps_espera').change(function(){
        this.checked ? $('.taulaEspera').show() : $('.taulaEspera').hide();
    });


    $('#p_rs').change(function(){
        omplirCentres();
    });
    var temps = new Date();
    anyActual = temps.getFullYear();
    mesActual = temps.getMonth();
    
    if(mesActual == 0 && anyActual > 2017){
        anyActual--;
        mesActual = 12;
    }
    tmp = false;
    omplirCombos(anyActual,mesActual);
});


function omplirCombos(anyFitxer,mesFitxer){   
    if ($("#cercador").hasClass("quirurgiques")){
        textSeccioIntervinguts = "Pacients intervinguts des de gener";
        textSeccioEspera = "Dies d'espera dels pacients pendents d’intervenció (temps mitjà)";
        textTaulaTipus = "Tipus d'intervenció";
        textComboTipus = "Tots els tipus d'intervenció";
        textResultats = "d'intervencions";
        //URL_dades = "/.content/xml/quirurgiques-2019-01.xml";
        URL_dades = "/.content/xml/llistes-espera/quirurgiques-";
        if(!tmp){
        desactivarFormulari();            
        }
        activarChecksMostra(); 
    }else if($("#cercador").hasClass("diagnostiques")){
        textSeccioIntervinguts = "Proves realitzades des de gener";
        textSeccioEspera = "Dies d'espera dels pacients pendents de prova (temps mitjà)";
        textTaulaTipus = "Tipus de prova";
        textComboTipus = "Tots els tipus de prova";
        textResultats = "de proves diagnòstiques";
        URL_dades = "/.content/xml/llistes-espera/diagnostiques-";

    }else if($("#cercador").hasClass("externes")){
        textSeccioIntervinguts = "Primeres visites realitzades des de gener";
        textSeccioEspera = "Dies d'espera dels pacients pendents de primera visita (temps mitjà)";
        textTaulaTipus = "Tipus de consulta externa";
        textComboTipus = "Tots els tipus de consulta externa";
        textResultats = "de consultes externes";
        URL_dades = "/.content/xml/llistes-espera/externes-";
    }
    canviaCursorLoading(true);
    comprovarNavegadorVersio();
    loadXML(anyFitxer, mesFitxer); 
}

function activarFormulari(intervencio_seleccionada){
    $(".caixa.caixaSelected").removeClass("caixaSelected");
    $("#caixa"+intervencio_seleccionada).addClass("caixaSelected");
    selectedIntervencio(intervencio_seleccionada, true);
    $("#altres").attr('checked', 'checked');
    $("#paginacioTaula").addClass("ocult");
    activarCombos();
    omplirIntervencions();
    omplirRegionsSanitaries();
    omplirCentres();
    commonDisplay(); 
    $('#refreshCamps').attr('disabled', false);
    $('#envia').attr('disabled', false);
    formulariActivat = true;
    $('.selectClickDisabled').css('display','none');
}
function desactivarFormulari(){
    $(".caixa.caixaSelected").removeClass("caixaSelected");
    intervencio_seleccionada = 0;
    selectedIntervencio(intervencio_seleccionada, false);
    if(window.location.href.indexOf("quirurgiques")>-1) desactivarCombos(); 
    omplirIntervencions();
    omplirRegionsSanitaries();
    omplirCentres(); 
    $('#resultats').addClass('ocult');
    $("#paginacioTaula").addClass("ocult");
    if(window.location.href.indexOf("quirurgiques")>-1) $('#refreshCamps').attr('disabled', 'disabled');
    if(window.location.href.indexOf("quirurgiques")>-1) $('#envia').attr('disabled', 'disabled');
    formulariActivat = false;
    $('.selectClickDisabled').css('display','block');
}
function canviaCursorLoading(activar){
    if(activar){
        $('#cercador').css("cursor", "wait");
        $('#cercador select').css("cursor", "wait"); 
        $('#cercador .basic_text_peq').css("cursor", "wait"); 
        $('#cercador select').attr('disabled', true);
    }else{
        $('#cercador').css("cursor", "auto");
        $('#cercador select').css("cursor", "pointer"); 
        $('#cercador .basic_text_peq').css("cursor", "default"); 
        $('#cercador select').attr('disabled', false);
    }
}
	

	
$(function() {
    $("#divFormSeccio").click(function(e) {
        event.preventDefault();
         e = e || window.event;
    e = e.target || e.srcElement;
    if (e.id != "refreshCamps") formulariActivat ? commonDisplay() : errorDisplay();
    });
});

$(function() {
    $(".selectClickDisabled").click(function(e) {
        event.preventDefault();
         e = e || window.event;
    e = e.target || e.srcElement;
    if (e.id != "refreshCamps") formulariActivat ? commonDisplay() : errorDisplay();
    });
});
	
	
function escriuOptions(anySelect,mesSelect,cont){
    
    var xhttpBool = new XMLHttpRequest();

    xhttpBool.onreadystatechange = function() {
        if (xhttpBool.readyState == 4 && xhttpBool.status == 200) {
            if(xhttpBool.responseXML != null ){ 
                $("#p_mes").append( $("<option></option>").attr("value",cont).attr("id",anySelect+"-"+parseInt(mesSelect)).text(monthNames[parseInt(mesSelect)-1]+" "+anySelect));
                cont++;
                if(cont < 12){
                    mesSelect = parseInt(mesSelect)-1;
                    if(mesSelect == 0){
                        mesSelect = 12;
                        anySelect--;
                    }
                    escriuOptions(anySelect,mesSelect,cont);
                }
                else canviaCursorLoading(false);

            }
            else canviaCursorLoading(false);
            
        }
        else if(xhttpBool.readyState == 4 ){
            canviaCursorLoading(false);   
        }      
    };

    // Obre el fitxer seleccionat
    if (mesSelect > 0 && mesSelect < 10){
        mesSelect = "0"+mesSelect;
    }
    var URL_dades_ = URL_dades+anySelect+"-"+mesSelect+".xml";
    xhttpBool.open("GET", URL_dades_, true);
    xhttpBool.send();
}

function errorDisplay() {

    $('#error-intervencio').css('display','block');
    $('#divGrup > div > h2, div.caixes > div').css('color','#BF0000');
    $('#titolTipusEsq, #titolTipusDret').css('border-bottom','1px solid #BF0000');
    if ($('#error-intervencio').length) { 
        $('html, body').animate({
                scrollTop: $('#error-intervencio').offset().top - 100 },
            200);
    }
}
function commonDisplay() {
    $('#error-intervencio').css('display','none');
    $('#divGrup > div > h2, div.caixes > div').css('color','#666');
    $('#titolTipusEsq, #titolTipusDret').css('border-bottom','1px solid #DCDCDC');
}

function selectedIntervencio(intervencio, display) {
    for (i = 1; i < 5; i++) $("#caixa"+i+" > div > div").addClass('hidden');
    if (display) $("#caixa"+intervencio+" > div > div").removeClass('hidden');
}

function activarChecksMostra(){
    $('#pacients').attr('checked', 'checked');
    $('#homes').attr('checked', 'checked');
    $('#dones').attr('checked', 'checked');
    $('#intervinguts').attr('checked', 'checked');
    $('#temps_espera').attr('checked', 'checked');
}

function ocultarCerca(){
    if (!$("#resultats").hasClass("ocult")){
        $("#resultats").addClass("ocult");
    }
}

function desactivarCombos(){
    $(".seccio.seccio_gris").addClass("frm_desactivat");
    $('#p_tipus').attr('disabled', 'true');
    $('#p_mes').attr('disabled', 'true');
    $('#p_rs').attr('disabled', 'true');
    $('#p_centre').attr('disabled', 'true');
}
function activarCombos(){
    $(".seccio.seccio_gris").removeClass("frm_desactivat");
    $('#p_tipus').removeAttr('disabled');
    $('#p_mes').removeAttr('disabled');
    $('#p_rs').removeAttr('disabled');
    $('#p_centre').removeAttr('disabled');
}


function clickPestanyaDades(){
    if( ! $("#divDades").hasClass("frm_desactivat") ){
        $("#divDades").attr("src", "/.content/administratiu/img/llistes_espera/dades_grey.png");
        if( ! $("#divTaula").hasClass("frm_desactivat") ){
            $("#divTaula").attr("src", "/.content/administratiu/img/llistes_espera/taula_red.png");
        }else{
            $("#divTaula").attr("src", "/.content/administratiu/img/llistes_espera/taula_grey.png");
        }
        activarDadesResultats();
    }else{
        $("#divDades").attr("src", "/.content/administratiu/img/llistes_espera/dades_grey.png");
        $("#divTaula").attr("src", "/.content/administratiu/img/llistes_espera/taula_grey.png");
        activarTaulaResultats();
    }
}

function clickPestanyaTaula(){
    if( ! $("#divTaula").hasClass("frm_desactivat") ){
        $("#divTaula").attr("src", "/.content/administratiu/img/llistes_espera/taula_grey.png");
        if( ! $("#divDades").hasClass("frm_desactivat") ){
            $("#divDades").attr("src", "/.content/administratiu/img/llistes_espera/dades_red.png");
        }else{
            $("#divDades").attr("src", "/.content/administratiu/img/llistes_espera/dades_grey.png");
        }
        activarTaulaResultats();
    }else{
        $("#divDades").attr("src", "/.content/administratiu/img/llistes_espera/dades_grey.png");
        $("#divTaula").attr("src", "/.content/administratiu/img/llistes_espera/taula_grey.png");
        activarDadesResultats();
    }
}

function activarDadesResultats(){
    $("#div_zona_resultats").removeClass("ocult");
    $("#div_taula_resultats").addClass("ocult");
    $("#seccioMostra").addClass("ocult");
    $("#paginacioTaula").addClass("ocult");
}
function activarTaulaResultats(){
    $("#div_zona_resultats").addClass("ocult");
    $("#div_taula_resultats").removeClass("ocult");
    $("#seccioMostra").removeClass("ocult");
    $("#paginacioTaula").removeClass("ocult");
}

function scrollResultats(){
    $('html, body').animate({
        scrollTop: $("#resultats").offset().top
    }, 1000);
}
function scrollFormulari(){
    $('html, body').animate({
        scrollTop: $("#form_llistes_espera").offset().top
    }, 1000);
}

/********************************* COMBOS **********************************/
var monthNames = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
    "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];
var llistaDates = [];

var neoplasia = []; //1
var cardiaca = [];  //2
var garantit = [];  //3
var referencia = [];//4
var llistaTipus = [];//0
var arrayTipus = [];

var regions = [];
var centres = [[]];
var regions_ordenades = [];


function loadXML(any, mes){
    var anyNum = parseInt(any);
    var mesNum = parseInt(mes); //workaround para que no entre en blucle infinito mientras no exista el fichero de julio y a la espera de que nos digan cuál de las dos soluciones propuestas quieren implementar
    
    if (anyActual > 2017){

        var xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function() {
			 
			if (xhttp.readyState == 4 && xhttp.status == 200) {
                if(xhttp.responseXML == null ){
                    
                    mesActual--;
                    if(mesActual == 0 && anyActual > 2017){
                        anyActual--;
                        mesActual = 12;
                    }
                    if(anyActual > 2010){
                    // omplirCombos(anyActual,mesActual);
                    }
                }
                else{
                    llegirXML(xhttp, mesNum, anyNum);            
                }

            }
            else if(xhttp.readyState == 4){
    
                mesNum--;

                if(mesNum == 0 && anyNum > 2017){
                    anyNum--;
                    mesNum = 12;
                }
				
				loadXML(anyNum, mesNum);
				//omplirCombos(anyActual,mesActual);
                
            }   
        };
    } 
    // Obre el fitxer seleccionat
    if (mesNum > 0 && mesNum < 10){
        mesNum = "0"+mesNum;
    }
    var URL_dades_ = URL_dades+anyNum+"-"+mesNum+".xml";
    xhttp.open("GET", URL_dades_, true);
    xhttp.send();
}

function llegirXML(xml, primerMesNum, primerAnyNum){
    neoplasia = []; //1
    cardiaca = [];  //2
    garantit = [];  //3
    referencia = [];//4
    llistaTipus = [];//0
    arrayTipus = [];
    
    regions = [];
    centres = [[]];
    regions_ordenades = [];

    var xmlDoc = xml.responseXML;
    var files = xmlDoc.getElementsByTagName("Row");

    var grup_actual = "";
    var tipus_actual = "";
    var regio_actual = "";
    var data_actual = "";
    var centre_actual = "";

    for (var i = 0 ; i < files.length; i++){

        var dades = files[i].getElementsByTagName("Data");
        var num_dades = dades.length;
        if(num_dades > 5 && dades[5].childNodes[0].nodeValue!="Pacients en llista d'espera" &&
            dades[0].childNodes[0].nodeValue!="Grups_Seguiment_Setmanal" &&
            dades[0].childNodes[0].nodeValue!="Prova diagnòstica" &&
            dades[0].childNodes[0].nodeValue!="Especialitat"){

            if (num_dades == 10){  // la fila tÃ© totes les dades
                if (dades[0].childNodes[0].nodeValue.indexOf("Total")==-1){
                    grup_actual = dades[0].childNodes[0].nodeValue;
                    tipus_actual = dades[1].childNodes[0].nodeValue;
                    data_actual = dades[2].childNodes[0].nodeValue;
                    regio_actual = dades[3].childNodes[0].nodeValue;
                    centre_actual = dades[4].childNodes[0].nodeValue;
                }
            }else if(num_dades == 9){
                if (dades[0].childNodes[0].nodeValue.indexOf("Total")==-1){
                    tipus_actual = dades[0].childNodes[0].nodeValue;
                    data_actual = dades[1].childNodes[0].nodeValue;
                    regio_actual = dades[2].childNodes[0].nodeValue;
                    centre_actual = dades[3].childNodes[0].nodeValue;
                }
            }else if(num_dades == 8){
                if (dades[0].childNodes[0].nodeValue.indexOf("Total")==-1){
                    data_actual = dades[0].childNodes[0].nodeValue;
                    regio_actual = dades[1].childNodes[0].nodeValue;
                    centre_actual = dades[2].childNodes[0].nodeValue;
                }
            }else if(num_dades == 7){
                if (dades[0].childNodes[0].nodeValue.indexOf("Total")==-1){
                    regio_actual = dades[0].childNodes[0].nodeValue;
                    centre_actual = dades[1].childNodes[0].nodeValue;
                }
            }else if(num_dades == 6){
                if (dades[0].childNodes[0].nodeValue.toLowerCase().indexOf("total")==-1){
                    centre_actual = dades[0].childNodes[0].nodeValue;
                }
            }

            guardarMesos(data_actual);
            guardarIntervencions(grup_actual, tipus_actual);
            guardarRegions(regio_actual);
            guardarCentres(regio_actual, centre_actual);
        }
    }
    
    ordenarRegionsCentres();
    
    omplirMesos(primerMesNum, primerAnyNum);
    omplirIntervencions();
    omplirRegionsSanitaries();
    
}

function guardarMesos(data){
    //llegir mesos pel combo
    //traducciÃ³ dates a mes-any
    if (data.toUpperCase()=="TOTAL") {return;}

    var mes = parseInt(data.substring(5,7));
    var text_data = monthNames[mes - 1] + " " + data.substring(0,4);

    if (jQuery.inArray(text_data, llistaDates) < 0) { //no existeix la data en l'array -> guardar-la
        llistaDates[llistaDates.length] = text_data;
    }
}
function guardarIntervencions(grup, tipus){
    // llegir tipus pel combo
    var abrev_grup = grup.substring(0,3);
    if (abrev_grup == "Cat"){ 
        if (jQuery.inArray(tipus, garantit) < 0) {
            garantit[garantit.length] = tipus;
        }
    }else if(abrev_grup == "Neo"){
        if (jQuery.inArray(tipus, neoplasia) < 0) {
            neoplasia[neoplasia.length] = tipus;
        }
    }else if(abrev_grup == "Ref"){
        if (jQuery.inArray(tipus, referencia) < 0) {
            referencia[referencia.length] = tipus;
        }
    }else if(abrev_grup == "Car"){
        if (jQuery.inArray(tipus, cardiaca) < 0) {
            cardiaca[cardiaca.length] = tipus;
        }
    }else if (abrev_grup == ""){
        //no són intervencions quirúrgiques
        if (jQuery.inArray(tipus, llistaTipus) < 0) {
            llistaTipus[llistaTipus.length] = tipus;
        }
    }else{
        // total
    }
}
function guardarRegions(regio) {
    if (jQuery.inArray(regio, regions) < 0) {
        regions[regions.length] = regio;
    }
}
function guardarCentres(regio, centre){
    var posRegio = regions.indexOf(regio);
    if (jQuery.inArray(centre,centres[posRegio]) < 0){
        if (centres[posRegio] == undefined) {
            centres[posRegio]=new Array();
        }

        
        if(jQuery.inArray(centre.replace('*',''),centres[posRegio]) < 0){
            centres[posRegio].push(centre.replace('*','')); 
        }
    } 
}
function ordenarRegionsCentres(){
    regions_ordenades = regions.slice();
    regions_ordenades.sort(function (a, b) {
        return a.localeCompare(b);
    }); 
     
}

function omplirIntervencions(){
    $('#p_tipus').children('option').remove();
    if (intervencio_seleccionada == 1) {
        neoplasia.sort();
        arrayTipus = neoplasia;
    }else if (intervencio_seleccionada == 2) {
        cardiaca.sort();
        arrayTipus = cardiaca;
    }else if (intervencio_seleccionada == 3) {
        garantit.sort();
        arrayTipus = garantit;
    }else if (intervencio_seleccionada == 4) {
        referencia.sort();
        arrayTipus = referencia;
    }else if (intervencio_seleccionada == 0) {
        //no té grup d'intervenció == no són intervencions quirúrgiques
        llistaTipus.sort();
        arrayTipus = llistaTipus;
    }
    for (var i = 0; i < arrayTipus.length ; i++){
        $("#p_tipus").append( $("<option></option>").attr("value",i+1).text(arrayTipus[i]) );
    }

    $("#p_tipus").append( $("<option></option>").attr("value",0).text(textComboTipus) );

    //seleccionar totes les intervencions de oncològiques
    $('#p_tipus option:contains("Tots")').attr('selected','selected');
    $('#p_tipus').trigger('change');
}
function omplirMesos(primerMes, primerAny){
    
    if(!tmp){
        $('#p_mes').children('option').remove();
        var mesSelect = parseInt(primerMes);
        var anySelect = parseInt(primerAny);
        $("#p_mes").append( $("<option></option>").attr("value",0).attr("id",anySelect+"-"+mesSelect).text(monthNames[mesSelect-1]+" "+anySelect) );       
        mesSelect--;
        if(mesSelect == 0){
            mesSelect = 12;
            anySelect--;
        }
        escriuOptions(anySelect,mesSelect,1);
    
        $('#p_mes option:eq(0)').attr('selected','selected');
        $('#p_mes').trigger('change');

        $('#p_mes').change(function(){  
            var dataTMP = $('#p_mes option:selected').attr('id').split('-');
            omplirCombos(parseInt(dataTMP[0]),parseInt(dataTMP[1]));
        });
        tmp=true;
    }
    else canviaCursorLoading(false);
}
function omplirRegionsSanitaries(){
    $('#p_rs').children('option').remove();
    for (var i = 0 ; i< regions_ordenades.length ; i++){
        $("#p_rs").append( $("<option></option>").attr("value",i+1).text(regions_ordenades[i]) );
    }

    $("#p_rs").append( $("<option></option>").attr("value",0).text("Tot Catalunya") );

    //seleccionar "Tot Catalunya"
    $('#p_rs option:contains("Tot")').attr('selected','selected');
    $('#p_rs').trigger('change');
}
function omplirCentres(){
//    var nom_regio = $(".p_rs span").text();
    var nom_regio = $("#p_rs").val() > 0 ? regions_ordenades[$("#p_rs").val() - 1] : $(".p_rs span").text();
    $('#p_rs option:contains(' +  nom_regio + ')').attr('selected','selected');

    var rs = regions.indexOf(nom_regio);

    $('#p_centre').children('option').remove();
    var llista = [];
    if(rs < 0) { // Tot Catalunya no està  en la llista de regions
        for (var j = 0; j < centres.length; j++){
            llista = llista.concat(centres[j]);
        }

        llista.sort(function (a, b) { return a.localeCompare(b);} );
        for (var i = 0 ; i< llista.length ; i++){
            $("#p_centre").append( $("<option></option>").attr("value",llista[i]).text(llista[i]) );
        }
    }else{
        llista = centres[rs];
        llista.sort(function (a, b) { return a.localeCompare(b);} );
        for (var i = 0 ; i< llista.length ; i++){
            $("#p_centre").append( $("<option></option>").attr("value",llista[i]).text(llista[i]) );
        }
    }
 
    $("#p_centre").append( $("<option></option>").attr("value",0).text("Tots els centres sanitaris") );

    // seleccionar "Tots els centres"
    $('#p_centre option:contains("Tots")').attr('selected','selected');
    $('#p_centre').trigger('change');
}


/********************************* RESULTATS **********************************/

function obtenirResultats(){
    var dataActual = $('#p_mes option:selected').attr('id').split('-');
    if (dataActual[1] > 0 && dataActual[1] < 10){
        dataActual[1] = "0"+dataActual[1];
    }
    if ($("#divTipus").hasClass("frm_desactivat")) return;
    $("#resultats").removeClass("ocult");

    var xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            recollirDades(xhttp);
        }
    };

    // Obre el fitxer seleccionat
    var URL_dades_ = URL_dades+dataActual[0]+"-"+dataActual[1]+".xml";
    xhttp.open("GET", URL_dades_, true);
    xhttp.send();
}
function recollirDades(xml){
    var xmlDoc = xml.responseXML;
    var files = xmlDoc.getElementsByTagName("Row");
	

    $("#resultats").addClass("ocult");
    $("#div_zona_resultats").addClass("ocult");
    $("#div_taula_resultats").addClass("ocult");
    $("#div_no_resultats").addClass("ocult");
    $("#pestanyesResultats").addClass("ocult");

//  var dataCercar = $(".p_mes span").text();
    var dataCercar = monthNames[$("#p_mes option:selected").attr("id").substring($("#p_mes option:selected").attr("id").indexOf("-") + 1) - 1] + " " +$("#p_mes option:selected").attr("id").substring(0,4);
//  var regioCercar = $(".p_rs span").text().toUpperCase();
    var regioCercar = ($("#p_rs").val() != 0 ? regions_ordenades[$("#p_rs").val() - 1] : $(".p_rs span").text()).toUpperCase();
//  var centreCercar = $(".p_centre span").text().toUpperCase();
    var centreCercar = ($("#p_centre").val() != 0 ? $("#p_centre").val() : $(".p_centre span").text()).toUpperCase();
//  var tipusCercar = $(".p_tipus span").text().toUpperCase();
    var tipusCercar = ($("#p_tipus").val() != 0 ? arrayTipus[ $("#p_tipus").val() - 1] : $(".p_tipus span").text()).toUpperCase();

    var totesRegions = ($("#p_rs").val() == 0);
    var totsCentres = ($("#p_centre").val() == 0);
    var totsTipus = ($("#p_tipus").val() == 0);

    var grup_actual = ""; 
	var num_grup_actual = 0;
    var tipus_actual = "";
    var mes_actual = "";
    var regio_actual = "";
    var centre_actual = "";

    var num_centres_trobats = 0;
    var textDades = "";
    var textAcumCentres = "";
    var textAcumRS = "";
    var textTaula ="";
    var textTaulaUnica ="";

    var esTotalCentres = false;
    var esTotalRegions = false;
    var esTotalDates = false;
    var esTotalTaula = false;
    var esTotalMes = false;
    var esTotalMesos = false;
    var anteriorEsTotalMes = 0; /*Ens permetra identificar els es total mesos*/
    var esTotalMesComplet = false;

    numFila = 0;
    numPag = 1;
    paginaActual = 1;

    activarChecksMostra();
    textTaula = textTaula + obrirDivPaginacio(numPag);

    textTaulaUnica = textTaulaUnica + "<table id='taulaUnicaResultats' class='taula_base table'>";
    textTaulaUnica = textTaulaUnica + "<thead>";
    textTaulaUnica = textTaulaUnica + muntarCapcalera();
    textTaulaUnica = textTaulaUnica + "</thead>";
    textTaulaUnica = textTaulaUnica + "<tbody>";

    for (var i = 0 ; i < files.length; i++){
		
        var dades = files[i].getElementsByTagName("Data");
		// debugger;
        var valPacients;
        var valDones;
        var valHomes;
        var valEspera;
        var valIntervinguts;

        esTotalCentres = false;
        esTotalRegions = false;
        esTotalMes = false;
        esTotalDates = false;
        esTotalTaula = false;
        esTotalMesos = false;
        esTotalMesComplet = false;

        var num_dades = dades.length;

        if(num_dades > 5 && dades[5].childNodes[0].nodeValue!="Pacients en llista d'espera" ){
            if( dades[0].childNodes[0].nodeValue.match( /total./i ) != null ){
                centre_actual =dades[0].childNodes[0].nodeValue;
                regio_actual = '';
                valPacients = dades[1].childNodes[0].nodeValue;
                valHomes = dades[2].childNodes[0].nodeValue;
                valDones = dades[3].childNodes[0].nodeValue;
                valEspera = dades[4].childNodes[0].nodeValue;
                valIntervinguts = dades[5].childNodes[0].nodeValue;
            }else if (num_dades == 10){ // tots els camps informats

                grup_actual = dades[0].childNodes[0].nodeValue;
                var abrev_grup = grup_actual.substring(0,3);
                if     (abrev_grup == "Cat"){   num_grup_actual = 3;    }
                else if(abrev_grup == "Neo"){   num_grup_actual = 1;    }
                else if(abrev_grup == "Ref"){   num_grup_actual = 4;    }
                else if(abrev_grup == "Car"){   num_grup_actual = 2;    }
                if (dades[0].childNodes[0].nodeValue.trim().toUpperCase() == "TOTAL"){
                    esTotalTaula = false;
                    tipus_actual = "";
                    regio_actual = "";
                    centre_actual = "";
                }else{
                    tipus_actual = dades[1].childNodes[0].nodeValue;
                    var mes = parseInt(dades[2].childNodes[0].nodeValue.substring(5,7));
                    mes_actual = monthNames[mes - 1] + " " + dades[2].childNodes[0].nodeValue.substring(0,4);
                    regio_actual = dades[3].childNodes[0].nodeValue;
                    centre_actual = dades[4].childNodes[0].nodeValue;
                }

                valPacients = dades[5].childNodes[0].nodeValue;
                valHomes = dades[6].childNodes[0].nodeValue;
                valDones = dades[7].childNodes[0].nodeValue;
                valEspera = dades[8].childNodes[0].nodeValue;
                valIntervinguts = dades[9].childNodes[0].nodeValue;
            }else if (num_dades == 9){

                tipus_actual = dades[0].childNodes[0].nodeValue;
                if (dades[0].childNodes[0].nodeValue.trim().toUpperCase() == "TOTAL"){
                    esTotalTaula = true;
                    regio_actual = "";
                    centre_actual = "";
                }else{
                    var mes = parseInt(dades[1].childNodes[0].nodeValue.substring(5,7));
                    mes_actual = monthNames[mes - 1] + " " + dades[1].childNodes[0].nodeValue.substring(0,4);
                    regio_actual = dades[2].childNodes[0].nodeValue;
                    centre_actual = dades[3].childNodes[0].nodeValue;
                }

                valPacients = dades[4].childNodes[0].nodeValue;
                valHomes = dades[5].childNodes[0].nodeValue;
                valDones = dades[6].childNodes[0].nodeValue;
                valEspera = dades[7].childNodes[0].nodeValue;
                valIntervinguts = dades[8].childNodes[0].nodeValue;
            }else if (num_dades == 8) {

                if (dades[0].childNodes[0].nodeValue.trim().toUpperCase() == "TOTAL"){
                    esTotalDates = true;
                    regio_actual = "";
                    centre_actual = "";
                }else{
                    var mes = parseInt(dades[0].childNodes[0].nodeValue.substring(5,7));
                    mes_actual = monthNames[mes - 1] + " " + dades[0].childNodes[0].nodeValue.substring(0,4);
                    regio_actual = dades[1].childNodes[0].nodeValue;
                    centre_actual = dades[2].childNodes[0].nodeValue;
                }

                valPacients = dades[3].childNodes[0].nodeValue;
                valHomes = dades[4].childNodes[0].nodeValue;
                valDones = dades[5].childNodes[0].nodeValue;
                valEspera = dades[6].childNodes[0].nodeValue;
                valIntervinguts = dades[7].childNodes[0].nodeValue;
            }else if (num_dades == 7){

                if (dades[0].childNodes[0].nodeValue.trim().toUpperCase() == "TOTAL"){
                    esTotalRegions = true;
                    regio_actual = "";
                    centre_actual = "";

                    /*IDENTIFICAR EL TOTAL DE TOT PER CADA MES, QUE ENCARA NO TRACTEM*/
                    if((i+1)+llistaDates.length >= files.length
                        && window.location.href.indexOf("proves-diagnostiques") <= -1
                        && window.location.href.indexOf("consultes-externes-especialitats") <= -1
                    ){
                        esTotalRegions = false;
                        esTotalMesComplet = true;
                    }
                    else if ((i+1)+llistaDates.length <= files.length
                        && window.location.href.indexOf("intervencions-quirurgiques") > -1){
                        esTotalTaula = true;
                        regio_actual = "";
                        centre_actual = "";
                        tipus_actual = dades[0].childNodes[0].nodeValue;
                        if (dades[1].hasChildNodes()) {
                            var mes = parseInt(dades[1].childNodes[0].nodeValue.substring(5,7)); //CAL ACTUALITZAR EL MES ACTUAL EN AQUEST CAS
                            mes_actual = monthNames[mes - 1] + " " + dades[1].childNodes[0].nodeValue.substring(0,4);
                        } else {
                            console.log("Error (Mes actual: " + mes_actual + ")");
                        }
                    }
                    else if((i+1)+llistaDates.length >= files.length){
                        //PROVES I ESPECIALITATS UTILITZEN ELS DOS ULTIMS TOTALS A LA TAULA, PER TANT, CAL AFEGIR-LOS
                        esTotalTaula = true;
                        esTotalRegions = false;
                        regio_actual = "";
                        centre_actual = "";
                        tipus_actual = dades[0].childNodes[0].nodeValue;
                        if (dades[1].hasChildNodes()) {
                            var mes = parseInt(dades[1].childNodes[0].nodeValue.substring(5,7)); //CAL ACTUALITZAR EL MES ACTUAL EN AQUEST CAS
                            mes_actual = monthNames[mes - 1] + " " + dades[1].childNodes[0].nodeValue.substring(0,4);
                            console.log("Mes actual: " + mes_actual);
                        } else {
                            console.log("Error (Mes actual: " + mes_actual + ")");
                        }
                    }
                }
                else if(dades[0].childNodes[0].nodeValue.trim().toUpperCase().indexOf("TOTAL")!=-1){
                    esTotalTaula = true;
                    regio_actual = "";
                    centre_actual = "";
                    tipus_actual = dades[0].childNodes[0].nodeValue;
                    var mes = parseInt(dades[1].childNodes[0].nodeValue.substring(5,7)); //CAL ACTUALITZAR EL MES ACTUAL EN AQUEST CAS
                    mes_actual = monthNames[mes - 1] + " " + dades[1].childNodes[0].nodeValue.substring(0,4);
                }
                else{
                    regio_actual = dades[0].childNodes[0].nodeValue;
                    centre_actual = dades[1].childNodes[0].nodeValue;
                }
                valPacients = dades[2].childNodes[0].nodeValue;
                valHomes = dades[3].childNodes[0].nodeValue;
                valDones = dades[4].childNodes[0].nodeValue;
                valEspera = dades[5].childNodes[0].nodeValue;
                valIntervinguts = dades[6].childNodes[0].nodeValue;
            }else if (num_dades == 6)  {

                if (dades[0].childNodes[0].nodeValue.trim().toUpperCase() == "TOTAL"){
                    esTotalCentres = centre_actual != "";
                    esTotalMes = !esTotalCentres;
                    centre_actual = "";

                    /*IDENTIFICAR EL TOTAL DELS MESOS, QUE ENCARA NO TRACTEM*/
                    if(anteriorEsTotalMes==i-1 && esTotalMes){
                        esTotalMesos = true;
                        esTotalMes=false;
                    }
                    else if (esTotalMes) anteriorEsTotalMes = i;
                }else{
                    centre_actual = dades[0].childNodes[0].nodeValue;
                    
                }
               
                valPacients = dades[1].childNodes[0].nodeValue;
                valHomes = dades[2].childNodes[0].nodeValue;
                valDones = dades[3].childNodes[0].nodeValue;
                valEspera = dades[4].childNodes[0].nodeValue;
                valIntervinguts = dades[5].childNodes[0].nodeValue;
            }

            if(esTotalTaula && (mes_actual == dataCercar) &&
                ((num_grup_actual == intervencio_seleccionada) || (intervencio_seleccionada == 0)) &&
                totsTipus && totesRegions && totsCentres){
                textTaulaUnica = textTaulaUnica + muntarFilaTotal(false, tipus_actual, "", "", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textTaula = textTaula + muntarFilaTotal(true, tipus_actual, "", "", valPacients, valDones, valHomes, valEspera, valIntervinguts);
            }else if((!esTotalTaula) && (esTotalRegions) && (! esTotalCentres) && (mes_actual == dataCercar) &&
                ((num_grup_actual == intervencio_seleccionada) || (intervencio_seleccionada == 0)) &&
                ((tipus_actual.toUpperCase() == tipusCercar.toUpperCase()) || totsTipus) &&
                totesRegions && totsCentres){

                textDades = textDades + getHtmlSeccioDades($(".p_rs span").text(), "seccio_gris", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textTaulaUnica = textTaulaUnica + muntarFilaTotal(false, tipus_actual, "Tot Catalunya".toUpperCase(), "", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textTaula = textTaula + muntarFilaTotal(true, tipus_actual, "Tot Catalunya".toUpperCase(), "", valPacients, valDones, valHomes, valEspera, valIntervinguts); 

                textDades = textDades +  textAcumRS;
                textAcumRS = "";
            }else if((!esTotalTaula) && (esTotalCentres)  && (! esTotalRegions) && (mes_actual == dataCercar) &&
                ((num_grup_actual == intervencio_seleccionada) || (intervencio_seleccionada == 0)) &&
                ((tipus_actual.toUpperCase() == tipusCercar.toUpperCase()) || totsTipus) &&
                ((regio_actual.toUpperCase() == regioCercar.toUpperCase()) || (regio_actual.toUpperCase().indexOf(regioCercar.toUpperCase()) >=0) || totesRegions) ){
                if (textAcumCentres.length != 0){
                    textAcumRS = textAcumRS + getHtmlObrirDesplegableRS(num_centres_trobats,regio_actual,regioCercar,centreCercar);
                    if (totsCentres){
                        textAcumRS = textAcumRS + getHtmlSeccioDades("", "seccio_gris", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                        if (! totesRegions && totsCentres){

                            textTaulaUnica = textTaulaUnica + muntarFilaTotal(false, tipus_actual, regio_actual, "Total", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                            textTaula = textTaula + muntarFilaTotal(true, tipus_actual, regio_actual, "Total", valPacients, valDones, valHomes, valEspera, valIntervinguts); 
                        }
                    }
                    textAcumRS = textAcumRS + textAcumCentres;
                    textAcumRS = textAcumRS + getHtmlTancarDesplegableRS();
                    textAcumCentres = "";
                } 
            }else if( esTotalMes && (!esTotalTaula) && (! esTotalRegions) && (mes_actual == dataCercar)  &&
                ((num_grup_actual == intervencio_seleccionada) || (intervencio_seleccionada == 0)) &&
                ((tipus_actual.toUpperCase() == tipusCercar.toUpperCase()) || totsTipus) &&
                ((centre_actual.replace("*","").toUpperCase() == centreCercar.replace("*","").toUpperCase()) || totsCentres) &&
                totesRegions) {
                textDades = textDades + getHtmlSeccioDades($(".p_rs span").text(), "seccio_gris", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textTaulaUnica = textTaulaUnica + muntarFilaTotal(false, tipus_actual, "Tot Catalunya".toUpperCase(), "", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textTaula = textTaula + muntarFilaTotal(true, tipus_actual, "Tot Catalunya".toUpperCase(), "", valPacients, valDones, valHomes, valEspera, valIntervinguts); 

                textDades = textDades +  textAcumRS;
                textAcumRS = "";
            }else if(esTotalDates) { 
            }else if ((!esTotalTaula) && (!esTotalMes) && (!esTotalMesos) && (!esTotalMesComplet) && (mes_actual == dataCercar) &&
                ((num_grup_actual == intervencio_seleccionada) || (intervencio_seleccionada == 0)) &&
                ((tipus_actual.toUpperCase() == tipusCercar.toUpperCase()) || totsTipus) && (tipus_actual != "") &&
                ((regio_actual.toUpperCase() == regioCercar.toUpperCase()) || (regio_actual.toUpperCase().indexOf(regioCercar.toUpperCase()) >=0) || totesRegions) &&
                ((centre_actual.replace("*","").toUpperCase() == centreCercar.replace("*","").toUpperCase()) || totsCentres) ){
                num_centres_trobats ++; 
                textAcumCentres = textAcumCentres + getHtmlObrirDesplegableCentre(num_centres_trobats, centre_actual,centreCercar);
                textAcumCentres = textAcumCentres + getHtmlSeccioDades("", "", valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textAcumCentres = textAcumCentres + getHtmlTancarDesplegableCentre();

                textTaulaUnica = textTaulaUnica + muntarFila(false, tipus_actual, regio_actual, centre_actual, valPacients, valDones, valHomes, valEspera, valIntervinguts);
                textTaula = textTaula + muntarFila(true, tipus_actual, regio_actual, centre_actual, valPacients, valDones, valHomes, valEspera, valIntervinguts);

                esTotalAnterior = 0;
            }else{
                
            }

        }
    }

    textTaula = textTaula + tancarDivPaginacio();
    textTaulaUnica = textTaulaUnica + "</tbody></ttable>";

    textDades = textDades + "<div class='fiDiv'></div>";
    muntarText();

    if (textAcumCentres.length > 0){
        textAcumRS = textAcumRS + textAcumCentres;
    }
    if (textAcumRS.length > 0 ){
        textDades = textDades + textAcumRS;
    }


    // ---------------------------------------------------------------- Notes "peu de pàgina" -------
    // si tots els tipus d'intervencions ==> no mostrar opció dades
    // si només un resultat ==> no mostrar opció taula

    $("#div_zona_resultats").html(textDades);
    $("#taula_resultats").html(textTaula);    
    $("#taula_resultats_1_taula").html(textTaulaUnica);
    muntarPaginacio();

    $(window).resize(function(){
        muntarPaginacio();
        goTo(paginaActual);
    })

  
    
    // activar missatge dades temporals - nota asterisc
    
    // HOSPITAL CLÍNIC DESEMBRE+NOVEMBRE
    $("#resultats #alerta_dades").remove();
    
     
    //$("#resultats").append("<div id='alerta_dades'>* Podeu consultar si s’ha produït alguna incidència amb el tractament de la informació a l’apartat de <a href='http://catsalut.gencat.cat/ca/coneix-catsalut/acces-sistema-salut/llistes-espera/qualitat-de-la-informacio/'>qualitat</a>.</div>");
    /*
    if ( (($(".p_mes span").text().indexOf("Novembre 2017") >= 0) ||($(".p_mes span").text().indexOf("Desembre 2017") >= 0)) && (! $("#cercador").hasClass("quirurgiques") ) && 
        (($(".p_centre span").text().indexOf("nic de Barcelona") >= 0) || (totsCentres && (($("#p_rs").val() == 0) || ($("#p_rs").val() == 2))))){
        $("#resultats").append("<div id='alerta_dades'>* Les dades dels mesos novembre i desembre de l’Hospital Clínic estan en revisió per problemes tècnics.</div>");
    }
    */
    // QUIRÚRGIQUES + VARIS HOSPITALS + GENER
    /*
    if ( 
            ($(".p_mes span").text().indexOf("Gener 2018") >= 0) && $("#cercador").hasClass("quirurgiques") && 
            ((
                ($(".p_centre span").text().indexOf("Vendrell") >= 0) || 
                    ($(".p_centre span").text().indexOf("Tecla") >= 0) || 
                    ($(".p_centre span").text().indexOf("Ponent") >= 0) || 
                    ($(".p_centre span").text().indexOf("Martorell") >= 0) || 
                    ($(".p_centre span").text().indexOf("Puigvert") >= 0) || 
                    ($(".p_centre span").text().indexOf("Esperit Sant") >= 0) ||
                    (totsCentres && (
                    ($("#p_rs").val() == 0) || ($("#p_rs").val() == 5) || ($("#p_rs").val() == 4) || ($("#p_rs").val() == 3)) 
                )
            ))
        ){
        $("#resultats").append("<div id='alerta_dades'>* Dades provisionals per problemes tècnics o de notificació de l’activitat per la implantació de la CIM10-MC/SCP.</div>");
    }
    if ( 
            ($(".p_mes span").text().indexOf("Gener 2018") >= 0) && $("#cercador").hasClass("diagnostiques") && 
            ((
                ($(".p_centre span").text().indexOf("Reus") >= 0) || 
                    ($(".p_centre span").text().indexOf("Sanitari") >= 0) || 
                    ($(".p_centre span").text().indexOf("Puigvert") >= 0) || 
                    ($(".p_centre span").text().indexOf("Amposta") >= 0) ||
                    (totsCentres && (
                    ($("#p_rs").val() == 0) || ($("#p_rs").val() == 5) || ($("#p_rs").val() == 4)  || ($("#p_rs").val() == 2) || ($("#p_rs").val() == 9)) 
                )
            ))
        ){
        $("#resultats").append("<div id='alerta_dades'>* Dades provisionals per problemes tècnics o de notificació de l’activitat per la implantació de la CIM10-MC/SCP.</div>");
    }
    if ( 
            ($(".p_mes span").text().indexOf("Gener 2018") >= 0) && $("#cercador").hasClass("externes") && 
            ((
                ($(".p_centre span").text().indexOf("Vendrell") >= 0) || 
                    ($(".p_centre span").text().indexOf("Tecla") >= 0) || 
                    ($(".p_centre span").text().indexOf("Valls") >= 0) || 
                    ($(".p_centre span").text().indexOf("Jaume Calella") >= 0) || 
                    ($(".p_centre span").text().indexOf("Althaia") >= 0) || 
                    ($(".p_centre span").text().indexOf("Martorell") >= 0) || 
                    ($(".p_centre span").text().indexOf("Esplugues") >= 0) || 
                    ($(".p_centre span").text().indexOf("Creu") >= 0) || 
                    ($(".p_centre span").text().indexOf("Matar") >= 0) ||
                    (totsCentres && (
                    ($("#p_rs").val() == 0) || ($("#p_rs").val() == 7) || ($("#p_rs").val() == 6)  || ($("#p_rs").val() == 5)  || ($("#p_rs").val() == 4) || ($("#p_rs").val() == 3) || ($("#p_rs").val() == 2) ) 
                )
            ))
        ){
        $("#resultats").append("<div id='alerta_dades'>* Dades provisionals per problemes tècnics o de notificació de l’activitat per la implantació de la CIM10-MC/SCP.</div>");
    }
    */
    // Hospitals Santa Tecla i El Vendrell de Tarragona a quirúrgiques i a consultes externes
    /*
    if ( 
            (($(".p_mes span").text().indexOf("Febrer 2018") >= 0) || ($(".p_mes span").text().indexOf("Març 2018") >= 0) || ($(".p_mes span").text().indexOf("Abril 2018") >= 0))  && ($("#cercador").hasClass("quirurgiques") || $("#cercador").hasClass("externes")) && 
            ((
                ($(".p_centre span").text().indexOf("Vendrell") >= 0) || 
                    ($(".p_centre span").text().indexOf("Tecla") >= 0) ||
                    (totsCentres && (
                    ($("#p_rs").val() == 0) || ($("#p_rs").val() == 5)) 
                )
            ))
        ){
        $("#resultats").append("<div id='alerta_dades'>* Dades provisionals per problemes tècnics o de notificació de l’activitat per la implantació de la CIM10-MC/SCP.</div>");
    }
    */
    // ---------------------------------------------------------------- FI Notes "peu de pàgina" -------

    if (num_centres_trobats == 0){
        $("#divDades").addClass("frm_desactivat");
        $("#divTaula").addClass("frm_desactivat");

        $("#divDades").addClass("ocult");
        $("#divTaula").addClass("ocult");

        $("#pestanyesResultats").addClass("ocult");
        $("#div_no_resultats").html("<strong>No s'han trobat resultats</strong>");
        $("#div_no_resultats").removeClass("ocult");
        $("#alerta_dades").addClass("ocult");
        $("#seccioMostra").addClass("ocult");
        $("#paginacioTaula").addClass("ocult");        
    } else{
        if ($("#p_tipus").val() == 0){
            $("#divDades").addClass("frm_desactivat");
            $("#divTaula").removeClass("frm_desactivat");
            $("#divDades").addClass("ocult");
            $("#divTaula").addClass("ocult");  //*Nomes un tipus de resultat ocultem ambes opcions*//

            clickPestanyaTaula();
        } else {
            if (num_centres_trobats == 1){
                $("#divTaula").addClass("frm_desactivat");
                $("#divTaula").addClass("ocult");
                $("#divDades").addClass("ocult"); //*Nomes un tipus de resultat ocultem ambes opcions*//
            } else{
                $("#divTaula").removeClass("frm_desactivat");
                $("#divTaula").removeClass("ocult");
                $("#divDades").removeClass("ocult"); //*Resultats dels dos tipus possibles*//
            }
            clickPestanyaTaula();
            $("#divDades").removeClass("frm_desactivat");

            clickPestanyaDades();
        }
        $("#pestanyesResultats").removeClass("ocult");
        $("#alerta_dades").removeClass("ocult");
    }
    $("#resultats").removeClass("ocult");

    $("#text_resultats").append( "<div id='alerta_dades'>Podeu consultar si s’ha produït alguna incidència amb el tractament de la informació a l’apartat de <a href='http://catsalut.gencat.cat/ca/coneix-catsalut/acces-sistema-salut/llistes-espera/qualitat-de-la-informacio/index.html'>qualitat</a>.</div>" );

    scrollResultats();

}

function muntarText(){
    var text = "Llistes d'espera " + textResultats + " de "; //tina textResultats = "d'intervencions";

    var nom_tipus = $('#p_tipus option:selected').text();
    if($.trim(nom_tipus) != "Total"){
        text = text + " <strong>" + nom_tipus + "</strong>";
    }

    var nom_centre = $('#p_centre option:selected').text();
    if($.trim(nom_centre) != "Total"){
        text = text + " a <strong>" + nom_centre + "</strong>";
    }

    var nom_regio = $('#p_rs option:selected').text();
    if($.trim(nom_regio) != "Total"){
        text = text + " de la <strong>Regió Sanitària de " + nom_regio + "</strong>";
    }

    var nom_mes = $('#p_mes option:selected').text();
    text = text + " (<strong>" + nom_mes + "</strong>" + ").";

    $("#text_resultats").html( text );
}

function getHtmlObrirDesplegableRS(iteracio, titol,criteriRegio,criteriCentre){
    var txt = "";
    var estat = "collapsed";
    var estatInner = "collapse";

    if(criteriRegio!="TOT CATALUNYA" || criteriCentre!="TOTS ELS CENTRES SANITARIS"){
        estat="";
        estatInner = "collapse in";
    }

    // obrir estructura => desplegable pare
    txt = txt + '<div class="panel-group llistat_collapse_cont" id="acordio_rs">';
    txt = txt + '   <div class="panel panel-default" >';
    txt = txt + '       <div class="panel-heading pd-30">';
    txt = txt + '           <h2 class="panel-title">';
    txt = txt + '               <a class="'+estat+'" data-toggle="collapse" data-parent="#acordio_rs" href="#collapse_acordio_rs' + iteracio + '" id="zona0">' + titol + '</a>';
    txt = txt + '           </h2>';
    txt = txt + '       </div>';
    txt = txt + '       <div id="collapse_acordio_rs' + iteracio + '"  class="panel-collapse '+estatInner+'">';
    return txt;
}
function getHtmlTancarDesplegableRS(){
    var txt = "";
    // tancar estructura => desplegable pare
    txt = txt + '       </div>';
    txt = txt + '   </div>';
    txt = txt + '</div>';
    return txt;
}
function getHtmlObrirDesplegableCentre(iteracio, nomCentre,criteriCentre){
    var txt = "";
    var estat = "collapsed";
    var estatInner = "collapse";

    if(criteriCentre!="TOTS ELS CENTRES SANITARIS"){
        estat="";
        estatInner = "collapse in";
    }

// obrir estructura => desplegable fill
    txt = txt + '               <div class="panel-group llistat_collapse_cont" id="acordio_centre">';
    txt = txt + '                   <div class="panel panel-default" id="centre' + iteracio + '">';
    txt = txt + '                       <div class="panel-heading pd-30">';
    txt = txt + '                           <h2 class="panel-title">';
    txt = txt + '                               <a class="'+estat+'" data-toggle="collapse" data-parent="#acordio_centre" href="#collapse_acordio_centre' + iteracio + '" style="padding-right: 25px;">' + nomCentre + '</a>';
    txt = txt + '                           </h2>';
    txt = txt + '                       </div>';
    txt = txt + '                       <div id="collapse_acordio_centre' + iteracio + '" class="panel-collapse '+estatInner+'" style="height: auto;">';
    return txt;
}
function getHtmlTancarDesplegableCentre(){
    var txt = "";
    // tancar estructura => desplegable fill
    txt = txt + '                   </div>';
    txt = txt + '               </div>';
    txt = txt + '           </div>';
    return txt;
}

/**
 colorFons => ["seccio_gris"|""]
 **/
function getHtmlSeccioDades(titol, colorFons, valPacients, valDones, valHomes, valTempsEspera, valIntervinguts){
    var txt = "";
    txt = txt + '<div class="col-sm-12 div_seccio_resultats">';

    var valDones2 = (valDones == 0) ? 0 : formatarNumero(valDones * 100, 1);
    var valHomes2 = (valHomes == 0) ? 0 : formatarNumero(valHomes * 100, 1);
    var pacients =  (jQuery.isNumeric(valPacients)) ?   formatarNumero(valPacients,0) :     valPacients;
    var dones =     (jQuery.isNumeric(valDones)) ?      formatarNumero(valDones, 1) + " %" :    valDones;
    var homes =     (jQuery.isNumeric(valHomes)) ?      formatarNumero(valHomes, 1) + " %" :    valHomes;
    var intervinguts = (jQuery.isNumeric(valIntervinguts)) ? formatarNumero(valIntervinguts,0) : valIntervinguts; 
    var espera =    (jQuery.isNumeric(valTempsEspera)) ? formatarNumero(valTempsEspera,0) : valTempsEspera;

//zona gris
    txt = txt + '<div class="seccio ' + colorFons + ' ">';
    if (titol.length > 0){
        txt = txt + "<div class='basic_text_peq'><h2 class='basic_title col-sm-12'>" + titol + "</h2></div>";
    }
    txt = txt + "<div class='col-lg-6 col-md-6 col-sm-12 col-xs-12'>";
    txt = txt + "<div class='col-xs-12 dada'><div class='dada_text_pacients'><div><strong>" + pacients + "</strong> " + textSeccioPacients + " </div></div></div>";
    txt = txt + "<div class='col-xs-6 dada'><div class='dada_text_homes'><div><strong>" +  homes + "</strong> " + textSeccioHomes + " </div></div></div>";
    txt = txt + "<div class='col-xs-6 dada'><div class='dada_text_dones'><div><strong>" +  dones + "</strong> " + textSeccioDones + " </div></div></div>";
    txt = txt + "</div>";

    txt = txt + "<div class='col-lg-6 col-md-6 col-sm-12 col-xs-12'>";
    txt = txt + "<div class='col-xs-12 dada'><div class='dada_text_intervinguts'><div><strong>" + intervinguts + "</strong> " + textSeccioIntervinguts + "</div></div></div>";
    txt = txt + "<div class='col-xs-12 dada'><div class='dada_text_espera'><div><strong>" + espera + "</strong> " + textSeccioEspera + "</div></div></div>";

    txt = txt + '   </div><div class="fiDiv"></div>';
    txt = txt + '   </div>';
    txt = txt + '</div>';
    return txt;
}

function obrirDivPaginacio(numPag) {
    var txt = "";
    txt = txt + "<div id='page" + numPag + "' class='";
    (numPag == 1) ? txt = txt + "pageTaulaResultats " : txt = txt + "pageTaulaResultats taulaNoVisible" ;
    txt = txt + "'>";

    txt = txt + "<table id='taulaResultats' class='taula_base table'>";
    txt = txt + "<thead>";
    txt = txt + muntarCapcalera();
    txt = txt + "</thead>";
    txt = txt + "<tbody>";
    return txt;
}
function tancarDivPaginacio(){
    var txt = "";
    txt = txt + "</tbody></table></div>";
    return txt;
}


function formatarNumero(numero, decimals){
    var txtNum = "";

    var numeroSplit = ("" + numero).split("\.");

    var partEntera = (decimals == 0) ? parseFloat(numero).toFixed(0) : parseInt(numeroSplit[0]);
    var partDecimal = parseFloat("0."+numeroSplit[1]);

    if (partEntera > 999){
        var partMilers;
        if (partEntera > 999999){
            partMilers =  parseInt(partEntera / 1000);
            txtNum = txtNum + parseInt(partMilers / 1000) + ".";
            var restom = (partMilers % 1000);
            var um = restom % 10;
            var dm = parseInt(restom/10) % 10;
            var cm = parseInt(parseInt(restom/100)) % 10;

            txtNum = txtNum + cm + dm + um + ".";
        }else{
            txtNum = txtNum + parseInt(partEntera / 1000) + ".";
        }

        var resto = (partEntera % 1000)
        var u = resto % 10
        var d = parseInt(resto/10) % 10
        var c = parseInt(parseInt(resto/100)) % 10;

        txtNum = txtNum + c + d + u
    }else{
        txtNum = txtNum + partEntera;
    }

    if ((decimals > 0) && (numero != 0)){
        partDecimal = partDecimal.toFixed(decimals);
        txtNum = txtNum + "," + ("" + partDecimal).split("\.")[1];
    }
    return txtNum;
}

function muntarCapcalera(){
    var txt = "<tr>";

    txt = txt + "<th class='taulaIntervencio titol1'>" + textTaulaTipus + "</th>";
    txt = txt + "<th class='taulaRs titol2'>Regió Sanitària</th>";
    txt = txt + "<th class=' taulaCentre titol3'>Centre sanitari</th>";

    txt = txt + "<th class='taulaPacients titol4'>" + textSeccioPacients + "</th>";
    txt = txt + "<th class='taulaHomes titol5'>% " + textSeccioHomes + "</th>";
    txt = txt + "<th class='taulaDones titol6'>% " + textSeccioDones + "</th>";
    txt = txt + "<th class='taulaIntervinguts titol7'>" + textSeccioIntervinguts + "</th>";
    txt = txt + "<th class='taulaEspera titol8'> " + textSeccioEspera + " </th>";

    txt = txt + "</tr>";
    return txt;
}
function muntarFila(paginacio, intervencio, rs, centre, valPacients, valDones, valHomes, valTempsEspera, valIntervinguts){
    var txt = "";



    var valDones2 = (valDones == 0) ? 0 : formatarNumero(valDones * 100, 1);
    var valHomes2 = (valHomes == 0) ? 0 : formatarNumero(valHomes * 100, 1);
    var pacients =  (jQuery.isNumeric(valPacients)) ?   formatarNumero(valPacients,0) :     valPacients;
    var dones =     (jQuery.isNumeric(valDones)) ?      formatarNumero(valDones, 1) :   valDones;
    var homes =     (jQuery.isNumeric(valHomes)) ?      formatarNumero(valHomes, 1) :   valHomes;
    var intervinguts = (jQuery.isNumeric(valIntervinguts)) ? formatarNumero(valIntervinguts,0) : valIntervinguts; 
    var espera =    (jQuery.isNumeric(valTempsEspera)) ? formatarNumero(valTempsEspera,0) : valTempsEspera;

    if (paginacio && ((numFila % elemPerPag) == 0) && (numFila > 0)) { 
        txt = txt + tancarDivPaginacio();
        numPag ++;
        txt = txt + obrirDivPaginacio(numPag);

    }

    txt = txt + "<tr id='fila" + numFila + "'>";
    //console.log(rs);
    if(centre.match( /total./i ) != null ){
        txt = txt + "<td class= 'taulaIntervencio'></td>";
    }else{
        txt = txt + "<td class= 'taulaIntervencio'>" + intervencio + "</td>";
    }
    txt = txt + "<td class= 'taulaRs'>" + rs + "</td>";
    txt = txt + "<td class= 'taulaCentre'>" + centre + "</td>";
    txt = txt + "<td class='taulaPacients numero'>" + pacients + "</td>";
    txt = txt + "<td class='taulaHomes numero'>" + homes + " </td>";
    txt = txt + "<td class='taulaDones numero'>" + dones + " </td>";
    txt = txt + "<td class='taulaIntervinguts numero'>" + intervinguts + "</td>";
    txt = txt + "<td class='taulaEspera numero'>" + espera + "</td>";

    txt = txt + "</tr>";
    (paginacio) ? numFila ++ : numFila;

    return txt;
}
function muntarFilaTotal(paginacio, intervencio, rs, centre, valPacients, valDones, valHomes, valTempsEspera, valIntervinguts){
    var txt = ""; 

    var valDones2 = (valDones == 0) ? 0 : formatarNumero(valDones * 100, 1);
    var valHomes2 = (valHomes == 0) ? 0 : formatarNumero(valHomes * 100, 1);
    var pacients =  (jQuery.isNumeric(valPacients)) ?   formatarNumero(valPacients,0) :     valPacients;
    var dones =     (jQuery.isNumeric(valDones)) ?      formatarNumero(valDones, 1) :   valDones;
    var homes =     (jQuery.isNumeric(valHomes)) ?      formatarNumero(valHomes, 1) :   valHomes;
    var intervinguts = (jQuery.isNumeric(valIntervinguts)) ? formatarNumero(valIntervinguts,0) : valIntervinguts; 
    var espera =    (jQuery.isNumeric(valTempsEspera)) ? formatarNumero(valTempsEspera,0) : valTempsEspera;

    if (paginacio && ((numFila % elemPerPag) == 0) && (numFila > 0)){
        txt = txt + tancarDivPaginacio();
        numPag ++;
        txt = txt + obrirDivPaginacio(numPag);
    }
    txt = txt + "<tr class='total' id='fila" + numFila + "'>";

    txt = txt + "<td class='total taulaIntervencio'>" + intervencio + "</td>";
    txt = txt + "<td class='total taulaRs'>" + rs + "</td>";
    txt = txt + "<td class='total taulaCentre'>" + centre + "</td>";
    txt = txt + "<td class='total taulaPacients numero'>" + pacients + "</td>";
    txt = txt + "<td class='total taulaHomes numero'>" + homes + " </td>";
    txt = txt + "<td class='total taulaDones numero'>" + dones + " </td>";
    txt = txt + "<td class='total taulaIntervinguts numero'>" + intervinguts + "</td>";
    txt = txt + "<td class='total taulaEspera numero'>" + espera + "</td>";

    txt = txt + "</tr>";
    (paginacio) ? numFila ++ : numFila;

    return txt;
}


function muntarPaginacio(){
    /*$('.pagDinamic').empty();
    $('.pagDinamicResp').empty();*/
    var isMobile = false;
    if($(window).width() < 992){
        isMobile = true;
    }

 
	$('#paginacioTaula').empty();
	
    if (!isMobile) {
        var textDinamic = "<ul class='pagination pagDinamic hidden-xs'>";
    } else {
        var textResponsiu = "<ul class='pagination pagDinamicResp visible-xs'>"; 
    }

    if ((numFila) > elemPerPag){
        if (!isMobile) {
            textDinamic = textDinamic +"<li class='first'><a id='pag_primera' class='desactivat' onclick='primera()'>&nbsp;</a></li>";
            textDinamic = textDinamic + "<li class='anterior'><a id='pag_anterior' class='anterior desactivat' onclick='anterior()'>anterior</a></li>";
            
            textDinamic = textDinamic+"<li id='pagination1' class='paginationNumber'><a class='paginaActual' onclick='goTo(1)'>1</a></li>";
        } else {
            textResponsiu = textResponsiu + "<li class='first'><a id='pag_primera_responsiu' class='desactivat' onclick='primera()'>&nbsp;</a></li>";
            textResponsiu = textResponsiu + "<li class='anterior'><a id='pag_anterior_responsive' class='anterior desactivat' onclick='anterior()'>&nbsp;</a></li>";
            
            textResponsiu = textResponsiu + "<li id='pagination_resp1' class='paginationNumberResponsive'><span class='actiu'>Pàgina 1</span></li>";
        }



        var paginacio = 2;
        while (paginacio <= numPag){
            //responsiu
            if (isMobile) {
                textResponsiu = textResponsiu + "<li id='pagination_resp" + paginacio + "' class='paginationNumberResponsive ocult'><span class='actiu'>Pàgina "+paginacio+"</span></li>";
            } else {
                if(paginacio <= 5){
                    textDinamic = textDinamic + "<li id='pagination" + paginacio + "' class='paginationNumber'><a onclick='goTo(" + paginacio + ")' >" + paginacio + "</a></li>";
                }else{
                    textDinamic = textDinamic + "<li id='pagination" + paginacio + "' class='paginationNumber ocult'><a onclick='goTo(" + paginacio + ")' >" + paginacio + "</a></li>";
                }
            }
          
            

            paginacio ++;
        }

        if (isMobile) {
            textResponsiu = textResponsiu + "<li class='seguent'><a id='pag_seguent_responsive' class='seguent' onclick='seguent()'>&nbsp;</a></li>";
            textResponsiu = textResponsiu + "<li class='last'><a id='pag_ultima_responsive' class='ultima' onclick='ultima()'>&nbsp;</a></li>" + "</ul>";
            $('#paginacioTaula').append(textResponsiu);
            
        } else {
            textDinamic = textDinamic + "<li class='seguent'><a id='pag_seguent' class='seguent' onclick='seguent()'>següent</a></li>";
            textDinamic = textDinamic + "<li class='last'><a id='pag_ultima' class='ultima' onclick='ultima()'>&nbsp;</a></li>" + "</ul>";
            $('#paginacioTaula').append(textDinamic);
        }

    }
}

function goTo(page){
    paginaActual = page;
    $("#pag_anterior").removeClass("desactivat");
    $("#pag_anterior_responsive").removeClass("desactivat");
    $(".paginaActual").removeClass("paginaActual");
    $("#pag_seguent").removeClass("desactivat");
    $("#pag_seguent_responsive").removeClass("desactivat");
    $("#taula_resultats>div").addClass("taulaNoVisible");
    $(".first > a").removeClass("desactivat");
    $(".last > a").removeClass("desactivat");

    if (page == 1){ 
        $("#pag_anterior").addClass("desactivat"); 
        $("#pag_anterior_responsive").addClass("desactivat");
        $(".first > a").addClass("desactivat");
        $("#pag_seguent").addClass("seguent");
    }else if (page == numPag){ 
        $("#pag_seguent").addClass("desactivat"); 
        $("#pag_seguent_responsive").addClass("desactivat");
        $(".last > a").addClass("desactivat");
        $("#pag_anterior").addClass("anterior");
    }
    $("#pagination"+page+" a").addClass("paginaActual");
    $("#page"+page).removeClass("taulaNoVisible");

    /*centrar pagina*/
    if (numPag > 5){
        $(".paginationNumber").addClass("ocult");
        var novaPagCentral = page;
        if (novaPagCentral <= 2){
            if (numPag >= 3) { novaPagCentral = 3; }
        }
        if (novaPagCentral > (numPag - 2)){
            novaPagCentral = numPag - 2;
        }

        for (var i = (novaPagCentral-2); i <= (novaPagCentral + 2); i++){
            $("#pagination"+i).removeClass("ocult");
        }
    }
    $(".paginationNumberResponsive").addClass("ocult");
    $("#pagination_resp"+paginaActual).removeClass("ocult");

}
function anterior(){
    if (paginaActual > 1){
        goTo(paginaActual-1);
    }
}
function seguent(){
    if (paginaActual < numPag){
        goTo(paginaActual+1);
    }
}

function primera(){
    goTo(1);
}
function ultima(){
    goTo(numPag);
}


function sayswho(element){
    var ua= navigator.userAgent, tem, 
    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
        if (element==0) return 'IE';
        else return (tem[1] || '');
    }
    if(M[1]=== 'Chrome'){
        tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
        if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera').split(" ")[element]; //
    }
    M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
    return M[element];
};

function comprovarNavegadorVersio(){
    var navegador = sayswho(0);
    var versio = sayswho(1);
    
    if( (navegador=="Chrome" && Number(versio)<45 ) ||
        (navegador=="Firefox" && Number(versio)<40) ||
        (navegador=="IE" && Number(versio)<11) ||
        (navegador.indexOf("Opera") != -1 && Number(versio)<36) ||
        (navegador=="Safari" && Number(versio)<10)
    )
        mostrarError('#error-navegador');
    
}

function mostrarError(idError) {
    $(idError).css('display','block');
    $('#divGrup > div > h2, div.caixes > div').css('color','#BF0000');
    $('#titolTipusEsq, #titolTipusDret').css('border-bottom','1px solid #BF0000');
    $('html, body').animate({
            scrollTop: $(idError).offset().top - 100 },
        200);
}
