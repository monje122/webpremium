const supabaseUrl = 'https://dbkixcpwirjwjvjintkr.supabase.co';
const supabase = window.supabase.createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRia2l4Y3B3aXJqd2p2amludGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjYxNDksImV4cCI6MjA2MTY0MjE0OX0.QJmWLWSe-pRYwxWeel8df7JLhNUvMKaTpL0MCDorgho');

// Variables globales
let usuario = {
  nombre: '',
  telefono: '',
  cedula: '',
  referido: '',
  cartones: [],
};

// Navegación entre secciones
function mostrarVentana(id) {
  document.querySelectorAll('section').forEach(s => s.classList.add('oculto'));
  document.getElementById(id).classList.remove('oculto');
  if (id === 'cartones') cargarCartones();
  if (id === 'pago') document.getElementById('monto-pago').textContent = usuario.cartones.length * 1;
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
  const contenedor = document.getElementById('contenedor-cartones');
  contenedor.innerHTML = '';
  for (let i = 1; i <= 50; i++) {
    const carton = document.createElement('div');
    carton.textContent = i;
    carton.classList.add('carton');

    const estaOcupado = data.some(c => c.numero === i);
    if (estaOcupado) {
      carton.classList.add('ocupado');
    } else {
      carton.onclick = () => abrirModalCarton(i, carton);
    }

    contenedor.appendChild(carton);
  }
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
  actualizarMonto();
}

function actualizarMonto() {
  document.getElementById('monto-total').textContent = usuario.cartones.length * 1;
}

// Subir comprobante y guardar en Supabase
async function enviarComprobante() {
   if (!usuario.nombre || !usuario.telefono || !usuario.cedula || !usuario.referido) {
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
      img.style.width = '200px';
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
  const { data } = await supabase.from('inscripciones').select('*');
  const comprobantes = document.getElementById('lista-comprobantes');
  comprobantes.innerHTML = '';
  data.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `
      <p><strong>${item.nombre}</strong> (${item.cedula}) - ${item.telefono}</p>
      <img src="${item.comprobante}" width="150">
      <hr>
    `;
    comprobantes.appendChild(div);
  });
  document.getElementById('contador-cartones').textContent = data.reduce((acc, cur) => acc + cur.cartones.length, 0);
  document.getElementById('contador-clientes').textContent = data.length;
}

// Reiniciar base de datos
async function reiniciarTodo() {
  if (!confirm('¿Estás seguro de reiniciar todo?')) return;
  await supabase.from('inscripciones').delete().neq('cedula', '');
  await supabase.from('cartones').delete().neq('numero', 0);
const { data: archivos } = await supabase.storage.from('comprobantes').list('', { limit: 100 });
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
  img.src = `${supabaseUrl}/storage/v1/object/public/cartones/SERIAL_PRUEBA_CARTON_${String(numero).padStart(5, '0')}.jpg`;

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
