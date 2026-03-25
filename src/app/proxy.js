let USE_LOCAL_PATH=true;

const LOCAL_PROXY = "http://localhost:4000";
const REMOTE_PROXY = "https://boxed-bliss.onrender.com";

const proxy = USE_LOCAL_PATH==true ? LOCAL_PROXY : REMOTE_PROXY;

export {proxy}