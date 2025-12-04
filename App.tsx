import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { ClipSettings } from './components/ClipSettings';
import { Button } from './components/Button';
import { ResultsView } from './components/ResultsView';
import { FFmpegService } from './services/ffmpegService';
import { AppState, LogEntry } from './types';
import { Terminal, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [splitDuration, setSplitDuration] = useState<number>(30);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [outputFiles, setOutputFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Refs
  const ffmpegRef = useRef<FFmpegService | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize FFmpeg Service
  useEffect(() => {
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpegService((log) => {
        setLogs(prev => [...prev, log]);
      });
      // Preload core
      setState(AppState.LOADING_CORE);
      ffmpegRef.current.load()
        .then(() => setState(AppState.READY))
        .catch((err) => {
          console.error(err);
          setErrorMessage(err instanceof Error ? err.message : String(err));
          setState(AppState.ERROR);
        });
    }
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    (logsEndRef.current as any)?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle Video Selection and Duration extraction
  const handleFileSelect = useCallback((file: File) => {
    setVideoFile(file);
    // Create hidden video element to get duration
    const video = (window as any).document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      (window as any).URL.revokeObjectURL(video.src);
      setVideoDuration(video.duration);
    };
    video.src = URL.createObjectURL(file);
  }, []);

  // Main Process
  const handleSplit = async () => {
    if (!videoFile || !ffmpegRef.current) return;

    try {
      setState(AppState.PROCESSING);
      setProgress(0);
      setLogs([]); // Clear previous logs
      
      const resultFiles = await ffmpegRef.current.splitVideo(
        videoFile, 
        splitDuration, 
        (p) => setProgress(Math.round(p))
      );

      setOutputFiles(resultFiles);
      setState(AppState.COMPLETED);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Processing failed');
      setState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setOutputFiles([]);
    setProgress(0);
    setLogs([]);
    setState(AppState.READY);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <Zap className="text-white h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">V-Split</h1>
          </div>
          <div className="text-sm text-gray-400 hidden sm:block">
            Browser-based Video Segmentation
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-8">
        
        {state === AppState.LOADING_CORE && (
          <div className="text-center animate-pulse">
            <p className="text-lg text-gray-400">Initializing Core Engine...</p>
          </div>
        )}

        {state === AppState.ERROR && (
          <div className="text-center max-w-lg bg-red-900/10 border border-red-900/50 p-8 rounded-2xl">
             <h2 className="text-red-500 text-xl font-bold mb-4">Engine Error</h2>
             <p className="text-gray-300 mb-6">
               Failed to initialize the video processing engine.
             </p>
             <div className="bg-black/30 p-4 rounded-lg mb-6 text-left overflow-auto max-h-40">
               <code className="text-red-400 text-xs font-mono">{errorMessage || "Unknown error occurred"}</code>
             </div>
             <p className="text-gray-400 text-sm mb-6">
               This app requires a browser with SharedArrayBuffer support. Please try using a recent version of Chrome, Edge, or Firefox.
             </p>
             <Button onClick={() => (window as any).location.reload()}>Retry</Button>
          </div>
        )}

        {(state === AppState.READY || state === AppState.IDLE) && !videoFile && (
           <div className="w-full max-w-4xl space-y-8 animate-fade-in">
             <div className="text-center space-y-4 mb-12">
               <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                 Split videos instantly.
               </h2>
               <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                 Process videos locally in your browser. No server uploads, maximum privacy.
                 Perfect for creating WhatsApp Status, Instagram Stories, or TikTok shorts.
               </p>
             </div>
             <VideoUploader onFileSelect={handleFileSelect} />
           </div>
        )}

        {(state === AppState.READY || state === AppState.IDLE) && videoFile && (
          <div className="w-full max-w-3xl space-y-8 animate-fade-in">
            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <FilmIcon />
                </div>
                <div>
                  <h3 className="font-medium text-white">{videoFile.name}</h3>
                  <p className="text-sm text-gray-500">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
              <button onClick={() => setVideoFile(null)} className="text-gray-400 hover:text-white px-3 py-1">
                Change
              </button>
            </div>

            <ClipSettings 
              duration={splitDuration} 
              setDuration={setSplitDuration} 
              videoDuration={videoDuration}
            />

            <div className="flex justify-center pt-6">
              <Button onClick={handleSplit} className="w-full sm:w-auto text-lg px-12 py-4">
                Start Splitting
              </Button>
            </div>
          </div>
        )}

        {state === AppState.PROCESSING && (
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Processing Video</h3>
              <p className="text-gray-400">Please wait while we segment your file...</p>
            </div>

            {/* Progress Bar */}
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-600 bg-primary-200/10">
                    Progress
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-primary-600">
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                <div 
                  style={{ width: `${progress}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-600 transition-all duration-300 ease-out"
                ></div>
              </div>
            </div>

            {/* Logs Terminal */}
            <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto border border-gray-800 shadow-inner">
              <div className="flex items-center text-gray-500 mb-2 border-b border-gray-800 pb-2">
                <Terminal size={14} className="mr-2" />
                <span>System Logs</span>
              </div>
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'info' ? 'text-gray-400' : ''}
                  `}>
                    <span className="opacity-50 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && (
          <ResultsView files={outputFiles} onReset={handleReset} />
        )}
      </main>

      <footer className="py-6 text-center text-gray-600 text-sm border-t border-gray-800">
        <p>V-Split &copy; {new Date().getFullYear()} • Powered by ANAJAK Team.</p>
      </footer>
    </div>
  );
};

// Simple Icon helper
const FilmIcon = () => (
  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

export default App;