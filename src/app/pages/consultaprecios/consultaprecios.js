function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function showModal(modalId) {
  // Hide all modals
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.add('hidden');
  });
  
  // Show the requested modal
  document.getElementById(modalId).classList.remove('hidden');
  
  // Hide results when going back
  if (modalId === 'modal1') {
    document.getElementById('results').classList.add('hidden');
  }
}

function showResults() {
  const resultsCard = document.getElementById('results');
  resultsCard.classList.remove('hidden');
  
  // Smooth scroll to results
  setTimeout(() => {
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
    }
  });
});