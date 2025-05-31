# Security Best Practices for Humano SISU

## Secret Management

### What NOT to Do
- ❌ **Never commit secrets directly in code**
- ❌ **Never use hardcoded tokens/passwords in scripts**
- ❌ **Never include API keys in code templates**
- ❌ **Never use the same token for all environments**

### Best Practices for Secret Management

#### 1. Environment Variables
- Use environment variables for all secrets
- Different values for development, staging, production
- Document required variables in template files without revealing actual values

```bash
# Example .env.template
API_TOKEN=your_token_here
```

#### 2. CI/CD Secrets
- Store secrets in GitHub Actions secrets or your CI/CD system
- Reference them in workflows using the proper syntax:

```yaml
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
```

#### 3. Secret Scanning
- Enable GitHub secret scanning or use tools like GitGuardian
- Set up pre-commit hooks to detect potential secrets
- Run periodic scans on your codebase

#### 4. AWS Secrets Management
- Use AWS Secrets Manager for production secrets
- Rotate keys periodically (every 30-90 days)
- Implement least privilege access to secrets

```bash
# Example of fetching secrets from AWS Secrets Manager
secret=$(aws secretsmanager get-secret-value \
  --secret-id "prod/manatal/api-token" \
  --query SecretString --output text)
```

#### 5. Token Rotation
- Implement automated token rotation
- Track token usage with proper logging
- Have a process for emergency token revocation

## Secure Code Practices

### Review checklist before commits
1. Are there any hardcoded credentials?
2. Are there commented-out secrets?
3. Are test files using proper environment variables?
4. Are there any tokens in shell scripts?
5. Are log statements leaking sensitive data?

### Security Monitoring
- Set up alerts for exposed secrets
- Monitor for unauthorized API usage
- Implement rate limiting for API endpoints

### Handling a Security Incident
1. Immediately revoke the exposed token/credential
2. Issue a new token with different values
3. Update all locations using the token
4. Document the incident and implement measures to prevent recurrence
