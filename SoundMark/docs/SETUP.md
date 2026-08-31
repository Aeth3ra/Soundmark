# SOUNDMARK Setup Guide

This guide explains how to set up and run SOUNDMARK locally for development.

## Prerequisites

Before running SOUNDMARK, install:

- [Node.js](https://nodejs.org/)
- [Meteor](https://www.meteor.com/)
- Git

You will also need access to the project's required external services and environment variables.

## Getting the Project

Clone the repository and navigate into the project directory:

```bash
git clone <https://github.com/Aeth3ra/Soundmark.git>
cd SOUNDMARK
```

## Installing Dependencies

Install the project's dependencies:

```bash
npm install
```

## Environment Configuration

SOUNDMARK requires environment-specific configuration for external services.

Private configuration is stored in:

```text
private/settings.json
```

Use the following format

```json
{
  "r2": {
    "accountId": ,
    "accessKeyId": ,
    "secretAccessKey": ,
    "bucketName":
  },
  "public": {
    "packages": {
      "accounts": {
        "clientStorage": "session"
      }
    }
  }
}
```

Do not commit credentials, API keys, or other sensitive information to the repository.

Ensure the required configuration is available before starting the application.

## Running the Application

Start the Meteor development server:

```bash
meteor run
```

Meteor will start the application and provide a local URL.

Open the provided URL in a browser to access SOUNDMARK.

## Development Workflow

During development, Meteor automatically rebuilds the application when source files are changed.

Changes to React components and application code should therefore be visible without manually rebuilding the project.

## External Services

SOUNDMARK integrates with external services for functionality such as audio file storage.

The required services must be configured before features depending on them can be used.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for information about how these services interact with SOUNDMARK.

## Troubleshooting

### Dependencies are missing

If the application fails to start after cloning the repository, try reinstalling dependencies:

```bash
rm -rf node_modules
npm install
```

### Meteor fails to start

Check that Meteor is installed and available from your terminal:

```bash
meteor --version
```

### Environment or service errors

Check that the required private configuration has been provided and that credentials are valid.

Do not commit private credentials to the repository.
