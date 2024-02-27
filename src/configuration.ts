
//import.meta.env is provided by vite

// these are the properties our app uses.
const config = {
    spacefield_host: import.meta.env.VITE_EPHEMERIDS_HOST || "vortical.hopto.org:8000",
    baseUrl: import.meta.env.BASE_URL || "/",

};
    


export default config;
