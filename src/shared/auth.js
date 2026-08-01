let _passwordVerified = false;
export function setPasswordVerified(v) {
    _passwordVerified = v;
}
export function getPasswordVerified() {
    return _passwordVerified;
}
export { _passwordVerified as passwordVerified };
