	function descarregarCSV(){	
		var doc = '';
		var num_cols = 0;
		var separador = ';';
		pacients = [];
		dones = [];
		homes = [];
		intervinguts = [];
		espera = [];
		
		num_cols = 3 + $('input:checkbox:checked').length

		if($("#pacients").prop('checked'))
		{
			pacients = $("#taulaResultats .taulaPacients.numero");
		}

		if($("#dones").prop('checked'))
		{
			dones = $("#taulaResultats .taulaDones.numero");
		}
		
		if($("#homes").prop('checked'))
		{
			homes = $("#taulaResultats .taulaHomes.numero");
		}
		
		if($("#intervinguts").prop('checked'))
		{
			intervinguts = $("#taulaResultats .taulaIntervinguts.numero");
		}
			
		if($("#temps_espera").prop('checked'))
		{
			espera = $("#taulaResultats .taulaEspera.numero");
		}

		//alerta de dades pendents de revisió (només mostrar si hi ha centres amb *)
		var alerta_dades = ( $("#resultats #alerta_dades").length != 0);

		// --- Paràmetres de cerca escollits ---
		var csv_nomGrup = $(".caixaSelected").text().trim()
		var csv_tipus = $("#p_tipus option:selected").text()
		var csv_mes = $("#p_mes option:selected").text()
		var csv_rs = $("#p_rs option:selected").text()
		var csv_centre = $("#p_centre option:selected").text()

		doc = doc + addLinia("Grup d'intervenció: " + csv_nomGrup, num_cols, separador)
		doc = doc + addLinia("Tipus d'intervenció: " + csv_tipus, num_cols, separador)
		doc = doc + addLinia("Mes: " + csv_mes, num_cols, separador)
		doc = doc + addLinia("Regió Sanitària: " + csv_rs, num_cols, separador)
		doc = doc + addLinia("Centre Sanitari: " + csv_centre, num_cols, separador)	

		// --- Taula Capçaleres ---
		var linia = "Tipus d'intervenció" + separador + "Regió Sanitària" + separador + "Centre Sanitàri";  

		$("#pacients").prop('checked') ? linia = linia + separador + $("#taulaUnicaResultats .titol4").html() : linia = linia;
		$("#homes").prop('checked') ? linia = linia + separador + $("#taulaUnicaResultats .titol5").html() : linia = linia;
		$("#dones").prop('checked') ? linia = linia + separador + $("#taulaUnicaResultats .titol6").html() : linia = linia;
		$("#intervinguts").prop('checked') ? linia = linia + separador + textSeccioIntervinguts : linia = linia;
		$("#temps_espera").prop('checked') ? linia = linia + separador + textSeccioEspera : linia = linia;

		doc = doc + linia + "\r\n" ;

		// --- Taula Continguts ---
		/*
		$("#taulaResultats tbody tr").each(function (index) {
			var txt = $(this).children("td")[0]
			doc = doc + addFila($(this), num_cols, separador)			
		})
		$("#taulaResultats tbody tr").each(function (index) {
			var txt = $(this).children("td")[0]
			doc = doc + addFila($(this), num_cols, separador)			
		})
		*/
		 doc += addFiles();

		if(alerta_dades){
			doc = doc + addLinia("", num_cols, separador);
			doc = doc + addLinia($("#alerta_dades").text(), num_cols, separador);
		}

		saveFile(doc, 'llistesEspera.csv')
	}


	function addFiles(/*f, num_cols, separador*/){		
		var separador = ';';
		taulaIntervencio = $("#taulaResultats tbody .taulaIntervencio");
		taulaRs =  $("#taulaResultats tbody .taulaRs");
		taulaCentre = $("#taulaResultats tbody .taulaCentre");
		var linia = "";//$("#taulaResultats tbody tr").find("td").eq(0).text();

		for(i = 0; i< taulaIntervencio.length; i++){
			if( taulaIntervencio[i].textContent != 'Tipus de prova'){
				linia += taulaIntervencio[i].textContent + separador + taulaRs[i].textContent + separador + taulaCentre[i].textContent + separador;
				if( pacients != 0){
					linia += pacients[i].textContent + separador;
				}
				if( homes != 0 ){
					linia += homes[i].textContent + separador;
				}
				if( dones != 0 ){
					linia += dones[i].textContent + separador;
				}
				if( intervinguts != 0){
					linia += intervinguts[i].textContent + separador;
				}
				if( espera != 0 ){
					linia += espera[i].textContent + separador;
				}
				linia += "\r\n";
			}
		}
		return linia;	
	}

	function addLinia(txt, num_cols, separador){
		var linia = txt 
		for(i = 1; i< num_cols; i=i+1){
			linia = linia + separador + '';
		}
		return linia + "\r\n"
	}

	function addLiniaBlanc(num_cols, separador){
		var linia = ''
		for(i = 1; i< num_cols; i=i+1){
			linia = linia + separador + ''
		}
		return linia + "\r\n"
	}

	function saveFile(doc, nomFitxer){
	
		if (window.navigator.userAgent.indexOf('Trident/7.0') != -1) {
		
			try {
			
			//utilitza un iframe ocult en la mateixa pàgina per a poder descarregar el csv
				var iframe = document.getElementById('csvDownloadFrame');
			
				var iframe2 = iframe.contentWindow || iframe.contentDocument;

				iframe2.document.open("text/html", "replace");

				iframe2.document.write(doc);

				iframe2.document.close();

				iframe2.focus();

				
				iframe2.document.execCommand('SaveAs', true, nomFitxer);
			} catch(e){}
		} else {
		
			try {
				var a = document.createElement('a');
				a.href = 'data:attachment/csv,'+escape(doc);
				a.target = '_blank';
				a.download = nomFitxer;
				a.innerHTML = nomFitxer;
				a.style.display = "none";
				window.URL = window.URL || window.webkitURL;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
			} catch(e){}
		}
	}