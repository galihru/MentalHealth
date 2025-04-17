# Security Policy

## Supported Versions

Our project follows semantic versioning. Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

> Note: Version information is automatically detected from the latest GitHub release.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability within the project, please follow these steps:

1. **Do not** disclose the vulnerability publicly until it has been addressed.
2. Submit your findings via [GitHub Security Advisories](https://github.com/4211421036/MentalHealth/security/advisories/new).
3. Alternatively, you can email the project maintainer directly at [your-email@example.com].
4. Include detailed information about the vulnerability, potential impact, and if possible, steps to reproduce.

You will receive an acknowledgment within 48 hours. After that:

- We will investigate and validate the reported issue
- We aim to release a fix within 14 days depending on complexity
- You will be notified throughout the process
- We will credit you for the discovery (unless you request anonymity)

## Security Considerations

### GitHub Workflow Security

Our project uses GitHub Actions workflows for automating PR merges. Key security aspects:

1. **Limited Scope**: Auto-merge functionality is strictly limited to:
   - PRs from repository owner (4211421036)
   - Dependabot updates (excluding major version changes)
   - Cloudflare Workers and Pages bot

2. **Token Security**:
   - All workflows use `secrets.GITHUB_TOKEN` which has repository-scoped permissions
   - No persistent PATs are stored in the workflow files

3. **Workflow Triggers**:
   - Scheduled executions (hourly)
   - Manual triggers via workflow_dispatch
   - PR events (opened, synchronized, reopened)

4. **Branch Protection**:
   - We recommend enabling branch protection rules on the main branch
   - Required status checks should be enforced before merging

### Hardware System Security

Our mental health monitoring system uses ESP32 with WiFi connectivity and has the following security considerations:

1. **Authentication**:
   - GitHub token security: The hardware uses a GitHub Personal Access Token (PAT) to update repository content
   - ⚠️ **WARNING**: Current implementation includes a hardcoded token - this should be moved to secure storage

2. **Data Security**:
   - Mental health data is sensitive personal information
   - All data is Base64 encoded before transmission
   - Consider implementing end-to-end encryption for production use

3. **WiFi Security**:
   - Current implementation connects to a predefined WiFi network
   - Use WPA2/WPA3 secured WiFi networks only
   - Consider implementing certificate validation

4. **Sensor Data Integrity**:
   - Input validation is implemented for sensor readings
   - Default values are provided when sensor readings are invalid

## Best Practices for Contributors

1. **Never commit credentials**:
   - Do not commit WiFi passwords, tokens, or other secrets
   - Use environment variables or secrets management

2. **Code Review**:
   - All PRs should undergo code review before merging
   - Security implications should be explicitly considered

3. **Dependency Management**:
   - Keep dependencies updated (Dependabot is configured for this)
   - Review security implications of new dependencies

4. **Testing**:
   - Add tests for new features, especially those handling sensitive data
   - Consider adding security-focused tests

## Security Improvement Roadmap

1. **Short-term**:
   - Remove hardcoded GitHub token from Arduino code
   - Implement secure storage for credentials
   - Add HTTPS certificate validation

2. **Medium-term**:
   - Implement end-to-end encryption for health data
   - Add user authentication system
   - Enhance logging for security events

3. **Long-term**:
   - Third-party security audit
   - Compliance assessment for health data regulations
   - Formal security documentation

## References

1. [GitHub Security Best Practices](https://docs.github.com/en/code-security)
2. [ESP32 Security Overview](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/index.html)
3. [IoT Security Foundation](https://www.iotsecurityfoundation.org/)
4. [OWASP IoT Security Guidelines](https://owasp.org/www-project-internet-of-things/)

---

This security policy is a living document and will be updated as the project evolves.

Last Updated: April 17, 2025
