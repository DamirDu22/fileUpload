const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const alertBox = document.getElementById('alert');

// Display the selected file's name.
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    fileNameDisplay.textContent = fileInput.files[0].name;
  } else {
    fileNameDisplay.textContent = '';
  }
});

uploadBtn.addEventListener('click', async () => {
  // Clear previous alerts.
  alertBox.textContent = '';
  alertBox.className = 'alert';

  if (fileInput.files.length === 0) {
    alertBox.textContent = 'Please select a file.';
    alertBox.classList.add('error');
    return;
  }
  const file = fileInput.files[0];

  try {
    // Request a SAS URL from the backend.
    const sasResponse = await fetch('/generate-sas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name })
    });

    if (!sasResponse.ok) {
      throw new Error('Error generating SAS URL.');
    }

    const { sasUrl, fileName } = await sasResponse.json();

    // Use the SAS URL to upload the file directly to Azure Blob Storage.
    const uploadResponse = await fetch(sasUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type
      },
      body: file
    });

    if (uploadResponse.ok) {
      alertBox.textContent = `File uploaded successfully as: ${fileName}`;
      alertBox.classList.add('success');
    } else {
      throw new Error('Error uploading file to Azure Blob Storage.');
    }
  } catch (error) {
    alertBox.textContent = error.message;
    alertBox.classList.add('error');
  }
});
