// función javascript que añade a los enlaces que tengan un target="_blank" y extensión PDF un mensaje en el title y un icono
// ---------------------------------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
  // Seleccionamos todos los enlaces con target="_blank"
  const enlaces = document.querySelectorAll("a[target='_blank']");

  enlaces.forEach(enlace => {
    // Configuramos el title según si es PDF o no
    if (enlace.href.toLowerCase().endsWith(".pdf")) {
      enlace.setAttribute("title", "Abre en ventana nueva; Documento en formato PDF;");
    } else {
      enlace.setAttribute("title", "Abre en ventana nueva");
    }

    // Verificamos si el enlace tiene la clase "no-icono"
    const tieneNoIcono = enlace.classList.contains("no-icono");

    // Verificamos si el enlace contiene solo una imagen
    const hijos = enlace.childNodes;
    const soloImagen = (
      hijos.length === 1 &&
      hijos[0].tagName === "IMG"
    );

    // Añadimos el icono solo si:
    // - NO tiene la clase "no-icono"
    // - NO es solo una imagen
    if (!tieneNoIcono && !soloImagen) {
      const icono = document.createElement("i");
      icono.className = "bi bi-box-arrow-up-right ms-1";
      enlace.appendChild(icono); // ahora el icono queda dentro del enlace
    }
  });
});



// función javascript que añade a los enlaces que tengan un extensión ZIP un mensaje en el title y un icono
// ---------------------------------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
  // Seleccionamos todos los enlaces que terminan en .zip
  const enlaces = document.querySelectorAll("a[href$='.zip']");

  enlaces.forEach(enlace => {
    // Añadimos el title al enlace
    enlace.setAttribute("title", "Archivo en formato ZIP");

    // Creamos el icono
    const icono = document.createElement("i");
    icono.className = "bi bi-file-zip";

    // Añadimos un margen izquierdo de 4px para separar del texto
    icono.style.marginLeft = "4px";

    // Insertamos el icono justo después del enlace
    enlace.insertAdjacentElement("afterend", icono);
  });
});




// FUNCION QUE ABRE UNA PÁGINA Y ACORDEÓN POR UN ELEMENTO CONCRETO QUE LE PASAMOS POR URL
// --------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function() {
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get("var"); // ej: "collapse_1_2"

  if (targetId) {
    const collapseEl = document.getElementById(targetId);
    if (collapseEl) {
      // Abrir el collapse
      new bootstrap.Collapse(collapseEl, { toggle: true });

      // Buscar la cabecera asociada
      const headingId = collapseEl.getAttribute("aria-labelledby");
      const headerBtn = document.querySelector(`#${headingId} .accordion-button`);
      if (headerBtn) {
        // Poner el foco
        headerBtn.focus();
        // Hacer scroll suave hasta la cabecera
        headerBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
});


document.addEventListener("DOMContentLoaded", function () {

    // Permitir que el click vaya al href
    document.querySelectorAll('.nav-item.dropdown > a').forEach(link => {
        link.addEventListener('click', function () {
            window.location = this.getAttribute('href');
        });
    });

    // Hover con delay al cerrar
    document.querySelectorAll('.nav-item.dropdown').forEach(item => {

        let timeout;

        item.addEventListener('mouseenter', function () {
            clearTimeout(timeout); // Evita que se cierre si vuelves rápido
            this.classList.add('show');
            this.querySelector('.dropdown-menu').classList.add('show');
        });

        item.addEventListener('mouseleave', function () {
            const dropdown = this;
            timeout = setTimeout(() => {
                dropdown.classList.remove('show');
                dropdown.querySelector('.dropdown-menu').classList.remove('show');
            }, 150); // Ajusta el delay aquí (200ms recomendado)
        });

    });

});

