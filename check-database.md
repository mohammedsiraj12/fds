# How to Check if Data is Being Created in Supabase

## Method 1: Supabase Dashboard (Easiest)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"Table Editor"** in the left sidebar

### Step 2: Check Each Table
1. **Check `patient_profiles` table:**
   - Click on `patient_profiles` table
   - You should see patient records with user_id, full_name, etc.

2. **Check `doctor_profiles` table:**
   - Click on `doctor_profiles` table
   - You should see doctor records with user_id, full_name, specialization, etc.

3. **Check `consultations` table:**
   - Click on `consultations` table
   - You should see questions from patients with patient_id, question, symptoms, status, etc.

4. **Check `appointments` table:**
   - Click on `appointments` table
   - You should see appointment bookings with patient_id, appointment_date, appointment_time, etc.

## Method 2: SQL Queries (More Detailed)

### Step 1: Open SQL Editor
1. In Supabase Dashboard, click **"SQL Editor"**
2. Click **"New Query"**

### Step 2: Run These Queries

**Check all patient profiles:**
```sql
SELECT * FROM patient_profiles ORDER BY created_at DESC;
```

**Check all doctor profiles:**
```sql
SELECT * FROM doctor_profiles ORDER BY created_at DESC;
```

**Check all consultations:**
```sql
SELECT 
  c.*,
  p.full_name as patient_name,
  d.full_name as doctor_name
FROM consultations c
LEFT JOIN patient_profiles p ON c.patient_id = p.id
LEFT JOIN doctor_profiles d ON c.doctor_id = d.id
ORDER BY c.created_at DESC;
```

**Check all appointments:**
```sql
SELECT 
  a.*,
  p.full_name as patient_name,
  d.full_name as doctor_name
FROM appointments a
LEFT JOIN patient_profiles p ON a.patient_id = p.id
LEFT JOIN doctor_profiles d ON a.doctor_id = d.id
ORDER BY a.created_at DESC;
```

## Method 3: Browser Console (Real-time)

### Step 1: Open Browser Developer Tools
1. In your app, press **F12** or right-click → **"Inspect"**
2. Click **"Console"** tab

### Step 2: Add Console Logs
Add this to your patient dashboard to see what's happening:

```javascript
// In patient dashboard, add this to handleAskQuestion function:
console.log("Submitting question:", { question, symptoms, patientProfile });
const { data, error } = await createConsultation(patientProfile.id, question, symptoms);
console.log("Consultation result:", { data, error });
```

## Method 4: Test the Full Flow

### Step 1: Create Test Data
1. **Sign up as a patient** with email: `testpatient@example.com`
2. **Ask a question** like "I have a headache"
3. **Sign up as a doctor** with email: `testdoctor@example.com`
4. **Log in as doctor** and check the consultations tab

### Step 2: Verify in Database
Run this SQL to see the test data:

```sql
-- Check if test patient was created
SELECT * FROM patient_profiles WHERE full_name LIKE '%test%';

-- Check if test doctor was created  
SELECT * FROM doctor_profiles WHERE full_name LIKE '%test%';

-- Check if consultation was created
SELECT 
  c.*,
  p.full_name as patient_name
FROM consultations c
LEFT JOIN patient_profiles p ON c.patient_id = p.id
WHERE c.question LIKE '%headache%';
```

## Expected Results

### If Working Correctly:
- ✅ **patient_profiles** table should have records
- ✅ **doctor_profiles** table should have records  
- ✅ **consultations** table should have questions
- ✅ **appointments** table should have bookings
- ✅ **Console logs** should show success messages
- ✅ **No error messages** in browser console

### If Not Working:
- ❌ **Tables don't exist** → Run the SQL from `create-tables.sql`
- ❌ **RLS errors** → Check Row Level Security policies
- ❌ **Permission errors** → Check API keys in `supabaseClient.js`
- ❌ **Network errors** → Check internet connection

## Quick Test Commands

**Check table count:**
```sql
SELECT 
  'patient_profiles' as table_name, COUNT(*) as count FROM patient_profiles
UNION ALL
SELECT 'doctor_profiles', COUNT(*) FROM doctor_profiles  
UNION ALL
SELECT 'consultations', COUNT(*) FROM consultations
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments;
```

**Check latest activity:**
```sql
SELECT 
  'patient_profiles' as table_name, MAX(created_at) as latest FROM patient_profiles
UNION ALL
SELECT 'doctor_profiles', MAX(created_at) FROM doctor_profiles
UNION ALL  
SELECT 'consultations', MAX(created_at) FROM consultations
UNION ALL
SELECT 'appointments', MAX(created_at) FROM appointments;
```
