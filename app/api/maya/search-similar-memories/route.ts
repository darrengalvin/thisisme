import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { memory_title, memory_description, threshold = 0.75 } = body

    if (!memory_title && !memory_description) {
      return NextResponse.json(
        { success: false, error: 'Memory title or description required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all user's existing memories
    const { data: existingMemories, error } = await supabase
      .from('memories')
      .select('id, title, description, approximate_date, created_at')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })

    if (error || !existingMemories || existingMemories.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          similar_memories: [],
          is_potential_duplicate: false,
          similarity_scores: []
        }
      })
    }

    // Create embedding for new memory
    const newMemoryText = `${memory_title || ''}\n${memory_description || ''}`
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: newMemoryText
    })

    const newEmbedding = embeddingResponse.data[0].embedding

    // Calculate similarity with existing memories using cosine similarity
    // For now, we'll use a simpler text-based comparison
    // TODO: Store embeddings in database with pgvector for better performance
    
    const similarities = await Promise.all(
      existingMemories.slice(0, 50).map(async (memory) => {
        const memoryText = `${memory.title || ''}\n${memory.description || ''}`
        
        try {
          const memoryEmbedding = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: memoryText
          })

          const similarity = cosineSimilarity(
            newEmbedding,
            memoryEmbedding.data[0].embedding
          )

          return {
            memory_id: memory.id,
            title: memory.title,
            description: memory.description?.substring(0, 200),
            similarity_score: similarity,
            date: memory.approximate_date
          }
        } catch (error) {
          return null
        }
      })
    )

    const validSimilarities = similarities.filter(s => s !== null) as any[]
    const sortedSimilarities = validSimilarities
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 5)

    const similarMemories = sortedSimilarities.filter(s => s.similarity_score >= threshold)
    const isPotentialDuplicate = sortedSimilarities[0]?.similarity_score >= 0.85

    return NextResponse.json({
      success: true,
      data: {
        similar_memories: similarMemories,
        is_potential_duplicate: isPotentialDuplicate,
        most_similar: sortedSimilarities[0] || null,
        total_memories_checked: validSimilarities.length
      }
    })

  } catch (error: any) {
    console.error('Search similar memories error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search similar memories' },
      { status: 500 }
    )
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}
