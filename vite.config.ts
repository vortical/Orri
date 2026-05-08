/** @type {import('vite').UserConfig} */

import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {

    // rely on the .env, .env.development, .env.production files for our configs

    const env = loadEnv(mode, process.cwd(), '')
    const baseurl_path = env.VITE_BASEURL_PATH;

    const vitconfig = {
        base: baseurl_path,
        plugins: [svelte(), tailwindcss()],
    };

    console.log(JSON.stringify({ base: vitconfig.base }));

    return vitconfig;
});
