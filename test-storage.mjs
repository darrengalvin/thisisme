// Quick test to verify Supabase Storage bucket
// Run with: node test-storage.mjs

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.log('Please make sure you have .env.local with:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_url')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function testStorageBucket() {
  try {
    console.log('🔍 Testing Supabase Storage bucket...')
    
    // List buckets
    console.log('📁 Listing all buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      return
    }
    
    console.log('📁 Available buckets:', buckets.map(b => b.name))
    
    // Check if 'files' bucket exists
    const filesBucket = buckets.find(b => b.name === 'files')
    if (!filesBucket) {
      console.error('❌ "files" bucket not found!')
      console.log('Please create a "files" bucket in your Supabase Storage dashboard')
      return
    }
    
    console.log('✅ "files" bucket exists:', filesBucket)
    
    // Test upload a small file
    console.log('📤 Testing upload...')
    const testContent = Buffer.from('test file content')
    const testPath = 'uploads/test.txt'
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return
    }
    
    console.log('✅ Upload successful:', uploadData)
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(testPath)
    
    console.log('🌐 Public URL:', publicUrl)
    
    // List files in uploads folder
    const { data: files, error: listError } = await supabase.storage
      .from('files')
      .list('uploads', { limit: 10 })
    
    if (listError) {
      console.error('❌ Error listing files:', listError)
    } else {
      console.log('📁 Files in uploads folder:', files)
    }
    
    // Clean up test file
    await supabase.storage.from('files').remove([testPath])
    console.log('🗑️ Test file cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testStorageBucket() 