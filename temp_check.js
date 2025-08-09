const fs = require('fs')
try {
  const content = fs.readFileSync('pages/landing.tsx', 'utf8')
  console.log('File reads successfully')
  console.log('Total lines:', content.split('\n').length)
  
  // Check for obvious syntax issues
  const lines = content.split('\n')
  for (let i = 70; i < 85; i++) {
    console.log(`${i}: ${lines[i]}`)
  }
} catch (error) {
  console.error('Error:', error.message)
}
