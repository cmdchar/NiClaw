import { closeElectronApp, expect, getStableWindow, test } from './fixtures/electron';

test.describe('Spatial OS navigation', () => {
  test('opens the Spatial OS approval surface from the sidebar', async ({ launchElectronApp }) => {
    const app = await launchElectronApp({ skipSetup: true });

    try {
      const page = await getStableWindow(app);

      await page.getByTestId('sidebar-nav-spatial').click();
      await expect(page.getByTestId('spatial-os-page')).toBeVisible();
      await expect(page.getByTestId('spatial-create-doctor-fix-plan')).toBeVisible();
      await expect(page.getByTestId('spatial-create-gateway-restart-plan')).toBeVisible();
      await expect(page.getByTestId('spatial-create-typecheck-plan')).toBeVisible();
    } finally {
      await closeElectronApp(app);
    }
  });
});
