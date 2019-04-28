//SQL Server
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: "konfio-hackmx.c7dhdhum783t.us-east-2.rds.amazonaws.com",
    user: "mota",
    password: "Javieruchiha1$",
    database: "konfio_db",
});

//Main handler
exports.handler = async (event) => {
    //JSON DEL POST
    return sendRes(200,JSON.parse(event.body));
};

//Calcular calificación del préstamo
const calcularCalificacion = (cantidad, plazo, ingreso,puntosSAT, puntosBuro) =>
{

  var caliBuro = 'D', caliSAT = 'D', caliIngreso = 'D';

  //Obtener calificación del buró
  switch (true) {
    case puntosBuro >=72:
      caliBuro = 'A';
      break;
    case puntosBuro >=63:
      caliBuro = 'B';
      break;
    case puntosBuro >=45:
      caliBuro = 'C';
      break;
  }

  //Obtener calificación SAT
  switch (true) {
    case puntosSAT>=85:
      caliSAT = 'A'
      break;
    case puntosSAT>60:
      caliSAT = 'B'
      break;
    case puntosSAT>=45:
      caliSAT = 'C'
      break;
  }

  //Obtener calificación Ingresos
  switch (true) {
    case cantidad*0.083 < ingreso:
      caliIngreso = 'A'
      break;
    case cantidad*0.041 < ingreso:
      caliIngreso = 'B'
      break;
    case cantidad*0.021 < ingreso:
      caliIngreso = 'C'
      break;
  }

  //Calificación conjunta SAT Ingreso
  var caliSATIngreso = ((caliIngreso<caliSAT)? caliIngreso : caliSAT);
  //Calificación final
  var cali = ((caliBuro < caliSATIngreso)? String.fromCharCode(caliSATIngreso.charCodeAt(0)-1): caliBuro);

  //Todas las calificaciones calculadas, caso especial: BURO = D SATINGRESO = A => C
  var calificaciones = {
    SAT: caliSAT,
    BURO: caliBuro,
    INGRESO: caliIngreso,
    FINAL: ((caliBuro == 'D' && caliSATIngreso == 'A')?'C': cali)
  };


  return calificaciones;

};

//Obtener las opciones de pago
const getOpciones= (cantidad, plazo, cali) =>
{
  var opciones;
  var ia = 0.25, ib = 0.29, ic = 0.35;
  switch (cali) {
    case 'A':
      if(plazo != 12 && plazo !=6)
      {
         opciones =[
        {
          nombre: "6 meses",
          total: (cantidad*(1+ ia/12*6)).toFixed(2),
          mensualidad: (cantidad*(1+ ia/12*6)/6).toFixed(2),
          plazo: 6
        },
        {
          nombre: "12 meses",
          total: (cantidad*(1+ia)).toFixed(2),
          mensualidad: (cantidad*(1+ia)/12).toFixed(2),
          plazo: 12
        },
        {
          nombre: plazo+" meses",
          total: (cantidad*(1+ia/12*plazo)).toFixed(2),
          mensualidad: (cantidad*(1+ia/12*plazo)/plazo).toFixed(2),
          plazo: plazo
        }
        ]
      }else
      {
        opciones =[
        {
          nombre: "6 meses",
          total: (cantidad*(1+ ia/12*6)).toFixed(2),
          mensualidad: (cantidad*(1+ ia/12*6)/6).toFixed(2),
          plazo: 6
        },
        {
          nombre: "12 meses",
          total: (cantidad*(1+ia)).toFixed(2),
          mensualidad: (cantidad*(1+ia)/12).toFixed(2),
          plazo: 12
        }
        ]
      }
      break;
    case 'B':
      if(plazo == 12)
      {
         opciones =[
        {
          nombre: "12 meses",
          total: (cantidad*(1+ib)).toFixed(2),
          mensualidad: (cantidad*(1+ib)/12).toFixed(2),
          plazo: 12
        }
        ]
      }else
      {
        opciones =[
        {
          nombre: "12 meses",
          total: (cantidad*(1+ib)).toFixed(2),
          mensualidad: (cantidad*(1+ib)/12).toFixed(2),
          plazo: 12
        },
        {
          nombre: ((plazo<36)? plazo: 36)+" meses",
          total: (cantidad*(1+ib/12*((plazo<36)? plazo: 36))).toFixed(2),
          mensualidad: (cantidad*(1+ib/12*((plazo<36)? plazo: 36))/((plazo<36)? plazo: 36)).toFixed(2),
          plazo: ((plazo<36)? plazo: 36)
        }
        ]
      }
      break;
    case 'C':
      opciones =[
        {
          nombre: "12 meses",
          total: (cantidad*(1+ic)).toFixed(2),
          mensualidad: (cantidad*(1+ic)/12).toFixed(2),
          plazo: 12
        },
        {
          nombre: "24 meses",
          total: (cantidad*(1+ic*2)).toFixed(2),
          mensualidad: (cantidad*(1+ic*2)/24).toFixed(2),
          plazo: 24
        }
        ]
      break;
    default:
      opciones= [];
  }
  return opciones;
};

//Enviar la respuesta
const sendRes = (status, msg) => {
  //Body
  var jsonBody ={}

  //Revisamos el tipo de request y los datos necesarios
  if(msg["tipo"] == "solicitud" && msg["SAT"] >= 0 && msg["BURO"] >= 0  && msg["ingreso"]>=0)
  {
    var cantidad = msg["cantidad"], plazo = msg["plazo"], ingreso = msg["ingreso"], puntosSAT = msg["SAT"], puntosBuro = msg["BURO"];
    var cali = calcularCalificacion(cantidad, plazo, ingreso,puntosSAT, puntosBuro);
    var mensaje = "", cantidadNueva = cantidad;
    if(cali["FINAL"] != 'D')
    {
      mensaje = "¡Felicidades tu crédito ha sido autorizado!";
      if(cali["FINAL"] == 'A'){
       cantidadNueva = cantidad*1.1;
      }
      else if(cali["FINAL"] == 'C')
      {
        cantidadNueva = cantidad*0.75;
      }
      mensaje+=" Creamos el préstamo a tu medida, por lo que puedes recibir hasta: "+cantidadNueva.toFixed(2);
    }else
    {
      mensaje = ":( ¡Lo sentimos! No cubres los requerimientos, inicia sesión para recibir información de cómo cumplir.";
    }
    jsonBody = { nombre: msg["nombre"],
    tipo: msg["tipo"],
    telefono: msg["telefono"],
    correo: msg["correo"],
    calificacion: cali["FINAL"],
    plazo: plazo,
    mensaje: mensaje,
    cantidad: cantidad.toFixed(2),
    cantidadNueva: cantidadNueva.toFixed(2),
    opciones: getOpciones(((cantidadNueva> cantidad)? cantidad: cantidadNueva), plazo, cali["FINAL"])
    };
    connection.connect(function(err) {
      if (err) jsonBody["conectado"] =false;
      jsonBody["conectado"] =true;
    });
    var sql="SELECT * FROM CLIENTE WHERE CORREO = '"+msg["correo"]+"'";
    connection.query(sql,
    (err, results)  =>{
      if(results.length== 0)
      {
        if(err){
          //throw err;
        }
        var fecha = msg["telefono"]+"','"+msg["anio"]+"-"+msg["mes"]+"-"+msg["dia"];
        sql = "INSERT INTO CLIENTE VALUES ('"+msg["nombre"]+"','"+msg["correo"]+"','"+fecha+"','"+ingreso+"','"+cantidad+"','"+plazo+"','"+cantidadNueva+"','"+puntosBuro+"','"+cali["BURO"]+"','"+puntosSAT+"','"+cali["SAT"]+"','"+cali["INGRESO"]+"','"+cali["FINAL"]+"','"+(new Date().toJSON().slice(0, 10))+"')";
        connection.query(sql,(err, res) => {
          if(err){
            //throw err;
          }

        });
      }else{
        connection.query("UPDATE CLIENTE SET INGRESO = "+ingreso+",CANTIDAD = "+cantidad+", PLAZO = "+plazo+" ,CANTIDAD = "+cantidad+",CANTIDAD_POSIBLE = "+cantidadNueva+", PUNTOSBURO = "+puntosBuro+" ,CBURO = '"+cali["BURO"]+"' , PUNTOSSAT ="+puntosSAT+" , CSAT = '"+cali["SAT"]+"', CINGRESO = '"+cali["INGRESO"]+"',CALIFICACION = '"+cali["FINAL"]+"',  FECHA_SOLICITUD = '"+(new Date().toJSON().slice(0, 10))+"' WHERE CORREO = '"+msg["correo"]+"'",(err, res) => {
          if(err){
            throw err;
          }

        });
      }
      }
    );



  }else if (msg["tipo"] == "aceptacion")
  {
     connection.connect(function(err) {
      if (err) jsonBody["conectado"] =false;
      jsonBody["conectado"] =true;
    });
    var correo = msg["correo"], cantidad =msg["cantidad"],total = msg["total"],plazo = msg["plazo"], dia = (new Date().toJSON().slice(0, 10));
    var sql = "INSERT INTO PRESTAMOS VALUES (1,'"+msg["correo"]+"',"+cantidad+","+total+","+plazo+",'"+dia+"')";
    connection.query(sql,
    (err, results)  =>{
      if(err){}
    });
    jsonBody = {mensaje: "CRÉDITO APROBADO"};
  }else
  {
    jsonBody = {error: "FORMATO INCORRECTO"};
  }
  var response = {
    statusCode: status,
    headers: {
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Headers':'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Credentials' : true,
      'Content-Type': 'txt/json'
    },
    body:JSON.stringify(jsonBody)
  };
  return response;
};
