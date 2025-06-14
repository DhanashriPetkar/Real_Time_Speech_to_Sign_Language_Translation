import { useState, useEffect } from 'react';

const useSignLanguageImages = () => {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      let imageFiles = {};

      // Load all images from a single static path
      const context = require.context('../assets/assets/asl_dataset/', true, /\.(png|jpe?g|svg)$/);
      const allImages = context.keys().map(key => ({ key, src: context(key) }));

      letters.split('').forEach(letter => {
        // Filter images for the current letter
        const letterImages = allImages.filter(img => img.key.includes(`/${letter}/`));

        if (letterImages.length > 0) {
          // Pick a random image
          const randomIndex = Math.floor(Math.random() * letterImages.length);
          imageFiles[letter] = { src: letterImages[randomIndex].src, alt: `Sign for ${letter}` };
        } else {
          console.warn(`No images found for letter: ${letter}`);
        }
      });

      setImages(imageFiles);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  return { images, loading, error };
};

export default useSignLanguageImages;
