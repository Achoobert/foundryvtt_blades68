/* global cy, describe, it */
import 'cypress-if'

describe('Blades68 smoke test', () => {
  it('loads the world and logs in as GM', () => {
    cy.visit('/')
    cy.licenseAgreeAndClickAccept()
    cy.setupInputPasswordAndClickLogin()
    cy.closeTourOverlay()
    cy.launchTestWorldFromSetup()
    cy.loginAsGM()
    cy.get('body').should('exist')

    cy.window().should((win) => {
      expect(win.game.system.id, 'active system').to.eq('blades68')
    })
  })
})
