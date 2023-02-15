// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDm1iBQ8eShl5usqRSWHcnPP3d6fzPnLok",
  authDomain: "audio-sentiment.firebaseapp.com",
  projectId: "audio-sentiment-youtube",
  storageBucket: "audio-sentiment-youtube.appspot.com",
  messagingSenderId: "643958190792",
  appId: "1:643958190792:web:8613d62252102a8f6b2bfd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app)