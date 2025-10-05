const axios = require('axios');
const Cerebras = require('@cerebras/cerebras_cloud_sdk')



const cerebras = new Cerebras({
  apiKey: process.env['CEREBRAS_API_KEY']
});


async function analyzeCommentsBatch(comments) {
  const messages = [
    {
      role: "system",
      content: `You are an expert in YouTube comment analysis.
      CRITICAL: You must use the EXACT commentId from the input. Do not generate new IDs.
      Your output must be **ONLY a JSON array of objects**, no explanations.
      Each object must have: commentId (use exact ID from input), videoId, sentiment, sentimentScore, 
      isControversial, isHilarious, isQuestion, isAnswer, isSuggestion.
      All boolean fields must be true or false (not 0 or 1).`
    },
    {
      role: "user",
      content: JSON.stringify(comments.map(c => ({
        commentId: c.commentId,
        videoId: c.videoId,
        commentText: c.commentText
      })))
    }
  ];

  try {
    const res = await cerebras.chat.completions.create({
      model: "qwen-3-235b-a22b-instruct-2507",
      messages,
      stream: false,
      max_completion_tokens: 20000,
      temperature: 0.7,
      top_p: 0.8
    });

    let content = res.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/```\n?/g, '');
    }

    let analyzed;
    try {
      analyzed = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Attempted to parse:', content.substring(0, 500));

      // Fallback: use mock analysis
      console.log('Falling back to mock analysis');
      analyzed = comments.map(comment => ({
        commentId: comment.commentId,
        videoId: comment.videoId,
        sentiment: 'neutral',
        sentimentScore: 0,
        isControversial: false,
        isHilarious: false,
        isQuestion: comment.commentText.includes('?'),
        isAnswer: false,
        isSuggestion: false
      }));
    }

    console.log(`Analyzed ${analyzed.length} comments`);
    return analyzed;

  } catch (error) {
    console.error('AI analysis error:', error);

    // Fallback to mock analysis
    return comments.map(comment => ({
      commentId: comment.commentId,
      videoId: comment.videoId,
      sentiment: 'neutral',
      sentimentScore: 0,
      isControversial: false,
      isHilarious: false,
      isQuestion: comment.commentText.includes('?'),
      isAnswer: false,
      isSuggestion: false
    }));
  }
}

async function generateVideoSummary(videoId, allAnalysis) {
  const totalComments = allAnalysis.length;

  const postitiveCount = allAnalysis.filter(a => a.sentiment === 'positive').length
  const negativeCount = allAnalysis.filter(a => a.sentiment === 'negative').length
  const neutralCount = allAnalysis.filter(a => a.sentiment === 'neutral').length

  const sentimentIs = neutralCount > postitiveCount ? neutralCount > negativeCount ? "neutral" : "negative" : "positive"

  const summary = {
    totalComments,
    positiveCount: postitiveCount,
    negativeCount: negativeCount,
    neutralCount: neutralCount,
    controversialCount: allAnalysis.filter(a => a.isControversial).length,
    hilariousCount: allAnalysis.filter(a => a.isHilarious).length,
    questionCount: allAnalysis.filter(a => a.isQuestion).length,
    answerCount: allAnalysis.filter(a => a.isAnswer).length,
    suggestionCount: allAnalysis.filter(a => a.isSuggestion).length,
    summaryText: `Analyzed ${totalComments} comments. Overall sentiment is ${sentimentIs}`
  };

  return summary;
}

module.exports = { analyzeCommentsBatch, generateVideoSummary };
