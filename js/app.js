const tabs = document.querySelectorAll('#tabs .tab');
const screens = {
  entry: document.getElementById('screen-entry'),
  ledger: document.getElementById('screen-ledger'),
};

function showScreen(name) {
  for (const key of Object.keys(screens)) {
    screens[key].dataset.active = key === name ? 'true' : 'false';
  }
  for (const tab of tabs) {
    tab.classList.toggle('active', tab.dataset.screen === name);
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => showScreen(tab.dataset.screen));
}

showScreen('entry');
