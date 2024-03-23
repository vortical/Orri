
//import.meta.env is provided by vite

// these are the properties our app uses.
const config = {
    spacefieldBaseURL: import.meta.env.VITE_SPACEFIELD_BASE_URL,
    baseUrl: import.meta.env.BASE_URL || "/",

};
    


export default config;
