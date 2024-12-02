"use client";

import { FaMicrophone, FaStop, FaPaperPlane, FaClock } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import TranscriptionList from "../components/TranscriptionList";

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
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
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
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || "Failed to analyze transcription");
      }

      const { analysis } = await analysisResponse.json();
      if (!analysis) {
        throw new Error("No analysis received from the server");
      }

      // Only clear the transcript and reset UI after successful analysis
      setTranscript("");
    } catch (error) {
      console.error("Error:", error);
      alert(error instanceof Error ? error.message : "Failed to process transcription. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsAnalyzing(false);
      stopThinkingAnimation();
    }
  };

  return (
    <main className="min-h-screen bg-black">
      <div className="main-container">
        <h1 className="selene-title">Selene</h1>
        
        <div className="space-y-8">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Tell me something about your business"
              className="w-full min-h-[100px]"
              disabled={isRecording || isProcessing}
            />
            
            <div className="absolute right-4 bottom-4 flex items-center space-x-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`record-button ${
                  isRecording ? 'recording' : 'not-recording'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? (
                  <FaStop className="w-6 h-6 text-white" />
                ) : (
                  <FaMicrophone className="w-6 h-6 text-white" />
                )}
              </button>
              
              {transcript && !isRecording && (
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="submit-button"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-b-transparent" />
                  ) : (
                    <FaPaperPlane className="w-6 h-6 text-white" />
                  )}
                </button>
              )}
            </div>
            
            {isRecording && (
              <div className="absolute left-4 bottom-4 status-message text-red-500">
                <div className="animate-pulse">●</div>
                <span className="font-mono">{formatTime(recordingTime)}</span>
              </div>
            )}
            
            {showStoppedMessage && !isProcessing && (
              <div className="absolute left-4 bottom-4 status-message">
                <FaClock className="w-4 h-4 mr-2" />
                <span>Processing your recording...</span>
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute left-4 bottom-4 thinking-animation">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                <span className="text-sm font-medium animate-pulse">
                  {thinkingPhrases[thinkingIndex]}...
                </span>
              </div>
            )}
          </div>

          <TranscriptionList />
        </div>
      </div>
    </main>
  );
}
