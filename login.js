function login(){

    const usuario = document.getElementById("user").value;
    const password = document.getElementById("pass").value;
    const msg = document.getElementById("msg");
    const btn = document.querySelector("button");

    if(!usuario || !password){
        msg.innerText = "⚠️ Completa los campos";
        msg.style.color = "orange";
        return;
    }

    btn.innerText = "Entrando...";
    btn.disabled = true;

    fetch("http://localhost:3000/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({usuario,password})
    })
    .then(res=>res.json())
    .then(data=>{
        localStorage.setItem("token",data.token);

        msg.innerText = "✅ Bienvenido";
        msg.style.color = "lightgreen";

        setTimeout(()=>{
            window.location = "index.html";
        },800);
    })
    .catch(()=>{
        msg.innerText = "❌ Error en login";
        msg.style.color = "red";
    })
    .finally(()=>{
        btn.innerText = "Entrar";
        btn.disabled = false;
    });
}

function togglePass(id){
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
}