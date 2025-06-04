const translations = {
  // Header
  appTitle: "🤖 Çoklu-YZ Soru Çözücü",
  appDescription: "Sorularınızı içeren görselleri yükleyin ve OpenAI ile Claude'dan cevaplar alın",
  
  // Upload section
  dragDropText: "Görselleri buraya sürükleyip bırakın veya dosya seçmek için tıklayın",
  dragDropActive: "Görselleri buraya bırakın...",
  supportedFormats: "JPEG, PNG, GIF, WebP formatları desteklenir (her biri maksimum 10MB, en fazla 8 görsel)",
  fileCounter: "dosya seçildi",
  selectedFiles: "Seçilen Dosyalar:",
  removeFile: "Kaldır",
  maxImagesError: "Maksimum 8 görsel izni verilmektedir. {count} görsel seçtiniz. Lütfen {excess} görseli kaldırın.",
  
  // Batch mode
  batchMode: "Toplu İşlem Modu",
  batchModeDescription: "Tüm görselleri {total} API çağrısı yerine 2 API çağrısında işle",
  batchModeEnabled: "✅ Etkin: Daha hızlı işleme, düşük maliyetler, tek birleşik analiz",
  batchModeDisabled: "⚠️ Devre dışı: Her görsel ayrı ayrı işlenir (daha fazla API çağrısı)",
  
  // Prompt and analysis
  promptPlaceholder: "İsteğe bağlı: Özel bir istem veya soru ekleyin (varsayılan analiz için boş bırakın)",
  analyzeButton: "Görseli Analiz Et",
  analyzeButtonBatch: "🚀 {count} Görseli Analiz Et (Toplu Mod)",
  analyzeButtonIndividual: "{count} Görseli Analiz Et (Tekil Mod)",
  analyzingText: "YZ modelleri ile analiz ediliyor...",
  
  // Error messages
  minImagesError: "Lütfen en az bir görsel yükleyin",
  maxImagesAnalysisError: "Analiz başına maksimum 8 görsel izni verilmektedir. Lütfen bazı görselleri kaldırın.",
  analysisError: "Görselleri analiz etme başarısız oldu. Lütfen tekrar deneyin.",
  networkError: "Ağ hatası - bu, çok sayıda görsel ({count}) nedeniyle zaman aşımından kaynaklanabilir. Daha az görsel (maksimum 8) ile deneyin veya bağlantınızı kontrol edin.",
  fileNotFoundError: "Dosya bulunamadı: {filename}. Bu bir karakter kodlama sorunu olabilir. Lütfen tekrar yüklemeyi deneyin.",
  strongEvaluationError: "{filename} için güçlü değerlendirme başarısız oldu: {error}",
  
  // Results section
  analysisResults: "Analiz Sonuçları",
  
  // Batch processing info
  batchProcessingUsed: "🚀 Toplu İşlem Kullanıldı!",
  batchProcessingDescription: "<strong>{totalImages} görsel</strong> sadece <strong>2 API çağrısı</strong> ile işlendi (<strong>{savedCalls} API çağrısı tasarruf edildi</strong>!)",
  batchBenefits: {
    faster: "⚡ Daha hızlı işleme",
    cheaper: "💰 Düşük maliyetler", 
    better: "🧠 Daha iyi çapraz-görsel analizi"
  },
  
  individualProcessingUsed: "📊 Tekil İşlem Kullanıldı",
  individualProcessingDescription: "<strong>{totalImages} görsel</strong> <strong>{totalApiCalls} API çağrısı</strong> ile işlendi",
  batchModeTip: "💡 İpucu: Birden fazla görsel için toplu modu etkinleştirerek API çağrılarından tasarruf edin ve daha hızlı sonuçlar alın!",
  
  // Evaluation
  evaluateStrongly: "🚀 Güçlü Değerlendirme",
  evaluating: "Değerlendiriliyor...",
  strongEvaluationResults: "🚀 Güçlü Değerlendirme Sonuçları",
  powerfulModels: "Güçlü Modeller",
  
  // Status and errors
  statusTitles: {
    consensus: "Konsensüs - Tüm modeller hemfikir",
    partial: "Kısmi uyum",
    different: "Farklı - Modeller hemfikir değil",
    error: "Hata",
    unknown: "Bilinmeyen"
  },
  
  errorProcessingImage: "Bu görseli işlerken hata oluştu: {error}",
  errorGeneral: "Hata: {error}",
  
  // File size units
  fileSizeUnits: {
    bytes: "Bayt",
    kb: "KB", 
    mb: "MB",
    gb: "GB"
  }
};

export default translations; 