module.exports = {
  API_BASE_URL: process.env.VERCEL_ENV === 'production'
    ? 'https://nime-anime-streaming.vercel.app' // Ganti dengan domain Vercel Anda
    : 'http://localhost:3474',
  BERKASDRIVE_BASE_URL: 'https://dl.berkasdrive.com',
};