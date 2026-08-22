/* global cy, describe, expect, it, Cypress */
import 'cypress-if'

describe('Blades68 Quench tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.licenseAgreeAndClickAccept()
    cy.setupInputPasswordAndClickLogin()
    cy.closeTourOverlay()
    cy.launchTestWorldFromSetup()
    cy.loginAsGM()
    cy.enableModules(['quench', 'blades68-quench-tests'])
    cy.get('.quench-button, [data-tooltip="QUENCH.Title"]', { timeout: 120000 }).should('exist')
  })

  const statsTimeout = Number(Cypress.env('QUENCH_STATS_TIMEOUT')) || 900000

  it('runs the blades68.* Quench batches with zero failures', { retries: 1 }, () => {
    cy.get('.quench-button, [data-tooltip="QUENCH.Title"]').click()
    cy.get("[data-select='all']").should('exist').click({ force: true })
    cy.get('#quench-run').should('be.visible').click()

    cy.get('.stats', { timeout: statsTimeout }).should('be.visible')
    cy.get('.stats').then((stats) => {
      cy.log('Test report: ', stats.text())
    })

    cy.get('.error').if().then((summary) => {
      cy.log('errors: ', summary.text())
    })

    cy.get('.stats').then(($stats) => {
      const summary = $stats.text()

      // "Ran N tests in ...ms. X failed | Y passed(N)" — guard against a silent
      // zero-batch pass (e.g. the test module never actually got enabled).
      const ranMatch = summary.match(/Ran (\d+) tests?/i)
      const ranCount = ranMatch ? Number(ranMatch[1]) : 0
      expect(ranCount, `Quench ran zero tests — summary: "${summary}"`).to.be.greaterThan(0)

      if (!summary.includes('failed')) return

      const errors = Cypress.$('.error-message')
        .map((_, el) => Cypress.$(el).text().trim())
        .get()
      const diffs = Cypress.$('.diff')
        .map((_, el) => Cypress.$(el).text().trim())
        .get()

      expect(
        summary,
        `Quench failures:\n${JSON.stringify({ summary, errors, diffs }, null, 2)}`
      ).to.not.include('failed')
    })
  })
})
