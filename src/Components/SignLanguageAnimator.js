import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSignLanguageImages from './useSignLanguageImages'; // Import the hook

const SignLanguageAnimator = ({ text, speed = 1 }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const animationRef = useRef(null);

  // Load images dynamically
  const { images: signImages, loading, error } = useSignLanguageImages();

  // Split the text into words and normalize
  const words = text
    ? text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 0)
    : [];

  const currentWord = words[currentWordIndex] || '';

  useEffect(() => {
    if (!isPlaying || words.length === 0 || animationCompleted) return;

    if (currentLetterIndex >= currentWord.length) {
      const nextWordTimer = setTimeout(() => {
        if (currentWordIndex < words.length - 1) {
          setCurrentWordIndex(currentWordIndex + 1);
          setCurrentLetterIndex(0);
        } else {
          setIsPlaying(false);
          setAnimationCompleted(true);
        }
      }, 1000 / speed);
      return () => clearTimeout(nextWordTimer);
    }

    animationRef.current = setTimeout(() => {
      setCurrentLetterIndex((prev) => prev + 1);
    }, 1000 / speed);

    return () => clearTimeout(animationRef.current);
  }, [currentWordIndex, currentLetterIndex, currentWord, words, isPlaying, animationCompleted, speed]);

  useEffect(() => {
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setIsPlaying(true);
    setAnimationCompleted(false);
  }, [text]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setIsPlaying(true);
    setAnimationCompleted(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-4 text-green-700">Sign Language Translation</h2>

      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-medium">
          Current Word: <span className="text-green-600 font-bold">{currentWord}</span>
        </div>
        <div className="space-x-2">
          <button
            onClick={handlePlayPause}
            className={`px-4 py-2 rounded-md ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleRestart}
            className="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white"
          >
            Restart
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg p-8 min-h-64">
        {loading ? (
          <div className="text-gray-500 text-lg">Loading signs...</div>
        ) : error ? (
          <div className="text-red-500 text-lg">Error loading images</div>
        ) : words.length === 0 ? (
          <div className="text-gray-500 text-lg">Enter text to see sign language translation</div>
        ) : animationCompleted ? (
          <div className="text-green-600 font-semibold text-lg">Translation completed!</div>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center">
            {currentWord.split('').slice(0, currentLetterIndex + 1).map((letter, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {signImages[letter] ? (
                  <img
                    src={signImages[letter]?.src}
                    alt={`Sign for letter ${letter}`}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="text-xl font-bold text-yellow-400">?</div>
                )}
                <div className="text-sm">{letter.toUpperCase()}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignLanguageAnimator;
