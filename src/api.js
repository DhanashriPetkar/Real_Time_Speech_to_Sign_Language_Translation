import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const diagnose = async (imageFile, text, city) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('text', text);
  formData.append('city', city);

  try {
    const response = await axios.post(`${API_URL}/diagnose`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    console.error('Error diagnosing plant disease:', error);
    throw error;
  }
};