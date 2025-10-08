  //Inicializando
let video;
let classifier;
let capturedImg = null;
let results = [];
let videoLoaded = false;
let infoDiv;

  //web
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwrG8v9b-31vo9xkLkE7v6NI-uAAfSQxguVu9YjAvot8oL5wgNiJA4lhIAlC_UMBwIa/exec'; // <- pega aquí tu URL de Apps Script

let snapButton, uploadButton, downloadButton, retakeButton;

  // --- nuevas variables para el layout ---
let canvasEl;
let canvasX = 0, canvasY = 0;

let showBubble = false;

  //Canvas= cámara
function setup() {
  let canvasSize = min(windowWidth, windowHeight);
  canvasEl = createCanvas(canvasSize, canvasSize);
  canvasX = Math.round((windowWidth - canvasSize) / 2);
  canvasY = 0;
  canvasEl.position(canvasX, canvasY);
  document.body.style.backgroundColor = "#111";

  // Div de mensajes
  infoDiv = createDiv('Inicializando...').style('white-space', 'pre-wrap');
  infoDiv.style('background', '#111');
  infoDiv.style('color', '#dfdfdb');
  infoDiv.style('padding', '6px');
  infoDiv.style('max-width', '600px');
  infoDiv.style('font-family', 'VT323, monospace');
  infoDiv.style('font-size', '16px');

  // Cámara trasera
  let constraints = {
    video: { facingMode: { ideal: "environment" } },
    audio: false
  };

  video = createCapture(constraints, () => {
    console.log('camera ready callback');
    videoLoaded = true;
    infoDiv.html('Cámara lista. Pulsa "Tomar foto".');
  });
  video.size(canvasSize, canvasSize);
  video.hide();

  // Modelo MobileNet
  classifier = ml5.imageClassifier('MobileNet', () => {
    console.log('Modelo MobileNet cargado');
    infoDiv.html('Modelo cargado. Cámara lista. Pulsa "Tomar foto".');
  });

  // Botones
  // Botón "Tomar foto"
  snapButton = createButton('Tomar foto');
  styleButton(snapButton);

  // Botón "Subir foto"
  uploadButton = createButton('↑↑↑↑↑SUBIR FOTO↑↑↑↑↑');
  styleButton(uploadButton);
  uploadButton.hide();

  // Botón "Descargar foto"
  downloadButton = createButton('↓↓↓↓↓DESCARGAR↓↓↓↓↓');
  styleButton(downloadButton);
  downloadButton.hide();

  // Botón "Continuar clasificando"
  retakeButton = createButton('Continuar clasificando');
  styleButton(retakeButton);
  retakeButton.hide();

  snapButton.mousePressed(takeSnapshot);
  uploadButton.mousePressed(uploadSnapshotToGoogle);
  downloadButton.mousePressed(downloadSnapshot);
  retakeButton.mousePressed(retakeSnapshot);

  positionUI();
}


  // estilo botones
function styleButton(btn, color) {
  btn.style('padding', '8px 14px');
  btn.style('border-radius', '1px');
  btn.style('background', '#06036f');
  btn.style('color',  '#ff00d6');
  btn.style('border', 'none');
  btn.style('font-size', '25px');
  btn.style('font-family', 'VT323, monospace');
}


// función que centraliza y posiciona los controles respecto al canvas
function positionUI() {
  const canvasSize = width; 
  canvasX = Math.round((windowWidth - canvasSize) / 2);
  canvasY = 0;
  canvasEl.position(canvasX, canvasY);

  const baseY = canvasY + canvasSize + Math.round(canvasSize * 0.06);

  // ancho relativo para botones
  const buttonWidth = Math.round(canvasSize * 0.8);

  // spacing vertical entre botones 
  const spacing = Math.round(canvasSize * 0.14);

  // centrar cada botón 
  snapButton.style('width', buttonWidth + 'px');
  snapButton.position(canvasX + Math.round((canvasSize - buttonWidth) / 2), baseY);

  uploadButton.style('width', buttonWidth + 'px');
  uploadButton.position(canvasX + Math.round((canvasSize - buttonWidth) / 2), baseY + spacing);

  downloadButton.style('width', buttonWidth + 'px');
  downloadButton.position(canvasX + Math.round((canvasSize - buttonWidth) / 2), baseY + spacing * 2);

  retakeButton.style('width', buttonWidth + 'px');
  retakeButton.position(canvasX + Math.round((canvasSize - buttonWidth) / 2), baseY + spacing * 3);

  // posicionar el infoDiv
  infoDiv.position(canvasX + 10, baseY + spacing * 4 + 5);
}


// ----------------------------
function takeSnapshot() {
  if (!videoLoaded) {
    infoDiv.html('La cámara aún está a punto.');
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

  //resultados IA
  results = res.slice(0, 1);

  infoDiv.html('Clasificación completada.');
}


// ----------------------------
function draw() {
  background(0);

  if (capturedImg) image(capturedImg, 0, 0, width, height);
  else if (videoLoaded) image(video, 0, 0, width, height);
  else { fill(255); textSize(16); textFont('VT323'); text('Esperando cámara...', 10, 30); return; }

  if (results.length > 0) {
    const margen = 10;
    const anchoMax = width - margen * 2; // ancho relativo al canvas
    let yPos = height / 2;  // mitad del canvas 
    const lineSpacing = 24;

    textFont('VT323');
    textSize(18);
    fill(255, 255, 0);
    stroke(30);
    strokeWeight(1);
    textWrap(WORD); 

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const confPercent = nf(r.confidence * 100, 1, 2);
      const texto = `#${results[i].label} (${confPercent}% confidence)`;

      text(texto, margen, yPos, anchoMax);

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
  tempCanvas.textWrap(WORD); 

  const margen = 10;
  const anchoMax = capturedImg.width - margen * 2; 
  let yPos = capturedImg.height / 2; // mitad vertical de la imagen 
  const lineSpacing = 24;

  for (let i = 0; i < results.length; i++) {
    let confPercent = nf(results[i].confidence * 100, 1, 2); // porcentaje
    let texto = `#${results[i].label} (${confPercent}% confidence)`;

    tempCanvas.text(texto, margen, yPos, anchoMax); // texto con ancho máximo
    yPos += lineSpacing * Math.ceil(tempCanvas.textWidth(texto) / anchoMax);
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
  tempCanvas.textWrap(WORD); 

  const margen = 10;
  const anchoMax = capturedImg.width - margen * 2; 
  let yPos = capturedImg.height / 2; // mitad vertical de la imagen real
  const lineSpacing = 24;

  for (let i = 0; i < results.length; i++) {
    let confPercent = nf(results[i].confidence * 100, 1, 2);
    let texto = `#${results[i].label} (${confPercent}% confidence)`;

    tempCanvas.text(texto, margen, yPos, anchoMax); 
    yPos += lineSpacing * Math.ceil(tempCanvas.textWidth(texto) / anchoMax); 
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


// ----------------------------
// Cuando cambia el tamaño de la ventana / rotación
function windowResized() {
  const newSize = min(windowWidth, windowHeight);
  resizeCanvas(newSize, newSize);

  // ajustar la captura a la nueva medida 
  if (video) video.size(newSize, newSize);
  
  // reposicionar todo
  positionUI();
}
