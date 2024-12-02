"use client";

import { FaMicrophone, FaStop, FaPaperPlane, FaClock, FaList } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TranscriptionList from "../components/TranscriptionList";
import CameraCapture from '../components/CameraCapture';

interface TranscriptionResponse {
  text: string;
  saved: boolean;
  id: string;
}

const thinkingPhrases = [
  "Analyzing business context",
  "Processing industry data",
  "Identifying market opportunities",
  "Evaluating competitive landscape",
  "Formulating strategic recommendations",
  "Generating action items",
  "Finalizing strategy report",
  "Preparing insights"
] as const;

export default function Home() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showStoppedMessage, setShowStoppedMessage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const thinkingInterval = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (thinkingInterval.current) {
        clearInterval(thinkingInterval.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startThinkingAnimation = () => {
    setThinkingIndex(0);
    let currentIndex = 0;
    
    thinkingInterval.current = setInterval(() => {
      currentIndex++;
      if (currentIndex >= thinkingPhrases.length) {
        if (thinkingInterval.current) {
          clearInterval(thinkingInterval.current);
        }
      } else {
        setThinkingIndex(currentIndex);
      }
    }, 2500);
  };

  const stopThinkingAnimation = () => {
    if (thinkingInterval.current) {
      clearInterval(thinkingInterval.current);
      thinkingInterval.current = null;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setShowStoppedMessage(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          console.log("Audio blob created, size:", audioBlob.size);
          await sendAudioForTranscription(audioBlob);
        } catch (error) {
          console.error("Error processing audio:", error);
          setTranscript(prev => prev + "\nError processing audio.");
        } finally {
          setIsProcessing(false);
          audioChunksRef.current = [];
          setShowStoppedMessage(false);
        }
      });

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access your microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
      setShowStoppedMessage(true);
      setIsProcessing(true);
    }
  };

  const sendAudioForTranscription = async (audioBlob: Blob): Promise<void> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

    try {
      console.log("Sending audio for transcription...");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error (Transcription):", errorText);
        throw new Error(`Failed to transcribe audio: ${errorText}`);
      }

      const data: TranscriptionResponse = await response.json();
      if (data.text) {
        setTranscript(data.text);
        setIsExpanded(true);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      } else {
        throw new Error("No transcription text received");
      }
    } catch (error) {
      console.error("Error in sendAudioForTranscription:", error);
      throw error;
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!transcript.trim()) return;

    try {
      setIsProcessing(true);
      setIsAnalyzing(true);
      setShowStoppedMessage(false);
      startThinkingAnimation();

      // First, create the transcription
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcript }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transcription");
      }

      const { id } = await response.json();

      // Then, trigger the analysis
      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          transcriptionId: id, 
          text: transcript 
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error("Failed to analyze transcription");
      }

      setTranscript("");
      setIsExpanded(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process transcription. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsAnalyzing(false);
      stopThinkingAnimation();
    }
  };

  const handleCapture = async (imageData: string): Promise<void> => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/process-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error (Process Photo):', errorText);
        throw new Error(`Failed to process photo: ${errorText}`);
      }

      const result = await response.json();
      console.log('Processed photo:', result);
      
      // Navigate to the business cards page
      router.push('/business-cards');
    } catch (error) {
      console.error('Error processing photo:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-center text-6xl font-light mb-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-700 text-transparent bg-clip-text font-poppins">
          Selene
        </h1>
        
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="flex justify-center items-center gap-4 w-full max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setIsExpanded(e.target.value.length > 0);
              }}
              onFocus={() => setIsExpanded(true)}
              onBlur={() => !transcript && setIsExpanded(false)}
              placeholder="Tell me something about your business"
              className={`flex-1 p-4 bg-black/10 text-white font-poppins resize-none outline-none transition-all duration-200 ${
                isExpanded 
                  ? 'rounded-lg min-h-[100px]' 
                  : 'rounded-full h-[52px] overflow-hidden'
              }`}
              style={{ maxHeight: '300px' }}
            />
            
            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isProcessing}
                  className={`p-4 rounded-full transition-colors ${
                    isProcessing 
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-yellow-400 hover:bg-orange-500'
                  }`}
                >
                  <FaMicrophone className="w-6 h-6 text-white" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="p-4 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                >
                  <FaStop className="w-6 h-6 text-white" />
                </button>
              )}

              {transcript && (
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className={`p-4 rounded-full transition-colors ${
                    isProcessing 
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-yellow-400 hover:bg-orange-500'
                  }`}
                >
                  {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaPaperPlane className="w-6 h-6 text-white" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Recording timer */}
          {isRecording && (
            <div className="mt-2 text-yellow-400 flex items-center justify-center">
              <FaClock className="w-4 h-4 mr-1" />
              <span>{formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Status Messages */}
          {showStoppedMessage && (
            <div className="mt-4 text-yellow-400 flex items-center justify-center">
              <span className="text-sm font-medium">Recording Stopped</span>
            </div>
          )}
          
          {isAnalyzing && (
            <div className="mt-4 text-yellow-400 flex items-center justify-center">
              <span className="text-sm font-medium animate-pulse">
                {thinkingPhrases[thinkingIndex]}...
              </span>
            </div>
          )}
        </div>

        <div className="mt-8">
          <TranscriptionList />
        </div>

        <div className="fixed bottom-8 right-8 flex items-center space-x-4">
          <Link
            href="/business-cards"
            className="p-4 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
          >
            <FaList className="w-6 h-6 text-white" />
          </Link>
          
          <CameraCapture onCapture={handleCapture} />
        </div>
      </div>
    </div>
  );
}
