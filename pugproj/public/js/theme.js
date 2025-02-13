function changeTheme(theme) {
    fetch('/theme', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.documentElement.className = theme;
        }
    });
}