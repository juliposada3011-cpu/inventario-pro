const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const SECRET = "123456";

const db = mysql.createConnection({
  host:"localhost",
  user:"root",
  password:"",
  database:"inventario"
});

db.connect(err=>{
  if(err) console.log(err);
  else console.log("MySQL conectado");
});

/* =========================
   REGISTRO
========================= */
app.post("/registro", async (req,res)=>{
  const {usuario,password} = req.body;

  if(!usuario || !password){
    return res.send("⚠️ Datos incompletos");
  }

  db.query("SELECT * FROM usuarios WHERE usuario=?",[usuario], async (err,result)=>{
    if(result.length > 0){
      return res.send("⚠️ El usuario ya existe");
    }

    const hash = await bcrypt.hash(password,10);

    db.query(
      "INSERT INTO usuarios (usuario,password,rol) VALUES (?,?,?)",
      [usuario,hash,"admin"],
      (err)=>{
        if(err) return res.send("❌ Error al registrar");
        res.send("Usuario creado");
      }
    );
  });
});

/* =========================
   LOGIN
========================= */
app.post("/login",(req,res)=>{
  const {usuario,password} = req.body;

  db.query("SELECT * FROM usuarios WHERE usuario=?",[usuario], async (err,result)=>{
    if(err) return res.sendStatus(500);

    if(result.length>0){
      const valid = await bcrypt.compare(password,result[0].password);
      if(valid){
        const token = jwt.sign({rol:result[0].rol}, SECRET);
        res.send({token, rol:result[0].rol});
      }else res.sendStatus(401);
    }else res.sendStatus(404);
  });
});

/* =========================
   AUTH
========================= */
function auth(req,res,next){

  const authHeader = req.headers["authorization"];
  if(!authHeader) return res.sendStatus(403);

  const token = authHeader.split(" ")[1];
  if(!token) return res.sendStatus(403);

  jwt.verify(token, SECRET,(err,decoded)=>{
    if(err) return res.sendStatus(401);
    req.user = decoded;
    next();
  });
}

/* =========================
   DASHBOARD
========================= */
app.get("/dashboard", auth, (req,res)=>{
  db.query("SELECT COUNT(*) total FROM productos",(e,t)=>{
    db.query("SELECT COUNT(*) bajos FROM productos WHERE stock < 5",(e2,b)=>{
      db.query("SELECT SUM(total) ventas FROM ventas",(e3,v)=>{
        res.send({
          total: t[0].total,
          bajos: b[0].bajos,
          ventas: v[0].ventas || 0
        });
      });
    });
  });
});

/* =========================
   PRODUCTOS
========================= */
app.get("/productos",auth,(req,res)=>{
  db.query("SELECT * FROM productos",(e,r)=>res.send(r));
});

app.post("/productos",auth,(req,res)=>{
  const {nombre,precio,stock} = req.body;

  db.query(
    "INSERT INTO productos (nombre,precio,stock) VALUES (?,?,?)",
    [nombre,precio,stock],
    ()=>res.send("ok")
  );
});

app.put("/productos/:id", auth, (req,res)=>{
  const { id } = req.params;
  const { nombre, precio, stock } = req.body;

  db.query(
    "UPDATE productos SET nombre=?, precio=?, stock=? WHERE id=?",
    [nombre,precio,stock,id],
    ()=>res.send("ok")
  );
});

/* =========================
   ELIMINAR
========================= */
app.delete("/productos/:id", auth, (req,res)=>{

  const id = req.params.id;

  db.query("DELETE FROM detalle_factura WHERE producto_id=?", [id], ()=>{
    db.query("DELETE FROM ventas WHERE producto_id=?", [id], ()=>{
      db.query("DELETE FROM productos WHERE id=?", [id], ()=>{
        res.send("ok");
      });
    });
  });
});

/* =========================
   VENTAS
========================= */
app.post("/ventas", auth, (req,res)=>{
  const {producto_id, cantidad, precio} = req.body;
  const total = cantidad * precio;

  db.query(
    "INSERT INTO ventas (producto_id, cantidad, total) VALUES (?,?,?)",
    [producto_id, cantidad, total],
    ()=>{
      db.query(
        "UPDATE productos SET stock = stock - ? WHERE id=?",
        [cantidad, producto_id]
      );
      res.send("ok");
    }
  );
});

app.get("/ventas", auth, (req,res)=>{
  db.query(`
    SELECT v.*, p.nombre 
    FROM ventas v
    JOIN productos p ON v.producto_id = p.id
    ORDER BY v.fecha DESC
  `,(err,result)=>{
    res.send(result);
  });
});

app.get("/ventas/grafica", auth, (req,res)=>{
  db.query(`
    SELECT DATE(fecha) as dia, SUM(total) as total
    FROM ventas
    GROUP BY dia
    ORDER BY dia
  `,(err,result)=>{
    res.send(result);
  });
});

/* =========================
   FACTURAS (🔥 CORREGIDO)
========================= */
app.post("/factura", auth, (req,res)=>{

  const {cliente, productos} = req.body;

  db.query("INSERT INTO clientes (nombre) VALUES (?)",[cliente],(err,result)=>{

    if(err) return res.status(500).send("Error cliente");

    const clienteId = result.insertId;

    db.query("INSERT INTO facturas (cliente_id) VALUES (?)",[clienteId],(err2,result2)=>{

      if(err2) return res.status(500).send("Error factura");

      const facturaId = result2.insertId;

      let pendientes = productos.length;

      if(pendientes === 0){
        return res.send("Factura creada");
      }

      productos.forEach(p=>{

        db.query(
          "INSERT INTO detalle_factura (factura_id, producto_id, cantidad, precio) VALUES (?,?,?,?)",
          [facturaId, p.id, p.cantidad, p.precio],
          (err3)=>{

            if(err3) console.log(err3);

            db.query(
              "UPDATE productos SET stock = stock - ? WHERE id=?",
              [p.cantidad, p.id]
            );

            pendientes--;

            if(pendientes === 0){
              res.send("Factura creada");
            }
          }
        );

      });

    });

  });
});

/* =========================
   LISTAR FACTURAS
========================= */
app.get("/facturas", auth, (req,res)=>{
  db.query(`
    SELECT f.id, c.nombre, f.fecha
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    ORDER BY f.id DESC
  `,(err,result)=>{
    res.send(result);
  });
});

/* =========================
   DETALLE FACTURA
========================= */
app.get("/factura/:id", auth, (req,res)=>{

  const id = req.params.id;

  db.query(`
    SELECT f.id, c.nombre, f.fecha
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    WHERE f.id=?
  `,[id],(err,factura)=>{

    db.query(`
      SELECT p.nombre, d.cantidad, d.precio
      FROM detalle_factura d
      LEFT JOIN productos p ON d.producto_id = p.id
      WHERE d.factura_id=?
    `,[id],(err2,detalle)=>{

      res.send({
        factura: factura[0],
        detalle
      });
    });
  });
});

/* =========================
   SERVIDOR
========================= */
app.listen(3000,()=>console.log("🚀 Servidor en http://localhost:3000"));