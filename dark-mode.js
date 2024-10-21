const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const head = document.getElementById('head')
const heading = document.getElementById('heading')

// Check if a saved theme preference exists in localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    body.classList.add(savedTheme);
    head.classList.add(savedTheme)
    heading.classList.add(savedTheme)
    updateButtonText();
}

themeToggle.addEventListener('click', function() {
    // Toggle dark mode class on the body
    body.classList.toggle('dark-mode');
    head.classList.toggle('dark-mode');
    heading.classList.toggle('dark-mode');

    // Save the user's preference in localStorage
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark-mode');
    } else {
        localStorage.removeItem('theme');
    }

    updateButtonText();
});

function updateButtonText() {
    if (body.classList.contains('dark-mode')) {
        themeToggle.textContent = 'Switch to Light Mode';
    } else {
        themeToggle.textContent = 'Switch to Dark Mode';
    }
}
