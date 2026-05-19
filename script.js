const token = localStorage.getItem("token");

if(!token){
    location = "login.html";
}

/* =========================
   DOM
========================= */
const nombreInput = document.getElementById("nombre");
const precioInput = document.getElementById("precio");
const stockInput = document.getElementById("stock");
const buscar = document.getElementById("buscar");

const tabla = document.getElementById("tabla");
const tablaVentas = document.getElementById("tablaVentas");

const total = document.getElementById("total");
const bajos = document.getElementById("bajos");
const ventas = document.getElementById("ventas");

const miGrafica = document.getElementById("miGrafica");
const graficaVentasCanvas = document.getElementById("graficaVentas");

/* =========================
   VARIABLES
========================= */
let datos = [];
let editando = false;
let idEditar = null;
let grafica = null;
let graficaVentas = null;

/* =========================
   NAVEGACIÓN
========================= */
function mostrar(e, id){

    document.querySelectorAll(".vista").forEach(v=>{
        v.style.display = "none";
    });

    document.getElementById(id).style.display = "block";

    document.querySelectorAll(".sidebar li").forEach(li=>{
        li.classList.remove("active");
    });

    if(e && e.target){
        e.target.classList.add("active");
    }

    if(id === "dashboard"){
        setTimeout(()=>{
            if(datos.length){
                crearGrafica(datos);
                crearGraficaVentas();
            }
        },100);
    }

    if(id === "facturas"){
        cargarFacturas();
    }
}

/* =========================
   TOAST
========================= */
function toast(msg){
    const t = document.createElement("div");
    t.className = "toast";
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2000);
}

/* =========================
   API
========================= */
async function api(url, options={}){
    try{
        const res = await fetch(url,{
            ...options,
            headers:{
                "Content-Type":"application/json",
                Authorization: "Bearer " + token
            }
        });

        if(res.status === 403){
            toast("No autorizado");
            return null;
        }

        if(!res.ok){
            console.log(await res.text());
            toast("Error servidor");
            return null;
        }

        const text = await res.text();

        try{
            return JSON.parse(text);
        }catch{
            return text;
        }

    }catch(e){
        console.log(e);
        toast("Error de conexión");
        return null;
    }
}

/* =========================
   DASHBOARD
========================= */
async function cargarDashboard(){
    const d = await api("http://localhost:3000/dashboard");
    if(!d) return;

    total.innerText = d.total || 0;
    bajos.innerText = d.bajos || 0;
    ventas.innerText = "$" + Number(d.ventas || 0).toLocaleString();
}

/* =========================
   CARGAR
========================= */
async function cargar(){

    const data = await api("http://localhost:3000/productos");
    if(!data) return;

    datos = data;

    render(datos);
    cargarDashboard();
    crearGrafica(datos);
    crearGraficaVentas();
    cargarVentas();
}

/* =========================
   TABLA
========================= */
function render(lista){

    if(!tabla) return;

    tabla.innerHTML = "";

    if(lista.length === 0){
        tabla.innerHTML = `
        <tr>
            <td colspan="5">📦 No hay productos</td>
        </tr>`;
        return;
    }

    lista.forEach(p=>{
        tabla.innerHTML += `
        <tr class="${p.stock < 5 ? 'low' : ''}">
            <td>${p.id}</td>
            <td>${p.nombre}</td>
            <td>$${Number(p.precio).toLocaleString()}</td>
            <td>${p.stock}</td>
            <td>
                <button onclick="editar(${p.id},'${p.nombre.replace(/'/g,"\\'")}',${p.precio},${p.stock})">✏️</button>
                <button onclick="vender(${p.id},${p.precio},${p.stock})">💰</button>
                <button onclick="eliminar(${p.id})">🗑️</button>
            </td>
        </tr>`;
    });
}

/* =========================
   GRAFICAS
========================= */
function crearGrafica(data){

    if(!miGrafica) return;

    const critico = data.filter(p => p.stock <= 2).length;
    const bajo = data.filter(p => p.stock > 2 && p.stock < 5).length;
    const normal = data.filter(p => p.stock >= 5).length;

    if(grafica) grafica.destroy();

    grafica = new Chart(miGrafica,{
        type:'doughnut',
        data:{
            labels:['Normal','Bajo','Crítico'],
            datasets:[{
                data:[normal, bajo, critico],
                backgroundColor:["#22c55e","#facc15","#ef4444"]
            }]
        }
    });
}

async function crearGraficaVentas(){

    const data = await api("http://localhost:3000/ventas/grafica");
    if(!data) return;

    if(graficaVentas) graficaVentas.destroy();

    graficaVentas = new Chart(graficaVentasCanvas,{
        type:'line',
        data:{
            labels:data.map(d=>d.dia),
            datasets:[{
                label:"Ventas",
                data:data.map(d=>d.total),
                borderColor:"#22c55e"
            }]
        }
    });
}

/* =========================
   HISTORIAL
========================= */
async function cargarVentas(){

    const data = await api("http://localhost:3000/ventas");
    if(!data) return;

    tablaVentas.innerHTML = "";

    data.forEach(v=>{
        tablaVentas.innerHTML += `
        <tr>
            <td>${v.id}</td>
            <td>${v.nombre}</td>
            <td>${v.cantidad}</td>
            <td>$${Number(v.total).toLocaleString()}</td>
            <td>${new Date(v.fecha).toLocaleString("es-CO")}</td>
        </tr>`;
    });
}

/* =========================
   FACTURAS
========================= */
async function cargarFacturas(){

    const data = await api("http://localhost:3000/facturas");

    const tablaF = document.getElementById("tablaFacturas");
    if(!tablaF) return;

    tablaF.innerHTML = "";

    if(!data || data.length === 0){
        tablaF.innerHTML = `
        <tr>
            <td colspan="4">No hay facturas</td>
        </tr>`;
        return;
    }

    data.forEach(f=>{
        tablaF.innerHTML += `
        <tr>
            <td>${f.id}</td>
            <td>${f.nombre || "Sin cliente"}</td>
            <td>${new Date(f.fecha).toLocaleString()}</td>
            <td>
                <button onclick="verFactura(${f.id})">👁 Ver</button>
            </td>
        </tr>`;
    });
}

async function verFactura(id){

    const data = await api(`http://localhost:3000/factura/${id}`);
    if(!data) return;

    let html = `
    <h3>Factura #${data.factura.id}</h3>
    <p>Cliente: ${data.factura.nombre}</p>

    <table>
        <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio</th>
        </tr>
    `;

    let total = 0;

    data.detalle.forEach(p=>{
        total += p.cantidad * p.precio;

        html += `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.cantidad}</td>
            <td>$${p.precio}</td>
        </tr>`;
    });

    html += `
        <tr>
            <td colspan="2"><b>Total</b></td>
            <td><b>$${total}</b></td>
        </tr>
    </table>
    `;

    document.getElementById("tablaFacturas").innerHTML = `
        <tr>
            <td colspan="4">${html}</td>
        </tr>`;
}

/* =========================
   CRUD
========================= */
function editar(id,n,p,s){
    nombreInput.value=n;
    precioInput.value=p;
    stockInput.value=s;
    editando=true;
    idEditar=id;
}

async function guardar(){

    const nombre = nombreInput.value.trim();
    const precio = Number(precioInput.value);
    const stock = Number(stockInput.value);

    if(!nombre || precio <= 0){
        toast("Datos inválidos");
        return;
    }

    if(editando){
        await api(`http://localhost:3000/productos/${idEditar}`,{
            method:"PUT",
            body: JSON.stringify({nombre,precio,stock})
        });
        editando=false;
    }else{
        await api("http://localhost:3000/productos",{
            method:"POST",
            body: JSON.stringify({nombre,precio,stock})
        });
    }

    limpiar();
    cargar();
}

async function eliminar(id){

    if(!confirm("¿Eliminar producto?")) return;

    const res = await api(`http://localhost:3000/productos/${id}`,{
        method:"DELETE"
    });

    if(!res){
        toast("No se pudo eliminar");
        return;
    }

    datos = datos.filter(p => p.id !== id);
    render(datos);
    crearGrafica(datos);
    cargarDashboard();

    toast("Eliminado correctamente");
}

async function vender(id,precio,stock){

    let cantidad = Number(prompt("Cantidad:"));

    if(!cantidad || cantidad <= 0){
        toast("Cantidad inválida");
        return;
    }

    if(cantidad > stock){
        toast("No hay suficiente stock");
        return;
    }

    await api("http://localhost:3000/ventas",{
        method:"POST",
        body: JSON.stringify({producto_id:id,cantidad,precio})
    });

    toast("Venta registrada");
    cargar();
}

/* =========================
   FACTURA CREAR
========================= */
async function crearFactura(){

    const data = await api("http://localhost:3000/productos");

    if(!data || data.length === 0){
        toast("No hay productos");
        return;
    }

    datos = data;

    const cliente = prompt("Nombre del cliente:");
    if(!cliente) return;

    let productos = [];

    for(const p of datos){

        let cantidad = Number(prompt(`Ingresa la cantidad de ${p.nombre}:`));

        if(cantidad > 0){
            productos.push({
                id:p.id,
                cantidad,
                precio:p.precio
            });
        }
    }

    if(productos.length === 0){
        toast("Sin productos");
        return;
    }

    await api("http://localhost:3000/factura",{
        method:"POST",
        body: JSON.stringify({cliente, productos})
    });

    toast("Factura creada");
    cargar();
}

/* =========================
   UTIL
========================= */
function limpiar(){
    nombreInput.value="";
    precioInput.value="";
    stockInput.value="";
}

function filtrar(){
    const t = buscar.value.toLowerCase();
    render(datos.filter(p=>p.nombre.toLowerCase().includes(t)));
}

function logout(){
    localStorage.clear();
    location="login.html";
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded",()=>{
    cargar();
});

/* =========================
   CHATBOT
========================= */
function toggleChat(){

    const chat = document.getElementById("chatbot");
    const box = document.getElementById("chat-box");

    const estaOculto = chat.style.display === "" || chat.style.display === "none";

    if(estaOculto){
        chat.style.display = "flex";

        if(!box.innerHTML.includes("Hola")){
            agregarMensaje("🤖 Hola 👋 Soy tu asistente virtual.", "bot");
        }

    }else{
        chat.style.display = "none";
    }
}

function enviarChat(){

    const input = document.getElementById("chat-input");
    const msg = input.value.trim();

    if(!msg) return;

    // 👤 usuario
    agregarMensaje("🧑 " + msg, "user");

    input.value = "";

    responderBot(msg.toLowerCase()).then(res=>{
        if(res){
            // 🤖 bot
            agregarMensaje(" " + res, "bot");
        }
    });
}

function agregarMensaje(texto, tipo = "bot"){
    const box = document.getElementById("chat-box");
    box.innerHTML += `<div class="${tipo}">${texto}</div>`;
    box.scrollTop = box.scrollHeight;
}

async function responderBot(msg){

    // 👋 RESPUESTA AL HOLA
    if(msg.includes("hola")){
        return "¿Quieres ver productos 📦 o ventas 💰?";
    }

    // 📦 PRODUCTOS
    if(msg.includes("productos")){
        const data = await api("http://localhost:3000/productos");

        if(!data || data.length === 0){
            return "📦 No hay productos";
        }

        return data.map(p=>p.nombre).join(", ");
    }

    // 💰 VENTAS
    if(msg.includes("ventas")){
        const data = await api("http://localhost:3000/ventas");

        if(!data || data.length === 0){
            return "💰 No hay ventas registradas";
        }

        const total = data.reduce((s,v)=>s + Number(v.total || 0), 0);

        return "💰 Ventas: $" + total.toLocaleString("es-CO");
    }

    return "Puedes preguntarme por productos 📦 o ventas 💰";
}

/* =========================
   ENTER PARA ENVIAR
========================= */
document.addEventListener("DOMContentLoaded",()=>{

    const input = document.getElementById("chat-input");

    if(input){
        input.addEventListener("keydown", function(e){
            if(e.key === "Enter"){
                e.preventDefault();
                enviarChat();
            }
        });
    }

});

/* =========================
   GLOBAL
========================= */
window.mostrar = mostrar;
window.guardar = guardar;
window.editar = editar;
window.vender = vender;
window.eliminar = eliminar;
window.crearFactura = crearFactura;
window.verFactura = verFactura;
window.logout = logout;