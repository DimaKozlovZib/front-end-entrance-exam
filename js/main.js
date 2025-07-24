import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Константы
const NOTIFICATION_DURATION = 3000;
const DEFAULT_LANGUAGE_LEVEL = 5;

// Кэширование часто используемых элементов
const elements = {
  editables: () => document.querySelectorAll('.editable'),
  photoInput: () => document.getElementById('photo-input'),
  photo: () => document.getElementById('photo'),
  downloadBtn: () => document.getElementById('downloadBtn'),
  resetBtn: () => document.getElementById('resetBtn'),
  notification: () => document.getElementById('notification'),
  resume: () => document.getElementById('resume')
};

// Инициализация приложения
function initApp() {
  loadSavedData();
  setupEventListeners();
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Редактируемые элементы
  elements.editables().forEach(element => {
    element.addEventListener('blur', handleEditableBlur);
    element.addEventListener('click', createWave);
  });

  // Кнопки
  elements.downloadBtn().addEventListener('click', downloadPDF);
  elements.resetBtn().addEventListener('click', resetData);

  // Фото
  elements.photoInput().addEventListener('change', changePhoto);

  // Уровни языков
  document.querySelectorAll('.power button').forEach(btn => {
    btn.addEventListener('click', changeLanguageLevel);
  });

  // Иконки инструментов
  document.querySelectorAll('.tool-img[id^="tool-input"]').forEach(el => {
    el.addEventListener('change', changeToolImg);
  });
}

// Обработчики событий
function handleEditableBlur() {
  saveData();
  showNotification();
}

function changeLanguageLevel(e) {
  const { lang, level } = e.target.dataset;
  const languageButtons = document.querySelectorAll(`.power button[data-lang="${lang}"]`);

  // Сброс предыдущего выбора
  languageButtons.forEach(button => {
    button.classList.remove('active', 'lastActive');
  });

  // Установка нового уровня
  for (let i = 1; i <= level; i++) {
    const button = document.querySelector(`.power button[data-lang="${lang}"][data-level="${i}"]`);
    if (button) {
      button.classList.add('active');
      if (i == level) button.classList.add('lastActive');
    }
  }

  localStorage.setItem(`lang-${lang}-level`, level);
  showNotification();
}

async function changePhoto(e) {
  try {
    const file = e.target.files[0];
    if (!file) return;

    const imageData = await readFileAsDataURL(file);
    elements.photo().src = imageData;
    localStorage.setItem('resumePhoto', imageData);
    showNotification('Фото сохранено');
  } catch (error) {
    console.error('Ошибка загрузки фото:', error);
    showNotification('Ошибка загрузки фото');
  }
}

async function changeToolImg(e) {
  try {
    const file = e.target.files[0];
    if (!file) return;

    const imgId = e.target.id.replace('input', 'img');
    const imgElement = document.getElementById(imgId);
    const imageData = await readFileAsDataURL(file);

    imgElement.src = imageData;
    localStorage.setItem(imgId, imageData);
    showNotification('Изображение сохранено');
  } catch (error) {
    console.error('Ошибка загрузки изображения:', error);
    showNotification('Ошибка загрузки изображения');
  }
}

// Вспомогательные функции
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

function createWave(event) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);

  const wave = document.createElement('span');
  wave.className = 'wave';
  wave.style.width = `${size}px`;
  wave.style.height = `${size}px`;
  wave.style.left = `${event.clientX - rect.left - size / 2}px`;
  wave.style.top = `${event.clientY - rect.top - size / 2}px`;

  target.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
}

// Работа с данными
function saveData() {
  elements.editables().forEach(element => {
    localStorage.setItem(element.id, element.innerHTML);
  });
}

function loadSavedData() {
  // Загрузка редактируемых полей
  elements.editables().forEach(element => {
    const savedValue = localStorage.getItem(element.id);
    if (savedValue) element.innerHTML = savedValue;
  });

  // Загрузка фото
  const savedPhoto = localStorage.getItem('resumePhoto');
  if (savedPhoto) elements.photo().src = savedPhoto;

  // Загрузка инструментов
  document.querySelectorAll('.tool-img[id^="tool-img"]').forEach(img => {
    const savedImg = localStorage.getItem(img.id);
    if (savedImg) img.src = savedImg;
  });

  // Загрузка уровня языка
  document.querySelectorAll('.power button').forEach(btn => {
    const lang = btn.dataset.lang;
    const level = Number(btn.dataset.level);
    const savedLevel = Number(localStorage.getItem(`lang-${lang}-level`) || DEFAULT_LANGUAGE_LEVEL);

    if (level <= savedLevel) {
      btn.classList.add('active');
      if (level === savedLevel) btn.classList.add('lastActive');
    }
  });
}

function resetData() {
  if (!confirm('Вы уверены, что хотите сбросить все изменения?')) return;

  localStorage.clear();

  // Сброс редактируемых полей
  elements.editables().forEach(element => {
    element.innerHTML = element.dataset.original || 'Text';
  });

  // Сброс фото
  elements.photo().src = '';
  elements.photoInput().value = '';

  // Сброс инструментов
  document.querySelectorAll('.tool-img[id^="tool-img"]').forEach(img => img.src = '');
  document.querySelectorAll('.tool-img[id^="tool-input"]').forEach(el => el.value = '');

  // Сброс уровней языка
  document.querySelectorAll('.power button').forEach(btn => {
    btn.classList.remove('active', 'lastActive');
  });

  showNotification('Данные сброшены!');
}

// Уведомления
function showNotification(message = 'Изменения сохранены!') {
  const notification = elements.notification();
  notification.textContent = message;
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
  }, NOTIFICATION_DURATION);
}

// Генерация PDF
async function downloadPDF() {
  showNotification('Генерируется PDF...');

  try {
    const pdf = await generatePDF();
    pdf.save('resume.pdf');
    showNotification('PDF скачан успешно!');
  } catch (error) {
    console.error('Ошибка при создании PDF:', error);
    showNotification('Ошибка при создании PDF');
  }
}

async function generatePDF() {
  const resume = elements.resume();
  const clone = resume.cloneNode(true);

  // Подготовка клона для PDF
  clone.style.width = '210mm';
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);

  // Создание canvas
  const canvas = await html2canvas(clone, {
    scale: 2,
    logging: false,
    width: 210 * 3.78,
    windowWidth: 210 * 3.78,
    scrollX: 0,
    scrollY: 0
  });

  document.body.removeChild(clone);

  // Создание PDF
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');

  // Обработка многостраничного документа
  let heightLeft = imgHeight;
  let position = 0;

  while (heightLeft > 0) {
    if (position !== 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight, undefined, 'FAST');
    }
    heightLeft -= pageHeight;
    position += pageHeight;
  }

  return pdf;
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);