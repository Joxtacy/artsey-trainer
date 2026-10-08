import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import './app.css';

// Cache the app for offline use; a new deploy replaces the cached version when it is found.
registerSW({ immediate: true });

export default mount(App, { target: document.getElementById('app')! });
