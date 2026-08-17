 // ---- TRANSICIÓN FLUIDA ENTRE PÁGINAS ----
document.body.classList.add('fade-in');
document.querySelectorAll('a.boton-enter').forEach(link => {
    link.addEventListener('click', (e) => {
        const destino = link.getAttribute('href');
        if (!destino || link.target === '_blank') return;
        e.preventDefault();
        document.body.classList.add('fade-out');
        setTimeout(() => { window.location.href = destino; }, 900);
    });
});

// Si la página vuelve a mostrarse (botón "atrás" del navegador, que en
// muchos casos la restaura desde el bfcache tal cual quedó, a mitad del
// fade-out) se resetea el estado para que no quede pegada invisible.
window.addEventListener('pageshow', () => {
    document.body.classList.remove('fade-out');
    document.body.classList.add('fade-in');
});

// ---- MENÚ HAMBURGUESA ----
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navLinks.classList.toggle('open');
    });
}

// ---- TABS (reutilizable para cualquier ventana win98 con pestañas) ----
function activarTabs(navEl) {
    const panel = navEl.nextElementSibling;
    const btns = navEl.querySelectorAll('.tab-btn');
    const contents = panel.querySelectorAll('.tab-content');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            const yaEstabaActivo = btn.classList.contains('active');
            btns.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            if (!yaEstabaActivo) {
                btn.classList.add('active');
                panel.querySelector('.tab-content[data-tab="' + tab + '"]').classList.add('active');
            }
        });
    });
}

// Activa las tabs de la ventana Nosotros/Envíos/Contacto (la del catálogo se activa aparte, dentro de renderCatalogo)
document.querySelectorAll('.tabs__nav').forEach(nav => {
    if (nav.id !== 'catalogoTabsNav') activarTabs(nav);
});

// ---- CARRITO ----
let carrito = [];

function actualizarCarrito() {
    const itemsContainer = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const contadorEl = document.getElementById('cartCount');
    const checkoutBtn = document.getElementById('cartCheckout');

    if (carrito.length === 0) {
        itemsContainer.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.</p>';
    } else {
        itemsContainer.innerHTML = carrito.map((item, i) => `
            <div class="carrito-item">
                <div class="carrito-item__info">
                    <span>${item.nombre}</span>
                    <span>$${(item.precio * item.cantidad).toLocaleString('es-CL')}</span>
                </div>
                <div class="carrito-item__controles">
                    <button class="carrito-item__btn" onclick="cambiarCantidad(${i}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="carrito-item__btn" onclick="cambiarCantidad(${i}, 1)">+</button>
                    <button class="carrito-item__quitar" onclick="quitarDelCarrito(${i})">×</button>
                </div>
            </div>
        `).join('');
    }

    const total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const cantidadTotal = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    totalEl.textContent = '$' + total.toLocaleString('es-CL');
    contadorEl.textContent = cantidadTotal;

    let mensaje = 'Hola! Quiero hacer este pedido:%0A%0A';
    carrito.forEach(item => {
        mensaje += `- ${item.nombre} x${item.cantidad}: $${(item.precio * item.cantidad).toLocaleString('es-CL')}%0A`;
    });
    mensaje += `%0ATotal: $${total.toLocaleString('es-CL')}`;
    checkoutBtn.href = `https://wa.me/56983525016?text=${mensaje}`;
}

function cambiarCantidad(index, delta) {
    carrito[index].cantidad += delta;
    if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
    actualizarCarrito();
}

function quitarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

const cartToggle = document.getElementById('cartToggle');
const cartPanel = document.getElementById('cartPanel');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');

if (cartToggle && cartPanel && cartOverlay && cartClose) {
    cartToggle.addEventListener('click', () => {
        cartPanel.classList.add('open');
        cartOverlay.classList.add('open');
    });
    cartClose.addEventListener('click', () => {
        cartPanel.classList.remove('open');
        cartOverlay.classList.remove('open');
    });
    cartOverlay.addEventListener('click', () => {
        cartPanel.classList.remove('open');
        cartOverlay.classList.remove('open');
    });
}

actualizarCarrito();

// ---- CATÁLOGO DINÁMICO DESDE GOOGLE SHEETS ----
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSMlZh_Wqy6rzeyf6CAdoBStSiSsL1q-jVGHkgxcxhGaHT0yS-F0-BZe_Ji43hAklcX7qF7MJSdEJ3f/pub?output=csv";

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function precioTexto(p) {
    const precios = [p.variante1_precio, p.variante2_precio, p.variante3_precio].filter(v => v);
    if (precios.length > 1) return "Desde $" + parseInt(precios[0]).toLocaleString('es-CL');
    return "$" + parseInt(precios[0] || 0).toLocaleString('es-CL');
}

function tarjetaHTML(p) {
    const sinStock = parseInt(p.stock) <= 0;
    return `
        <div class="product-card">
            ${p.nuevo === 'SI' ? '<span class="product-card__badge">Nuevo</span>' : ''}
            <img src="assets/img/${p.imagen}" alt="${p.nombre}" class="product-card__img">
            <h3 class="product-card__name">${p.nombre}</h3>
            <p class="product-card__price">${precioTexto(p)}</p>
            <button type="button" class="nav-btn product-card__btn ver-detalle-btn" ${sinStock ? 'disabled' : ''}>${sinStock ? 'Agotado' : 'Ver más'}</button>
        </div>`;
}

 function renderCatalogo(productos) {
    const nav = document.getElementById('catalogoTabsNav');
    const panel = document.getElementById('catalogoTabsPanel');

    const categoriasUnicas = [...new Set(productos.map(p => p.categoria).filter(c => c))];
    const categorias = [{ key: 'todos', label: 'Todos' }, ...categoriasUnicas.map(c => ({ key: c, label: capitalizar(c) }))];

    nav.innerHTML = categorias.map(c =>
        `<button class="tab-btn" data-tab="${c.key}">${c.label}</button>`
    ).join('');

    panel.innerHTML = categorias.map(c => {
        const items = c.key === 'todos' ? productos : productos.filter(p => p.categoria === c.key);
        const grid = items.map(tarjetaHTML).join('');
        return `<div class="tab-content" data-tab="${c.key}"><div class="tab-content__inner"><div class="catalog__grid">${grid}</div></div></div>`;
    }).join('');

    document.querySelectorAll('#catalogoTabsPanel .tab-content').forEach(tabDiv => {
        const cat = tabDiv.dataset.tab;
        const items = cat === 'todos' ? productos : productos.filter(p => p.categoria === cat);
        const botones = tabDiv.querySelectorAll('.ver-detalle-btn');
        botones.forEach((btn, i) => {
            if (btn.disabled) return;
            btn.addEventListener('click', () => abrirDetalleProducto(items[i]));
        });
    });

    activarTabs(nav);
}

Papa.parse(SHEET_CSV_URL, {
    download: true,
    header: true,
    complete: function(results) {
        const productos = results.data.filter(p => p.id);
        renderCatalogo(productos);
        renderDestacados(productos);
    },
    error: function(err) {
        console.error("Error cargando el catálogo:", err);
        document.getElementById('catalogoTabsPanel').innerHTML = '<p style="text-align:center; font-size:11px; color:#1c45a8;">No se pudo cargar el catálogo.</p>';
    }
});

// ---- DETALLE DE PRODUCTO ----
let productoActual = null;

function abrirDetalleProducto(producto) {
    productoActual = producto;
    document.getElementById('productoModalImg').src = 'assets/img/' + producto.imagen;
    document.getElementById('productoModalImg').alt = producto.nombre;
    document.getElementById('productoModalNombre').textContent = producto.nombre;
    document.getElementById('productoModalDescripcion').textContent = producto.descripcion;

    let badges = '';
    if (producto.nuevo === 'SI') badges += '<span class="badge-nuevo">Nuevo</span>';
    if (producto.destacado === 'SI') badges += '<span class="badge-destacado">Destacado</span>';
    document.getElementById('productoModalBadges').innerHTML = badges;

    const variantes = [];
    if (producto.variante1_nombre) variantes.push({ nombre: producto.variante1_nombre, precio: parseInt(producto.variante1_precio) });
    if (producto.variante2_nombre) variantes.push({ nombre: producto.variante2_nombre, precio: parseInt(producto.variante2_precio) });
    if (producto.variante3_nombre) variantes.push({ nombre: producto.variante3_nombre, precio: parseInt(producto.variante3_precio) });
    document.getElementById('productoModalVariantes').innerHTML = variantes.map((v, i) =>
        `<button type="button" class="opcion-btn variante-btn ${i === 0 ? 'active' : ''}" data-precio="${v.precio}">${v.nombre} - $${v.precio.toLocaleString('es-CL')}</button>`
    ).join('');

    const opcionesContainer = document.getElementById('productoModalOpciones');
    if (producto.opciones) {
        const lista = producto.opciones.split(',').map(o => o.trim());
        opcionesContainer.innerHTML = lista.map((o, i) =>
            `<button type="button" class="opcion-btn tipo-btn ${i === 0 ? 'active' : ''}">${o}</button>`
        ).join('');
    } else {
        opcionesContainer.innerHTML = '';
    }

  const personalizarWrap = document.getElementById('productoModalPersonalizar');
    const personalizarOpcionesWrap = document.getElementById('productoModalPersonalizarOpciones');
    const personalizarCheck = document.getElementById('personalizarCheck');
    personalizarCheck.checked = false;
    personalizarOpcionesWrap.innerHTML = '';

    if (producto.personalizable === 'SI' && producto.personalizacion2_costo) {
        personalizarWrap.style.display = 'none';
        const tier1Label = producto.personalizacion1_nombre || 'Personalizar';
        const opciones = [
            { nombre: 'Sin personalizar', costo: 0 },
            { nombre: tier1Label, costo: parseInt(producto.costo_personalizacion) || 0 },
            { nombre: producto.personalizacion2_nombre, costo: parseInt(producto.personalizacion2_costo) || 0 }
        ];
        personalizarOpcionesWrap.innerHTML = opciones.map((o, i) =>
            `<button type="button" class="opcion-btn personalizar-btn ${i === 0 ? 'active' : ''}" data-costo="${o.costo}">${o.nombre}${o.costo ? ' (+$' + o.costo.toLocaleString('es-CL') + ')' : ''}</button>`
        ).join('');
        personalizarOpcionesWrap.style.display = 'flex';
    } else if (producto.personalizable === 'SI') {
        personalizarOpcionesWrap.style.display = 'none';
        document.getElementById('personalizarTexto').textContent = `Personalizar (+$${parseInt(producto.costo_personalizacion).toLocaleString('es-CL')}) ${producto.nota_personalizacion || ''}`;
        personalizarWrap.style.display = 'flex';
    } else {
        personalizarWrap.style.display = 'none';
        personalizarOpcionesWrap.style.display = 'none';
    }
    const stockEl = document.getElementById('productoModalStock');
    const agregarBtn = document.getElementById('productoModalAgregar');
    if (parseInt(producto.stock) <= 0) {
        stockEl.textContent = 'Agotado';
        stockEl.classList.add('sin-stock');
        agregarBtn.disabled = true;
    } else {
        stockEl.textContent = '';
        stockEl.classList.remove('sin-stock');
        agregarBtn.disabled = false;
    }

    actualizarPrecioModal();
    document.getElementById('productoOverlay').classList.add('open');
    document.getElementById('productoModal').classList.add('open');
}

function actualizarPrecioModal() {
    const varianteActiva = document.querySelector('.variante-btn.active');
    let precio = varianteActiva ? parseInt(varianteActiva.dataset.precio) : 0;

    const personalizarBtnActivo = document.querySelector('.personalizar-btn.active');
    if (personalizarBtnActivo) {
        precio += parseInt(personalizarBtnActivo.dataset.costo) || 0;
    } else if (document.getElementById('personalizarCheck').checked) {
        precio += parseInt(productoActual.costo_personalizacion) || 0;
    }
    document.getElementById('productoModalPrecioFinal').textContent = '$' + precio.toLocaleString('es-CL');
}
document.getElementById('productoModalVariantes').addEventListener('click', (e) => {
    if (!e.target.classList.contains('variante-btn')) return;
    document.querySelectorAll('.variante-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    actualizarPrecioModal();
});
document.getElementById('productoModalOpciones').addEventListener('click', (e) => {
    if (!e.target.classList.contains('tipo-btn')) return;
    document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
});
document.getElementById('personalizarCheck').addEventListener('change', actualizarPrecioModal);
 document.getElementById('productoModalPersonalizarOpciones').addEventListener('click', (e) => {
    if (!e.target.classList.contains('personalizar-btn')) return;
    document.querySelectorAll('.personalizar-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    actualizarPrecioModal();
});
 document.getElementById('productoModalAgregar').addEventListener('click', () => {
    const varianteActiva = document.querySelector('.variante-btn.active');
    const tipoActivo = document.querySelector('.tipo-btn.active');
    const personalizarBtnActivo = document.querySelector('.personalizar-btn.active');
    let nombreFinal = productoActual.nombre;
    if (varianteActiva) nombreFinal += ' (' + varianteActiva.textContent.split(' - ')[0] + ')';
    if (tipoActivo) nombreFinal += ' - ' + tipoActivo.textContent;

    let precio = varianteActiva ? parseInt(varianteActiva.dataset.precio) : 0;

    if (personalizarBtnActivo && parseInt(personalizarBtnActivo.dataset.costo) > 0) {
        nombreFinal += ' [' + personalizarBtnActivo.textContent.split(' (+')[0] + ']';
        precio += parseInt(personalizarBtnActivo.dataset.costo);
    } else if (document.getElementById('personalizarCheck').checked) {
        nombreFinal += ' [Personalizado]';
        precio += parseInt(productoActual.costo_personalizacion) || 0;
    }

    const existente = carrito.find(item => item.nombre === nombreFinal);
    if (existente) { existente.cantidad++; } else { carrito.push({ nombre: nombreFinal, precio, cantidad: 1 }); }
    actualizarCarrito();
    cerrarModalProducto();
});
function cerrarModalProducto() {
    document.getElementById('productoOverlay').classList.remove('open');
    document.getElementById('productoModal').classList.remove('open');
}
document.getElementById('productoModalClose').addEventListener('click', cerrarModalProducto);
document.getElementById('productoOverlay').addEventListener('click', cerrarModalProducto);
 // ---- DESTACADOS (estilo Windows Media Player) ----
let destacadosList = [];
let destacadoIndex = 0;
let destacadoTimer = null;
let destacadoPlaying = true;
const DESTACADO_DURACION = 4000;

function mostrarDestacado(i) {
    const screen = document.getElementById('destacadoScreen');
    const fill = document.getElementById('destacadoProgress');
    if (destacadosList.length === 0) {
        screen.innerHTML = '<p class="wmp-screen__vacio">Sin destacados por ahora.</p>';
        fill.style.width = '0%';
        return;
    }
    const p = destacadosList[i];
    screen.innerHTML = `
        <img src="assets/img/${p.imagen}" alt="${p.nombre}" class="wmp-screen__img">
        <h3 class="wmp-screen__nombre">${p.nombre}</h3>
        <p class="wmp-screen__precio">${precioTexto(p)}</p>
    `;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => {
        fill.style.transition = `width ${DESTACADO_DURACION}ms linear`;
        fill.style.width = '100%';
    });
}

function siguienteDestacado() {
    if (destacadosList.length === 0) return;
    destacadoIndex = (destacadoIndex + 1) % destacadosList.length;
    mostrarDestacado(destacadoIndex);
}

function anteriorDestacado() {
    if (destacadosList.length === 0) return;
    destacadoIndex = (destacadoIndex - 1 + destacadosList.length) % destacadosList.length;
    mostrarDestacado(destacadoIndex);
}

function iniciarAutoplayDestacados() {
    clearInterval(destacadoTimer);
    if (!destacadoPlaying || destacadosList.length <= 1) return;
    destacadoTimer = setInterval(siguienteDestacado, DESTACADO_DURACION);
}

function renderDestacados(productos) {
    destacadosList = productos.filter(p => p.destacado === 'SI');
    destacadoIndex = 0;
    mostrarDestacado(destacadoIndex);
    iniciarAutoplayDestacados();
}

document.getElementById('destacadoPrev').addEventListener('click', () => {
    anteriorDestacado();
    iniciarAutoplayDestacados();
});
document.getElementById('destacadoNext').addEventListener('click', () => {
    siguienteDestacado();
    iniciarAutoplayDestacados();
});
document.getElementById('destacadoPlayPause').addEventListener('click', (e) => {
    destacadoPlaying = !destacadoPlaying;
    e.target.textContent = destacadoPlaying ? '❚❚' : '▶';
    iniciarAutoplayDestacados();
});
document.getElementById('destacadoScreen').addEventListener('click', () => {
    if (destacadosList.length > 0) abrirDetalleProducto(destacadosList[destacadoIndex]);
});