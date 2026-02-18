// Minimal toast shim used during build to avoid adding runtime dependency on 'sonner'
export const toast = {
  success: (msg: string) => {
    if (typeof window !== 'undefined') {
      try { window.alert(msg); } catch {};
    }
    // eslint-disable-next-line no-console
    console.log('SUCCESS:', msg);
  },
  error: (msg: string) => {
    if (typeof window !== 'undefined') {
      try { window.alert(msg); } catch {};
    }
    // eslint-disable-next-line no-console
    console.error('ERROR:', msg);
  },
  info: (msg: string) => {
    if (typeof window !== 'undefined') {
      try { window.alert(msg); } catch {};
    }
    // eslint-disable-next-line no-console
    console.info('INFO:', msg);
  }
}

export default toast;
