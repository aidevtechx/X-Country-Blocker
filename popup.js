import { countryList } from './countries.js';

document.addEventListener('DOMContentLoaded', () => {
  const countryInput = document.getElementById('countryInput');
  const addBtn = document.getElementById('addBtn');
  const blockedList = document.getElementById('blockedList');
  const debugModeCheckbox = document.getElementById('debugMode');
  const datalist = document.getElementById('countryList');

  // Populate datalist
  countryList.forEach(country => {
    const option = document.createElement('option');
    option.value = country;
    datalist.appendChild(option);
  });

  // Load settings
  chrome.storage.local.get(['blockedCountries', 'debugMode'], (result) => {
    const countries = result.blockedCountries || [];
    countries.forEach(addCountryToList);
    debugModeCheckbox.checked = result.debugMode || false;
  });

  // Add country
  addBtn.addEventListener('click', () => {
    const country = countryInput.value.trim();
    if (country) {
      chrome.storage.local.get(['blockedCountries'], (result) => {
        const countries = result.blockedCountries || [];
        // Case-insensitive check for duplicates
        if (!countries.some(c => c.toLowerCase() === country.toLowerCase())) {
          countries.push(country);
          chrome.storage.local.set({ blockedCountries: countries }, () => {
            addCountryToList(country);
            countryInput.value = '';
          });
        }
      });
    }
  });

  // Toggle debug mode
  debugModeCheckbox.addEventListener('change', (e) => {
    chrome.storage.local.set({ debugMode: e.target.checked });
  });

  function addCountryToList(country) {
    const li = document.createElement('li');
    li.textContent = country;

    const removeBtn = document.createElement('span');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => {
      chrome.storage.local.get(['blockedCountries'], (result) => {
        const countries = result.blockedCountries || [];
        const newCountries = countries.filter(c => c !== country);
        chrome.storage.local.set({ blockedCountries: newCountries }, () => {
          li.remove();
        });
      });
    };

    li.appendChild(removeBtn);
    blockedList.appendChild(li);
  }
});
