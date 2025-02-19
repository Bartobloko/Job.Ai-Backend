const scraper = require('./scraper/scraper');
const jobService = require('../services/jobService');
const aiService = require('../services/aiService');
const statsService = require('../services/statsService');

const getJobDetails = async (accountId) => {
    try {
        // Log bot activation
        await statsService.logBotAction(
            accountId,
            'BOT_START',
            'Started job scraping process'
        );
        await statsService.updateAccountStats(accountId, { botActivations: 1 });

        console.log('Pobieranie szczegółów ofert pracy...');
        const scrappedJobs = await scraper.scrapeJobOffers(accountId); // Pass accountId to use custom settings

        await statsService.logBotAction(
            accountId,
            'SCRAPE_COMPLETE',
            `Successfully scraped ${scrappedJobs.length} jobs`
        );

        console.log('Znaleziono ofert:', scrappedJobs.length);
        let newJobsCount = 0;
        let analyzedJobsCount = 0;

        for (const job of scrappedJobs) {
            const alreadySaved = await jobService.isJobAlreadySaved(job.title, job.company);

            if (alreadySaved) {
                console.log('Oferta już istnieje w bazie danych');
            } else {
                newJobsCount++;
                const savedJob = await jobService.saveJobToDatabase(job, accountId);

                try {
                    const response = await aiService.analyzeJobWithOllama(savedJob, accountId);
                    analyzedJobsCount++;

                    await statsService.logBotAction(
                        accountId,
                        'JOB_ANALYZED',
                        `Analyzed job: ${job.title} - ${response.slice(0, 50)}...`
                    );
                } catch (error) {
                    await statsService.logBotAction(
                        accountId,
                        'ANALYSIS_ERROR',
                        `Failed to analyze job ${job.title}: ${error.message}`
                    );
                }
            }
        }

        await statsService.logBotAction(
            accountId,
            'BOT_COMPLETE',
            `Completed processing. New jobs: ${newJobsCount}, Analyzed: ${analyzedJobsCount}`
        );

    } catch (error) {
        await statsService.logBotAction(
            accountId,
            'BOT_ERROR',
            `Error during job processing: ${error.message}`
        );
        throw error;
    }
};

module.exports = { getJobDetails };