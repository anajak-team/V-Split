import React from 'react';
import { Clock, Scissors } from 'lucide-react';

interface ClipSettingsProps {
  duration: number;
  setDuration: (val: number) => void;
  videoDuration: number;
}

export const ClipSettings: React.FC<ClipSettingsProps> = ({ duration, setDuration, videoDuration }) => {
  const estimatedParts = Math.ceil(videoDuration / duration);

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 max-w-2xl mx-auto mt-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
        <Scissors className="mr-2 text-primary-500" size={20} />
        Configuration
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Split Interval (Seconds)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt((e.target as any).value) || 1))}
              className="bg-gray-900 border border-gray-700 text-white text-lg rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-4"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            For Instagram Stories use 15s or 60s, for Shorts use 60s.
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Total Length</span>
            <span className="text-white font-mono">
              {Math.floor(videoDuration / 60)}m {Math.round(videoDuration % 60)}s
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Estimated Clips</span>
            <span className="text-primary-400 font-bold text-lg">
              ~{estimatedParts}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};