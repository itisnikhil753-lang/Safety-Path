const express = require('express');
const path = require('path');
const app = express();

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.listen(8080, () => {
    console.log('Frontend serving on http://localhost:8080');
});
