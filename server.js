// index.js
const express = require('express');
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

// Load environment variables (optional: if using dotenv)
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER;

if (!accountName || !accountKey || !containerName) {
  throw new Error("Missing one or more required environment variables: AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_CONTAINER");
}

// Create the shared key credential and blob service client.
const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);

// Middleware to parse JSON bodies.
app.use(express.json());

// Serve static files (our simple HTML/JS site) from the 'public' folder.
app.use(express.static('public'));

// Endpoint to generate a SAS URL for a new blob.
app.post('/generate-sas', async (req, res) => {
  try {
    // Expect a JSON body with a fileName property.
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // Get a container client and ensure the container exists.
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();

    // Get a block blob client for the new blob.
    const blobClient = containerClient.getBlockBlobClient(fileName);

    // Set the SAS expiry time to 1 hour from now.
    const expiryTime = new Date(new Date().valueOf() + 60 * 60 * 1000);

    // Define SAS permissions. Here we allow creating/writing (and reading, if desired).
    const permissions = BlobSASPermissions.parse("cwr");

    // Build the SAS token parameters.
    const sasOptions = {
      containerName,
      fileName,
      permissions,
      expiresOn: expiryTime,
    };

    // Generate the SAS token.
    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();

    // Construct the full URL including the SAS token.
    const sasUrl = `${blobClient.url}?${sasToken}`;

    // Return the SAS URL and blob name to the client.
    res.status(200).json({ sasUrl, fileName });
  } catch (error) {
    console.error('Error generating SAS:', error);
    res.status(500).json({ error: 'Error generating SAS URL' });
  }
});

app.listen(port, () => {
  console.log(`Server running...`);
});