/* =====================================================
   兒童臉部隱私保護工具 - Application Logic
   Version: 1.0.0 (2023-12-23)
   ===================================================== */

// 版本紀錄
const VERSION = '1.0.0';
const VERSION_DATE = '2023-12-23';
console.log(`%c🛡️ 兒童臉部隱私保護工具 v${VERSION}`,
    'color: #6366f1; font-size: 16px; font-weight: bold;');
console.log(`%c📅 更新日期: ${VERSION_DATE}`, 'color: #94a3b8;');
console.log('%c📋 更新紀錄:', 'color: #10b981; font-weight: bold;');
console.log(`%c
  v1.0.0 (2023-12-23)
  ├─ ✨ 核心功能
  │   ├─ 自動臉部偵測 (face-api.js)
  │   ├─ 智慧年齡判斷 (可設定 ≤12 歲)
  │   ├─ Emoji 遮蓋 (6 種表情)
  │   └─ 批次上傳/下載
  │
  ├─ 🔧 編輯功能
  │   ├─ 手動新增/移除遮蓋
  │   ├─ 拖曳移動遮蓋位置
  │   └─ 調整遮蓋大小
  │
  ├─ 🎨 UI/UX 優化
  │   ├─ 對比滑桿 (原圖/處理後)
  │   ├─ 處理完成自動滾動
  │   ├─ 按鈕文字說明
  │   └─ 完整 RWD 響應式設計
  │
  └─ 📱 PWA 支援
      ├─ 離線快取
      └─ 可安裝為 App
`, 'color: #64748b;');

// Application State
const state = {
    selectedEmoji: '😊',
    emojiSizePercent: 110,
    processedImages: [],
    isModelLoaded: false,
    isProcessing: false,
    childOnlyMode: false,
    ageThreshold: 12,
    deferredPrompt: null
};

// Edit Mode State
const editState = {
    isEditing: false,
    currentImageIndex: -1,
    masks: [],
    selectedMaskIndex: -1,
    isDragging: false,
    isResizing: false,
    addMode: false,
    dragOffset: { x: 0, y: 0 },
    selectedEmoji: '😊',
    canvas: null,
    ctx: null,
    image: null,
    scale: 1
};

// DOM Elements
const elements = {
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    emojiOptions: document.getElementById('emojiOptions'),
    emojiSize: document.getElementById('emojiSize'),
    sizeValue: document.getElementById('sizeValue'),
    progressSection: document.getElementById('progressSection'),
    progressText: document.getElementById('progressText'),
    progressCount: document.getElementById('progressCount'),
    progressFill: document.getElementById('progressFill'),
    previewSection: document.getElementById('previewSection'),
    previewGrid: document.getElementById('previewGrid'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    downloadAllBtn: document.getElementById('downloadAllBtn'),
    modelSection: document.getElementById('modelSection'),
    modelStatus: document.getElementById('modelStatus'),
    toastContainer: document.getElementById('toastContainer'),
    childOnlyToggle: document.getElementById('childOnlyToggle'),
    ageThreshold: document.getElementById('ageThreshold'),
    ageThresholdControl: document.getElementById('ageThresholdControl'),
    ageValue: document.getElementById('ageValue'),
    installBtn: document.getElementById('installBtn'),
    // Edit Modal
    editModal: document.getElementById('editModal'),
    editCanvas: document.getElementById('editCanvas'),
    addMaskBtn: document.getElementById('addMaskBtn'),
    finishEditBtn: document.getElementById('finishEditBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    editEmojiOptions: document.getElementById('editEmojiOptions')
};

// Initialize Application
async function init() {
    setupEventListeners();
    setupPWA();
    await loadFaceDetectionModels();
}

// Setup Event Listeners
function setupEventListeners() {
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.emojiOptions.addEventListener('click', handleEmojiSelect);
    elements.emojiSize.addEventListener('input', handleSizeChange);
    elements.childOnlyToggle.addEventListener('change', handleChildOnlyToggle);
    elements.ageThreshold.addEventListener('input', handleAgeThresholdChange);
    elements.clearAllBtn.addEventListener('click', clearAll);
    elements.downloadAllBtn.addEventListener('click', downloadAll);
    elements.installBtn.addEventListener('click', handleInstallClick);

    // Edit Modal Events
    elements.addMaskBtn.addEventListener('click', toggleAddMode);
    elements.finishEditBtn.addEventListener('click', finishEditing);
    elements.cancelEditBtn.addEventListener('click', cancelEditing);
    elements.editEmojiOptions.addEventListener('click', handleEditEmojiSelect);

    // Canvas Events
    elements.editCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    elements.editCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    elements.editCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    elements.editCanvas.addEventListener('mouseleave', handleCanvasMouseUp);

    // Touch Events
    elements.editCanvas.addEventListener('touchstart', handleCanvasTouchStart);
    elements.editCanvas.addEventListener('touchmove', handleCanvasTouchMove);
    elements.editCanvas.addEventListener('touchend', handleCanvasTouchEnd);
}

// Setup PWA
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredPrompt = e;
        elements.installBtn.style.display = 'inline-flex';
    });
    window.addEventListener('appinstalled', () => {
        elements.installBtn.style.display = 'none';
        state.deferredPrompt = null;
        showToast('應用已成功安裝！', 'success');
    });
}

async function handleInstallClick() {
    if (!state.deferredPrompt) return;
    state.deferredPrompt.prompt();
    const { outcome } = await state.deferredPrompt.userChoice;
    if (outcome === 'accepted') showToast('感謝安裝！', 'success');
    state.deferredPrompt = null;
}

function handleChildOnlyToggle(e) {
    state.childOnlyMode = e.target.checked;
    if (state.childOnlyMode) {
        elements.ageThresholdControl.classList.add('active');
    } else {
        elements.ageThresholdControl.classList.remove('active');
    }
}

function handleAgeThresholdChange(e) {
    state.ageThreshold = parseInt(e.target.value);
    elements.ageValue.textContent = `≤ ${state.ageThreshold} 歲`;
}

// Load Face Detection Models
async function loadFaceDetectionModels() {
    try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        state.isModelLoaded = true;
        elements.modelStatus.textContent = '✅ 臉部偵測模型載入完成，可以開始上傳照片';
        elements.modelSection.querySelector('.model-status').classList.add('ready');
        showToast('模型載入成功！可以開始上傳照片', 'success');
    } catch (error) {
        console.error('Failed to load models:', error);
        elements.modelStatus.textContent = '❌ 模型載入失敗，請重新整理頁面';
        showToast('模型載入失敗，請重新整理頁面', 'error');
    }
}

// Drag & Drop Handlers
function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); elements.uploadZone.classList.add('drag-over'); }
function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); elements.uploadZone.classList.remove('drag-over'); }
function handleDrop(e) {
    e.preventDefault(); e.stopPropagation();
    elements.uploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) processFiles(files);
    else showToast('請上傳圖片檔案', 'warning');
}
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) processFiles(files);
    e.target.value = '';
}
function handleEmojiSelect(e) {
    if (e.target.classList.contains('emoji-btn')) {
        document.querySelectorAll('.emoji-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        state.selectedEmoji = e.target.dataset.emoji;
    }
}
function handleSizeChange(e) {
    state.emojiSizePercent = parseInt(e.target.value);
    elements.sizeValue.textContent = `${state.emojiSizePercent}%`;
}

// Process Files
async function processFiles(files) {
    if (!state.isModelLoaded) { showToast('請等待模型載入完成', 'warning'); return; }
    if (state.isProcessing) { showToast('正在處理中，請稍候', 'warning'); return; }

    state.isProcessing = true;
    const totalFiles = files.length;
    let processedCount = 0;

    elements.progressSection.style.display = 'block';
    elements.previewSection.style.display = 'block';
    updateProgress(0, totalFiles);

    for (const file of files) {
        try {
            const result = await processImage(file);
            state.processedImages.push(result);
            addPreviewCard(result, state.processedImages.length - 1);
            processedCount++;
            updateProgress(processedCount, totalFiles);
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            showToast(`處理 ${file.name} 時發生錯誤`, 'error');
            processedCount++;
            updateProgress(processedCount, totalFiles);
        }
    }

    state.isProcessing = false;
    elements.progressText.textContent = '處理完成！';
    showToast(`成功處理 ${state.processedImages.length} 張照片`, 'success');

    // 自動滾動到預覽區塊
    setTimeout(() => {
        elements.previewSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, 300);
}

// Process Single Image
async function processImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = async (e) => {
            const originalDataUrl = e.target.result;
            img.src = originalDataUrl;

            img.onload = async () => {
                try {
                    // 使用更高解析度和更低閾值來增強偵測
                    const detections = await faceapi
                        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({
                            inputSize: 640,        // 從 512 提升到 640
                            scoreThreshold: 0.2    // 從 0.3 降低到 0.2
                        }))
                        .withAgeAndGender();

                    const masks = [];
                    let maskedCount = 0;

                    for (const detection of detections) {
                        const box = detection.detection.box;
                        const age = Math.round(detection.age);
                        const isChild = age <= state.ageThreshold;
                        const shouldMask = !state.childOnlyMode || isChild;

                        if (shouldMask) {
                            masks.push({
                                id: `mask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                x: box.x + box.width / 2,
                                y: box.y + box.height / 2,
                                size: Math.max(box.width, box.height) * (state.emojiSizePercent / 100),
                                emoji: state.selectedEmoji,
                                isChild: isChild,
                                age: age
                            });
                            maskedCount++;
                        }
                    }

                    // Create processed canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Draw masks
                    for (const mask of masks) {
                        ctx.font = `${mask.size}px serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(mask.emoji, mask.x, mask.y);
                    }

                    canvas.toBlob((blob) => {
                        resolve({
                            originalName: file.name,
                            processedName: `protected_${file.name}`,
                            blob: blob,
                            dataUrl: canvas.toDataURL('image/png'),
                            originalDataUrl: originalDataUrl,
                            faceCount: detections.length,
                            maskedCount: maskedCount,
                            masks: masks,
                            width: img.naturalWidth,
                            height: img.naturalHeight
                        });
                    }, 'image/png');
                } catch (error) { reject(error); }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function updateProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    elements.progressFill.style.width = `${percent}%`;
    elements.progressCount.textContent = `${current} / ${total}`;
    elements.progressText.textContent = current < total ? `處理中... (${percent}%)` : '處理完成！';
}

// Add Preview Card
function addPreviewCard(result, index) {
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.dataset.index = index;

    const childCount = result.masks.filter(m => m.isChild).length;
    let badgeText = result.faceCount === 0 ? '無偵測到臉部' :
        (state.childOnlyMode ? `🧒 ${childCount} 兒童` : `👤 ${result.faceCount} 個臉部`);
    const maskedText = result.maskedCount > 0 ? `已遮蓋 ${result.maskedCount} 個` : '';

    card.innerHTML = `
        <div class="preview-image-container">
            <div class="comparison-container" data-comparing="true">
                <img src="${result.originalDataUrl}" alt="原始" class="comparison-original">
                <img src="${result.dataUrl}" alt="${result.originalName}" class="comparison-processed" style="clip-path: inset(0 50% 0 0);">
                <div class="comparison-divider" style="left: 50%; opacity: 1; pointer-events: auto;"></div>
                <div class="comparison-labels" style="opacity: 1;">
                    <span class="comparison-label">處理後</span>
                    <span class="comparison-label">原圖</span>
                </div>
            </div>
            <span class="face-count-badge ${childCount > 0 ? 'child' : ''}">${badgeText}</span>
            ${maskedText ? `<span class="face-count-badge" style="top: 2.5rem;">${maskedText}</span>` : ''}
        </div>
        <div class="preview-info">
            <p class="preview-filename" title="${result.processedName}">${result.processedName}</p>
            <div class="preview-card-actions">
                <button class="btn btn-small btn-edit" onclick="openEditMode(${index})" title="編輯遮蓋">
                    <span>✏️</span> 編輯
                </button>
                <button class="btn btn-secondary btn-small btn-compare active" onclick="toggleComparison(this)" title="對比原圖">
                    <span>🔄</span> 對比
                </button>
                <button class="btn btn-secondary btn-small" onclick="downloadSingle('${result.processedName}')" title="下載照片">
                    <span>💾</span> 下載
                </button>
                <button class="btn btn-secondary btn-small btn-delete" onclick="removeCard(${index})" title="刪除">
                    <span>🗑️</span>
                </button>
            </div>
        </div>
    `;

    elements.previewGrid.appendChild(card);
    initComparisonSlider(card);
}

// Toggle Comparison
function toggleComparison(button) {
    const card = button.closest('.preview-card');
    const container = card.querySelector('.comparison-container');
    const isComparing = container.dataset.comparing === 'true';
    const processed = container.querySelector('.comparison-processed');
    const divider = container.querySelector('.comparison-divider');
    const labels = container.querySelector('.comparison-labels');

    if (isComparing) {
        // 關閉對比模式
        container.dataset.comparing = 'false';
        button.classList.remove('active');
        processed.style.clipPath = 'inset(0 0 0 0)';
        divider.style.left = '100%';
        divider.style.opacity = '0';
        divider.style.pointerEvents = 'none';
        if (labels) labels.style.opacity = '0';
    } else {
        // 開啟對比模式
        container.dataset.comparing = 'true';
        button.classList.add('active');
        processed.style.clipPath = 'inset(0 50% 0 0)';
        divider.style.left = '50%';
        divider.style.opacity = '1';
        divider.style.pointerEvents = 'auto';
        if (labels) labels.style.opacity = '1';
    }
}

function initComparisonSlider(card) {
    const container = card.querySelector('.comparison-container');
    const processed = container.querySelector('.comparison-processed');
    const divider = container.querySelector('.comparison-divider');

    // 不再初始化狀態，保留 HTML 中設定的預設值
    let isDragging = false;

    const updatePosition = (clientX) => {
        const rect = container.getBoundingClientRect();
        let x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = (x / rect.width) * 100;
        processed.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        divider.style.left = `${percent}%`;
    };

    // 分隔線本身的拖曳事件
    divider.addEventListener('mousedown', (e) => {
        if (container.dataset.comparing === 'true') {
            isDragging = true;
            e.preventDefault();
        }
    });

    // 容器點擊也可以調整位置
    container.addEventListener('mousedown', (e) => {
        if (container.dataset.comparing === 'true' && e.target !== divider) {
            isDragging = true;
            updatePosition(e.clientX);
        }
    });

    // 全域拖曳移動
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            updatePosition(e.clientX);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // 觸控事件
    divider.addEventListener('touchstart', (e) => {
        if (container.dataset.comparing === 'true') {
            isDragging = true;
            e.preventDefault();
        }
    }, { passive: false });

    container.addEventListener('touchstart', (e) => {
        if (container.dataset.comparing === 'true' && e.target !== divider) {
            isDragging = true;
            updatePosition(e.touches[0].clientX);
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            updatePosition(e.touches[0].clientX);
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });
}

// ===================== EDIT MODE =====================

function openEditMode(index) {
    editState.currentImageIndex = index;
    editState.isEditing = true;
    editState.masks = JSON.parse(JSON.stringify(state.processedImages[index].masks));
    editState.selectedMaskIndex = -1;
    editState.addMode = false;
    editState.selectedEmoji = state.selectedEmoji;

    elements.editModal.classList.add('active');

    // Load image
    const img = new Image();
    img.src = state.processedImages[index].originalDataUrl;
    img.onload = () => {
        editState.image = img;
        editState.canvas = elements.editCanvas;
        editState.ctx = editState.canvas.getContext('2d');

        // Calculate scale to fit
        const wrapper = document.querySelector('.edit-canvas-wrapper');
        const maxW = wrapper.clientWidth - 40;
        const maxH = wrapper.clientHeight - 40;
        editState.scale = Math.min(maxW / img.width, maxH / img.height, 1);

        editState.canvas.width = img.width * editState.scale;
        editState.canvas.height = img.height * editState.scale;

        renderEditCanvas();
    };

    // Update emoji buttons
    document.querySelectorAll('.edit-emoji-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.emoji === editState.selectedEmoji);
    });

    elements.addMaskBtn.classList.remove('active');
}

function renderEditCanvas() {
    const ctx = editState.ctx;
    const scale = editState.scale;

    ctx.clearRect(0, 0, editState.canvas.width, editState.canvas.height);
    ctx.drawImage(editState.image, 0, 0, editState.canvas.width, editState.canvas.height);

    // Draw masks
    editState.masks.forEach((mask, i) => {
        const x = mask.x * scale;
        const y = mask.y * scale;
        const size = mask.size * scale;

        // Draw emoji
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mask.emoji, x, y);

        // Draw selection border if selected
        if (i === editState.selectedMaskIndex) {
            const half = size / 2;
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x - half, y - half, size, size);
            ctx.setLineDash([]);

            // Delete button
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x + half, y - half, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.fillText('✕', x + half, y - half);

            // Resize handle
            ctx.fillStyle = '#6366f1';
            ctx.beginPath();
            ctx.arc(x + half, y + half, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Add mode cursor hint
    if (editState.addMode) {
        editState.canvas.style.cursor = 'crosshair';
    } else {
        editState.canvas.style.cursor = editState.selectedMaskIndex >= 0 ? 'move' : 'default';
    }
}

function handleEditEmojiSelect(e) {
    if (e.target.classList.contains('edit-emoji-btn')) {
        document.querySelectorAll('.edit-emoji-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        editState.selectedEmoji = e.target.dataset.emoji;

        // Update selected mask emoji
        if (editState.selectedMaskIndex >= 0) {
            editState.masks[editState.selectedMaskIndex].emoji = editState.selectedEmoji;
            renderEditCanvas();
        }
    }
}

function toggleAddMode() {
    editState.addMode = !editState.addMode;
    editState.selectedMaskIndex = -1;
    elements.addMaskBtn.classList.toggle('active', editState.addMode);
    renderEditCanvas();
}

function getCanvasCoords(e) {
    const rect = editState.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) / editState.scale,
        y: (clientY - rect.top) / editState.scale
    };
}

function findMaskAt(coords) {
    for (let i = editState.masks.length - 1; i >= 0; i--) {
        const mask = editState.masks[i];
        const half = mask.size / 2;
        if (coords.x >= mask.x - half && coords.x <= mask.x + half &&
            coords.y >= mask.y - half && coords.y <= mask.y + half) {
            return i;
        }
    }
    return -1;
}

function isOnDeleteButton(coords, mask) {
    const half = mask.size / 2;
    const dx = coords.x - (mask.x + half);
    const dy = coords.y - (mask.y - half);
    return Math.sqrt(dx * dx + dy * dy) < 15 / editState.scale;
}

function isOnResizeHandle(coords, mask) {
    const half = mask.size / 2;
    const dx = coords.x - (mask.x + half);
    const dy = coords.y - (mask.y + half);
    return Math.sqrt(dx * dx + dy * dy) < 12 / editState.scale;
}

function handleCanvasMouseDown(e) {
    const coords = getCanvasCoords(e);

    if (editState.addMode) {
        // Add new mask
        editState.masks.push({
            id: `mask_${Date.now()}`,
            x: coords.x,
            y: coords.y,
            size: 80,
            emoji: editState.selectedEmoji,
            isChild: true,
            age: 0
        });
        editState.addMode = false;
        elements.addMaskBtn.classList.remove('active');
        editState.selectedMaskIndex = editState.masks.length - 1;
        renderEditCanvas();
        return;
    }

    // Check if clicking on selected mask's delete button
    if (editState.selectedMaskIndex >= 0) {
        const mask = editState.masks[editState.selectedMaskIndex];
        if (isOnDeleteButton(coords, mask)) {
            editState.masks.splice(editState.selectedMaskIndex, 1);
            editState.selectedMaskIndex = -1;
            renderEditCanvas();
            return;
        }
        if (isOnResizeHandle(coords, mask)) {
            editState.isResizing = true;
            return;
        }
    }

    // Find mask at click position
    const maskIndex = findMaskAt(coords);
    if (maskIndex >= 0) {
        editState.selectedMaskIndex = maskIndex;
        editState.isDragging = true;
        const mask = editState.masks[maskIndex];
        editState.dragOffset = { x: coords.x - mask.x, y: coords.y - mask.y };
    } else {
        editState.selectedMaskIndex = -1;
    }
    renderEditCanvas();
}

function handleCanvasMouseMove(e) {
    if (!editState.isDragging && !editState.isResizing) return;

    const coords = getCanvasCoords(e);
    const mask = editState.masks[editState.selectedMaskIndex];

    if (editState.isDragging) {
        mask.x = coords.x - editState.dragOffset.x;
        mask.y = coords.y - editState.dragOffset.y;
    } else if (editState.isResizing) {
        const dx = coords.x - mask.x;
        const dy = coords.y - mask.y;
        mask.size = Math.max(30, Math.sqrt(dx * dx + dy * dy) * 2);
    }

    renderEditCanvas();
}

function handleCanvasMouseUp() {
    editState.isDragging = false;
    editState.isResizing = false;
}

// Touch handlers
function handleCanvasTouchStart(e) {
    e.preventDefault();
    handleCanvasMouseDown(e);
}

function handleCanvasTouchMove(e) {
    e.preventDefault();
    handleCanvasMouseMove(e);
}

function handleCanvasTouchEnd(e) {
    handleCanvasMouseUp();
}

function finishEditing() {
    const result = state.processedImages[editState.currentImageIndex];
    result.masks = editState.masks;

    // Regenerate processed image
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = result.originalDataUrl;
    img.onload = () => {
        ctx.drawImage(img, 0, 0);

        for (const mask of result.masks) {
            ctx.font = `${mask.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mask.emoji, mask.x, mask.y);
        }

        result.dataUrl = canvas.toDataURL('image/png');
        result.maskedCount = result.masks.length;

        // Update preview card
        const card = document.querySelector(`.preview-card[data-index="${editState.currentImageIndex}"]`);
        if (card) {
            card.querySelector('.comparison-processed').src = result.dataUrl;
            const badge = card.querySelectorAll('.face-count-badge')[1];
            if (badge) badge.textContent = `已遮蓋 ${result.maskedCount} 個`;
        }

        closeEditModal();
        showToast('編輯已儲存', 'success');
    };
}

function cancelEditing() {
    closeEditModal();
}

function closeEditModal() {
    editState.isEditing = false;
    editState.currentImageIndex = -1;
    editState.masks = [];
    editState.selectedMaskIndex = -1;
    elements.editModal.classList.remove('active');
}

// ===================== OTHER FUNCTIONS =====================

function downloadSingle(filename) {
    const result = state.processedImages.find(img => img.processedName === filename);
    if (!result) {
        showToast('找不到該照片', 'error');
        return;
    }

    // 使用時間戳作為檔名
    const safeName = 'protected_photo_' + Date.now() + '.png';

    // 創建一個臨時圖片來獲取正確的 blob
    const img = new Image();
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(function (blob) {
            if (blob) {
                console.log('Blob created, size:', blob.size);
                console.log('Downloading as:', safeName);

                // 純 JavaScript 下載（不使用 FileSaver.js）
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = safeName;
                link.style.display = 'none';
                document.body.appendChild(link);

                // 模擬點擊
                link.click();

                // 清理
                setTimeout(function () {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                    console.log('Download complete');
                }, 200);

                showToast('照片已下載', 'success');
            } else {
                console.error('Blob creation failed');
                showToast('下載失敗', 'error');
            }
        }, 'image/png');
    };
    img.onerror = function () {
        showToast('下載失敗：圖片載入錯誤', 'error');
    };
    img.src = result.dataUrl;
}

function removeCard(index) {
    const card = document.querySelector(`.preview-card[data-index="${index}"]`);
    if (!card) return;

    state.processedImages[index] = null;
    card.style.animation = 'scaleIn 0.3s ease reverse';
    setTimeout(() => {
        card.remove();
        if (state.processedImages.filter(Boolean).length === 0) {
            elements.previewSection.style.display = 'none';
            elements.progressSection.style.display = 'none';
        }
    }, 300);
}

function clearAll() {
    state.processedImages = [];
    elements.previewGrid.innerHTML = '';
    elements.previewSection.style.display = 'none';
    elements.progressSection.style.display = 'none';
    showToast('已清除所有照片', 'success');
}

async function downloadAll() {
    const images = state.processedImages.filter(Boolean);
    if (images.length === 0) { showToast('沒有可下載的照片', 'warning'); return; }

    elements.downloadAllBtn.disabled = true;
    elements.downloadAllBtn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></span> 打包中...';

    try {
        const zip = new JSZip();
        const folder = zip.folder('protected_photos');

        for (const img of images) {
            const response = await fetch(img.dataUrl);
            const blob = await response.blob();
            folder.file(img.processedName, blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `protected_photos_${new Date().toISOString().slice(0, 10)}.zip`);
        showToast(`已下載 ${images.length} 張照片`, 'success');
    } catch (error) {
        console.error('Error creating ZIP:', error);
        showToast('建立 ZIP 檔案時發生錯誤', 'error');
    } finally {
        elements.downloadAllBtn.disabled = false;
        elements.downloadAllBtn.innerHTML = '<span>📦</span> 批次下載 ZIP';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
