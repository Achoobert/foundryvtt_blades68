import { defineFoundryConfig } from './foundry-cypress.js'
import developmentOptions from './fvtt.config.js'

export default defineFoundryConfig({
  e2e: {
    baseUrl: developmentOptions.baseURL || 'http://localhost:30000'
  },
  env: {
    FOUNDRY_WORLD: developmentOptions.testWorldName || 'blades68-dev'
  }
})
