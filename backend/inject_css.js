const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../frontend', 'pages');

fs.readdirSync(pagesDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('global_responsive.css')) {
            content = content.replace('</head>', '    <link rel="stylesheet" href="../css/global_responsive.css">\\n</head>');
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated responsive link in " + file);
        }
    }
});
