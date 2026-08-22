/* global cy, describe, expect, it */
import 'cypress-if'

const RULEBOOK_PATH = '/Users/achoobert/repos/foundry_stuff/forged/blades68/rule_books/blades68_v1.0.1_digital.pdf'

describe('Blades68 PDF import', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.licenseAgreeAndClickAccept()
    cy.setupInputPasswordAndClickLogin()
    cy.closeTourOverlay()
    cy.launchTestWorldFromSetup()
    cy.loginAsGM()
  })

  it('parses real faction data out of the rulebook PDF', () => {
    cy.window().then((win) => {
      win.game.blades68.openPdfImport()
    })

    cy.get('#blades68-pdf-import', { timeout: 10000 }).should('be.visible')

    cy.get('#blades68-pdf-import input[name="rulebookFile"]').selectFile(RULEBOOK_PATH, { force: true })

    cy.get('#blades68-pdf-import [data-action="parseFactions"]').click()

    cy.get('#blades68-pdf-import .pdf-import-log', { timeout: 60000 }).should(
      'contain.text',
      'Parsed'
    )

    cy.get('#blades68-pdf-import .faction-preview-row', { timeout: 10000 }).should(
      'have.length.at.least',
      5
    )

    cy.get('#blades68-pdf-import .faction-preview').should(
      'contain.text',
      'Anixis Field Unit'
    )

    cy.get('#blades68-pdf-import [data-action="createFactions"]').should('not.be.disabled').click()

    cy.get('#blades68-pdf-import .pdf-import-log').should('contain.text', 'Created')

    cy.window().then((win) => {
      const factions = win.game.actors.contents.filter((actor) => actor.type === 'faction')
      const anixis = factions.find((actor) => actor.name === 'Anixis Field Unit')
      expect(anixis, 'Anixis Field Unit actor was created').to.exist
      expect(anixis.system.tier).to.equal(2)
      expect(anixis.system.hold).to.equal('strong')
    })
  })
})
