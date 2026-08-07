# Aerovex Backend

A robust NestJS backend application featuring Role-Based Access Control (RBAC), authentication, payment processing, and file management capabilities.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (RBAC)
- **User Management**: Complete user lifecycle management with role assignments
- **Payment Integration**: Stripe integration for one-time and recurring payments
- **File Management**: AWS S3 integration for secure file uploads and storage
- **Email Service**: Email notifications with customizable templates using Handlebars
- **Job Queues**: Background job processing with BullMQ and Redis
- **Security**: Helmet, CSRF protection, rate limiting, and account lockout mechanisms
- **API Documentation**: Swagger/OpenAPI documentation
- **Webhooks**: Stripe webhook handling for payment events
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for performance optimization

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) v11
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache/Queue**: Redis, BullMQ
- **Authentication**: JWT (Passport)
- **File Storage**: AWS S3
- **Payment**: Stripe
- **Email**: Nodemailer with Handlebars templates
- **Validation**: class-validator, class-transformer
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier, Husky

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- pnpm package manager
- PostgreSQL (v14 or higher)
- Redis (v6 or higher)
- AWS account (for S3 storage)
- Stripe account (for payment processing)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd aerovex-backend
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy the example environment file and configure it with your credentials:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Application
PORT=3000
APP_NAME=aerovex-backend
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/aerovex?schema=public"

# Frontend URL (for CORS)
AEROVEX_FRONTEND_URL="http://localhost:5173"

# Super Admin Credentials
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=superadmin12!@
SUPER_ADMIN_NAME=SuperAdmin

# JWT Configuration
JWT_ACCESS_SECRET_KEY=your-access-secret-key
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key
JWT_ACCESS_TOKEN_EXPIRES_IN=5m
JWT_REFRESH_TOKEN_EXPIRES_IN=15d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
AWS_BUCKET_NAME=your-aws-bucket-name

# Email Configuration
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_SENDER=noreply@aerovex.com

# Queue Configuration
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_REMOVE_ON_COMPLETE=true
QUEUE_REMOVE_ON_FAIL=false
QUEUE_BACKOFF_DELAY=5000

# Security
MAX_LOGIN_ATTEMPTS=5
LOCK_DURATION_SECONDS=3600

# Stripe
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Database Setup

Generate Prisma client and run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start Redis

Make sure Redis is running on your machine:

```bash
# Using Homebrew (macOS)
brew services start redis

# Or run Redis directly
redis-server
```

### 6. Run the Application

```bash
# Development mode with hot reload
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod

# Debug mode
pnpm start:debug
```

The API will be available at `http://localhost:3000`

## API Documentation

Once the application is running, access the Swagger API documentation at:

```
http://localhost:3000/api/docs
```

## Available Scripts

```bash
# Development
pnpm start:dev          # Start in development mode with watch
pnpm start:debug        # Start in debug mode

# Build
pnpm build              # Build the application

# Production
pnpm start:prod         # Start in production mode

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format code with Prettier

# Testing
pnpm test               # Run unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:cov           # Run tests with coverage
pnpm test:e2e           # Run end-to-end tests
```

## Project Structure

```
aerovex-backend/
├── prisma/                 # Prisma schema and migrations
├── src/
│   ├── auth/              # Authentication module
│   ├── billing/           # Payment and billing module
│   ├── common/            # Shared utilities and decorators
│   ├── cron/              # Scheduled tasks
│   ├── external-service/  # Third-party service integrations
│   ├── prisma/            # Prisma service
│   ├── queues/            # BullMQ job queues
│   ├── redis/             # Redis configuration
│   ├── role/              # Role management
│   ├── templates/         # Email templates
│   ├── upload/            # File upload module
│   ├── user/              # User management
│   ├── webhooks/          # Webhook handlers
│   ├── app.module.ts      # Root application module
│   └── main.ts            # Application entry point
├── test/                  # E2E tests
├── .env.example           # Environment variables template
└── package.json           # Project dependencies
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **CSRF Protection**: Cross-Site Request Forgery protection
- **Rate Limiting**: Throttling to prevent abuse
- **Helmet**: Security headers configuration
- **Account Lockout**: Automatic account locking after failed login attempts
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: class-validator for request validation

## Database Schema

To view the database schema:

```bash
npx prisma studio
```

This will open Prisma Studio at `http://localhost:5555`

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch
```

## Deployment

### Build for production

```bash
pnpm build
```

### Environment Variables

Ensure all production environment variables are properly configured:

- Use strong, unique secrets for JWT keys
- Configure production database
- Set up production Redis instance
- Configure AWS S3 for production
- Update Stripe keys to live mode
- Configure production email service

### Running in Production

```bash
# Using Node
node dist/src/main.js

# Or using pnpm
pnpm start:prod
```

### Using Docker (if applicable)

```bash
# Build Docker image
docker build -t aerovex-backend .

# Run container
docker run -p 3000:3000 --env-file .env aerovex-backend
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Verify DATABASE_URL in `.env` is correct
- Check database credentials and permissions

### Redis Connection Issues

- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Verify REDIS_HOST and REDIS_PORT in `.env`

### Email Not Sending

- Verify SMTP credentials in `.env`
- Check firewall settings for SMTP ports
- For Gmail, ensure "Less secure app access" is enabled or use App Passwords

### File Upload Issues

- Verify AWS credentials are correct
- Ensure S3 bucket exists and has proper permissions
- Check CORS configuration on S3 bucket

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Follow the existing code style
- Run `pnpm lint` before committing
- Ensure all tests pass with `pnpm test`

## License

UNLICENSED

## Support

For issues and questions, please open an issue in the repository.

## Author

Aerovex

---

Built with [NestJS](https://nestjs.com/)
