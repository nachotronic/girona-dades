# Exploración de fuentes

| id | estado | tipo | tamaño | url final |
| --- | --- | --- | --- | --- |
| idescat_emex_nodes_mun | 200 | application/json | 53735 | https://api.idescat.cat/emex/v1/nodes.json?tipus=mun |
| idescat_emex_nodes_com | 200 | application/json | 2219 | https://api.idescat.cat/emex/v1/nodes.json?tipus=com |
| idescat_emex_girona | 200 | application/json | 41089 | https://api.idescat.cat/emex/v1/dades.json?id=170792 |
| idescat_codis_mun | 200 | text/csv | 33638 | https://www.idescat.cat/codis/?id=50&n=9&f=ssv |
| ine_operaciones | 200 | application/json | 243680 | https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES |
| ine_tablas_adrh | 200 | application/json | 169297 | https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/ADRH |
| ine_vut_39364 | 200 | application/json | 47697 | https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/39364?nult=1 |
| ine_series_30656 | 200 | application/json | 776146 | https://servicios.ine.es/wstempus/js/ES/SERIES_TABLA/30656?page=1 |
| ine_tabla_30656 | 200 | application/json | 41 | https://servicios.ine.es/wstempus/js/ES/TABLA/30656 |
| ine_jaxi_30656 | 200 | text/html | 43717 | https://www.ine.es/jaxiT3/Tabla.htm?t=30656 |
| ine_csv_30656 | 200 | text/plain | 3438507 | https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/30656.csv |
| ine_variables_adrh | 200 | application/json | 898 | https://servicios.ine.es/wstempus/js/ES/VARIABLES_OPERACION/ADRH |
| catastro_bu_atom | 200 | text/xml | 682565 | https://www.catastro.hacienda.gob.es/INSPIRE/buildings/ES.SDGC.BU.atom.xml |
| catastro_bu_atom_17 | 200 | text/xml | 385026 | https://www.catastro.hacienda.gob.es/INSPIRE/buildings/17/ES.SDGC.BU.atom_17.xml |
| catastro_bu_atom_alt | error | ConnectionError: HTTPConnectionPool(host='www.catastro.minhap.es', port=80): Max retries exceeded | | http://www.catastro.minhap.es/INSPIRE/buildings/ES.SDGC.bu.atom.xml |
| girona_ckan_paquetes | 200 | application/json | 1533 | https://www.girona.cat/opendata/api/3/action/package_list |
| xifra_menu_ini | 200 | text/html | 11954 | https://www.ddgi.cat/xifra/menu_ini.asp |
| xifra_menu_mun | 200 | text/html | 15566 | https://www.ddgi.cat/xifra/menu_mun.asp |
| xifra_poblacion | 200 | text/html | 80319 | https://www.ddgi.cat/xifra/demografia/dpt.asp?IdMenu=03020101 |
| xifra_ambits | 200 | text/html | 8660 | https://www.ddgi.cat/xifra/ambits.asp |
| xifra_novetats | 200 | text/html | 10066 | https://www.ddgi.cat/xifra/novetats.asp |
| mitma_trans_mun | 200 | application/vnd.ms-excel | 6356992 | https://apps.fomento.gob.es/BoletinOnline2/sedal/34010210.XLS |
| mitma_valor_medio_prov | 200 | application/vnd.ms-excel | 173056 | https://apps.fomento.gob.es/BoletinOnline2/sedal/34020150.XLS |
| mitma_suelo_10_50k | 200 | application/vnd.ms-excel | 374272 | https://apps.fomento.gob.es/BoletinOnline2/sedal/36402500.XLS |
| hacienda_conprel | 200 | text/html | 40865 | https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL |
| aeat_irpf_municipios | 404 | text/html | 4929 | https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpfmunicipios/2023/jrubik7fe28e5d4daeab97eaf47efe29f0716914ab405e.html |
| socrata_lloguer | 200 | application/json | 140064 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=lloguer&limit=30 |
| socrata_fiances | 200 | application/json | 14869 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=fiances&limit=30 |
| socrata_compravendes_habitatges | 200 | application/json | 129 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=compravendes+habitatges&limit=30 |
| socrata_habitatges_d_ús_turístic | 200 | application/json | 89674 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=habitatges+d%27%C3%BAs+tur%C3%ADstic&limit=30 |
| socrata_sol_licitants_habitatge_protecció_oficia | 200 | application/json | 277352 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=sol%C2%B7licitants+habitatge+protecci%C3%B3+oficial&limit=30 |
| socrata_atur_registrat_municipis | 200 | application/json | 130 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=atur+registrat+municipis&limit=30 |
| socrata_llistes_d_espera | 200 | application/json | 129 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=llistes+d%27espera&limit=30 |
| socrata_estacions_meteorològiques | 200 | application/json | 28325 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=estacions+meteorol%C3%B2giques&limit=30 |
| socrata_qualitat_de_l_aire | 200 | application/json | 114809 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=qualitat+de+l%27aire&limit=30 |
| socrata_residus_municipals | 200 | application/json | 55586 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=residus+municipals&limit=30 |
| socrata_consum_elèctric_municipis | 200 | application/json | 139827 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=consum+el%C3%A8ctric+municipis&limit=30 |
| socrata_centres_educatius | 200 | application/json | 208718 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=centres+educatius&limit=30 |
| socrata_fets_penals | 200 | application/json | 71161 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=fets+penals&limit=30 |
| socrata_renda_garantida | 200 | application/json | 31475 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=renda+garantida&limit=30 |
| socrata_establiments_turístics | 200 | application/json | 59022 | https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=establiments+tur%C3%ADstics&limit=30 |
