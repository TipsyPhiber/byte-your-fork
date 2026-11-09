// Cross-component session flags.
//
// Cook Mode is hands-free: the user can go 15+ minutes without touching the
// screen, which the inactivity logout in useAuth would read as "walked away".
// Cook Mode sets keep-alive while mounted; useAuth re-arms its timer instead
// of logging out while the flag is up.
let keepAlive = false;

export const setSessionKeepAlive = (v) => { keepAlive = v; };
export const isSessionKeptAlive = () => keepAlive;
