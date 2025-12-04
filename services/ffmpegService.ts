import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { LogEntry } from '../types';

export class FFmpegService {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;
  private logCallback: (log: LogEntry) => void;

  constructor(onLog: (log: LogEntry) => void) {
    this.ffmpeg = new FFmpeg();
    this.logCallback = onLog;
    
    // Hook into internal logs
    this.ffmpeg.on('log', ({ message }) => {
      this.log('info', message);
    });
  }

  private log(type: 'info' | 'error' | 'success', message: string) {
    this.logCallback({
      type,
      message,
      timestamp: Date.now()
    });
  }

  public async load() {
    if (this.loaded) return;

    try {
      this.log('info', 'Checking environment capabilities...');
      if (!(window as any).crossOriginIsolated) {
        this.log('info', 'Note: SharedArrayBuffer is not available. Using single-threaded core.');
      }

      this.log('info', 'Loading FFmpeg resources...');
      
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
      const coreBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';

      // 1. Fetch Worker Script manually
      // We do this to replace the internal relative imports with absolute CDN URLs
      // so we can load it from a Blob URL without CORS issues.
      this.log('info', 'Fetching worker script...');
      const workerResp = await fetch(`${baseURL}/worker.js`);
      if (!workerResp.ok) throw new Error(`Failed to fetch worker: ${workerResp.statusText}`);
      let workerScript = await workerResp.text();

      // 2. Patch relative imports in the worker
      // Minified code might look like: import{FFmpeg}from"./classes.js";
      // Regex explanation:
      // from      : match literal "from"
      // \s*       : match zero or more spaces (handles minified vs unminified)
      // ['"]      : match opening quote
      // \.\/      : match literal "./"
      // (.*?)     : capture the filename (lazy)
      // ['"]      : match closing quote
      this.log('info', 'Patching worker imports...');
      const oldScript = workerScript;
      workerScript = workerScript.replace(
        /from\s*['"]\.\/(.*?)['"]/g, 
        (match, p1) => `from '${baseURL}/${p1}'`
      );

      if (workerScript === oldScript) {
        this.log('info', 'Warning: No imports patched in worker script. Regex might be mismatched.');
      }

      // 3. Create Blob URL for the worker
      const workerBlob = new Blob([workerScript], { type: 'text/javascript' });
      const workerURL = URL.createObjectURL(workerBlob);
      this.log('info', `Created worker blob: ${workerURL}`);

      // 4. Load Core and WASM as Blobs
      // We use toBlobURL to fetch these resources and convert them to local blob: URLs
      // This bypasses the strict CSP/CORS worker construction requirements.
      const coreURL = await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm');

      this.log('info', 'Initializing FFmpeg engine...');
      
      // 5. Load FFmpeg with explicit URLs
      // We pass workerURL (and classWorkerURL for safety) to force the library
      // to use our local blob instead of trying to access the CDN directly.
      await this.ffmpeg.load({
        coreURL: coreURL,
        wasmURL: wasmURL,
        workerURL: workerURL,
        classWorkerURL: workerURL // Explicitly override both to ensure Blob usage
      });
      
      this.loaded = true;
      this.log('success', 'FFmpeg core loaded successfully.');
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to load FFmpeg: ${msg}`);
      throw new Error(`FFmpeg Load Error: ${msg}`);
    }
  }

  public async splitVideo(
    file: File, 
    segmentDuration: number, 
    onProgress: (progress: number) => void
  ): Promise<File[]> {
    if (!this.loaded) await this.load();

    // Rename file virtually to ensure simple ASCII name for FFmpeg
    // This creates a reference, it does not copy the file data.
    const inputFileName = 'input.mp4';
    const safeFile = new File([file], inputFileName, { type: file.type });
    
    const mountDir = '/input_mount';
    const inputPath = `${mountDir}/${inputFileName}`;
    const outputPattern = 'output_%03d.mp4';

    try {
      this.log('info', 'Mounting input file...');
      
      // Create a directory to mount the file system
      await this.ffmpeg.createDir(mountDir);
      
      // Mount the file using WORKERFS. 
      // This allows FFmpeg to read directly from the Blob/File without loading 
      // the entire content into RAM (MEMFS), preventing OOM on large files.
      // Casting to 'any' because strict types sometimes miss the 'mount' method in wrapper.
      await (this.ffmpeg as any).mount('WORKERFS', { files: [safeFile] }, mountDir);

      this.log('info', `Starting segmentation (Duration: ${segmentDuration}s)...`);
      onProgress(10); 

      // Command explanation:
      // -i inputPath : Read from the mounted path
      // -c copy      : Stream copy (fast, no re-encoding)
      // -map 0       : Map all streams
      // -f segment   : Segment muxer
      // -segment_time: Split duration
      // -reset_timestamps 1 : Reset timestamps for each clip
      await this.ffmpeg.exec([
        '-i', inputPath,
        '-c', 'copy',
        '-map', '0',
        '-f', 'segment',
        '-segment_time', segmentDuration.toString(),
        '-reset_timestamps', '1',
        outputPattern
      ]);

      onProgress(80);
      this.log('success', 'Segmentation complete. Processing output files...');

      // Unmount input immediately to free up resources
      try {
        await (this.ffmpeg as any).unmount(mountDir);
        await this.ffmpeg.deleteDir(mountDir);
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }

      const files: File[] = [];
      const dir = await this.ffmpeg.listDir('.');
      
      for (const f of dir) {
        if (!f.isDir && f.name.startsWith('output_') && f.name.endsWith('.mp4')) {
          // Read the output file from MEMFS
          const data = await this.ffmpeg.readFile(f.name);
          const blob = new Blob([data], { type: 'video/mp4' });
          files.push(new File([blob], f.name, { type: 'video/mp4' }));
          
          // CRITICAL: Delete the file from MEMFS immediately after reading to free RAM
          await this.ffmpeg.deleteFile(f.name);
        }
      }
      
      onProgress(100);
      return files;

    } catch (error: any) {
      // Attempt cleanup on error
      try {
        await (this.ffmpeg as any).unmount(mountDir);
        await this.ffmpeg.deleteDir(mountDir);
      } catch(e) {}

      this.log('error', `Processing failed: ${error.message}`);
      throw error;
    }
  }
}