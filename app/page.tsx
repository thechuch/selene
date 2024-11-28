"use client";

import { FaMicrophone, FaStop, FaCamera, FaPaperPlane, FaClock } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle textarea height adjustment
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  }, [transcript]);

  const handleTranscribe = async () => {
    if (isRecording) {
      setIsProcessing(true);
      try {
        mediaRecorderRef.current?.stop();
        audioStreamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setRecordingTime(0);
      } catch (error) {
        console.error("Error stopping recording:", error);
        setIsProcessing(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.addEventListener("dataavailable", (event) => {
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
          }
        });

        mediaRecorder.start(1000);
        setIsRecording(true);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Could not access your microphone. Please check permissions.");
        setIsProcessing(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendAudioForTranscription = async (audioBlob: Blob) => {
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

      const data = await response.json();
      setTranscript(prev => prev + (prev ? "\n" : "") + data.text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error("Error in sendAudioForTranscription:", error);
      setTranscript(prev => prev + "\nTranscription failed. Please try again.");
      throw error;
    }
  };

  const handleCameraClick = () => {
    console.log("Camera clicked");
  };

  const handleSendClick = () => {
    console.log("Send clicked");
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-center text-6xl font-light mb-12 bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-700 text-transparent bg-clip-text">Selene</h1>
        
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            {/* Recording button */}
            <button
              onClick={handleTranscribe}
              disabled={isProcessing}
              className="p-4 bg-yellow-400 rounded-full hover:bg-orange-500 transition-colors"
            >
              {isRecording ? (
                <FaStop className="w-6 h-6 text-white" />
              ) : (
                <FaMicrophone className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Camera button */}
            <button
              onClick={handleCameraClick}
              className="p-4 bg-yellow-400 rounded-full hover:bg-orange-500 transition-colors"
            >
              <FaCamera className="w-6 h-6 text-white" />
            </button>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Tell me something about your business."
                className="w-full bg-transparent text-white resize-none focus:outline-none rounded-full px-6 py-3 min-h-[48px] border border-transparent hover:border-yellow-400/30 focus:border-gradient"
                style={{
                  background: 'transparent',
                  borderImage: 'linear-gradient(to right, #facc15, #c2410c) 1'
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSendClick}
              className="p-4 bg-yellow-400 rounded-full hover:bg-orange-500 transition-colors"
            >
              <FaPaperPlane className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Recording timer */}
          {isRecording && (
            <div className="mt-2 text-yellow-400 flex items-center">
              <FaClock className="w-4 h-4 mr-1" />
              <span>{formatTime(recordingTime)}</span>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-2 text-yellow-400">
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
