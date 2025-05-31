# Humano SISU Frontend

Frontend application for the Humano SISU recruitment platform.

## Features

- Multilingual support (English/Spanish)
- Candidate and employer application forms
- Responsive design for all devices
- Integration with Manatal API for recruitment management
- Analytics tracking for form submissions and user interactions

## Documentation

- [Manatal API Integration](./MANATAL_API_INTEGRATION.md) - Details on the recruitment API integration
- [Analytics](./ANALYTICS.md) - Information about analytics implementation
- [API Security](./API_SECURITY.md) - Security best practices for API usage
- [Deployment](./DEPLOYMENT.md) - Deployment instructions
- [Future Enhancements](./FUTURE_ENHANCEMENTS.md) - Planned improvements

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured for deployment

### Setup for Development

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd saas-proyecto/frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.template .env.local
   # Edit .env.local with your API keys and settings
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:5173`

## Testing

Run tests with:
```bash
npm test
```

## Building for Production

Build the application for production:
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Deployment

### Deploy to S3/CloudFront

1. Build the application
   ```bash
   npm run build
   ```

2. Deploy to S3
   ```bash
   aws s3 sync dist/ s3://www.humanosisu.com --delete
   ```

3. Invalidate CloudFront cache
   ```bash
   aws cloudfront create-invalidation --distribution-id E3JC3C46Y6RAHD --paths "/*"
   ```

## Project Structure

- `src/pages/` - Page components
- `src/components/` - Reusable UI components
- `src/contexts/` - React context providers
- `src/config/` - Configuration files
- `src/services/` - Service modules
- `src/utils/` - Utility functions
- `src/translations.ts` - Translation strings

## Documentation

- [API Security](./API_SECURITY.md) - Information about API security and best practices
- [Analytics Implementation](./ANALYTICS.md) - Documentation for the analytics implementation

## Key Components

### Start Free Page

The "Start Free" page (`ComienzaGratisPage.tsx`) allows users to sign up as either employers or candidates:

- **Employers**: Submit company information and job openings
- **Candidates**: Submit personal information and resume

Both flows integrate with Manatal's API for seamless data collection and management.

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Security Notes

- API tokens should never be committed to the repository
- Use environment variables for sensitive information
- See [API_SECURITY.md](./API_SECURITY.md) for more details

## License

Proprietary - All rights reserved