# SHRANIX Krushi ERP — License Guide

## How Licensing Works

SHRANIX Krushi ERP uses a secure license system to protect against unauthorized use while keeping your business operations completely offline.

## License Activation

### First-Time Activation

1. Launch SHRANIX Krushi ERP
2. On the activation screen, enter:
   - Your **email** (SHRANIX account)
   - Your **password** (SHRANIX account)
   - Your **license number**
3. Click **Activate**
4. The ERP connects to the activation server (one-time)
5. A signed license token is stored locally
6. Activation completes — internet can be disconnected

### What Happens During Activation

- Your credentials are verified against the SHRANIX server
- Your license is checked for validity and ownership
- A signed token (RSA-2048) is generated and stored locally
- The token is bound to your specific device
- No sensitive data is stored in plaintext

## License Verification

### Local Verification

- On every launch, the ERP verifies the locally stored token
- No internet connection is needed for this verification
- The token is cryptographically signed and cannot be forged

### Periodic Revalidation

- The ERP attempts to revalidate your license every 12 hours
- This is a background process — you won't notice it
- If internet is available: revalidation happens silently
- If internet is unavailable: the ERP continues working normally

### Grace Period

- If your license is about to expire, you enter a grace period
- During grace period, the ERP continues working
- You can renew your license before the grace period ends
- The grace period is configurable by the administrator

## License Token Format

The license token is a signed digital document containing:

- License identifier
- Product and edition
- Customer reference
- Expiry date
- Device binding information
- Cryptographic signature (RSA-2048)

**Security Note:** The private signing key is held only by the SHRANIX server. The ERP only has the public key for verification. This means:

- Tokens cannot be forged
- Tokens cannot be modified without detection
- The signing secret is never exposed to the client

## Device Binding

### How It Works

- Your license is bound to your specific computer
- The binding uses multiple device signals (not just one hardware component)
- This prevents casual copying while allowing normal hardware changes

### Hardware Changes

- Normal hardware changes (RAM, disk, network card) are tolerated
- Multiple signals ensure no single change invalidates your device
- If you need to transfer your license, use the deactivation feature

### Device Limit

- Each license has a maximum number of active devices
- Check your license details for your specific limit
- Deactivate old devices to free up slots

## Deactivation

### When to Deactivate

- Before replacing your computer
- Before a major hardware overhaul
- When you want to move the license to a new machine

### How to Deactivate

1. Launch SHRANIX Krushi ERP
2. Go to **Settings** → **License**
3. Click **Deactivate**
4. Confirm deactivation
5. Your license slot is freed

### What Happens

- The local token is invalidated
- The device slot is freed on the server
- Your ERP data remains on the local computer
- You can activate on a new machine

## Reactivation

### After Deactivation

1. Install SHRANIX Krushi ERP on the new machine
2. Launch and enter your credentials
3. Activate with your license number
4. A new token is issued for the new device

### After Reinstall

- If you reinstall on the same machine, activation usually works automatically
- The device fingerprint is preserved across reinstalls
- If activation fails, deactivate first, then reactivate

## Offline Operation

### After Activation

- The ERP works completely offline
- No internet is needed for business operations
- License verification happens locally

### Extended Offline Use

- The ERP can work offline for extended periods
- Periodic revalidation is recommended when internet is available
- If you need guaranteed extended offline use, request an offline token

### Offline Token

- Available from the activation screen
- Valid for a bounded period (default: 7 days)
- Signed and device-bound
- Cannot be copied to another machine

## License Expiry

### Before Expiry

- You'll receive notifications about upcoming expiry
- Renew your license before it expires
- Connect to internet and reactivate

### After Expiry

- Grace period begins (configurable duration)
- During grace period, the ERP continues working
- After grace period, reactivation is required
- Your data is never deleted due to license expiry

## Security Features

### Cryptographic Protection

- RSA-2048 asymmetric signing
- Private key never leaves the server
- Public key bundled in the ERP for verification
- Algorithm whitelist prevents confusion attacks

### Tamper Detection

- Integrity hash over license fields
- Clock rollback detection
- Device identity verification
- Security event logging

### Anti-Piracy

- Tokens are device-bound
- Cross-device token copying is detected
- License cloning triggers security alerts
- Server-side ownership verification

## Support

### Activation Issues

- Email: support@shranix.com
- Include: license number, email, error message
- Do NOT include: passwords, tokens, private keys

### License Transfer

- Contact support for license transfers
- Provide proof of ownership
- Transfer fee may apply

---

_SHRANIX Krushi ERP V1.0.0 — Secure, Offline, Yours_
