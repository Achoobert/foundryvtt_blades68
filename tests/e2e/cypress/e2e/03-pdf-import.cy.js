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

    cy.get('#blades68-pdf-import [data-action="parseRulebook"]').click()

    cy.get('#blades68-pdf-import .pdf-import-log', { timeout: 120000 }).should(
      'contain.text',
      'Created'
    )

    cy.window().then((win) => {
      const factions = win.game.items.contents.filter((item) => item.type === 'faction')
      const anixis = factions.find((item) => item.name === 'Anixis Field Unit')
      expect(anixis, 'Anixis Field Unit item was created').to.exist
      expect(anixis.system.tier).to.equal(2)
      expect(anixis.system.hold).to.equal('strong')
    })
  })
})
