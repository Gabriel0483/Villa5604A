// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBrmDlzIxwLFE6hPQWPuT6k7WjG4JMM9XQ",
  authDomain: "studio-7236191215-125fd.firebaseapp.com",
  projectId: "studio-7236191215-125fd",
  storageBucket: "studio-7236191215-125fd.firebasestorage.app",
  messagingSenderId: "992446105643",
  appId: "1:992446105643:web:5c8696f88950743c67826e"
};

export const isFirebaseConfigValid = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);
