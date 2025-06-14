import React, { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Mic, AudioWaveform, Thermometer, Wind, Smile, Frown, Meh } from 'lucide-react';
import axios from 'axios';
import SignLanguageAnimator from './SignLanguageAnimator';

const Dashboard = () => {
  const [textInput, setTextInput] = useState('');
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isChecking, setIsChecking] = useState(false);
  const [correctedText, setCorrectedText] = useState('');

  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  
  // Add sentiment analysis state
  const [sentimentData, setSentimentData] = useState(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  
  // Colors for sentiment donut chart
  const SENTIMENT_COLORS = {
    positive: '#4CAF50', // Green
    neutral: '#FFC107',  // Amber
    negative: '#F44336'  // Red
  };

  useEffect(() => {
    // Initialize Speech Recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setTextInput(transcript);
      };
    }

    // Initialize Audio Context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    // Cleanup
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const addPunctuation = async (text) => {
    try {
        setIsChecking(true);

        const apiKey = 'AIzaSyDsZCP_hY3pDpqmz67-pbKQrg32LANSODs';

        if (!apiKey) {
            throw new Error("API key is missing. Please set your Gemini API key.");
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `Add proper punctuation and capitalization to this text: "${text}"` }]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 150,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        const correctedText = response.data.candidates[0].content.parts[0].text.trim();
        setTextInput(correctedText);
        setCorrectedText(correctedText);
        
        // Analyze sentiment after adding punctuation
        analyzeSentiment(correctedText);
    } catch (error) {
        console.error('Punctuation error:', error);
        setError('Error adding punctuation. Please try again.');
    } finally {
        setIsChecking(false);
    }
  };

  // New function to analyze sentiment
  const analyzeSentiment = async (text) => {
    if (!text) return;
    
    try {
      setIsAnalyzingSentiment(true);
      
      const apiKey = 'AIzaSyDsZCP_hY3pDpqmz67-pbKQrg32LANSODs';
      
      if (!apiKey) {
        throw new Error("API key is missing. Please set your Gemini API key.");
      }
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: `Analyze the sentiment of this text and return a JSON with these exact keys: positiveScore (0-100), neutralScore (0-100), negativeScore (0-100), and dominantEmotion (one of: "positive", "neutral", "negative"). The three scores should add up to 100. Text to analyze: "${text}"` }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Extract JSON from response
      const responseText = response.data.candidates[0].content.parts[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const sentimentJson = JSON.parse(jsonMatch[0]);
        
        // Create data for the donut chart
        const chartData = [
          { name: 'Positive', value: sentimentJson.positiveScore, color: SENTIMENT_COLORS.positive },
          { name: 'Neutral', value: sentimentJson.neutralScore, color: SENTIMENT_COLORS.neutral },
          { name: 'Negative', value: sentimentJson.negativeScore, color: SENTIMENT_COLORS.negative }
        ];
        
        setSentimentData({
          chartData,
          dominantEmotion: sentimentJson.dominantEmotion
        });
      } else {
        throw new Error("Could not parse sentiment data");
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      setError('Error analyzing sentiment. Please try again.');
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  const calculateSpectralBandwidth = (spectralData, centroid, sampleRate, fftSize) => {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectralData.length; i++) {
      const magnitude = Math.pow(10, spectralData[i] / 20);
      const frequency = (i * sampleRate) / fftSize;
      weightedSum += magnitude * Math.pow(frequency - centroid, 2);
      magnitudeSum += magnitude;
    }
    
    return Math.sqrt(weightedSum / magnitudeSum) || 0;
  };

  const analyzeAudio = async (audioBlob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Create and configure nodes
      const sourceNode = audioContextRef.current.createBufferSource();
      const analyzerNode = audioContextRef.current.createAnalyser();
      
      analyzerNode.fftSize = 2048;
      analyzerNode.smoothingTimeConstant = 0.4;
      analyzerNode.minDecibels = -100;
      analyzerNode.maxDecibels = -30;
      
      // Connect nodes
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(analyzerNode);
      analyzerNode.connect(audioContextRef.current.destination);
      
      const features = {
        duration: audioBuffer.duration,
        frequency: [],
        amplitude: [],
        spectral: []
      };

      // Get frequency data
      const bufferLength = analyzerNode.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      
      // Start playback
      sourceNode.start(0);
      
      // Capture frequency data
      const captureFrequencyData = () => {
        analyzerNode.getByteFrequencyData(frequencyData);
        
        const sampleRate = audioBuffer.sampleRate;
        const nyquist = sampleRate / 2;
        const frequencyResolution = nyquist / bufferLength;
        
        features.frequency = Array.from(frequencyData).map((magnitude, i) => ({
          hz: Math.round(i * frequencyResolution),
          magnitude: magnitude
        })).filter(item => item.magnitude > 0);
      };
      
      // Wait for audio processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      captureFrequencyData();
      
      // Calculate amplitude
      const channelData = audioBuffer.getChannelData(0);
      const chunkSize = Math.floor(channelData.length / 100);
      for (let i = 0; i < 100; i++) {
        const chunk = channelData.slice(i * chunkSize, (i + 1) * chunkSize);
        const amplitude = Math.max(...chunk.map(Math.abs));
        features.amplitude.push({
          time: Number((i / 100 * audioBuffer.duration).toFixed(2)),
          value: amplitude
        });
      }

      // Spectral analysis
      const spectralData = new Float32Array(analyzerNode.fftSize);
      analyzerNode.getFloatFrequencyData(spectralData);
      
      let weightedSum = 0;
      let magnitudeSum = 0;
      
      for (let i = 0; i < spectralData.length; i++) {
        const magnitude = Math.pow(10, spectralData[i] / 20);
        const frequency = (i * audioBuffer.sampleRate) / analyzerNode.fftSize;
        weightedSum += magnitude * frequency;
        magnitudeSum += magnitude;
      }
      
      const spectralCentroid = weightedSum / magnitudeSum || 0;
      
      features.spectral.push({
        centroid: spectralCentroid,
        bandwidth: calculateSpectralBandwidth(spectralData, spectralCentroid, audioBuffer.sampleRate, analyzerNode.fftSize)
      });

      setAudioFeatures(features);
      
      // Clean up
      setTimeout(() => {
        sourceNode.stop();
        sourceNode.disconnect();
        analyzerNode.disconnect();
      }, audioBuffer.duration * 1000);

    } catch (err) {
      console.error('Error analyzing audio:', err);
      setError('Error analyzing audio. Please try again.');
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setIsLoading(true);
      setAudioFeatures(null);
      setSentimentData(null);
      setError(null);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        analyzeAudio(audioBlob);
        setIsLoading(false);
        
        // Stop and release media stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Error accessing microphone. Please check permissions and try again.');
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
  
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  
    // Add punctuation to the final text
    if (textInput) {
      await addPunctuation(textInput);
    }
  };

  // Get sentiment icon based on dominant emotion
  const getSentimentIcon = (emotion) => {
    switch(emotion) {
      case 'positive':
        return <Smile className="w-12 h-12" style={{ color: SENTIMENT_COLORS.positive }} />;
      case 'negative':
        return <Frown className="w-12 h-12" style={{ color: SENTIMENT_COLORS.negative }} />;
      default:
        return <Meh className="w-12 h-12" style={{ color: SENTIMENT_COLORS.neutral }} />;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-green-800">Real Time Speech to Sign Language</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-green-700">Start Translation</h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">Real Time Text</label>
              <textarea
                id="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-md focus:ring-green-500 focus:border-green-500"
                rows="3"
              ></textarea>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    addPunctuation(textInput);
                  }}
                  disabled={!textInput || isChecking}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isChecking ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Add Punctuation'
                  )}
                </button>
                <button
                  onClick={() => analyzeSentiment(textInput)}
                  disabled={!textInput || isAnalyzingSentiment}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {isAnalyzingSentiment ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Sentiment'
                  )}
                </button>
                <button
                  onClick={() => setShowSignLanguage(true)}
                  disabled={!textInput}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Show Sign Language Translation
                </button>
              </div>
            </div>

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-200 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <Mic className="w-5 h-5" />
                {isLoading ? 'Loading...' : 'Start Recording'}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-200 flex items-center justify-center gap-2"
              >
                <AudioWaveform className="w-5 h-5" />
                Stop Recording
              </button>
            )}
          </div>
          
          {audioUrl && (
            <div className="mt-4">
              <audio controls src={audioUrl} className="w-full mb-4" />
              <a
                href={audioUrl}
                download="recording.wav"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Download Recording
              </a>
            </div>
          )}
        </div>

        {/* Sentiment Analysis Section */}
        {sentimentData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-purple-700">Sentiment Analysis</h2>
            <div className="flex flex-col md:flex-row items-center justify-center">
              <div className="w-full md:w-1/2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sentimentData.chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {sentimentData.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
                <h3 className="text-xl font-medium mb-4">Dominant Emotion</h3>
                <div className="flex flex-col items-center">
                  {getSentimentIcon(sentimentData.dominantEmotion)}
                  <p className="text-2xl font-bold mt-4 capitalize">{sentimentData.dominantEmotion}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showSignLanguage && textInput && (
          <SignLanguageAnimator text={textInput} speed={animationSpeed} />
        )}
          
        {audioFeatures && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-green-700">Frequency Analysis</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={audioFeatures.frequency.filter((_, i) => i % 4 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hz"
                    label={{ value: 'Frequency (Hz)', position: 'bottom' }}
                    domain={[0, 'auto']}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <YAxis
                    label={{ value: 'Magnitude', angle: -90, position: 'left' }}
                    domain={[0, 255]}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Magnitude']}
                    labelFormatter={(label) => `${label.toLocaleString()} Hz`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="magnitude" 
                    stroke="#4CAF50" 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-green-700">Amplitude Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={audioFeatures.amplitude}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    label={{ value: 'Time (s)', position: 'bottom' }}
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    label={{ value: 'Amplitude', angle: -90, position: 'left' }}
                    domain={[0, 1]}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(3)}`, 'Amplitude']}
                    labelFormatter={(label) => `${label.toFixed(2)} s`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2196F3" 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-green-700">Spectral Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg flex items-center gap-4">
                  <Thermometer className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Spectral Centroid</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {audioFeatures.spectral[0].centroid.toFixed(2)} Hz
                    </p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg flex items-center gap-4">
                  <Wind className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Spectral Bandwidth</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {audioFeatures.spectral[0].bandwidth.toFixed(2)} Hz
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;