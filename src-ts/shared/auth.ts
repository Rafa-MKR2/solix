// SPDX-License-Identifier: MIT
// Centralized authentication state — single source of truth
// Avoids cross-module mutation coupling between operations.ts and features

let _passwordVerified = false;

export function setPasswordVerified(v: boolean): void {
  _passwordVerified = v;
}

export function getPasswordVerified(): boolean {
  return _passwordVerified;
}

// Direct read access through live ES module binding
export { _passwordVerified as passwordVerified };
