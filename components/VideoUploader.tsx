import React, { useRef, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const validateAndPass = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file.');
      return;
    }
    // Limit size to 5GB
    if (file.size > 5 * 1024 * 1024 * 1024) { 
      setError('For browser performance, please use videos under 5GB.');
      return;
    }
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer as any;
    if (dt.files && dt.files[0]) {
      validateAndPass(dt.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as any;
    if (target.files && target.files[0]) {
      validateAndPass(target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => (inputRef.current as any)?.click()}
        className={`
          relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300
          ${isDragging 
            ? 'border-primary-500 bg-primary-600/10' 
            : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 bg-gray-800/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleChange}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-primary-600/20 text-primary-500' : 'bg-gray-800 text-gray-400'}`}>
            {isDragging ? <FileVideo size={48} /> : <Upload size={48} />}
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-200">
              {isDragging ? 'Drop video here' : 'Click to upload or drag video'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              MP4, MOV, MKV supported (Max 5GB)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-200 animate-fade-in">
          <AlertCircle size={20} className="mr-3" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};