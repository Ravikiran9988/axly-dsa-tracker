const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, 'src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const routes = [...content.matchAll(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/g)];
  console.log(file);
  routes.forEach(r => console.log('  ' + r[1].toUpperCase() + ' ' + r[2]));
}
