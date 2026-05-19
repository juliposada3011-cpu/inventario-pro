function registrar(){

    const usuario = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value.trim();
    const confirm = document.getElementById("confirm").value.trim();
    const msg = document.getElementById("msg");
    const btn = document.querySelector("button");

    msg.innerText = "";

    // VALIDACIONES
    if(!usuario || !password || !confirm){
        msg.innerText = "⚠️ Completa todos los campos";
        msg.style.color = "orange";
        return;
    }

    if(password !== confirm){
        msg.innerText = "❌ Las contraseñas no coinciden";
        msg.style.color = "red";
        return;
    }

    if(password.length < 4){
        msg.innerText = "⚠️ Mínimo 4 caracteres";
        msg.style.color = "orange";
        return;
    }

    // BLOQUEAR BOTÓN
    btn.innerText = "Creando cuenta...";
    btn.disabled = true;

    fetch("http://localhost:3000/registro",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({usuario,password})
    })
    .then(res => {
        if(!res.ok) throw new Error("Error del servidor");
        return res.text();
    })
    .then(data=>{
        msg.innerText = data;

        if(data.toLowerCase().includes("creado")){
            msg.style.color = "lightgreen";

            // transición elegante
            document.body.style.transition = "0.4s";
            document.body.style.opacity = "0";

            setTimeout(()=>{
                window.location = "login.html";
            },800);

        }else{
            msg.style.color = "red";
        }
    })
    .catch(err=>{
        console.error(err);
        msg.innerText = "❌ Error en el servidor";
        msg.style.color = "red";
    })
    .finally(()=>{
        btn.innerText = "Registrarse";
        btn.disabled = false;
    });
}

/* VALIDACIÓN EN VIVO MEJORADA */
document.getElementById("confirm").addEventListener("input", ()=>{
    const pass = document.getElementById("pass").value;
    const confirm = document.getElementById("confirm").value;
    const msg = document.getElementById("msg");

    if(!confirm){
        msg.innerText = "";
        return;
    }

    if(pass === confirm){
        msg.innerText = "✅ Las contraseñas coinciden";
        msg.style.color = "lightgreen";
    }else{
        msg.innerText = "❌ No coinciden";
        msg.style.color = "red";
    }
});

/* MOSTRAR CONTRASEÑA */
function togglePass(id){
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
}

/* TRANSICIÓN LOGIN */
function irLogin(){
    document.body.style.transition = "0.3s";
    document.body.style.opacity = "0";

    setTimeout(()=>{
        window.location = "login.html";
    },300);
}