// import SHA256 from "crypto-js/sha256";
// import HmacMD5 from "crypto-js/hmac-md5";
// import CryptoJS from "crypto-js/core";
// import Base64 from "crypto-js/enc-base64";
// import Utf8 from "crypto-js/enc-utf8";
// import AES from "crypto-js/aes";
// import PBKDF2 from "crypto-js/pbkdf2";
import * as CryptoJS from 'crypto-js';

const keySize = 128
const saltSize = 128
const PBDKF2_iterations = 50
const PBDKF2_hasher = CryptoJS.algo.SHA256

// TODO: double check all this...
// TODO: unit tests
export function AES_Encrypt(message: string, key: string): string {
	const salt = CryptoJS.lib.WordArray.random(saltSize / 8);

	const derived_key = CryptoJS.PBKDF2(key, salt, {
		keySize: keySize / 32,
		hasher: PBDKF2_hasher,
		iterations: PBDKF2_iterations
	})

	const iv = CryptoJS.lib.WordArray.random(128 / 8);

	const ciphertext = CryptoJS.AES.encrypt(message, derived_key, {
		iv: iv,
		padding: CryptoJS.pad.Pkcs7,
		mode: CryptoJS.mode.CBC
	})

	return salt.toString() + iv.toString() + ciphertext.toString()
}

export function AES_Decrypt(message: string, key: string): string | null {
	if(message.length < 65)
		return null

	const salt = CryptoJS.enc.Hex.parse(message.substring(0, 32))
	const iv = CryptoJS.enc.Hex.parse(message.substring(32, 64))
	const ciphertext = message.substring(64)

	const derived_key = CryptoJS.PBKDF2(key, salt, {
		keySize: keySize / 32,
		hasher: PBDKF2_hasher,
		iterations: PBDKF2_iterations
	})

	return CryptoJS.AES.decrypt(ciphertext, derived_key, {
		iv: iv,
		padding: CryptoJS.pad.Pkcs7,
		mode: CryptoJS.mode.CBC
	}).toString(CryptoJS.enc.Utf8)
}