import './style.css';
import './ui/svelte.css';
import { mount } from 'svelte';
import App from './ui/components/App.svelte';
import config from './configuration.ts';

console.log(`Config: \n${JSON.stringify(config)}`);

mount(App, { target: document.getElementById('app')! });
