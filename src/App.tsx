/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, CheckCircle, AlertCircle, RefreshCcw, FileText, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

import { Type } from "@google/genai";

interface GradingItem {
  number: number;
  studentAnswer: string;
  answerKey: string;
  score: number;
  status: string;
  error: string;
}

interface GradingResult {
  items: GradingItem[];
}

export default function App() {
  const [fileData, setFileData] = useState<{ data: string, mimeType: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFileData({
          data: base64,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeAnswer = async () => {
    if (!fileData) {
      alert("Mohon unggah file jawaban mahasiswa.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const model = "gemini-3-flash-preview";
      
      const prompt = `
        Anda adalah asisten dosen yang bertugas memeriksa jawaban algoritma atau pseudocode mahasiswa dari dokumen (PDF atau Gambar) yang diunggah.
        
        Tugas Anda:
        1. Identifikasi setiap nomor soal dalam dokumen.
        2. Untuk setiap nomor, temukan:
           - "Jawaban Mahasiswa": Teks algoritma/pseudocode yang ditulis dalam warna hitam/teks utama.
           - "Kunci Jawaban": Teks algoritma/pseudocode yang berada dalam kotak berwarna KUNING (biasanya di bagian bawah soal). 
             PENTING: Jika kotak kuning (Kunci Jawaban) TIDAK DITEMUKAN dalam dokumen, gunakan pengetahuan ahli Anda untuk menentukan jawaban yang benar secara mandiri dan lakukan koreksi dengan sangat tepat.
        3. Berikan penilaian untuk setiap nomor (skor 0-10).
        
        Aturan Penilaian & Kebijakan Bahasa:
        - Akurasi: Jika kunci jawaban tidak ada, Anda harus menilai berdasarkan standar algoritma yang benar dan logis secara ketat.
        - Logika dan Bahasa: Upayakan bahasa dan logika sama persis dengan kunci jawaban (jika ada) atau standar industri yang benar.
        - Indentasi: Periksa apakah mahasiswa menggunakan indentasi yang benar (terutama di dalam loop atau kondisi). Jika indentasi berantakan, berikan penalti.
        - Penalti Bahasa: Jika logika benar tetapi istilah bahasa berbeda (contoh: kunci "output" tapi mahasiswa menulis "cetak", atau "input" jadi "baca"), berikan penalti RINGAN (kurangi 1 poin). Sebutkan di bagian 'error' bahwa istilah kurang tepat.
        - Struktur program & Indentasi: 3 poin.
        - Penggunaan nested loop: 3 poin.
        - Logika kondisi: 3 poin.
        - Sintaks penutup: 1 poin.
        - Toleransi: Berikan toleransi typo selama logika benar, namun tetap prioritaskan kesesuaian istilah dan indentasi dengan standar yang benar.
      `;

      const base64Data = fileData.data.split(',')[1];
      const response = await genAI.models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: fileData.mimeType, data: base64Data } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER },
                    studentAnswer: { type: Type.STRING },
                    answerKey: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    status: { type: Type.STRING },
                    error: { type: Type.STRING }
                  },
                  required: ["number", "studentAnswer", "answerKey", "score", "status", "error"]
                }
              }
            },
            required: ["items"]
          }
        }
      });

      const parsedResult = JSON.parse(response.text || "{}");
      setResult(parsedResult);
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Terjadi kesalahan saat menganalisis jawaban.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFileData(null);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 border-b border-[#141414] pb-6 flex justify-between items-end">
          <div>
            <h1 className="font-serif italic text-4xl mb-2">Asisten Dosen AI</h1>
            <p className="text-sm opacity-60 uppercase tracking-widest">Sistem Pemeriksa Algoritma Otomatis</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono opacity-50">VERSI 2.0.0</p>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-8">
          {/* Input Section */}
          <section className="bg-white border border-[#141414] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-bold">Unggah File Jawaban</h2>
            </div>

            <div className="space-y-4">
              {fileData ? (
                <div className="relative border border-[#141414] aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
                  {fileData.mimeType.includes('image') ? (
                    <img src={fileData.data} alt="Preview" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={48} className="opacity-20" />
                      <span className="text-xs font-mono uppercase tracking-widest">PDF Dokumen Terpilih</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setFileData(null)}
                    className="absolute top-2 right-2 p-1 bg-white border border-[#141414] hover:bg-gray-100"
                  >
                    <RefreshCcw size={14} />
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-[#141414] aspect-video flex flex-col items-center justify-center gap-4 bg-gray-50">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-8 hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#141414]/5 flex items-center justify-center group-hover:bg-[#141414]/10 transition-colors">
                      <Upload size={32} />
                    </div>
                    <span className="text-xs uppercase font-mono tracking-widest mt-2">Pilih File Jawaban (PDF/Gambar)</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={handleFileUpload} 
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={analyzeAnswer}
                disabled={isAnalyzing || !fileData}
                className={`w-full py-4 bg-[#141414] text-white font-mono uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-3 transition-all ${isAnalyzing || !fileData ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black'}`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Mulai Koreksi
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Results Section */}
          <AnimatePresence>
            {result && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-emerald-600" size={20} />
                    <h2 className="font-mono text-xs uppercase tracking-[0.2em] font-bold">Hasil Penilaian Per Nomor</h2>
                  </div>
                  <div className="font-mono text-[10px] opacity-50 uppercase tracking-widest">
                    Total: {result.items.length} Soal
                  </div>
                </div>

                <div className="space-y-3">
                  {result.items.map((item, idx) => (
                    <div key={idx} className="bg-white border border-[#141414] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row">
                        {/* Score Column */}
                        <div className="bg-[#141414] text-white p-4 md:w-32 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#141414]">
                          <span className="text-[10px] uppercase font-mono opacity-50 mb-1">Nomor {item.number}</span>
                          <span className="font-mono text-3xl font-bold">{item.score}</span>
                        </div>
                        
                        {/* Explanation Column */}
                        <div className="flex-1 p-4 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${item.status.toLowerCase().includes('benar') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <h3 className="text-[10px] uppercase font-mono tracking-widest font-bold">{item.status}</h3>
                          </div>
                          <p className="text-sm font-serif italic text-[#141414]/80">
                            {item.error || 'Jawaban sudah sesuai dengan kunci dan kriteria penilaian.'}
                          </p>
                        </div>

                        {/* Quick View Toggle (Optional/Compact) */}
                        <details className="border-t md:border-t-0 md:border-l border-[#141414]">
                          <summary className="p-4 text-[10px] uppercase font-mono cursor-pointer hover:bg-gray-50 list-none flex items-center justify-center h-full">
                            Detail Kode
                          </summary>
                          <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#141414]">
                            <div>
                              <h4 className="text-[9px] uppercase font-mono opacity-50 mb-2">Mahasiswa:</h4>
                              <pre className="text-[10px] font-mono bg-white p-2 border border-[#141414]/10 overflow-x-auto">
                                {item.studentAnswer}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-[9px] uppercase font-mono opacity-50 mb-2">Kunci:</h4>
                              <pre className="text-[10px] font-mono bg-yellow-50 p-2 border border-yellow-200 overflow-x-auto">
                                {item.answerKey}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <button 
                    onClick={reset}
                    className="group flex items-center gap-3 px-10 py-4 border border-[#141414] font-mono text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all"
                  >
                    <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                    Reset & Mulai Baru
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
