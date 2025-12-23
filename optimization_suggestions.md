# 🚀 未來優化與改良建議 (Optimization Suggestions)

基於目前的 **v1.1.0** 版本，以下整理了幾個方向的優化建議，可作為後續開發的參考藍圖。

## 1. ⚡ 效能優化 (Performance)

目前所有的運算都在主執行緒 (Main Thread) 進行，處理大量或高解析度圖片時可能會造成介面短暫卡頓。

- **Web Workers 多執行緒處理**：
  - 將 `face-api.js` 的偵測運算與 Canvas 的圖片處理移至 **Web Worker** 背景執行。
  - **效益**：確保 UI 介面永遠保持流暢，不會因為運算而凍結，並能同時處理多張圖片。

- **智慧圖片預縮放 (Smart Resizing)**：
  - 在進行臉部偵測前，先將超高解析度圖片（如 4K+）縮小到適合偵測的大小（如 1280px 寬）。
  - **效益**：大幅縮短 AI 偵測時間，且通常不會顯著影響偵測準確度。

- **GPU 加速優化**：
  - 確保 `face-api.js` 正確使用 WebGL 後端。
  - 針對不支援 WebGL 的裝置提供更輕量的模型 fallback (如 Tiny Face Detector)。

## 2. 🛠️ 功能增強 (New Features)

- **自訂貼圖 (Custom Stickers)**：
  - 允許使用者上傳自己的圖片（如 PNG 貼紙）作為遮擋圖示，而不僅限於 Emoji。
  - **實作**：新增檔案上傳輸入框，將上傳的圖片轉為 Image 物件供 Canvas 繪製。

- **匯出選項 (Export Options)**：
  - 下載時允許選擇圖片格式（JPG, PNG, WebP）與壓縮品質（Quality 0-100）。
  - **效益**：讓使用者在檔案大小與畫質間取得平衡。

- **批次編輯 (Batch Editing)**：
  - 新增「套用到全部」按鈕，將當前圖片的遮擋設定（如 Emoji 種類、大小、旋轉）一鍵應用到所有已上傳的照片。

- **人臉分群 (Face Clustering)** (進階)：
  - 簡單辨識是否為「同一個人」，讓使用者可以針對特定人物設定特定的遮擋方式。

## 3. 🎨 UI/UX 使用者體驗

- **深色/淺色模式切換 (Dark/Light Mode)**：
  - 目前預設為深色主題，可新增切換按鈕或跟隨系統設定。
  - **實作**：使用 CSS Variables 定義兩套色票。

- **拖曳排序 (Drag & Drop Reordering)**：
  - 允許使用者在預覽區塊中拖曳調整照片的順序。

- **新手引導 (Onboarding Tour)**：
  - 首次進入網站時，顯示簡單的步驟引導（Step-by-step guide），介紹如何上傳、編輯與下載。

- **無障礙設計 (Accessibility / A11y)**：
  - 加強鍵盤導航支援（Tab 鍵順序）。
  - 為螢幕閱讀器提供更完整的 ARIA 標籤。

## 4. 🏗️ 程式碼架構 (Architecture)

隨著功能增加，單一 `app.js` 檔案會變得難以維護。

- **模組化拆分 (ES Modules)**：
  - 將程式碼拆分為多個檔案，例如：
    - `face-detection.js`: 負責 AI 模型相關邏輯。
    - `image-processor.js`: 負責 Canvas 繪圖與遮擋邏輯。
    - `ui-manager.js`: 負責 DOM 操作與事件監聽。
    - `utils.js`: 通用工具函式。
  - **效益**：提升程式碼可讀性與可維護性。

- **導入 TypeScript**：
  - 如果專案規模持續擴大，建議導入 TypeScript 以獲得型別檢查，減少 Runtime Errors。

- **自動化測試 (Testing)**：
  - 建立基礎的單元測試 (Unit Tests) 針對核心演算法。
  - 使用 Cypress 或 Playwright 進行端對端測試 (E2E Tests)，確保關鍵流程（上傳 -> 偵測 -> 下載）功能正常。

---

## 📅 建議優先順序

1. **Web Workers** (提升核心體驗，解決卡頓)
2. **模組化拆分** (為後續擴充打好基礎)
3. **匯出選項** (實用性高)
4. **自訂貼圖** (增加趣味性)
