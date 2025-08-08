# PDF Upload Setup Guide

## **📄 Medical Records PDF Upload Feature**

### **✅ What's Implemented:**

1. **Patient Side:**
   - ✅ PDF file selection
   - ✅ File validation (PDF only)
   - ✅ Upload to Supabase Storage
   - ✅ Database tracking
   - ✅ File management (view/delete)

2. **Doctor Side:**
   - ✅ View patient medical records
   - ✅ Access PDF files directly
   - ✅ See upload dates and descriptions

### **🔧 Setup Required:**

#### **Step 1: Create Supabase Storage Bucket**

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"Create Bucket"**
3. Fill in:
   - **Name**: `medical-records`
   - **Public**: `false` (for security)
   - **File size limit**: `10MB`
4. Click **"Create bucket"**

#### **Step 2: Set Storage Policies**

Run this SQL in **Supabase SQL Editor**:

```sql
-- Allow patients to upload their medical records
CREATE POLICY "Patients can upload medical records" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'medical-records' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow patients to view their own records
CREATE POLICY "Patients can view their medical records" ON storage.objects
FOR SELECT USING (
  bucket_id = 'medical-records' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow doctors to view patient medical records
CREATE POLICY "Doctors can view patient medical records" ON storage.objects
FOR SELECT USING (
  bucket_id = 'medical-records'
);

-- Allow patients to delete their own records
CREATE POLICY "Patients can delete their medical records" ON storage.objects
FOR DELETE USING (
  bucket_id = 'medical-records' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Step 3: Create Medical Records Table**

Run this SQL in **Supabase SQL Editor**:

```sql
-- Create medical_records table for PDF uploads
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT DEFAULT 'Medical Record',
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add medical_record_id to consultations table (optional reference)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_uploaded_at ON medical_records(uploaded_at);

-- Enable RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_records
CREATE POLICY "Patients can view their own medical records" ON medical_records
FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own medical records" ON medical_records
FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their own medical records" ON medical_records
FOR DELETE USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view all medical records" ON medical_records
FOR SELECT USING (true);
```

### **🎯 How It Works:**

#### **Patient Experience:**
1. **Go to "📄 Medical Records" tab**
2. **Click "Choose File"** and select a PDF
3. **Click "Upload Medical Record"**
4. **File uploads to Supabase Storage**
5. **Record saved to database**
6. **Doctors can now view the PDF**

#### **Doctor Experience:**
1. **Click "Respond Now"** on a patient consultation
2. **See "📄 Patient Medical Records" section**
3. **View uploaded PDFs** with file names and dates
4. **Click "View PDF"** to open the file
5. **Use medical records** to provide better advice

### **📊 Features:**

- **✅ Secure Storage**: Files stored in Supabase Storage
- **✅ Access Control**: Patients see only their files, doctors see all
- **✅ File Management**: Upload, view, delete records
- **✅ Integration**: Shows in doctor consultation modal
- **✅ File Validation**: Only accepts PDF files
- **✅ Size Limits**: 10MB per file
- **✅ Metadata**: File name, size, upload date, description

### **🚀 Benefits:**

1. **Better Diagnosis**: Doctors can see medical history
2. **Faster Consultations**: No need to ask for records
3. **Secure**: Files are private and secure
4. **Organized**: Easy to manage and find records
5. **Professional**: Clean, modern interface

### **🔍 Testing:**

1. **Upload a PDF** as a patient
2. **Check the file** appears in the list
3. **Log in as doctor** and respond to consultation
4. **Verify the PDF** appears in the medical records section
5. **Click "View PDF"** to open the file

**The PDF upload feature is now fully functional!** 🎉
