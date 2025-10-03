// sketch.js — versión final con cámara móvil, subir, descargar y volver a sacar
// Requiere: ml5 library (Sketch -> Add Library -> ml5)

let video;
let classifier;
let capturedImg = null;
let results = [];
let videoLoaded = false;
let infoDiv;

const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwrG8v9b-31vo9xkLkE7v6NI-uAAfSQxguVu9YjAvot8oL5wgNiJA4lhIAlC_UMBwIa/exec'; // <- pega aquí tu URL de Apps Script

let snapButton, uploadButton, downloadButton, retakeButton;

let showBubble = false;

function setup() {
  let canvasSize = min(windowWidth, windowHeight); // elige el menor
  createCanvas(canvasSize, canvasSize);

  // 👇 Esto cambia el color de fondo de toda la página (fuera del canvas)
  document.body.style.backgroundColor = "#111"; // oscuro

  // Div de mensajes
  infoDiv = createDiv('Inicializando...').style('white-space', 'pre-wrap');
  infoDiv.position(10, height + 10);
  infoDiv.style('background', '#111');
  infoDiv.style('color', '#dfdfdb');
  infoDiv.style('padding', '6px');
  infoDiv.style('max-width', '600px');
  infoDiv.style('font-family', 'VT323, monospace'); // para DOM
  infoDiv.style('font-size', '32px');

  // Cámara trasera (móvil)
  let constraints = {
    video: { facingMode: { ideal: "environment" } },
    audio: false
  };

  video = createCapture(constraints, () => {
    console.log('camera ready callback');
    videoLoaded = true;
    infoDiv.html('Cámara lista. Pulsa "Tomar foto".');
  });
  video.size(400, 400);
  video.hide();

  // Modelo MobileNet
  classifier = ml5.imageClassifier('MobileNet', () => {
    console.log('Modelo MobileNet cargado');
    infoDiv.html('Modelo cargado. Cámara lista. Pulsa "Tomar foto".');
  });

  // Botones
  // Botón "Tomar foto"
snapButton = createButton('Tomar foto');
snapButton.position(windowWidth * 0.01, height + windowHeight * 0.08);
snapButton.mousePressed(takeSnapshot);
styleButton(snapButton);

// Botón "Subir foto"
uploadButton = createButton('↑↑↑↑↑SUBIR FOTO↑↑↑↑↑');
uploadButton.position(windowWidth * 0.05, height + windowHeight * 0.22);
uploadButton.mousePressed(uploadSnapshotToGoogle);
uploadButton.hide();
styleButton(uploadButton);

// Botón "Descargar foto"
downloadButton = createButton('↓↓↓↓↓DESCARGAR↓↓↓↓↓');
downloadButton.position(windowWidth * 0.18, height + windowHeight * 0.36);
downloadButton.mousePressed(downloadSnapshot);
downloadButton.hide();
styleButton(downloadButton);

// Botón "Continuar clasificando"
retakeButton = createButton('Continuar clasificando');
retakeButton.position(windowWidth * 0.05, height + windowHeight * 0.52);
retakeButton.mousePressed(retakeSnapshot);
retakeButton.hide();
styleButton(retakeButton);

}


// ----------------------------
function styleButton(btn, color) {
  btn.style('padding', '8px 14px');
  btn.style('border-radius', '1px');
  btn.style('background', '#06036f');
  btn.style('color',  '#ff00d6');
  btn.style('border', 'none');
  btn.style('font-size', '60px');
  btn.style('font-family', 'VT323, monospace');

}

// ----------------------------
function takeSnapshot() {
  if (!videoLoaded) {
    infoDiv.html('La cámara aún no está lista.');
    return;
  }

  const temp = createGraphics(video.width, video.height);
  temp.image(video, 0, 0, temp.width, temp.height);
  capturedImg = temp.get();

  infoDiv.html('Snapshot creado. Clasificando...');

  // Mostrar botones
  uploadButton.show();
  downloadButton.show();
  retakeButton.show();

  try {
    classifier.classify(temp.elt, gotResult);
  } catch (e) {
    console.error(e);
    infoDiv.html('Error al clasificar: ' + e);
  }
}

// ----------------------------
// ----------------------------
function gotResult(a, b) {
  let err = null, res = null;
  if (Array.isArray(a)) res = a;
  else if ((a === null || a === undefined) && Array.isArray(b)) res = b;
  else if (b !== undefined) { err = a; res = b; }
  else res = [];

  if (err) {
    console.error('gotResult error:', err);
    infoDiv.html('Error en la clasificación.');
    results = [];
    return;
  }

  if (!res || res.length === 0) {
    infoDiv.html('No se obtuvieron resultados.');
    results = [];
    return;
  }

  // Guardamos los 3 primeros resultados para dibujar sobre la imagen,
  // pero NO los imprimimos en el infoDiv (evita duplicado).
  results = res.slice(0, 1);

  // Mensaje simple de estado (sin listar las etiquetas)
  infoDiv.html('Clasificación completada.');
}


// ----------------------------
function draw() {
  background(0);

  if (capturedImg) image(capturedImg, 0, 0, width, height);
  else if (videoLoaded) image(video, 0, 0, width, height);
  else { fill(255); textSize(22); textFont('VT323'); text('Esperando cámara...', 10, 30); return; }

  if (results.length > 0) {
  const margen = 10;
  const anchoMax = width - margen * 2; // ancho relativo al canvas
  let yPos = height / 2;  // mitad del canvas (mitad de la cámara en pantalla)
  const lineSpacing = 24;
  
  textFont('VT323');
  textSize(42);
  fill(255, 255, 0);
  stroke(30);
  strokeWeight(1);
  textWrap(WORD); // para que haga salto de línea automático

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const confPercent = nf(r.confidence * 100, 1, 2);
    const texto = `#${results[i].label} (${confPercent}% confidence)`;
    
    text(texto, margen, yPos, anchoMax);
    
    // Ajustar yPos según cuántas líneas ocupa la etiqueta
    yPos += 24 * Math.ceil(textWidth(texto) / anchoMax);
  }
}
}

// ----------------------------
// Subir snapshot con texto IA
function uploadSnapshotToGoogle() {
  if (!capturedImg) { 
    infoDiv.html('No hay imagen para subir.'); 
    return; 
  }

  const tempCanvas = createGraphics(capturedImg.width, capturedImg.height);
  tempCanvas.image(capturedImg, 0, 0);

  // Dibujar etiquetas IA
  tempCanvas.textFont('VT323');
  tempCanvas.textSize(18);
  tempCanvas.fill(255, 255, 0);
  tempCanvas.stroke(30);
  tempCanvas.strokeWeight(1);
  tempCanvas.textWrap(WORD); // permite salto de línea automático

  const margen = 10;
  const anchoMax = capturedImg.width - margen * 2; // aquí sí usamos el tamaño real de la imagen
  let yPos = capturedImg.height / 2; // mitad vertical de la imagen real
  const lineSpacing = 24;

  for (let i = 0; i < results.length; i++) {
    let confPercent = nf(results[i].confidence * 100, 1, 2); // porcentaje con 2 decimales
    let texto = `#${results[i].label} (${confPercent}% confidence)`;

    tempCanvas.text(texto, margen, yPos, anchoMax); // texto con ancho máximo
    yPos += lineSpacing * Math.ceil(tempCanvas.textWidth(texto) / anchoMax); // ajustar vertical
  }

  // Convertir a dataURL y enviar a Google
  const dataURL = tempCanvas.elt.toDataURL('image/jpeg', 0.78);
  const fd = new FormData();
  fd.append('image', dataURL);
  fd.append('name', 'foto_' + Date.now() + '.jpg');
  fd.append('uploader', 'visitante');

  infoDiv.html('Preparando subida...');
  fetch(WEBAPP_URL, { method:'POST', body:fd })
    .then(r => r.json())
    .then(res => {
      if (res && res.status === 'ok') infoDiv.html('Subida OK.');
      else infoDiv.html('Error subiendo: ' + (res.message || 'unknown'));
    })
    .catch(err => { 
      console.error(err); 
      infoDiv.html('Error en subida: ' + err.message); 
    });
}


// ----------------------------
// Descargar snapshot con texto IA
function downloadSnapshot() {
  if (!capturedImg) { 
    infoDiv.html('No hay imagen para descargar.'); 
    return; 
  }

  const tempCanvas = createGraphics(capturedImg.width, capturedImg.height);
  tempCanvas.image(capturedImg, 0, 0);

  tempCanvas.textFont('VT323');
  tempCanvas.textSize(18);
  tempCanvas.fill(255, 255, 0);
  tempCanvas.stroke(30);
  tempCanvas.strokeWeight(1);
  tempCanvas.textWrap(WORD); // permite que el texto haga salto de línea por palabras

  const margen = 10;
  const anchoMax = capturedImg.width - margen * 2; // aquí sí usamos el tamaño real de la imagen
  let yPos = capturedImg.height / 2; // mitad vertical de la imagen real
  const lineSpacing = 24;

  for (let i = 0; i < results.length; i++) {
    let confPercent = nf(results[i].confidence * 100, 1, 2);
    let texto = `#${results[i].label} (${confPercent}% confidence)`;

    tempCanvas.text(texto, margen, yPos, anchoMax); // text con ancho máximo
    yPos += lineSpacing * Math.ceil(tempCanvas.textWidth(texto) / anchoMax); // ajustar Y para la siguiente línea
  }

  tempCanvas.elt.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'foto_' + Date.now() + '.jpg';
    a.click();
  }, 'image/jpeg', 0.95);
}

// ----------------------------
// Volver a sacar foto
function retakeSnapshot() {
  capturedImg = null;
  results = [];
  infoDiv.html('Cámara lista. Pulsa "Tomar foto".');
  uploadButton.hide();
  downloadButton.hide();
  retakeButton.hide();
}
