// Add this function to handle theme toggling
function setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    // Check for saved theme preference or default to light theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon(true);
    }

    // Add click handler to toggle button
    themeToggleBtn.addEventListener('click', () => {
        const isDarkTheme = document.body.classList.toggle('dark-theme');

        // Save preference to localStorage
        localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');

        // Update the icon
        updateThemeIcon(isDarkTheme);
    });
}

// Change the icon based on current theme
function updateThemeIcon(isDarkTheme) {
    const iconPath = document.querySelector('#theme-toggle path');
    if (!iconPath) return;

    // Update sky and cloud colors based on theme
    if (isDarkTheme) {
        // Dark mode - night sky colors
        COLORS.sky = '#0a1a2a';  // Dark blue for night sky
        COLORS.cloud = '#333333'; // Darker clouds for night time
        // Also update office colors for dark mode
        COLORS.carpet = '#E6E6E6'; // Darker carpet
        COLORS.floor = '#444444';  // Much darker floor for dark mode
        COLORS.wall = '#B2B2B2';   // Darker walls

        // Sun icon for switching to light mode
        iconPath.setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
    } else {
        // Light mode - day sky colors
        COLORS.sky = '#87CEEB';  // Light blue for day sky
        COLORS.cloud = '#ffffff'; // White clouds for day time
        // Reset office colors for light mode
        COLORS.carpet = '#f8f8f8'; // Original carpet
        COLORS.floor = '#ffffff';  // Original floor
        COLORS.wall = '#cccccc';   // Original walls

        // Moon icon for switching to dark mode
        iconPath.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    }

    // Force redraw to update the sky
    requestAnimationFrame(draw);
}

// Initialize theme toggle when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupThemeToggle();

    // Apply initial theme colors when page loads
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        // Set dark theme colors 
        COLORS.sky = '#0a1a2a';     // Dark blue for night sky
        COLORS.cloud = '#333333';   // Darker clouds for night time
        COLORS.carpet = '#E6E6E6';  // Darker carpet
        COLORS.floor = '#444444';   // Much darker floor for dark mode
        COLORS.wall = '#B2B2B2';    // Darker walls
    }
});