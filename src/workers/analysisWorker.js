const { Worker, Queue } = require("bullmq");
const { redisConnection } = require("../config/redis");
const { analyzeCommentsBatch, generateVideoSummary } = require("../services/aiService");
const { broadcastAnalysis } = require("../ws/wsServer");
const { sendAnalysisCompletedEmail } = require("../services/emailService");
const axios = require("axios");

const resultsQueue = new Queue("analysis-results-queue", { connection: redisConnection });

const videoAnalysisCache = new Map();
const videosBeingCompleted = new Set();
const completionTimeouts = new Map();

const analysisWorker = new Worker(
  "comments-fetch-queue",
  async (job) => {
    const { videoId, userId, comments, batchNumber, jobId } = job.data;

    console.log(`🔎 Analyzing batch ${batchNumber} for video ${videoId} (${comments.length} comments)`);

    try {
      const analyzed = await analyzeCommentsBatch(comments);
      await resultsQueue.add("analysisBatch", { videoId, userId, analyzed });
      if (!videoAnalysisCache.has(videoId)) {
        videoAnalysisCache.set(videoId, []);
      }
      videoAnalysisCache.get(videoId).push(...analyzed);
      if (jobId) {
        await axios.patch(`${process.env.DB_OPS_URL}/analysis/job/${jobId}`, {
          commentsAnalyzed: videoAnalysisCache.get(videoId).length,
          jobStatus: "processing",
        });
      }

      broadcastAnalysis(videoId, {
        type: "analysis_progress",
        videoId,
        batchNumber,
        analyzedCount: analyzed.length,
        totalAnalyzed: videoAnalysisCache.get(videoId).length,
      });

      console.log(`Finished batch ${batchNumber} for video ${videoId}`);

      if (completionTimeouts.has(videoId)) {
        clearTimeout(completionTimeouts.get(videoId));
        completionTimeouts.delete(videoId);
      }
      const timeoutId = setTimeout(async () => {
        try {
          const allAnalysis = videoAnalysisCache.get(videoId);
          if (!allAnalysis || allAnalysis.length === 0) {
            console.warn(`No cached analysis found for video ${videoId}. Skipping summary.`);
            return;
          }

          console.log(`Timeout triggered for video ${videoId} — generating summary...`);
          if (videosBeingCompleted.has(videoId)) return;
          videosBeingCompleted.add(videoId);

          const [videoRes, userRes] = await Promise.all([
            axios.get(`${process.env.DB_OPS_URL}/video/${videoId}`),
            axios.get(`${process.env.DB_OPS_URL}/user/${userId}`),
          ]);

          const video = videoRes.data;
          const user = userRes.data;

          // Generate summary
          const summary = await generateVideoSummary(videoId, allAnalysis);

          await resultsQueue.add("updateSummary", {
            videoId,
            userId,
            summary,
            jobId,
          });

          // Clean up only after success
          videoAnalysisCache.delete(videoId);
          videosBeingCompleted.delete(videoId);
          completionTimeouts.delete(videoId);

          broadcastAnalysis(videoId, {
            type: "analysis_complete",
            videoId,
            summary,
          });

          // Send notification
          const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard/${videoId}`;
          if (user?.email) {
            await sendAnalysisCompletedEmail(user.email, video.title, dashboardUrl);
          }

          console.log(`Complete analysis for video ${videoId}`);
        } catch (err) {
          console.error(`Summary generation error for video ${videoId}:`, err);
          videosBeingCompleted.delete(videoId);
          completionTimeouts.delete(videoId);
        }
      }, 7000);

      completionTimeouts.set(videoId, timeoutId);

      return { success: true, analyzed: analyzed.length };
    } catch (error) {
      console.error(`Analysis error for video ${videoId}:`, error);

      broadcastAnalysis(videoId, {
        type: "analysis_error",
        videoId,
        error: error.message,
      });

      throw error;
    }
  },
  { connection: redisConnection, concurrency: 2 }
);

analysisWorker.on("completed", (job) => {
  console.log(`Analysis job ${job.id} completed`);
});

analysisWorker.on("failed", (job, err) => {
  console.error(`Analysis job ${job.id} failed:`, err.message);
});

module.exports = analysisWorker;
