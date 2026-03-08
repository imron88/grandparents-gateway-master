import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const RP_NAME = process.env.RP_NAME || 'Grandparent Gateway';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

/**
 * Generate registration options for a new passkey.
 */
export async function genRegistrationOptions(user, existingCredentials = []) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(user.id, 'utf-8'),
    userName: user.email,
    userDisplayName: user.display_name,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credential_id,
      type: 'public-key',
      transports: cred.transports || ['internal'],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
    supportedAlgorithmIDs: [-7, -257],
  });
}

/**
 * Verify registration response from client.
 */
export async function verifyRegistration(response, expectedChallenge) {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });
}

/**
 * Generate authentication (assertion) options.
 * Use empty allowCredentials = discoverable credentials mode.
 * Browser shows ALL passkeys for this RP — avoids credential ID encoding mismatches.
 */
export async function genAuthenticationOptions(existingCredentials = []) {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    timeout: 60000,
    userVerification: 'required',
    allowCredentials: [], // discoverable — let browser pick from stored passkeys
  });
}

/**
 * Verify authentication response from client.
 */
export async function verifyAuthentication(response, expectedChallenge, credential) {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
    credential: {
      id: credential.credential_id,
      publicKey: Buffer.from(credential.public_key, 'base64'),
      counter: credential.counter,
      transports: credential.transports || ['internal'],
    },
  });
}
