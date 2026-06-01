import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  isDark: boolean;
  themeColor: string;
  onProductFound: (p: { name: string; calories: number; protein: number; fat: number; carbs: number }) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ isDark, themeColor, onProductFound, onClose }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portion, setPortion] = useState('100');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-box';

  useEffect(() => { return () => { stopScan(); }; }, []);

  const startScan = async () => {
    setError(null); setIsScanning(true);
    try {
      const s = new Html5Qrcode(containerId);
      scannerRef.current = s;
      await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 100 } },
        async (code) => { setScannedCode(code); await stopScan(); await lookup(code); }, () => {});
    } catch { setError('Камера недоступна'); setIsScanning(false); }
  };

  const stopScan = async () => {
    if (scannerRef.current) { try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {} scannerRef.current = null; }
    setIsScanning(false);
  };

  const lookup = async (barcode: string) => {
    setIsLoading(true); setError(null);
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_uk,product_name_en,nutriments`);
      const d = await r.json();
      if (d.status === 0 || !d.product) { setError('Продукт не знайдено'); return; }
      setProduct(d.product);
    } catch { setError('Помилка пошуку'); } finally { setIsLoading(false); }
  };

  const handleAdd = () => {
    if (!product?.nutriments) return;
    const f = (parseFloat(portion) || 100) / 100;
    const name = product.product_name_uk || product.product_name || product.product_name_en || 'Продукт';
    onProductFound({ name: `${name} (${Math.round(f*100)}г)`, calories: Math.round((product.nutriments['energy-kcal_100g']||0)*f), protein: Math.round((product.nutriments.proteins_100g||0)*f), fat: Math.round((product.nutriments.fat_100g||0)*f), carbs: Math.round((product.nutriments.carbohydrates_100g||0)*f) });
  };

  const reset = () => { setScannedCode(null); setProduct(null); setError(null); setPortion('100'); };
  const cb = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm';
  const tm = isDark ? 'text-white' : 'text-slate-900';
  const td = isDark ? 'text-white/50' : 'text-slate-500';
  const inp = `w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 ${isDark ? 'bg-white/5 border border-white/10 text-white focus:ring-white/20' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:ring-purple-200'}`;

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cb}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><span className="text-lg">📱</span><h3 className={`text-sm font-bold ${tm}`}>Сканер штрих-коду</h3></div>
        <button onClick={() => { stopScan(); onClose(); }} className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'text-white/40 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>✕</button>
      </div>
      <div id={containerId} className="w-full rounded-xl overflow-hidden" style={{ display: isScanning ? 'block' : 'none', minHeight: isScanning ? 200 : 0 }} />
      {!isScanning && !product && !isLoading && (
        <div className="text-center py-4 space-y-3">
          <div className="text-4xl">📷</div>
          <p className={`text-xs ${td}`}>Наведи камеру на штрих-код</p>
          <button onClick={startScan} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95" style={{ background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}>Сканувати</button>
        </div>
      )}
      {isLoading && <div className="flex items-center justify-center gap-3 py-6"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${themeColor}40`, borderTopColor: themeColor }} /><p className={`text-sm ${td}`}>Шукаю...</p></div>}
      {error && <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}><p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p><button onClick={reset} className="text-xs font-semibold mt-2" style={{ color: themeColor }}>Знову</button></div>}
      {product && (
        <div className="space-y-3">
          <div className={`rounded-xl p-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
            <p className={`text-sm font-bold ${tm}`}>{product.product_name_uk || product.product_name || product.product_name_en}</p>
            {scannedCode && <p className={`text-[10px] ${td}`}>Код: {scannedCode}</p>}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ l:'Ккал',v:product.nutriments?.['energy-kcal_100g']||0,c:themeColor},{l:'Білки',v:product.nutriments?.proteins_100g||0,c:'#10b981'},{l:'Жири',v:product.nutriments?.fat_100g||0,c:'#f59e0b'},{l:'Вуглев.',v:product.nutriments?.carbohydrates_100g||0,c:'#3b82f6'}].map(m=>(
              <div key={m.l} className={`rounded-xl p-2 ${isDark?'bg-white/5':'bg-slate-50'}`}><p className="text-lg font-black" style={{color:m.c}}>{Math.round(m.v)}</p><p className={`text-[9px] ${td}`}>{m.l}/100г</p></div>
            ))}
          </div>
          <div><label className={`block text-[10px] font-medium mb-1 ${td}`}>Порція (г)</label><input type="number" value={portion} onChange={e=>setPortion(e.target.value)} className={inp}/></div>
          <div className="flex gap-2">
            <button onClick={reset} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 ${isDark?'bg-white/10 text-white':'bg-slate-100 text-slate-700'}`}>Скинути</button>
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95" style={{background:`linear-gradient(135deg,${themeColor},#6366f1)`}}>Додати</button>
          </div>
        </div>
      )}
    </div>
  );
};
