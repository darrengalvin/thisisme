// Test script to create a photo tag directly via API
const mediaId = '1c3cb0e4-bd64-47b3-a9ac-4969410fb5f5';

// First, let's create a person in the network
async function createTestTag() {
  try {
    console.log('🏷️ Creating test person in network...');
    
    // Step 1: Create a person in user network
    const networkResponse = await fetch('http://localhost:3000/api/network', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // You'll need to get this from browser
      },
      body: JSON.stringify({
        person_name: 'Test Person',
        person_email: 'test@example.com',
        relationship: 'Friend'
      })
    });
    
    const networkData = await networkResponse.json();
    console.log('✅ Network response:', networkData);
    
    if (!networkData.success) {
      throw new Error('Failed to create person in network');
    }
    
    const personId = networkData.person.id;
    console.log('👤 Created person with ID:', personId);
    
    // Step 2: Create photo tag
    console.log('🏷️ Creating photo tag...');
    
    const tagResponse = await fetch(`http://localhost:3000/api/media/${mediaId}/photo-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE' // Same token
      },
      body: JSON.stringify({
        tags: [{
          media_id: mediaId,
          tagged_person_id: personId,
          x_position: 50,
          y_position: 50,
          tag_width: 10,
          tag_height: 10
        }]
      })
    });
    
    const tagData = await tagResponse.json();
    console.log('✅ Tag response:', tagData);
    
    if (tagData.success) {
      console.log('🎉 SUCCESS! Tag created for media:', mediaId);
      console.log('🔄 Now refresh your browser and check the image!');
    } else {
      console.error('❌ Failed to create tag:', tagData);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Instructions for running this
console.log(`
🚀 To run this test:

1. Open your browser console on localhost:3000
2. Get your JWT token by running:
   localStorage.getItem('token') || sessionStorage.getItem('token')
3. Replace 'YOUR_JWT_TOKEN_HERE' with your actual token
4. Copy and paste this entire script into the console
5. Call: createTestTag()
`);
