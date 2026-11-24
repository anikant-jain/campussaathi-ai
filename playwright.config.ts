import { defineConfig } from '@playwright/test';
const port=process.env.TEST_PORT || '5188';
const baseURL='http://127.0.0.1:'+port;
export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.ts',
  fullyParallel:false,
  workers:1,
  reporter:'list',
  use:{baseURL,browserName:'chromium',trace:'retain-on-failure'},
  webServer:{command:'node tests/serve.mjs',url:baseURL+'/api/health',timeout:60000,reuseExistingServer:false}
});

