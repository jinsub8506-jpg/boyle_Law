const slider = document.getElementById('depthSlider');
const plunger = document.getElementById('plunger');
const pressureDisplay = document.getElementById('pressure');
const scale = document.getElementById('scale');
const resetButton = document.getElementById('resetButton');
const rig = document.getElementById('rig');
const dropZone = document.getElementById('drop-zone');
const sensorPool = document.getElementById('sensor-pool');

// 새로 추가된 HTML 요소 가져오기
const showVolumeCheckbox = document.getElementById('showVolumeCheckbox');
const volumeDisplay = document.getElementById('volumeDisplay');

let isDropped = false;

// 보일의 법칙에 필요한 변수 추가
let initialVolume;
const initialPressure = 1.0; // 1 atm

let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// 눈금 생성 (기존 코드 유지)
for (let i = 1; i < 100; i++) {
  if (i % 10 === 0) continue;
  if (i % 5 === 0) {
    const midtick = document.createElement('div');
    midtick.className = 'midtick';
    midtick.style.bottom = `${i}%`;
    scale.appendChild(midtick);
  } else {
    const subtick = document.createElement('div');
    subtick.className = 'subtick';
    subtick.style.bottom = `${i}%`;
    scale.appendChild(subtick);
  }
}

// 초기 상태 설정
const MAX_VOLUME = 100; // mL
const MIN_VOLUME = 0; // mL. 이 값을 조절하여 부피 범위를 설정하세요.
const MAX_SLIDER_VALUE = 400;
const BARREL_TOP = 200; // 주사기 통의 상단 Y 좌표 (px)
const PLUNGER_MAX_TRAVEL = 300; // 플런저가 움직일 수 있는 최대 거리 (px)

// 슬라이더 이동 시 plunger 위치 및 압력/부피 업데이트
slider.addEventListener('input', () => {
  updatePlungerPosition();
  if (isDropped) {
    updatePressure();
  }
  // 슬라이더 변경 시 부피도 업데이트
  updateVolumeDisplay();
});

// 초기화 버튼 클릭 시 슬라이더 초기값(200)으로 설정
resetButton.addEventListener('click', () => {
  // 슬라이더 초기값으로 설정
  slider.value = 200;
  updatePlungerPosition();

  // rig의 위치를 sensor-pool 중앙으로 초기화
  const sensorPoolRect = sensorPool.getBoundingClientRect();
  const rigWidth = rig.offsetWidth;
  const rigHeight = rig.offsetHeight;
  
  const initialLeft = sensorPoolRect.left + (sensorPoolRect.width / 2) - (rigWidth / 2);
  const initialTop = sensorPoolRect.top + (sensorPoolRect.height / 2) - (rigHeight / 2);
  
  rig.style.position = 'absolute';
  rig.style.left = `${initialLeft}px`;
  rig.style.top = `${initialTop}px`;

  xOffset = initialLeft;
  yOffset = initialTop;
  
  // 압력 측정 비활성화 및 초기화
  isDropped = false;
  pressureDisplay.textContent = '0.00';
  
  // 부피도 초기화
  showVolumeCheckbox.checked = false;
  updateVolumeDisplay();
});

function updatePlungerPosition() {
  const sliderValue = parseInt(slider.value);
  const barrelHeight = 400;
  const plungerMaxTravel = barrelHeight - 100;

  const plungerTranslateY = (sliderValue - (MAX_SLIDER_VALUE / 2)) * (plungerMaxTravel / MAX_SLIDER_VALUE);

  plunger.style.transform = `translateY(${plungerTranslateY}px)`;
}

// 부피를 계산하는 함수
function calculateVolume() {
  const sliderValue = parseInt(slider.value);
  const volumeRange = MAX_VOLUME - MIN_VOLUME;
  const volume = MIN_VOLUME + (sliderValue / MAX_SLIDER_VALUE) * volumeRange;
  return volume;
}

function updatePressure() {
  // 현재 부피 계산
  const currentVolume = calculateVolume();
  
  // 보일의 법칙 공식: P_current * V_current = P_initial * V_initial
  const pressure = (initialPressure * initialVolume) / currentVolume;
  
  pressureDisplay.textContent = pressure.toFixed(2);
}

// 부피 표시를 업데이트하는 함수
function updateVolumeDisplay() {
  if (showVolumeCheckbox.checked) {
    const currentVolume = calculateVolume();
    volumeDisplay.textContent = `부피: ${currentVolume.toFixed(2)} mL`;
    volumeDisplay.style.display = 'inline'; // 체크박스가 체크되면 보이게 함
  } else {
    volumeDisplay.style.display = 'none'; // 체크박스가 해제되면 숨김
  }
}

// 부피보이기 체크박스에 이벤트 리스너 추가
showVolumeCheckbox.addEventListener('change', updateVolumeDisplay);

// 드래그 앤 드롭 기능 구현 (PC)
rig.addEventListener('dragstart', (e) => {
  e.dataTransfer.setData('text/plain', 'rig');
});

// 터치 드래그 앤 드롭 기능 구현 (모바일)
rig.addEventListener('touchstart', (e) => {
    isDragging = true;
    initialX = e.touches[0].clientX - xOffset;
    initialY = e.touches[0].clientY - yOffset;
    rig.style.position = 'absolute';
});

rig.addEventListener('touchmove', (e) => {
    if (isDragging) {
        e.preventDefault();
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;

        rig.style.left = `${currentX}px`;
        rig.style.top = `${currentY}px`;
        xOffset = currentX;
        yOffset = currentY;
    }
});

rig.addEventListener('touchend', (e) => {
    isDragging = false;
    // 터치 종료 시 드롭 영역 체크
    const dropZoneRect = dropZone.getBoundingClientRect();
    const sensorPoolRect = sensorPool.getBoundingClientRect();
    const rigRect = rig.getBoundingClientRect();
    
    // rig의 중심 좌표 계산
    const rigCenterX = rigRect.left + rigRect.width / 2;
    const rigCenterY = rigRect.top + rigRect.height / 2;

    if (
        rigCenterX >= dropZoneRect.left &&
        rigCenterX <= dropZoneRect.right &&
        rigCenterY >= dropZoneRect.top &&
        rigCenterY <= dropZoneRect.bottom
    ) {
        handleDrop(e, dropZone);
    } else if (
        rigCenterX >= sensorPoolRect.left &&
        rigCenterX <= sensorPoolRect.right &&
        rigCenterY >= sensorPoolRect.top &&
        rigCenterY <= sensorPoolRect.bottom
    ) {
        handleDrop(e, sensorPool);
    }
});

// 드롭 함수
function handleDrop(e, targetElement) {
  e.preventDefault();
  
  // 드롭할 위치를 계산 (PC 및 모바일 모두에서 작동하도록)
  const targetRect = targetElement.getBoundingClientRect();
  const newLeft = targetRect.left + (targetRect.width / 2) - (rig.offsetWidth / 2);
  const newTop = targetRect.top + (targetRect.height / 2) - (rig.offsetHeight / 2);
  
  rig.style.position = 'absolute';
  rig.style.left = `${newLeft}px`;
  rig.style.top = `${newTop}px`;
  
  // 위치 저장
  xOffset = newLeft;
  yOffset = newTop;
  
  // drop-zone에 놓았을 때만 압력 측정 활성화
  isDropped = (targetElement.id === 'drop-zone');
  if (isDropped) {
    // 센서를 드롭존에 놓았을 때 초기 부피를 저장
    initialVolume = calculateVolume();
    updatePressure();
  } else {
    pressureDisplay.textContent = '0.00';
  }
}

// drop-zone에 드래그 앤 드롭 이벤트 추가 (PC)
dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('drop', (e) => handleDrop(e, dropZone));

// sensor-pool에 드래그 앤 드롭 이벤트 추가 (PC)
sensorPool.addEventListener('dragover', (e) => e.preventDefault());
sensorPool.addEventListener('drop', (e) => handleDrop(e, sensorPool));

// 페이지 로드 시 초기 상태 업데이트
updatePlungerPosition();
pressureDisplay.textContent = '0.00'; // 초기 압력 0으로 설정

// 페이지 로드 시 rig의 초기 위치를 sensor-pool 중앙으로 설정
document.addEventListener('DOMContentLoaded', () => {
  const sensorPoolRect = sensorPool.getBoundingClientRect();
  const rigWidth = rig.offsetWidth;
  const rigHeight = rig.offsetHeight;
  
  const initialLeft = sensorPoolRect.left + (sensorPoolRect.width / 2) - (rigWidth / 2);
  const initialTop = sensorPoolRect.top + (sensorPoolRect.height / 2) - (rigHeight / 2);
  
  rig.style.position = 'absolute';
  rig.style.left = `${initialLeft}px`;
  rig.style.top = `${initialTop}px`;
  
  // 초기 위치를 xOffset, yOffset에 저장
  xOffset = initialLeft;
  yOffset = initialTop;
  
  // 초기에는 압력 측정이 비활성화
  isDropped = false;
  pressureDisplay.textContent = '0.00';
});

// --- 플런저 드래그 기능 추가 ---
let isPlungerDragging = false;
let plungerStartPosY = 0; // 플런저 드래그 시작 시 Y 위치
let sliderStartValue = 0; // 플런저 드래그 시작 시 슬라이더 값

// 플런저 드래그 시작 (마우스)
plunger.addEventListener('mousedown', (e) => {
  isPlungerDragging = true;
  plungerStartPosY = e.clientY;
  sliderStartValue = slider.value;
  plunger.style.cursor = 'grabbing';
  // 드래그 시 반응 속도 향상을 위해 트랜지션 일시적으로 제거
  plunger.style.transition = 'none';
});

// 플런저 드래그 중 (마우스)
document.addEventListener('mousemove', (e) => {
  if (isPlungerDragging) {
    e.preventDefault(); 
    const deltaY = e.clientY - plungerStartPosY;
    
    // 드래그 방향에 맞춰 슬라이더 값 계산
    const sliderDelta = (deltaY / PLUNGER_MAX_TRAVEL) * MAX_SLIDER_VALUE;
    let newSliderValue = parseInt(sliderStartValue) + sliderDelta;

    // 슬라이더 값의 범위를 벗어나지 않도록 제한
    newSliderValue = Math.max(0, Math.min(MAX_SLIDER_VALUE, newSliderValue));
    
    slider.value = newSliderValue;
    
    // 플런저 위치 및 압력 업데이트
    updatePlungerPosition();
    if (isDropped) {
      updatePressure();
    }
    updateVolumeDisplay();
  }
});

// 플런저 드래그 종료 (마우스)
document.addEventListener('mouseup', () => {
  isPlungerDragging = false;
  plunger.style.cursor = 'grab';
  // 드래그 종료 후 다시 트랜지션 적용 (기존 스타일로 복원)
  plunger.style.transition = 'transform 0.3s ease';
});

// 플런저 드래그 시작 (터치)
plunger.addEventListener('touchstart', (e) => {
  e.preventDefault(); 
  e.stopPropagation(); 
  isPlungerDragging = true;
  plungerStartPosY = e.touches[0].clientY;
  sliderStartValue = slider.value;
  plunger.style.cursor = 'grabbing';
  // 드래그 시 반응 속도 향상을 위해 트랜지션 일시적으로 제거
  plunger.style.transition = 'none';
});

// 플런저 드래그 중 (터치)
plunger.addEventListener('touchmove', (e) => {
  if (isPlungerDragging) {
    e.preventDefault(); 
    e.stopPropagation(); 
    const deltaY = e.touches[0].clientY - plungerStartPosY;
    
    // 드래그 방향에 맞춰 슬라이더 값 계산
    const sliderDelta = (deltaY / PLUNGER_MAX_TRAVEL) * MAX_SLIDER_VALUE;
    let newSliderValue = parseInt(sliderStartValue) + sliderDelta;
    
    newSliderValue = Math.max(0, Math.min(MAX_SLIDER_VALUE, newSliderValue));
    
    slider.value = newSliderValue;
    
    updatePlungerPosition();
    if (isDropped) {
      updatePressure();
    }
    updateVolumeDisplay();
  }
});

// 플런저 드래그 종료 (터치)
plunger.addEventListener('touchend', () => {
  isPlungerDragging = false;
  plunger.style.cursor = 'grab';
  // 드래그 종료 후 다시 트랜지션 적용 (기존 스타일로 복원)
  plunger.style.transition = 'transform 0.3s ease';
});