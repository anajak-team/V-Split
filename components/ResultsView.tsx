import React, { useState } from 'react';
import { Download, Film, CheckCircle } from 'lucide-react';
import JSZip from 'jszip';

interface ResultsViewProps {
  files: File[];
  onReset: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ files, onReset }) => {
  const [isZipping, setIsZipping] = useState(false);

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const doc = (window as any).document;
    const a = doc.createElement('a');
    a.href = url;
    a.download = file.name;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    if (isZipping) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.name, file);
      });

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 1, // Fastest compression, suitable for already compressed video files
        },
      });

      const url = URL.createObjectURL(blob);
      const doc = (window as any).document;
      const a = doc.createElement('a');
      a.href = url;
      a.download = 'v-split-clips.zip';
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to create ZIP archive:', error);
      alert('There was an error creating the ZIP file. Please try downloading clips individually.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-green-500/10 text-green-400 rounded-full mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Splitting Complete!</h2>
        <p className="text-gray-400">Generated {files.length} clips successfully.</p>
      </div>

      <div className="flex justify-end mb-6 space-x-4">
        <button
          onClick={onReset}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          Start Over
        </button>
        <button
          onClick={downloadAllAsZip}
          disabled={isZipping}
          className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg border border-transparent shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          <Download size={16} className="mr-2" />
          {isZipping ? 'Archiving...' : 'Download All (ZIP)'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {files.map((file, idx) => (
          <div key={idx} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 group">
            <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
               <Film size={48} className="text-gray-700" />
               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button 
                  onClick={() => downloadFile(file)}
                  className="bg-white text-gray-900 p-2 rounded-full transform scale-90 group-hover:scale-100 transition-transform"
                 >
                   <Download size={20} />
                 </button>
               </div>
            </div>
            <div className="p-4">
              <h4 className="text-white font-medium truncate mb-1">{file.name}</h4>
              <p className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
