"use client";

import { useState, useRef, useCallback } from 'react';
import { FaCamera, FaTimes, FaSpinner } from 'react-icons/fa';

interface CameraCaptureProps {
  onCapture: (imageData: string) => Promise<void>;
  onClose?: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setIsActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check your camera permissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose?.();
  }, [stopCamera, onClose]);

  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      setError('Failed to capture photo. Please try again.');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL('image/png');

      // Confirm with user
      if (window.confirm('Use this photo for processing?')) {
        setIsProcessing(true);
        setError(null);
        
        try {
          await onCapture(imageData);
          stopCamera();
        } catch (error) {
          console.error('Error processing photo:', error);
          setError('Failed to process photo. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      setError('Failed to capture photo. Please try again.');
    }
  }, [onCapture, stopCamera]);

  return (
    <div className="relative">
      {!isActive ? (
        <button
          onClick={startCamera}
          disabled={isLoading}
          className={`p-4 rounded-full transition-colors ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-yellow-400 hover:bg-orange-500'
          }`}
        >
          {isLoading ? (
            <FaSpinner className="w-6 h-6 text-white animate-spin" />
          ) : (
            <FaCamera className="w-6 h-6 text-white" />
          )}
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="relative w-full max-w-2xl">
            {error && (
              <div className="absolute top-16 left-4 right-4 bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 text-center">
                {error}
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-4">
              <button
                onClick={takePhoto}
                disabled={isProcessing}
                className={`p-4 rounded-full transition-colors ${
                  isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-yellow-400 hover:bg-orange-500'
                }`}
              >
                {isProcessing ? (
                  <FaSpinner className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <FaCamera className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

            <button
              onClick={handleClose}
              disabled={isProcessing}
              className={`absolute top-4 right-4 p-2 transition-colors ${
                isProcessing
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-white hover:text-yellow-400'
              }`}
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 