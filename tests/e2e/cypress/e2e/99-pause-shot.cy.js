describe('Pause background', () => {
  it('renders the bluetime bar', () => {
    cy.visit('/');
    cy.licenseAgreeAndClickAccept();
    cy.setupInputPasswordAndClickLogin();
    cy.closeTourOverlay();
    cy.launchTestWorldFromSetup();
    cy.loginAsGM();

    cy.window({ timeout: 120000 }).should((win) => {
      expect(win.game.ready, 'game.ready').to.eq(true);
    });

    cy.window().then((win) => {
      win.game.settings.set('blades68', 'PauseAnimation', 'bluetime');
      win.game.togglePause(true);
    });
    cy.get('#pause[data-b68-pause-animation="bluetime"] .blades68-bluetime-blob').should('have.length', 5);
    cy.wait(1500);
    cy.screenshot('pause-bluetime', { capture: 'viewport' });
    cy.wait(3000);
    cy.screenshot('pause-bluetime-b', { capture: 'viewport' });
    cy.wait(3000);
    cy.screenshot('pause-bluetime-c', { capture: 'viewport' });

    cy.window().then((win) => {
      win.game.settings.set('blades68', 'PauseAnimation', 'vhs');
    });
    cy.get('#pause[data-b68-pause-animation="vhs"] canvas.blades68-vhs-static').should('exist');
    cy.screenshot('pause-vhs', { capture: 'viewport' });

    // the grain loop must keep repainting, and the CSS layers must keep their animations
    cy.window().then((win) => {
      const pause = win.document.querySelector('#pause');
      const canvas = pause.querySelector('canvas.blades68-vhs-static');
      const first = canvas.toDataURL();
      expect(pause.hasAttribute('data-b68-reduced-motion'), 'reduced-motion attr').to.eq(false);
      expect(win.getComputedStyle(pause, '::before').animationName, 'scanlines').to.eq('b68-vhs-flicker');
      expect(win.getComputedStyle(pause, '::after').animationName, 'tracking band').to.eq('b68-vhs-roll');
      cy.wait(500).then(() => {
        expect(canvas.toDataURL() === first, 'grain frozen').to.eq(false);
      });
    });

    // Photosensitivity Mode calms the bar without freezing it: grain keeps repainting slowly,
    // the flashing layers stop.
    cy.window().then((win) => {
      // core registers this client setting with requiresReload, so re-render the overlay by hand
      win.game.settings.set('core', 'photosensitiveMode', true);
      win.ui.pause.render();
    });
    cy.get('#pause[data-b68-reduced-motion]').should('exist');
    cy.window().then((win) => {
      const pause = win.document.querySelector('#pause');
      const canvas = pause.querySelector('canvas.blades68-vhs-static');
      const first = canvas.toDataURL();
      expect(win.getComputedStyle(pause, '::before').animationName, 'scanlines').to.eq('none');
      expect(win.getComputedStyle(pause, '::after').animationName, 'tracking band').to.eq('none');
      cy.wait(600).then(() => {
        expect(canvas.toDataURL() === first, 'calm grain frozen').to.eq(false);
      });
    });
    cy.screenshot('pause-vhs-calm', { capture: 'viewport' });

    // vanilla is the bare logo: no canvas, no blobs, no animated pseudo-elements
    cy.window().then((win) => {
      win.game.settings.set('core', 'photosensitiveMode', false);
      win.game.settings.set('blades68', 'PauseAnimation', 'vanilla');
    });
    cy.get('#pause[data-b68-pause-animation="vanilla"]').should('exist');
    cy.get('#pause canvas.blades68-vhs-static').should('not.exist');
    cy.get('#pause .blades68-bluetime').should('not.exist');
    cy.window().then((win) => {
      const pause = win.document.querySelector('#pause');
      expect(win.getComputedStyle(pause.querySelector('img')).animationName, 'logo').to.eq('none');
      expect(win.getComputedStyle(pause, '::before').animationName, 'scanlines').to.eq('none');
      expect(win.getComputedStyle(pause, '::after').animationName, 'tracking band').to.eq('none');
    });
    cy.screenshot('pause-vanilla', { capture: 'viewport' });

    cy.window().then((win) => win.game.settings.set('blades68', 'PauseAnimation', 'bluetime'));
  });
});
