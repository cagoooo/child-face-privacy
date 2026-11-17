/* =====================================================
   兒童臉部隱私保護工具 - Application Logic
   Child Face Privacy Tool
   Version: 1.3.0 (2024-12-23)
   ===================================================== */

// 版本紀錄 (Version History)
const VERSION = '1.3.1';
const VERSION_DATE = '2026-11-17';
console.log(`%c🛡️ 兒童臉部隱私保護工具 v${VERSION} (Child Face Privacy Tool)`,
    'color: #6366f1; font-size: 16px; font-weight: bold;');
console.log(`%c📅 更新日期 (Updated): ${VERSION_DATE}`, 'color: #94a3b8;');
console.log('%c📋 更新紀錄 (Changelog):', 'color: #10b981; font-weight: bold;');
console.log(`%c
  v1.3.0 (2024-12-23) - Code Optimization & Touch Gestures
  ├─ 🧹 程式碼重構 (Code Refactoring)
  │   └─ 合併重複函數，減少 ~100 行程式碼
  │
  ├─ 📱 觸控手勢優化 (Touch Gestures)
  │   ├─ 雙指縮放調整遮蓋大小 (Pinch to resize)
  │   ├─ 雙指旋轉調整角度 (Two-finger rotate)
  │   └─ 觸覺回饋提示 (Haptic feedback)
  │
  └─ 🔄 上傳進度覆蓋層 (Upload Progress Overlay)

  v1.2.0 (2024-12-23) - Upload Progress
  └─ 📊 四階段上傳進度指示器

  v1.1.0 (2024-12-23) - Enhanced Detection & Mask Types
  ├─ 🔍 SSD MobileNet 模型
  ├─ 🎭 遮蓋類型 (Emoji/馬賽克/模糊)
  └─ 🎨 遮蓋類型選擇器

  v1.0.0 (2024-12-23) - Initial Release
  ├─ ✨ 自動臉部偵測 & 年齡判斷
  ├─ 🔧 編輯模式 (拖曳/縮放)
  └─ 📱 PWA 離線支援
`, 'color: #64748b;');

// Application State
const state = {
    selectedEmoji: '😊',
    emojiSizePercent: 110,
    maskType: 'emoji', // 'emoji', 'mosaic', 'blur'
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
    scale: 1,
    // Multi-touch gesture state
    isPinching: false,
    isRotating: false,
    initialPinchDistance: 0,
    initialPinchSize: 0,
    initialRotation: 0,
    initialMaskRotation: 0,
    lastTouchCenter: null,
    touchStartTime: 0
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
    editEmojiOptions: document.getElementById('editEmojiOptions'),
    maskTypeOptions: document.getElementById('maskTypeOptions'),
    emojiSection: document.getElementById('emojiSection'),
    // Upload Progress Overlay
    uploadProgressOverlay: document.getElementById('uploadProgressOverlay'),
    uploadProgressStages: document.getElementById('uploadProgressStages'),
    uploadProgressFill: document.getElementById('uploadProgressFill'),
    uploadProgressPercent: document.getElementById('uploadProgressPercent'),
    currentImagePreview: document.getElementById('currentImagePreview'),
    currentFileName: document.getElementById('currentFileName'),
    currentFileCount: document.getElementById('currentFileCount')
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

    // Mask Type Selection
    if (elements.maskTypeOptions) {
        elements.maskTypeOptions.addEventListener('click', handleMaskTypeSelect);
    }

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

    // Touch Events (passive: false because we need preventDefault)
    elements.editCanvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    elements.editCanvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
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

// Handle Mask Type Selection
function handleMaskTypeSelect(e) {
    if (e.target.classList.contains('mask-type-btn')) {
        // Update active state
        document.querySelectorAll('.mask-type-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Update state
        state.maskType = e.target.dataset.type;

        // Show/hide emoji section based on type
        if (elements.emojiSection) {
            if (state.maskType === 'emoji') {
                elements.emojiSection.style.display = 'block';
            } else {
                elements.emojiSection.style.display = 'none';
            }
        }

        showToast(`已切換為 ${e.target.textContent.trim()} 模式`, 'success');
    }
}

// Load Face Detection Models with Progress
async function loadFaceDetectionModels() {
    const modelSection = elements.modelSection;
    const statusEl = elements.modelStatus;

    // 創建進度條 HTML
    const progressHTML = `
        <div class="model-loading-progress">
            <div class="model-loading-text">
                <span class="model-loading-icon">⏳</span>
                <span class="model-loading-status">正在載入 AI 模型 (Loading AI Models)...</span>
            </div>
            <div class="model-progress-bar">
                <div class="model-progress-fill" style="width: 0%"></div>
            </div>
            <div class="model-loading-detail">首次載入約需 10-30 秒 (First load: ~10-30s)</div>
            <div class="model-loading-steps">
                <span class="model-step" data-step="1">1. SSD MobileNet</span>
                <span class="model-step" data-step="2">2. FaceLandmarks</span>
                <span class="model-step" data-step="3">3. Age/Gender</span>
            </div>
        </div>
    `;

    modelSection.querySelector('.model-status').innerHTML = progressHTML;

    const progressFill = modelSection.querySelector('.model-progress-fill');
    const loadingStatus = modelSection.querySelector('.model-loading-status');
    const loadingDetail = modelSection.querySelector('.model-loading-detail');
    const steps = modelSection.querySelectorAll('.model-step');

    const updateProgress = (percent, status, detail) => {
        progressFill.style.width = `${percent}%`;
        if (status) loadingStatus.textContent = status;
        if (detail) loadingDetail.textContent = detail;
    };

    const markStepComplete = (stepNum) => {
        steps[stepNum - 1].classList.add('complete');
    };

    const markStepActive = (stepNum) => {
        steps.forEach(s => s.classList.remove('active'));
        steps[stepNum - 1].classList.add('active');
    };

    try {
        const MODEL_URL = './models';

        // Step 1: SSD MobileNet (~5.6MB)
        markStepActive(1);
        updateProgress(5, '載入 SSD MobileNet 模型 (Loading SSD MobileNet)...', '臉部偵測核心模型 (~5.6MB)');
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        markStepComplete(1);
        updateProgress(50, null, null);

        // Step 2: FaceLandmarks68 (~356KB)
        markStepActive(2);
        updateProgress(55, '載入臉部特徵點模型 (Loading FaceLandmarks)...', '用於旋轉偵測 (~356KB)');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        markStepComplete(2);
        updateProgress(75, null, null);

        // Step 3: Age/Gender (~430KB)
        markStepActive(3);
        updateProgress(80, '載入年齡偵測模型 (Loading Age/Gender)...', '用於年齡判斷 (~430KB)');
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
        markStepComplete(3);
        updateProgress(100, null, null);

        // Complete
        state.isModelLoaded = true;
        modelSection.querySelector('.model-status').innerHTML = `
            <div class="model-loading-complete">
                <span class="model-complete-icon">✅</span>
                <span>AI 模型載入完成！可以開始上傳照片 (Ready to upload)</span>
            </div>
        `;
        modelSection.querySelector('.model-status').classList.add('ready');
        showToast('AI 模型載入完成！', 'success');

    } catch (error) {
        console.error('Failed to load models:', error);
        modelSection.querySelector('.model-status').innerHTML = `
            <div class="model-loading-error">
                <span>❌</span>
                <span>模型載入失敗 (Load failed)，請重新整理頁面</span>
                <button onclick="location.reload()" class="btn btn-small">🔄 重新整理</button>
            </div>
        `;
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

    // Show upload progress overlay
    showUploadProgressOverlay(totalFiles);

    for (const file of files) {
        try {
            // Update current file info
            updateUploadProgress(processedCount, totalFiles, file.name, null);

            const result = await processImage(file, {
                showProgress: true,
                currentIndex: processedCount,
                totalFiles: totalFiles
            });
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

    // Hide upload progress overlay
    hideUploadProgressOverlay();

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

// ===================== UPLOAD PROGRESS OVERLAY =====================

// Show upload progress overlay
function showUploadProgressOverlay(totalFiles) {
    if (!elements.uploadProgressOverlay) return;

    elements.uploadProgressOverlay.classList.add('active');
    elements.currentFileCount.textContent = `0 / ${totalFiles}`;
    elements.currentFileName.textContent = '準備處理...';
    elements.uploadProgressFill.style.width = '0%';
    elements.uploadProgressPercent.textContent = '0%';

    // Reset all stages
    resetUploadStages();
}

// Hide upload progress overlay
function hideUploadProgressOverlay() {
    if (!elements.uploadProgressOverlay) return;

    // Show completion state briefly
    setUploadStage('masking', 'complete');
    elements.uploadProgressFill.style.width = '100%';
    elements.uploadProgressPercent.textContent = '100%';

    setTimeout(() => {
        elements.uploadProgressOverlay.classList.remove('active');
        resetUploadStages();
    }, 500);
}

// Reset all upload stages
function resetUploadStages() {
    if (!elements.uploadProgressStages) return;

    const stages = elements.uploadProgressStages.querySelectorAll('.upload-stage');
    stages.forEach(stage => {
        stage.classList.remove('active', 'complete');
    });
}

// Set upload stage state
function setUploadStage(stageName, state) {
    if (!elements.uploadProgressStages) return;

    const stage = elements.uploadProgressStages.querySelector(`[data-stage="${stageName}"]`);
    if (stage) {
        if (state === 'active') {
            stage.classList.remove('complete');
            stage.classList.add('active');
        } else if (state === 'complete') {
            stage.classList.remove('active');
            stage.classList.add('complete');
        }
    }
}

// Update upload progress
function updateUploadProgress(current, total, fileName, imageDataUrl) {
    if (!elements.uploadProgressOverlay) return;

    elements.currentFileName.textContent = fileName;
    elements.currentFileCount.textContent = `${current + 1} / ${total}`;

    // Update image preview
    if (imageDataUrl && elements.currentImagePreview) {
        elements.currentImagePreview.style.backgroundImage = `url(${imageDataUrl})`;
        elements.currentImagePreview.classList.add('has-image');
    } else {
        elements.currentImagePreview.style.backgroundImage = '';
        elements.currentImagePreview.classList.remove('has-image');
    }

    // Calculate overall progress (current image position + stage progress within current image)
    const baseProgress = (current / total) * 100;
    elements.uploadProgressFill.style.width = `${Math.round(baseProgress)}%`;
    elements.uploadProgressPercent.textContent = `${Math.round(baseProgress)}%`;
}

// Update stage progress within an image
function updateStageProgress(current, total, stagePercent) {
    if (!elements.uploadProgressOverlay) return;

    const baseProgress = (current / total) * 100;
    const stageContribution = (stagePercent / 100) * (100 / total);
    const totalProgress = Math.min(100, baseProgress + stageContribution);

    elements.uploadProgressFill.style.width = `${Math.round(totalProgress)}%`;
    elements.uploadProgressPercent.textContent = `${Math.round(totalProgress)}%`;
}

// Process Single Image with Progress (Unified function)
// @param {File} file - The image file to process
// @param {Object} options - Optional settings
// @param {boolean} options.showProgress - Whether to show progress overlay (default: false)
// @param {number} options.currentIndex - Current file index for progress (default: 0)
// @param {number} options.totalFiles - Total files for progress (default: 1)
async function processImage(file, options = {}) {
    const { showProgress = false, currentIndex = 0, totalFiles = 1 } = options;

    return new Promise((resolve, reject) => {
        // Stage 1: Reading file
        if (showProgress) {
            resetUploadStages();
            setUploadStage('reading', 'active');
            updateStageProgress(currentIndex, totalFiles, 10);
        }

        const img = new Image();
        const reader = new FileReader();

        reader.onload = async (e) => {
            const originalDataUrl = e.target.result;

            // Stage 1 complete, Stage 2: Loading image
            if (showProgress) {
                setUploadStage('reading', 'complete');
                setUploadStage('loading', 'active');
                updateStageProgress(currentIndex, totalFiles, 25);
                updateUploadProgress(currentIndex, totalFiles, file.name, originalDataUrl);
            }

            img.src = originalDataUrl;

            img.onload = async () => {
                try {
                    // Stage 2 complete, Stage 3: Detecting faces
                    if (showProgress) {
                        setUploadStage('loading', 'complete');
                        setUploadStage('detecting', 'active');
                        updateStageProgress(currentIndex, totalFiles, 50);
                    }

                    // 使用 SSD MobileNet 進行更精準的偵測
                    const detections = await faceapi
                        .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({
                            minConfidence: 0.3
                        }))
                        .withFaceLandmarks()
                        .withAgeAndGender();

                    // Stage 3 complete, Stage 4: Applying masks
                    if (showProgress) {
                        setUploadStage('detecting', 'complete');
                        setUploadStage('masking', 'active');
                        updateStageProgress(currentIndex, totalFiles, 75);
                    }

                    const masks = [];
                    let maskedCount = 0;

                    for (const detection of detections) {
                        const box = detection.detection.box;
                        const age = Math.round(detection.age);
                        const isChild = age <= state.ageThreshold;
                        const shouldMask = !state.childOnlyMode || isChild;

                        if (shouldMask) {
                            // 計算臉部旋轉角度
                            let rotation = 0;
                            if (detection.landmarks) {
                                const leftEye = detection.landmarks.getLeftEye();
                                const rightEye = detection.landmarks.getRightEye();
                                if (leftEye.length > 0 && rightEye.length > 0) {
                                    const leftCenter = {
                                        x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
                                        y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length
                                    };
                                    const rightCenter = {
                                        x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
                                        y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length
                                    };
                                    rotation = Math.atan2(rightCenter.y - leftCenter.y, rightCenter.x - leftCenter.x);
                                }
                            }

                            masks.push({
                                id: `mask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                x: box.x + box.width / 2,
                                y: box.y + box.height / 2,
                                size: Math.max(box.width, box.height) * (state.emojiSizePercent / 100),
                                width: box.width,
                                height: box.height,
                                emoji: state.selectedEmoji,
                                maskType: state.maskType,
                                rotation: rotation,
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
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0);

                    // Draw masks based on type
                    for (const mask of masks) {
                        drawMask(ctx, mask, img);
                    }

                    if (showProgress) {
                        updateStageProgress(currentIndex, totalFiles, 95);
                    }

                    canvas.toBlob((blob) => {
                        // Stage 4 complete
                        if (showProgress) {
                            setUploadStage('masking', 'complete');
                            updateStageProgress(currentIndex, totalFiles, 100);
                        }

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

// Draw mask based on type (emoji, mosaic, blur)
function drawMask(ctx, mask, img) {
    ctx.save();
    ctx.translate(mask.x, mask.y);
    ctx.rotate(mask.rotation || 0);

    const halfSize = mask.size / 2;

    switch (mask.maskType || 'emoji') {
        case 'mosaic':
            drawMosaic(ctx, -halfSize, -halfSize, mask.size, mask.size, img, mask);
            break;
        case 'blur':
            drawBlur(ctx, -halfSize, -halfSize, mask.size, mask.size, img, mask);
            break;
        case 'emoji':
        default:
            ctx.font = `${mask.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mask.emoji, 0, 0);
            break;
    }

    ctx.restore();
}

// Draw mosaic effect
function drawMosaic(ctx, x, y, width, height, img, mask) {
    const blockSize = Math.max(8, Math.floor(mask.size / 8));
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // Get the face region from original image
    const srcX = Math.max(0, mask.x - width / 2);
    const srcY = Math.max(0, mask.y - height / 2);
    const srcW = Math.min(width, img.naturalWidth - srcX);
    const srcH = Math.min(height, img.naturalHeight - srcY);

    tempCanvas.width = srcW;
    tempCanvas.height = srcH;
    tempCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    // Create circular clip
    ctx.beginPath();
    ctx.arc(0, 0, mask.size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw pixelated blocks
    for (let bx = 0; bx < srcW; bx += blockSize) {
        for (let by = 0; by < srcH; by += blockSize) {
            const pixel = tempCtx.getImageData(
                Math.min(bx, srcW - 1),
                Math.min(by, srcH - 1),
                1, 1
            ).data;
            ctx.fillStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            ctx.fillRect(x + bx, y + by, blockSize, blockSize);
        }
    }
}

// Draw blur effect
function drawBlur(ctx, x, y, width, height, img, mask) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const srcX = Math.max(0, mask.x - width / 2);
    const srcY = Math.max(0, mask.y - height / 2);
    const srcW = Math.min(width, img.naturalWidth - srcX);
    const srcH = Math.min(height, img.naturalHeight - srcY);

    tempCanvas.width = srcW;
    tempCanvas.height = srcH;

    // Scale down and up to create blur effect
    const scale = 0.1;
    tempCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW * scale, srcH * scale);
    tempCtx.drawImage(tempCanvas, 0, 0, srcW * scale, srcH * scale, 0, 0, srcW, srcH);

    // Create circular clip
    ctx.beginPath();
    ctx.arc(0, 0, mask.size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(tempCanvas, x, y, srcW, srcH);
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
                <button class="btn btn-secondary btn-small" onclick="downloadSingle(${index})" title="下載照片">
                    <span>💾</span> 下載
                </button>
                <button class="btn btn-secondary btn-small btn-delete" onclick="removeCard(${index})" title="刪除">
                    <span>🗑️</span> 刪除
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
        editState.ctx = editState.canvas.getContext('2d', { willReadFrequently: true });

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

// ===================== ENHANCED TOUCH HANDLERS =====================

// Calculate distance between two touch points
function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Calculate angle between two touch points
function getTouchAngle(touches) {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx);
}

// Get center point between two touches
function getTouchCenter(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    };
}

// Enhanced touch start handler
function handleCanvasTouchStart(e) {
    e.preventDefault();
    editState.touchStartTime = Date.now();

    if (e.touches.length === 1) {
        // Single touch - treat as mouse click/drag
        handleCanvasMouseDown(e);
    } else if (e.touches.length === 2 && editState.selectedMaskIndex >= 0) {
        // Two finger touch - pinch to resize / rotate
        const mask = editState.masks[editState.selectedMaskIndex];

        editState.isPinching = true;
        editState.isRotating = true;
        editState.isDragging = false;
        editState.isResizing = false;

        editState.initialPinchDistance = getTouchDistance(e.touches);
        editState.initialPinchSize = mask.size;
        editState.initialRotation = getTouchAngle(e.touches);
        editState.initialMaskRotation = mask.rotation || 0;
        editState.lastTouchCenter = getTouchCenter(e.touches);

        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
}

// Enhanced touch move handler
function handleCanvasTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
        // Single touch - treat as mouse move
        handleCanvasMouseMove(e);
    } else if (e.touches.length === 2 && editState.selectedMaskIndex >= 0) {
        // Two finger gesture
        const mask = editState.masks[editState.selectedMaskIndex];

        if (editState.isPinching) {
            // Pinch to resize
            const currentDistance = getTouchDistance(e.touches);
            const scale = currentDistance / editState.initialPinchDistance;
            mask.size = Math.max(30, Math.min(500, editState.initialPinchSize * scale));
        }

        if (editState.isRotating) {
            // Two finger rotate
            const currentAngle = getTouchAngle(e.touches);
            const angleDiff = currentAngle - editState.initialRotation;
            mask.rotation = editState.initialMaskRotation + angleDiff;
        }

        // Move mask with two-finger pan
        const currentCenter = getTouchCenter(e.touches);
        if (editState.lastTouchCenter) {
            const rect = editState.canvas.getBoundingClientRect();
            const dx = (currentCenter.x - editState.lastTouchCenter.x) / editState.scale;
            const dy = (currentCenter.y - editState.lastTouchCenter.y) / editState.scale;
            mask.x += dx;
            mask.y += dy;
        }
        editState.lastTouchCenter = currentCenter;

        renderEditCanvas();
    }
}

// Enhanced touch end handler
function handleCanvasTouchEnd(e) {
    // Check for long press (to trigger delete/action menu)
    const touchDuration = Date.now() - editState.touchStartTime;

    if (e.touches.length === 0) {
        // All fingers lifted
        if (editState.isPinching || editState.isRotating) {
            // Haptic feedback for gesture completion
            if (navigator.vibrate) {
                navigator.vibrate(5);
            }
        }

        editState.isPinching = false;
        editState.isRotating = false;
        editState.lastTouchCenter = null;
        handleCanvasMouseUp();
    } else if (e.touches.length === 1) {
        // One finger remains - switch back to drag mode
        editState.isPinching = false;
        editState.isRotating = false;
        editState.lastTouchCenter = null;
    }
}

function finishEditing() {
    const result = state.processedImages[editState.currentImageIndex];
    result.masks = editState.masks;

    // Regenerate processed image
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

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

function downloadSingle(index) {
    const result = state.processedImages[index];
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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

// Monkey patch getContext to force willReadFrequently
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, attributes) {
    if (type === '2d') {
        attributes = { ...attributes, willReadFrequently: true };
    }
    return originalGetContext.call(this, type, attributes);
};

document.addEventListener('DOMContentLoaded', init);
