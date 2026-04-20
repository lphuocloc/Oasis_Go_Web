import { getApp, getApps, initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { firebaseClientConfig, firebaseWebPushVapidKey } from '../config/firebase'

const ensureFirebaseApp = () => {
    if (getApps().length === 0) {
        return initializeApp(firebaseClientConfig)
    }
    return getApp()
}

const canUseWebPush = () => {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

const requestPermission = async () => {
    if (!canUseWebPush()) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    return Notification.requestPermission()
}

const getFirebaseMessaging = async () => {
    if (!canUseWebPush()) return null

    const supported = await isSupported()
    if (!supported) {
        return null
    }

    const app = ensureFirebaseApp()
    return getMessaging(app)
}

export const requestFcmToken = async () => {
    if (!firebaseWebPushVapidKey.trim()) {
        console.warn('Missing Firebase Web Push certificate key. Set firebaseWebPushVapidKey in src/config/firebase.ts')
        return null
    }

    const permission = await requestPermission()
    if (permission !== 'granted') {
        return null
    }

    const messaging = await getFirebaseMessaging()
    if (!messaging) {
        return null
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, {
        vapidKey: firebaseWebPushVapidKey,
        serviceWorkerRegistration,
    })

    return token || null
}

export const subscribeForegroundMessages = async (
    onPayload: (payload: MessagePayload) => void,
) => {
    const messaging = await getFirebaseMessaging()
    if (!messaging) {
        return () => { }
    }

    return onMessage(messaging, onPayload)
}
