const supabaseUrl = 'https://dbkixcpwirjwjvjintkr.supabase.co';
const supabase = window.supabase.createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRia2l4Y3B3aXJqd2p2amludGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjYxNDksImV4cCI6MjA2MTY0MjE0OX0.QJmWLWSe-pRYwxWeel8df7JLhNUvMKaTpL0MCDorgho');

// Variables globales
let cartonesOcupados = [];
let usuario = {
  nombre: '',
  telefono: '',
  cedula: '',
  referido: '',
  cartones: [],

};
window.addEventListener('DOMContentLoaded', async () => {
  await obtenerTotalCartones(); // lee desde Supabase
  generarCartones();            // genera del 1 al totalCartones
});

let totalCartones = 0;

async function obtenerTotalCartones() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('total_cartones')
    .eq('clave', 1)
    .single();

  if (!error && data) {
    totalCartones = data.total_cartones;
  }
}

// Navegación entre secciones
async function mostrarVentana(id) {
  // Si es la sección de cartones, primero verificamos si las ventas están abiertas
  if (id === 'cartones') {
    const { data } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'ventas_abierta')
      .single();

  if (!data || data.valor === false) {
  alert('Las ventas están cerradas');
  document.querySelectorAll('section').forEach(s => s.classList.add('oculto'));
  document.getElementById('bienvenida').classList.remove('oculto');
  return;
}
  }

  // Ahora mostramos la ventana deseada
  document.querySelectorAll('section').forEach(s => s.classList.add('oculto'));
  document.getElementById(id).classList.remove('oculto');

  if (id === 'cartones') {
    cargarCartones();
  }

  if (id === 'pago') {
    document.getElementById('monto-pago').textContent = usuario.cartones.length * 1;
  }
}
// Guardar datos del formulario
function guardarDatosInscripcion() {
  usuario.nombre = document.getElementById('nombre').value;
  usuario.telefono = document.getElementById('telefono').value;
  usuario.cedula = document.getElementById('cedula').value;
  usuario.referido = document.getElementById('referido').value;
  usuario.cartones = [];
  mostrarVentana('cartones');
}

// Cargar y mostrar cartones con imagen y modal
async function cargarCartones() {
  const { data } = await supabase.from('cartones').select('*');
  cartonesOcupados = data.map(c => c.numero); // ✅ ACTUALIZAR VARIABLE GLOBA
  const contenedor = document.getElementById('contenedor-cartones');
  contenedor.innerHTML = '';
  for (let i = 1; i <= totalCartones; i++) {
    const carton = document.createElement('div');
    carton.textContent = i;
    carton.classList.add('carton');

    
    const estaOcupado = cartonesOcupados.includes(i); // ✅ USAR VARIABLE ACTUALIZADA
    if (estaOcupado) {
      carton.classList.add('ocupado');
    } else {
      carton.onclick = () => abrirModalCarton(i, carton);
    }

    contenedor.appendChild(carton);
  }
  actualizarContadorCartones(totalCartones, cartonesOcupados.length, usuario.cartones.length);
  actualizarMonto();
}

// Marcar/desmarcar cartones
function toggleCarton(num, elem) {
  const index = usuario.cartones.indexOf(num);
  if (index >= 0) {
    usuario.cartones.splice(index, 1);
    elem.classList.remove('seleccionado');
  } else {
    usuario.cartones.push(num);
    elem.classList.add('seleccionado');
  }
  actualizarContadorCartones(totalCartones, cartonesOcupados.length, usuario.cartones.length);
  actualizarMonto();
}

function actualizarMonto() {
  document.getElementById('monto-total').textContent = usuario.cartones.length * 1;
}

// Subir comprobante y guardar en Supabase
async function enviarComprobante() {
   if (!usuario.nombre || !usuario.telefono || !usuario.cedula ) {
    return alert('Debes completar primero los datos de inscripción');
  }
  const archivo = document.getElementById('comprobante').files[0];
  if (!archivo) return alert('Debes subir un comprobante');
  const nombreArchivo = `${usuario.cedula}-${Date.now()}.jpg`;
  const { data, error } = await supabase.storage.from('comprobantes').upload(nombreArchivo, archivo);
  if (error) return alert('Error subiendo imagen');
  const urlPublica = `${supabaseUrl}/storage/v1/object/public/comprobantes/${nombreArchivo}`;
// Guardar inscripción en Supabase
  const { error: errorInsert } = await supabase.from('inscripciones').insert([{
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    cedula: usuario.cedula,
    referido: usuario.referido,
    cartones: usuario.cartones,
    comprobante: urlPublica
  }]);

  if (errorInsert) {
    console.error(errorInsert);
    return alert('Error guardando inscripción');
  }

  // Marcar cartones como ocupados
  for (const num of usuario.cartones) {
    await supabase.from('cartones').insert([{ numero: num }]);
  }

  alert('Inscripción y comprobante enviados con éxito');
  location.reload();

  // Marcar cartones como ocupados
  for (const num of usuario.cartones) {
    await supabase.from('cartones').insert([{ numero: num }]);
  }

  alert('Comprobante enviado');
  location.reload();
}

// Consultar cartones por cédula
async function consultarCartones() {
  const cedula = document.getElementById('consulta-cedula').value;
  const { data } = await supabase.from('inscripciones').select('*').eq('cedula', cedula);
  const cont = document.getElementById('cartones-usuario');
  cont.innerHTML = '';
  data.forEach(item => {
    item.cartones.forEach(num => {
      const img = document.createElement('img');
      img.src = `${supabaseUrl}/storage/v1/object/public/cartones/SERIAL_PRUEBA_CARTON_${String(num).padStart(5, '0')}.jpg`;
      img.style.width = '100px';
      img.style.margin = '5px';
      cont.appendChild(img);
    });
  });
}
usuario.cartones = [];

// Entrar al panel admin
async function entrarAdmin() {
  const clave = document.getElementById('clave-admin').value;
  if (clave !== 'admin123') return alert('Clave incorrecta');

  document.getElementById('panel-admin').classList.remove('oculto');
  document.getElementById('panel-admin').classList.remove('oculto');
contarCartonesVendidos(); // 🔁 Llama aquí para que se actualice al entrar

document.getElementById('verListaBtn').addEventListener('click', async () => {
  const { data, error } = await supabase
    .from('inscripciones')
    .select('*')
    .eq('estado', 'aprobado'); // Cambia esto si tu campo se llama distinto

  const listaDiv = document.getElementById('listaAprobados');
  listaDiv.innerHTML = ''; // Limpiar antes de insertar

  if (error) {
    console.error('Error al obtener aprobados:', error);
    listaDiv.innerHTML = '<p>Error al obtener la lista.</p>';
    return;
  }

  if (data.length === 0) {
    listaDiv.innerHTML = '<p>No hay personas aprobadas.</p>';
    return;
  }
 // Mostrar la lista
// Crear tabla
  const tabla = document.createElement('table');
  tabla.style.width = '100%';
  tabla.style.borderCollapse = 'collapse';
  tabla.innerHTML = `
    <thead>
      <tr>
        <th style="border: 1px solid #ccc; padding: 8px;">Nombre</th>
        <th style="border: 1px solid #ccc; padding: 8px;">Cédula</th>
        <th style="border: 1px solid #ccc; padding: 8px;">Referido</th>
        <th style="border: 1px solid #ccc; padding: 8px;">Teléfono</th>
        <th style="border: 1px solid #ccc; padding: 8px;">Cartones</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = tabla.querySelector('tbody');

  // Agregar cada aprobado como fila
  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="border: 1px solid #ccc; padding: 8px;">${item.nombre}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.cedula}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.referido}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.telefono}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.cartones.join(', ')}</td>
    `;
    tbody.appendChild(tr);
  });

  listaDiv.appendChild(tabla);
});

  // Traemos TODAS las inscripciones
  const { data, error } = await supabase
    .from('inscripciones')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error(error);
    return alert('Error cargando inscripciones');
  }

  // Llenamos la tabla
  const tbody = document.querySelector('#tabla-comprobantes tbody');
  tbody.innerHTML = ''; // limpia antes de pintar

  data.forEach(item => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.telefono}</td>
      <td>${item.cedula}</td>
      <td>${item.referido}</td>
       <td>${item.cartones.join(', ')}</td>
      <td><a href="${item.comprobante}" target="_blank">
            <img src="${item.comprobante}" alt="Comp.">
          </a></td>
      <td>
        <button class="btn-accion btn-aprobar" title="Aprobar">&#x2705;</button>
        <button class="btn-accion btn-rechazar" title="Rechazar">&#x274C;</button>
      </td>
    `;

    // ===== acciones =====
    const btnAprobar  = tr.querySelector('.btn-aprobar');
    const btnRechazar = tr.querySelector('.btn-rechazar');

    btnAprobar.onclick = () => aprobarInscripcion(item.id, tr);
    btnRechazar.onclick = () => rechazarInscripcion(item, tr);

    // Si la inscripción ya fue procesada, inhabilitamos los botones
    if (item.estado === 'aprobado') {
      btnAprobar.disabled = true;
      btnRechazar.disabled = true;
    } else if (item.estado === 'rechazado') {
      btnAprobar.disabled = true;
      btnRechazar.disabled = true;
    }

    tbody.appendChild(tr);
  });

  // Contadores
  document.getElementById('contadorCartones').innerText = 
  `Cartones disponibles: ${totalCartones - cartonesOcupados.length} de ${totalCartones}`;

  document.getElementById('contador-clientes').textContent = data.length;
}
document.getElementById('cerrarVentasBtn').addEventListener('click', async () => {
  const confirmacion = confirm("¿Estás seguro que quieres cerrar las ventas?");
  if (!confirmacion) return;

  const { error } = await supabase
    .from('configuracion')
    .update({ valor: false }) // o 'false' si la columna es texto
    .eq('clave', 'ventas_abierta');

  if (error) {
    alert("Error al cerrar las ventas");
    console.error(error);
  } else {
    alert("Ventas cerradas correctamente");
    location.reload(); // Opcional: recargar para que se apliquen cambios
  }
});

// Reiniciar base de datos
async function reiniciarTodo() {
  if (!confirm('¿Estás seguro de reiniciar todo?')) return;
  await supabase.from('inscripciones').delete().neq('cedula', '');
  await supabase.from('cartones').delete().neq('numero', 0);
  const { data: archivos } = await supabase.storage.from('comprobantes').list();
  const listaDiv = document.getElementById('listaAprobados');
  if (listaDiv) listaDiv.innerHTML = '';
  for (const file of archivos) {
    await supabase.storage.from('comprobantes').remove([file.name]);
  }
  alert('Datos reiniciados');
  location.reload();
}

// Variables para modal
let cartonSeleccionadoTemporal = null;
let cartonElementoTemporal = null;


// Abrir modal con imagen del cartón
function abrirModalCarton(numero, elemento) {
  cartonSeleccionadoTemporal = numero;
  cartonElementoTemporal = elemento;
  const img = document.getElementById('imagen-carton-modal');
  img.src = `${supabaseUrl}/storage/v1/object/public/cartones/SERIAL_CARTONES_CARTON_${String(numero).padStart(5, '0')}.jpg`;

  document.getElementById('modal-carton').classList.remove('oculto');

  const btn = document.getElementById('btnSeleccionarCarton');
  btn.onclick = () => {
    toggleCarton(cartonSeleccionadoTemporal, cartonElementoTemporal);
    cerrarModalCarton();
  };
}

function cerrarModalCarton() {
  document.getElementById('modal-carton').classList.add('oculto');
  cartonSeleccionadoTemporal = null;
  cartonElementoTemporal = null;
}
function actualizarContadorCartones(total, ocupados, seleccionados) {
  const disponibles = total - ocupados - seleccionados;
  const contador = document.getElementById('contadorCartones');
  contador.textContent = `Cartones disponibles: ${disponibles} de ${total}`;
}
async function elegirMasCartones() {
  const cedula = document.getElementById('consulta-cedula').value;

  // Consultar datos del usuario por cédula
  const { data, error } = await supabase.from('inscripciones').select('*').eq('cedula', cedula);

  if (error || data.length === 0) {
    return alert('No se encontró ningún usuario con esa cédula');
  }

  const inscripcion = data[0];

  // Asignar los datos al usuario actual
  usuario.nombre = inscripcion.nombre;
  usuario.telefono = inscripcion.telefono;
  usuario.cedula = inscripcion.cedula;
  usuario.referido = inscripcion.referido;
  usuario.cartones = [];

  // Ir a pantalla de selección
  mostrarVentana('cartones');
}
document.getElementById('abrirVentasBtn').addEventListener('click', async () => {
  const confirmacion = confirm("¿Estás seguro que quieres abrir las ventas?");
  if (!confirmacion) return;

  const { error } = await supabase
    .from('configuracion')
    .update({ valor: true })  // poner ventas_abierta = true
    .eq('clave', 'ventas_abierta');

  if (error) {
    alert("Error al abrir las ventas");
    console.error(error);
  } else {
    alert("Ventas abiertas correctamente");
    location.reload(); // Opcional: recargar para que se apliquen cambios
  }
});
// Aprobar = simplemente marcar la inscripción como "aprobado"
async function aprobarInscripcion(id, fila) {
  const { error } = await supabase
    .from('inscripciones')
    .update({ estado: 'aprobado' })
    .eq('id', id);

  if (error) {
    console.error(error);
    return alert('No se pudo aprobar');
  }
  fila.querySelectorAll('button').forEach(b => (b.disabled = true));
  alert('¡Inscripción aprobada!');
}

// Rechazar = borrar los cartones ocupados y marcar "rechazado"
async function rechazarInscripcion(item, fila) {
  const confirma = confirm('¿Seguro que deseas rechazar y liberar cartones?');
  if (!confirma) return;

  // 1. Liberar cartones ocupados
  if (item.cartones.length) {
    const { error: errCart } = await supabase
      .from('cartones')
      .delete()
      .in('numero', item.cartones);
    if (errCart) {
      console.error(errCart);
      return alert('Error liberando cartones');
    }
  }

  // 2. Marcar inscripción como rechazada
  const { error: errUpd } = await supabase
    .from('inscripciones')
    .update({ estado: 'rechazado' })
    .eq('id', item.id);

  if (errUpd) {
    console.error(errUpd);
    return alert('Error actualizando inscripción');
  }

  fila.querySelectorAll('button').forEach(b => (b.disabled = true));
  alert('Inscripción rechazada y cartones liberados');
}
async function rechazar(inscripcionId, cartones, comprobanteURL) {
  // 1. Liberar los cartones en Supabase
  for (let numero of cartones) {
    await supabase
      .from('cartones')
      .update({ disponible: true })
      .eq('numero', numero);
  }

  // 2. Eliminar la inscripción
  await supabase
    .from('inscripciones')
    .delete()
    .eq('id', inscripcionId);

  // 3. (Opcional) Eliminar la imagen del comprobante si quieres
  const filename = comprobanteURL.split('/').pop(); // obtén el nombre del archivo
  await supabase
    .storage
    .from('comprobantes')
    .remove([filename]);

  // 4. Recargar la lista
  cargarInscripciones(); // o la función que actualiza la tabla
}
async function rechazarInscripcion(item, tr) {
  const confirmar = confirm('¿Estás seguro de rechazar esta inscripción? Esto eliminará los datos y liberará los cartones.');
  if (!confirmar) return;

  // Eliminar inscripción de la tabla "inscripciones"
  const { error: deleteError } = await supabase
    .from('inscripciones')
    .delete()
    .eq('id', item.id);

  if (deleteError) {
    console.error(deleteError);
    alert('Error al eliminar la inscripción');
    return;
  }

  // Eliminar los cartones asignados
  for (const numero of item.cartones) {
    await supabase
      .from('cartones')
      .delete()
      .eq('numero', numero);
  }

  // Eliminar comprobante del storage si existe
  const urlSplit = item.comprobante.split('/');
  const nombreArchivo = urlSplit[urlSplit.length - 1];

  await supabase.storage.from('comprobantes').remove([nombreArchivo]);

  // Eliminar fila de la tabla visual
  tr.remove();
  alert('Inscripción rechazada y eliminada correctamente');
}
async function subirCartones() {
  const input = document.getElementById('cartonImageInput');
  const files = input.files;
  const status = document.getElementById('uploadStatus');
  status.innerHTML = '';

  if (!files.length) {
    alert('Selecciona al menos una imagen');
    return;
  }

  // Mostrar mensaje de carga
  status.innerHTML = '<p style="color:blue;">Cargando imágenes...</p>';

  const errores = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.name;

    try {
      const { error } = await supabase.storage
        .from('cartones')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        errores.push(`Error subiendo ${fileName}: ${error.message}`);
      }
    } catch (err) {
      errores.push(`Error inesperado en ${fileName}`);
    }
  }

  // Limpiar input
  input.value = '';

  // Mostrar resultado
  if (errores.length) {
    status.innerHTML = `<p style="color:red;">Se encontraron errores:</p><ul>${errores.map(e => `<li>${e}</li>`).join('')}</ul>`;
  } else {
    status.innerHTML = '<p style="color:green;">¡Todas las imágenes fueron subidas exitosamente!</p>';
  }

  // (Opcional) Borrar el mensaje después de unos segundos
  setTimeout(() => {
    status.innerHTML = '';
  }, 5000); // 5 segundos
}
async function borrarCartones() {
  const status = document.getElementById('deleteStatus');
  status.innerHTML = 'Cargando lista de imágenes...';

  // Paso 1: Obtener la lista de imágenes en el bucket 'cartones'
  const { data: list, error: listError } = await supabase.storage
    .from('cartones')
    .list('', { limit: 1000 }); // Aumenta si hay más de 1000

  if (listError) {
    status.innerHTML = `<p style="color:red;">Error listando imágenes: ${listError.message}</p>`;
    return;
  }

  if (!list.length) {
    status.innerHTML = '<p style="color:orange;">No hay imágenes para borrar.</p>';
    return;
  }

  // Paso 2: Construir lista de nombres de archivo
  const fileNames = list.map(file => file.name);

  // Paso 3: Eliminar imágenes
  const { error: deleteError } = await supabase.storage
    .from('cartones')
    .remove(fileNames);

  if (deleteError) {
    status.innerHTML = `<p style="color:red;">Error al borrar imágenes: ${deleteError.message}</p>`;
  } else {
    status.innerHTML = `<p style="color:green;">Se borraron ${fileNames.length} imágenes exitosamente.</p>`;
  }

  // (Opcional) Ocultar mensaje luego de 5 segundos
  setTimeout(() => {
    status.innerHTML = '';
  }, 5000);
}
function mostrarSeccion(id) {
  const secciones = document.querySelectorAll('section');
  secciones.forEach(sec => sec.classList.add('oculto'));

  const target = document.getElementById(id);
  if (target) target.classList.remove('oculto');

  // Mostrar redes solo en la sección de inicio
  const redes = document.getElementById('redes-sociales');
  if (redes) {
    redes.style.display = id === 'inicio' ? 'flex' : 'none';
  }
}
async function guardarNuevoTotal() {
  const nuevoTotal = parseInt(document.getElementById("nuevoTotalCartones").value);

  if (isNaN(nuevoTotal) || nuevoTotal < 1) {
    document.getElementById("estadoTotalCartones").textContent = "Número inválido.";
    return;
  }

  const { error } = await supabase
    .from('configuracion')
    .update({ total_cartones: nuevoTotal })
    .eq('clave', 1);

  if (!error) {
    document.getElementById("estadoTotalCartones").textContent = "¡Total actualizado!";
    totalCartones = nuevoTotal;
    generarCartones(); // Regenera los cartones
  } else {
    document.getElementById("estadoTotalCartones").textContent = "Error al actualizar.";
  }
}
async function contarCartonesVendidos() {
  const { data, error } = await supabase
    .from('cartones')
    .select('numero');

  if (error) {
    console.error('Error al contar cartones:', error);
    return;
  }

  const total = data.length;
  document.getElementById('total-vendidos').textContent = total;
}
