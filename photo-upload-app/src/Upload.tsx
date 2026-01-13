import React, { useState, useEffect } from 'react'
import { BlockBlobClient } from '@azure/storage-blob'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const sasUrl = import.meta.env.VITE_AZURE_SAS_URL as string | undefined

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [file])

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null)
    setBlobUrl(null)
    const f = e.target.files && e.target.files[0]
    if (f) setFile(f)
  }

  const onUpload = async () => {
    setMessage(null)
    setProgress(0)
    if (!file) {
      setMessage('No file selected')
      return
    }
    if (!sasUrl) {
      setMessage('SAS URL not configured. Add VITE_AZURE_SAS_URL to your .env')
      return
    }

    try {
      setUploading(true)
      const blobName = `${Date.now()}-${file.name}`
      // Build the blob URL so the SAS query string stays at the end (keep signature valid)
      const sas = new URL(sasUrl)
      // Ensure no duplicate slashes on the path and append the encoded blob name
      sas.pathname = sas.pathname.replace(/\/+$/, '') + '/' + encodeURIComponent(blobName)
      const blobClient = new BlockBlobClient(sas.toString())

      await blobClient.uploadBrowserData(file, {
        onProgress: (ev) => {
          // `TransferProgressEvent` uses `loadedBytes`
          if ((ev as any).loadedBytes && file.size) {
            const loaded = (ev as any).loadedBytes as number
            setProgress(Math.round((loaded / file.size) * 100))
          }
        },
      })

      setMessage('Upload successful')
      // blobClient.url contains the SAS token if container URL had it
      setBlobUrl(blobClient.url)
    } catch (err: any) {
      console.error(err)
      setMessage(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '1rem auto' }}>
      <h2>Upload a Photo</h2>
      <input type="file" accept="image/*" onChange={onChange} />
      {preview && (
        <div style={{ marginTop: 12 }}>
          <img src={preview} alt="preview" style={{ maxWidth: '100%' }} />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button onClick={onUpload} disabled={uploading}>
          {uploading ? `Uploading (${progress}%)` : 'Upload to Azure'}
        </button>
      </div>

      {message && (
        <div style={{ marginTop: 12 }}>
          <strong>{message}</strong>
        </div>
      )}

      {blobUrl && (
        <div style={{ marginTop: 12 }}>
          <a href={blobUrl} target="_blank" rel="noreferrer">
            View uploaded file
          </a>
        </div>
      )}

      {!sasUrl && (
        <div style={{ marginTop: 12, color: 'orange' }}>
          <small>
            <strong>Note:</strong> Set <code>VITE_AZURE_SAS_URL</code> in your
            <code>.env</code> (container SAS URL) to enable uploads.
          </small>
        </div>
      )}
    </div>
  )
}
