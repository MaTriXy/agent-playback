import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mockJson = path.resolve(__dirname, '../mock-session.json');
const mockJsonl = path.resolve(__dirname, '../mock-session.jsonl');

// Helper — load a file via the file input and wait for timeline rows to appear
async function loadFile(page, filePath) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Load JSON/JSONL').click(),
  ]);
  await fileChooser.setFiles(filePath);
  await expect(page.locator('.lane-row').first()).toBeVisible();
}

// ─── Startup ────────────────────────────────────────────────────────────────

test('app loads with empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.title')).toHaveText('Playback');
  await expect(page.locator('.subtitle')).toHaveText('No session loaded');
  await expect(page.locator('.lane-row')).toHaveCount(0);
});

// ─── File loading ────────────────────────────────────────────────────────────

test('loads pre-parsed JSON file', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  const rows = page.locator('.lane-row');
  await expect(rows).toHaveCount(4);
  await expect(page.locator('.subtitle')).toContainText('Fix React Counter Bug');
});

test('loads and parses JSONL file', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJsonl);
  const rows = page.locator('.lane-row');
  await expect(rows).toHaveCount(4);
});

test('first row shows user text', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await expect(page.locator('.lane-row').first().locator('.cell.user')).toContainText("Can you find the bug");
});

// ─── Timeline ────────────────────────────────────────────────────────────────

test('first row is active on load', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await expect(page.locator('.lane-row').first()).toHaveClass(/active/);
});

test('clicking a row makes it active', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.locator('.lane-row').nth(2).click();
  await expect(page.locator('.lane-row').nth(2)).toHaveClass(/active/);
  await expect(page.locator('.lane-row').first()).not.toHaveClass(/active/);
});

test('detail panel updates when row is clicked', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.locator('.lane-row').nth(1).click();
  // second detail card = step details (first is session summary)
  await expect(page.locator('.detail-card').nth(1).locator('.detail-body').first()).toContainText('can you fix it');
});

// ─── Tape deck & playback controls ───────────────────────────────────────────

test('step counter shows correct total', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await expect(page.locator('.deck-meta')).toContainText('/ 4');
});

test('next button advances step', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await expect(page.locator('.deck-meta')).toContainText('Step 1 / 4');
  await page.locator('#deckNext, button[title="Next"]').first().click();
  await expect(page.locator('.deck-meta')).toContainText('Step 2 / 4');
});

test('prev button goes back a step', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.locator('button[title="Next"]').first().click();
  await page.locator('button[title="Previous"]').first().click();
  await expect(page.locator('.deck-meta')).toContainText('Step 1 / 4');
});

test('topbar next/prev buttons work', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.deck-meta')).toContainText('Step 2 / 4');
  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(page.locator('.deck-meta')).toContainText('Step 1 / 4');
});

test('play button starts playback and tape deck shows playing state', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('.tape-deck')).toHaveClass(/is-playing/);
  await expect(page.locator('.main-readout')).toContainText('Playing');
  // pause so it doesn't interfere with other assertions
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});

test('pause button stops playback', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.tape-deck')).not.toHaveClass(/is-playing/);
  await expect(page.locator('.main-readout')).toContainText('Paused');
});

test('record button on tape deck toggles play/pause', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.locator('.record-trigger').click();
  await expect(page.locator('.tape-deck')).toHaveClass(/is-playing/);
  await page.locator('.record-trigger').click();
  await expect(page.locator('.tape-deck')).not.toHaveClass(/is-playing/);
});

test('auto-playback advances steps', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  // set speed to 2x so interval is 750ms
  await page.locator('select').selectOption('2');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('.deck-meta')).toContainText('Step 2 / 4', { timeout: 3000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
});

// ─── Speed selector ───────────────────────────────────────────────────────────

test('speed label updates when speed is changed', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.locator('select').selectOption('2');
  await expect(page.locator('.deck-meta')).toContainText('2x');
  await page.locator('select').selectOption('0.5');
  await expect(page.locator('.deck-meta')).toContainText('0.5x');
});

// ─── Minimal mode ─────────────────────────────────────────────────────────────

test('minimal button toggles is-minimal class on body', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Minimal' }).click();
  await expect(page.locator('body')).toHaveClass(/is-minimal/);
  await page.getByRole('button', { name: 'Minimal' }).click();
  await expect(page.locator('body')).not.toHaveClass(/is-minimal/);
});

test('minimal mode hides visualizer stage', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, mockJson);
  await page.getByRole('button', { name: 'Minimal' }).click();
  await expect(page.locator('.visualizer-stage')).not.toBeVisible();
});

// ─── Server integration ───────────────────────────────────────────────────────

test('server health endpoint is reachable', async ({ request }) => {
  const res = await request.get('http://localhost:4000/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
});

test('can POST a session to server and GET it back', async ({ request }) => {
  const session = {
    title: 'Playwright Test Session',
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: 't1',
        timestamp: '',
        user_text: 'hello from playwright',
        agent_summary: 'test agent response',
        reasoning_summary: '',
        agent_output: 'test output',
        tools: [],
      },
    ],
    meta: {},
  };

  const post = await request.post('http://localhost:4000/api/sessions', { data: session });
  expect(post.ok()).toBeTruthy();
  const { session_id } = await post.json();
  expect(session_id).toBeTruthy();

  const get = await request.get(`http://localhost:4000/api/sessions/${session_id}`);
  expect(get.ok()).toBeTruthy();
  const data = await get.json();
  expect(data.title).toBe('Playwright Test Session');
  expect(data.steps).toHaveLength(1);
  expect(data.steps[0].user_text).toBe('hello from playwright');
});

test('loading a session URL renders the timeline', async ({ page, request }) => {
  // Upload session to server first
  const fs = await import('fs');
  const raw = fs.readFileSync(mockJson, 'utf8');
  const session = JSON.parse(raw);

  const post = await request.post('http://localhost:4000/api/sessions', { data: session });
  const { session_id } = await post.json();

  // Navigate to the session URL via Vite proxy
  await page.goto(`/session/${session_id}`);
  await expect(page.locator('.lane-row')).toHaveCount(4, { timeout: 5000 });
  await expect(page.locator('.subtitle')).toContainText('Fix React Counter Bug');
});
