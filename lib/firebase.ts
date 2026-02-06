// Firebase 연동 설정 파일
// 아래의 firebaseConfig는 본인 Firebase 콘솔에서 복사한 값으로 교체하세요.
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD_fAT2dwGP75B8RnFaC6qHi2yHqGkQ5dt",
  authDomain: "realtime-bceb9.firebaseapp.com",
  databaseURL: "https://realtime-bceb9.firebaseio.com",
  projectId: "realtime-bceb9",
  storageBucket: "realtime-bceb9.appspot.com",
  messagingSenderId: "1017791925116",
  appId: "1:1017791925116:web:c9129ae93b7de104984aeb",
  measurementId: "G-JMNSZF6HTZ"
};

export function initFirebase() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
}

export function getDb() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getDatabase();
}
