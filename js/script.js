// Sample data for search suggestions
const campusLocations = [
    'Main Library', 'Student Center', 'Engineering Building', 'Science Hall',
    'Administration Building', 'Cafeteria', 'Gymnasium', 'Art Building',
    'Business School', 'Computer Lab', 'Auditorium', 'Medical Center',
    'Residence Hall A', 'Residence Hall B', 'Parking Garage',
    'Campus Store', 'Career Services', 'Financial Aid Office'
];

const searchInput = document.getElementById('searchInput');
const suggestions = document.getElementById('suggestions');

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up search input event listener
    searchInput.addEventListener('input', handleSearchInput);
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', handleOutsideClick);
    
    // Add staggered animation delays to cards
    const cards = document.querySelectorAll('.quick-link-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${0.1 * index}s`;
    });
});

function handleSearchInput() {
    const query = searchInput.value.toLowerCase();
    
    if (query.length < 2) {
        suggestions.style.display = 'none';
        return;
    }

    const filteredLocations = campusLocations.filter(location => 
        location.toLowerCase().includes(query)
    );

    if (filteredLocations.length > 0) {
        suggestions.innerHTML = filteredLocations.map(location => 
            `<div class="suggestion-item" onclick="selectLocation('${location}')">${location}</div>`
        ).join('');
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

function handleOutsideClick(e) {
    if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
        suggestions.style.display = 'none';
    }
}

function selectLocation(location) {
    searchInput.value = location;
    suggestions.style.display = 'none';
    performSearch();
}

function performSearch() {
    const query = searchInput.value;
    if (query.trim()) {
        alert(`Searching for: ${query}\n\nThis would normally open the map view and highlight the searched location.`);
        // In a real implementation, this would navigate to the map page
        // window.location.href = `map.html?search=${encodeURIComponent(query)}`;
    }
}

function showCategory(category) {
    const categoryNames = {
        'academic': 'Academic Buildings',
        'dining': 'Dining & Food',
        'residence': 'Residence Halls',
        'recreation': 'Recreation & Sports'
    };
    
    alert(`Opening ${categoryNames[category]} view...\n\nThis would show a filtered map with only ${categoryNames[category].toLowerCase()} highlighted.`);
    // In a real implementation, this would navigate to the map with filters
    // window.location.href = `map.html?category=${category}`;
}

function openMainMap() {
    alert('Opening Interactive Campus Map...\n\nThis would navigate to the main map interface where users can explore all campus buildings and features.');
    // In a real implementation, this would navigate to the main map page
    // window.location.href = 'map.html';
}

// Optional: Add keyboard navigation for search
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    } else if (e.key === 'Escape') {
        suggestions.style.display = 'none';
    }
});