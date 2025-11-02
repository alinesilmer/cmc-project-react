import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Configuración de Firebase - Reemplaza con tus credenciales
const firebaseConfig = {

  apiKey: "AIzaSyCYP9mW83dyjEh6fwaIxs8n9Ji6NH1YVWU",

  authDomain: "cmc-website-c1651.firebaseapp.com",

  projectId: "cmc-website-c1651",

  storageBucket: "cmc-website-c1651.firebasestorage.app",

  messagingSenderId: "474482887147",

  appId: "1:474482887147:web:ecc445fcbad34d3dad71ae"

};



// Inicializar Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
