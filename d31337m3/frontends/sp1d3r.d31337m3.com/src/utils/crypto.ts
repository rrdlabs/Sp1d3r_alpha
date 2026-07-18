const STORAGE_KEY_PRIVATE = "sp1d3r_x25519_private"
const STORAGE_KEY_PUBLIC = "sp1d3r_x25519_public"

const X25519_ALGO = { name: "X25519" } as const
const X25519_IMPORT = { name: "X25519" } as const

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

export async function generateX25519Keypair(): Promise<{
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicKeyHex: string
  privateKeyBase64: string
}> {
  const keypair = await crypto.subtle.generateKey(
    X25519_ALGO,
    true,
    ["deriveKey", "deriveBits"]
  )

  const pubRaw = await crypto.subtle.exportKey("raw", keypair.publicKey)
  const privRaw = await crypto.subtle.exportKey("pkcs8", keypair.privateKey)

  const publicKeyHex = bytesToHex(new Uint8Array(pubRaw))
  const privateKeyBase64 = arrayBufferToBase64(privRaw)

  localStorage.setItem(STORAGE_KEY_PUBLIC, publicKeyHex)
  localStorage.setItem(STORAGE_KEY_PRIVATE, privateKeyBase64)

  return {
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    publicKeyHex,
    privateKeyBase64,
  }
}

export async function loadOrGenerateKeypair(): Promise<{
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicKeyHex: string
}> {
  const existingPub = localStorage.getItem(STORAGE_KEY_PUBLIC)
  const existingPriv = localStorage.getItem(STORAGE_KEY_PRIVATE)

  if (existingPub && existingPriv) {
    try {
      const pubBytes = hexToBytes(existingPub)
      const publicKey = await crypto.subtle.importKey(
        "raw",
        toArrayBuffer(pubBytes),
        X25519_IMPORT,
        true,
        []
      )

      const privBuffer = base64ToArrayBuffer(existingPriv)
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privBuffer,
        X25519_IMPORT,
        true,
        ["deriveKey", "deriveBits"]
      )

      return { privateKey, publicKey, publicKeyHex: existingPub }
    } catch {
      localStorage.removeItem(STORAGE_KEY_PUBLIC)
      localStorage.removeItem(STORAGE_KEY_PRIVATE)
    }
  }

  return generateX25519Keypair()
}

export function getStoredPublicKeyHex(): string | null {
  return localStorage.getItem(STORAGE_KEY_PUBLIC)
}

export async function decryptFinding(
  privateKey: CryptoKey,
  ephemeralPublicKeyHex: string,
  nonceHex: string,
  ciphertextHex: string
): Promise<string> {
  const ephemeralPubBytes = hexToBytes(ephemeralPublicKeyHex)
  const ephemeralPublicKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(ephemeralPubBytes),
    X25519_IMPORT,
    false,
    []
  )

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "X25519", public: ephemeralPublicKey },
    privateKey,
    256
  )

  const info = new TextEncoder().encode("d31337m3-crawler-e2ee-v1")
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  )

  const derivedKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  )

  const nonce = hexToBytes(nonceHex)
  const ciphertext = hexToBytes(ciphertextHex)

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(nonce) },
    derivedKey,
    toArrayBuffer(ciphertext)
  )

  return new TextDecoder().decode(plaintext)
}
