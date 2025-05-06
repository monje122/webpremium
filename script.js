const supabase = window.supabase.createClient(
  'https://dbkixcpwirjwjvjintkr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRia2l4Y3B3aXJqd2p2amludGtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjYxNDksImV4cCI6MjA2MTY0MjE0OX0.QJmWLWSe-pRYwxWeel8df7JLhNUvMKaTpL0MCDorgho'
);

const cartonPrecio = 5;
let seleccionados = [];
let datosUsuario = {};
let ocupadosSet = new Set();

// Navegación
function mostrarVentana(id) {
  document.querySelectorAll("section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function pedirClave() {
  const clave = prompt("Ingrese la clave de administrador:");
  if (clave === "admin123") {
    mostrarVentana("adminPanel");
    cargarInscripciones();
  } else {
    alert("Clave incorrecta");
  }
}

// Inscripción
function guardarInscripcion() {
  const nombre = document.getElementById("nombre").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const referido = document.getElementById("referido").value.trim();

  if (!nombre || !telefono || !/^\d{11}$/.test(telefono)) {
    alert("Datos inválidos.");
    return;
  }

  datosUsuario = { nombre, telefono, referido };
  mostrarVentana("ventana3");
}

// Generar cartones y manejar selección
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('cartons-container');
  const modal = document.getElementById('cartonModal');
  const image = document.getElementById('cartonImage');
  const btnSelect = document.getElementById('btnSelect');
  const btnRemove = document.getElementById('btnRemove');
  const btnClose = document.getElementById('btnClose');
  let selectedNumber = null;

  // Traer cartones ocupados
  const { data: ocupados } = await supabase.from('cartones_ocupados').select('numero');
  ocupadosSet = new Set(ocupados.map(c => c.numero));

  for (let i = 1; i <= 60; i++) {
    const div = document.createElement('div');
    div.classList.add('carton');
    div.dataset.number = i;
    div.textContent = i;

    if (ocupadosSet.has(i)) {
      div.classList.add('ocupado');
      div.style.pointerEvents = 'none';
    }

    div.addEventListener('click', () => {
      if (div.classList.contains('ocupado')) return;
      selectedNumber = i;
      image.src = `https://dbkixcpwirjwjvjintkr.supabase.co/storage/v1/object/public/cartones/SERIAL_PRUEBA_CARTON_0000${i}.jpg`;
      btnRemove.classList.toggle('hidden', !seleccionados.includes(i));
      modal.classList.remove('hidden');
    });

    container.appendChild(div);
  }

  btnSelect.onclick = async () => {
    if (selectedNumber !== null) {
      if (ocupadosSet.has(selectedNumber)) {
        alert(`El cartón ${selectedNumber} ya fue ocupado.`);
        const div = document.querySelector(`[data-number="${selectedNumber}"]`);
        if (div) div.style.display = 'none';
        modal.classList.add('hidden');
        return;
      }

      if (!seleccionados.includes(selectedNumber)) {
        seleccionados.push(selectedNumber);
        const div = document.querySelector(`[data-number="${selectedNumber}"]`);
        div.classList.add('selected');
        actualizarMonto();
      }

      modal.classList.add('hidden');
    }
  };

  btnRemove.onclick = () => {
    seleccionados = seleccionados.filter(n => n !== selectedNumber);
    const div = document.querySelector(`[data-number="${selectedNumber}"]`);
    div.classList.remove('selected');
    actualizarMonto();
    modal.classList.add('hidden');
  };

  btnClose.onclick = () => modal.classList.add('hidden');

  function actualizarMonto() {
    const total = seleccionados.length * cartonPrecio;
    document.getElementById("totalMonto").textContent = total;
  }
});

function irAVentana4() {
  if (seleccionados.length === 0) {
    alert("Selecciona al menos un cartón.");
    return;
  }
  mostrarVentana("ventana4");
}

function mostrarNombreArchivo(input) {
  const archivo = input.files[0];
  document.getElementById("archivoNombre").textContent = archivo ? `Archivo: ${archivo.name}` : '';
}

async function subirYEnviar() {
  const archivo = document.getElementById("comprobante").files[0];
  if (!archivo) {
    alert("Sube el comprobante.");
    return;
  }

  const fileName = `${Date.now()}_${archivo.name}`;
  const { error: uploadError } = await supabase.storage.from("comprobantes").upload(fileName, archivo);

  if (uploadError) {
    alert("Error al subir comprobante.");
    return;
  }

  const url = `https://dbkixcpwirjwjvjintkr.supabase.co/storage/v1/object/public/comprobantes/${fileName}`;
  const { nombre, telefono, referido } = datosUsuario;
  const monto = seleccionados.length * cartonPrecio;

  const { error: insertError } = await supabase.from("inscripciones").insert([{
    nombre, telefono, referido,
    cartones: seleccionados.join(","),
    monto,
    comprobante_url: url
  }]);

  if (insertError) {
    console.error("Error al guardar inscripción:", insertError);
    alert("Error al guardar inscripción. Revisa la consola.");
    return;
  }

  // Marcar cartones como ocupados
  const ocupadosInsert = seleccionados.map(num => ({
    numero: num,
    creado_por: telefono
  }));
  const { error: errorOcupados } = await supabase.from("cartones_ocupados").insert(ocupadosInsert);

  if (errorOcupados) {
    console.error("Error al marcar ocupados:", errorOcupados);
    alert("Error al marcar cartones ocupados.");
    return;
  }

  const mensaje = `Hola! Soy ${nombre} (+58${telefono}).\nReferido: ${referido}.\nCartones: ${seleccionados.join(", ")}.\nMonto: ${monto} Bs.\nAdjunto comprobante.`;
  window.open(`https://wa.me/584123714136?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// Admin Panel
async function cargarInscripciones() {
  const contenedor = document.getElementById("listaInscripciones");
  contenedor.innerHTML = "Cargando...";

  const { data, error } = await supabase.from("inscripciones").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Error al cargar inscripciones:", error);
    contenedor.innerHTML = "Error al cargar.";
    return;
  }

  let totalCartones = 0;
  data.forEach(i => {
    totalCartones += i.cartones.split(",").length;
  });

  const resumen = `
    <p><strong>Total inscripciones:</strong> ${data.length}</p>
    <p><strong>Cartones vendidos:</strong> ${totalCartones}</p>
  `;

  contenedor.innerHTML = resumen + data.map(i => `
    <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
      <p><strong>Nombre:</strong> ${i.nombre}</p>
      <p><strong>Teléfono:</strong> ${i.telefono}</p>
      <p><strong>Referido:</strong> ${i.referido}</p>
      <p><strong>Cartones:</strong> ${i.cartones}</p>
      <p><strong>Monto:</strong> ${i.monto} Bs</p>
      <a href="${i.comprobante_url}" target="_blank">Ver comprobante</a>
    </div>
  `).join('');
}

// Actualización en tiempo real
supabase
  .channel('public:cartones_ocupados')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'cartones_ocupados' },
    (payload) => {
      const numero = payload.new.numero;
      const div = document.querySelector(`.carton[data-number="${numero}"]`);
      if (div) {
        ocupadosSet.add(numero);
        div.classList.add('fade-out');
        setTimeout(() => div.remove(), 500); // espera la animación antes de eliminar
      }
    }
  )
  .subscribe();
