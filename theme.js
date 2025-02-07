function toggleTheme() {
    const body = document.body;
    const themeToggleIcon = document.querySelector('.theme-toggle i');

    // Toggle dark-theme class
    body.classList.toggle('dark-theme');

    // Update icon and localStorage berdasarkan status dark-theme
    if (body.classList.contains('dark-theme')) {
        themeToggleIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggleIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToggleIcon = document.querySelector('.theme-toggle i');

    // Set tema awal
    if (savedTheme) {
        document.body.classList.toggle('dark-theme', savedTheme === 'dark');
    } else {
        document.body.classList.toggle('dark-theme', systemPrefersDark);
    }

    // Set ikon awal
    if (document.body.classList.contains('dark-theme')) {
        themeToggleIcon.className = 'fas fa-sun';
    } else {
        themeToggleIcon.className = 'fas fa-moon';
    }
});
